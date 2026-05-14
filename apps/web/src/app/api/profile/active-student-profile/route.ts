import { NextResponse } from 'next/server'
import { createNextServerSupabaseClient } from '@mysryear/shared'

export async function PATCH(req: Request) {
  const supabase = await createNextServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 })
  }

  const json = (await req.json().catch(() => null)) as { studentProfileId?: string | null } | null
  if (!json) {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const { studentProfileId } = json

  const { error } = await supabase
    .from('profiles')
    .update({ active_student_profile_id: studentProfileId ?? null })
    .eq('id', session.user.id)

  if (error) {
    // Common failure: column missing if migration wasn't applied in this environment.
    const message =
      /active_student_profile_id/i.test(error.message) || /column .* does not exist/i.test(error.message)
        ? 'Active student profile selection is not available yet (missing migration).'
        : error.message
    return NextResponse.json({ ok: false, error: message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
