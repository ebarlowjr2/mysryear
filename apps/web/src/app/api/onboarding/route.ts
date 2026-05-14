import { NextResponse } from 'next/server'
import { createNextServerSupabaseClient, USER_ROLES, type UserRole } from '@mysryear/shared'

function badRequest(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 400 })
}

type OnboardingPayload = {
  role: UserRole
  studentProfile?: {
    firstName?: string
    lastName?: string
    graduationYear?: number
    schoolId?: string | null
  }
}

export async function POST(req: Request) {
  const supabase = await createNextServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 })
  }

  const json = (await req.json().catch(() => null)) as OnboardingPayload | null
  if (!json) return badRequest('Invalid JSON')

  const { role, studentProfile } = json
  if (!USER_ROLES.includes(role)) return badRequest('Invalid role')

  // Upsert role + onboarding flag immediately so middleware stops bouncing.
  const { error: profileUpdateError } = await supabase
    .from('profiles')
    .update({ role, onboarding_complete: true })
    .eq('id', session.user.id)

  if (profileUpdateError) return badRequest(profileUpdateError.message)

  let activeStudentProfileId: string | null = null

  if (role === 'student') {
    // Student-led: ensure a student profile exists and is linked to the auth user.
    const { data: existing, error: existingError } = await supabase
      .from('student_profiles')
      .select('id')
      .eq('student_user_id', session.user.id)
      .maybeSingle()
    if (existingError) return badRequest(existingError.message)

    if (existing?.id) {
      activeStudentProfileId = existing.id as string
      const { error: updateSpError } = await supabase
        .from('student_profiles')
        .update({
          first_name: studentProfile?.firstName ?? null,
          last_name: studentProfile?.lastName ?? null,
          graduation_year: studentProfile?.graduationYear ?? null,
          school_id: studentProfile?.schoolId ?? null,
        })
        .eq('id', activeStudentProfileId)
      if (updateSpError) return badRequest(updateSpError.message)
    } else {
      const { data: created, error: createError } = await supabase
        .from('student_profiles')
        .insert({
          student_user_id: session.user.id,
          created_by_user_id: session.user.id,
          first_name: studentProfile?.firstName ?? null,
          last_name: studentProfile?.lastName ?? null,
          graduation_year: studentProfile?.graduationYear ?? null,
          school_id: studentProfile?.schoolId ?? null,
        })
        .select('id')
        .single()
      if (createError) return badRequest(createError.message)
      activeStudentProfileId = (created?.id as string) || null
    }

    if (activeStudentProfileId) {
      // Ensure membership row exists.
      const { error: relError } = await supabase.from('family_relationships').insert({
        student_profile_id: activeStudentProfileId,
        user_id: session.user.id,
        role: 'student',
      })
      // Ignore conflicts (unique constraint) for idempotency.
      if (relError && !/duplicate key/i.test(relError.message)) return badRequest(relError.message)
    }
  } else if (role === 'parent' || role === 'guardian') {
    // Parent-led: create a student profile container (student can claim later).
    const { data: created, error: createError } = await supabase
      .from('student_profiles')
      .insert({
        student_user_id: null,
        created_by_user_id: session.user.id,
        first_name: studentProfile?.firstName ?? null,
        last_name: studentProfile?.lastName ?? null,
        graduation_year: studentProfile?.graduationYear ?? null,
        school_id: studentProfile?.schoolId ?? null,
      })
      .select('id')
      .single()
    if (createError) return badRequest(createError.message)

    activeStudentProfileId = (created?.id as string) || null

    if (activeStudentProfileId) {
      // For now: creators are admins so they can invite and manage relationships.
      const { error: relError } = await supabase.from('family_relationships').insert({
        student_profile_id: activeStudentProfileId,
        user_id: session.user.id,
        role: 'admin',
      })
      if (relError && !/duplicate key/i.test(relError.message)) return badRequest(relError.message)
    }
  } else if (role === 'counselor') {
    // Counselor onboarding does not create a student profile. They will be linked via invites.
    activeStudentProfileId = null
  }

  if (activeStudentProfileId) {
    const { error: activeError } = await supabase
      .from('profiles')
      .update({ active_student_profile_id: activeStudentProfileId })
      .eq('id', session.user.id)
    if (activeError) return badRequest(activeError.message)
  }

  return NextResponse.json({ ok: true, role, activeStudentProfileId })
}

