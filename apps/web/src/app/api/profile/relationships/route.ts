import { NextResponse } from 'next/server'
import { createNextServerSupabaseClient } from '@mysryear/shared'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

export async function DELETE(req: Request) {
  const supabase = await createNextServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return jsonError('Not authenticated', 401)

  const body = (await req.json().catch(() => null)) as { studentProfileId?: string } | null
  if (!body?.studentProfileId) return jsonError('Missing studentProfileId')

  const { error } = await supabase
    .from('family_relationships')
    .delete()
    .eq('student_profile_id', body.studentProfileId)
    .eq('user_id', session.user.id)
    .in('role', ['parent', 'guardian', 'counselor'])

  if (error) return jsonError(error.message)

  await supabase
    .from('profiles')
    .update({ active_student_profile_id: null })
    .eq('id', session.user.id)
    .eq('active_student_profile_id', body.studentProfileId)

  return NextResponse.json({ ok: true })
}
