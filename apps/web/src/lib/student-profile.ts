import { createNextServerSupabaseClient, type UserRole } from '@mysryear/shared'

type StudentProfileRow = { id: string; student_user_id: string | null }

export async function getActiveStudentProfileId(): Promise<string | null> {
  const supabase = await createNextServerSupabaseClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .maybeSingle()

  const role = (profile?.role as UserRole | undefined) || 'student'

  if (role === 'student') {
    const { data: existing } = await supabase
      .from('student_profiles')
      .select('id,student_user_id')
      .eq('student_user_id', session.user.id)
      .maybeSingle()

    if (existing?.id) return existing.id

    const { data: created, error: createError } = await supabase
      .from('student_profiles')
      .insert({ student_user_id: session.user.id, created_by_user_id: session.user.id })
      .select('id,student_user_id')
      .single()

    if (createError) throw createError
    const sp = created as StudentProfileRow

    await supabase.from('family_relationships').insert({
      student_profile_id: sp.id,
      user_id: session.user.id,
      role: 'student',
    })

    return sp.id
  }

  const { data: rel } = await supabase
    .from('family_relationships')
    .select('student_profile_id')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  return (rel?.student_profile_id as string | undefined) || null
}

