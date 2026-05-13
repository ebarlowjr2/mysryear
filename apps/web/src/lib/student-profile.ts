import { createNextServerSupabaseClient, type UserRole } from '@mysryear/shared'

type StudentProfileRow = { id: string; student_user_id: string | null }

export async function getActiveStudentProfileId(): Promise<string | null> {
  const supabase = await createNextServerSupabaseClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) return null

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .maybeSingle()

  // If schema isn't fully migrated yet, don't crash server routes.
  if (profileError) return null

  const role = (profile?.role as UserRole | undefined) || 'student'

  if (role === 'student') {
    const { data: existing, error: existingError } = await supabase
      .from('student_profiles')
      .select('id,student_user_id')
      .eq('student_user_id', session.user.id)
      .maybeSingle()

    if (existingError) return null
    if (existing?.id) return existing.id

    const { data: created, error: createError } = await supabase
      .from('student_profiles')
      .insert({ student_user_id: session.user.id, created_by_user_id: session.user.id })
      .select('id,student_user_id')
      .single()

    if (createError) return null
    const sp = created as StudentProfileRow

    const { error: relError } = await supabase.from('family_relationships').insert({
      student_profile_id: sp.id,
      user_id: session.user.id,
      role: 'student',
    })
    if (relError) return null

    return sp.id
  }

  const { data: rel, error: relError } = await supabase
    .from('family_relationships')
    .select('student_profile_id')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (relError) return null
  return (rel?.student_profile_id as string | undefined) || null
}
