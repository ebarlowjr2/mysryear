import { NextResponse } from 'next/server'
import { createNextServerSupabaseClient, USER_ROLES, type UserRole } from '@mysryear/shared'

function badRequest(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 400 })
}

export async function POST() {
  const supabase = await createNextServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 })
  }

  // If onboarding is already complete, no-op.
  const { data: profileRow } = await supabase
    .from('profiles')
    .select('role,onboarding_complete')
    .eq('id', session.user.id)
    .maybeSingle()

  if (profileRow?.onboarding_complete) {
    return NextResponse.json({ ok: true, skipped: true })
  }

  const md = (session.user.user_metadata || {}) as Record<string, unknown>
  const role = md.role as UserRole | undefined
  if (!role || !USER_ROLES.includes(role)) {
    return badRequest('Missing role metadata; please complete onboarding.')
  }

  const graduationYear = typeof md.graduation_year === 'number' ? md.graduation_year : null
  const schoolId = typeof md.school_id === 'string' ? md.school_id : null

  // Use the existing onboarding endpoint logic by doing the minimal inline work here.
  const { error: profileUpdateError } = await supabase
    .from('profiles')
    .update({ role, onboarding_complete: true })
    .eq('id', session.user.id)

  if (profileUpdateError) return badRequest(profileUpdateError.message)

  if (role === 'student') {
    if (!graduationYear || !schoolId) {
      // Mark onboarding incomplete again so the UI can collect missing fields.
      await supabase.from('profiles').update({ onboarding_complete: false }).eq('id', session.user.id)
      return badRequest('Missing graduation year or school; please complete onboarding.')
    }

    // Ensure a student profile exists and is linked to the auth user.
    const { data: existing } = await supabase
      .from('student_profiles')
      .select('id')
      .eq('student_user_id', session.user.id)
      .maybeSingle()

    let studentProfileId: string | null = (existing?.id as string | undefined) || null

    if (!studentProfileId) {
      const { data: created, error: createError } = await supabase
        .from('student_profiles')
        .insert({
          student_user_id: session.user.id,
          created_by_user_id: session.user.id,
          graduation_year: graduationYear,
          school_id: schoolId,
        })
        .select('id')
        .single()
      if (createError) return badRequest(createError.message)
      studentProfileId = (created?.id as string) || null
    } else {
      await supabase
        .from('student_profiles')
        .update({ graduation_year: graduationYear, school_id: schoolId })
        .eq('id', studentProfileId)
    }

    if (studentProfileId) {
      await supabase.from('family_relationships').insert({
        student_profile_id: studentProfileId,
        user_id: session.user.id,
        role: 'student',
      })
      await supabase
        .from('profiles')
        .update({ active_student_profile_id: studentProfileId })
        .eq('id', session.user.id)
    }
  }

  return NextResponse.json({ ok: true, role })
}

