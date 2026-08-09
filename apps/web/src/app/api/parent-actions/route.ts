import { NextResponse } from 'next/server'
import { createNextServerSupabaseClient } from '@mysryear/shared'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

export async function POST(req: Request) {
  const supabase = await createNextServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return jsonError('Not authenticated', 401)

  const body = (await req.json().catch(() => null)) as
    | { studentProfileId?: string; actionKey?: string; completed?: boolean }
    | null
  if (!body) return jsonError('Invalid JSON')
  if (!body.studentProfileId) return jsonError('Missing studentProfileId')
  if (!body.actionKey) return jsonError('Missing actionKey')

  if (body.completed === false) {
    const { error } = await supabase
      .from('parent_action_completions')
      .delete()
      .eq('student_profile_id', body.studentProfileId)
      .eq('parent_user_id', session.user.id)
      .eq('action_key', body.actionKey)
    if (error) return jsonError(error.message)
    return NextResponse.json({ ok: true })
  }

  const { error } = await supabase.from('parent_action_completions').upsert(
    {
      student_profile_id: body.studentProfileId,
      parent_user_id: session.user.id,
      action_key: body.actionKey,
      status: 'completed',
      completed_at: new Date().toISOString(),
    },
    { onConflict: 'student_profile_id,parent_user_id,action_key' },
  )
  if (error) return jsonError(error.message)
  return NextResponse.json({ ok: true })
}
