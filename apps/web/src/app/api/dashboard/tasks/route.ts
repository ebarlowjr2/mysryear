import { NextResponse } from 'next/server'
import { createNextServerSupabaseClient } from '@mysryear/shared'

function error(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

const ALLOWED_STATUS = new Set(['not_started', 'in_progress', 'done'])

export async function PATCH(req: Request) {
  const supabase = await createNextServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) return error('Not authenticated', 401)

  const body = (await req.json().catch(() => null)) as
    | {
        taskId?: string
        status?: 'not_started' | 'in_progress' | 'done'
      }
    | null

  if (!body) return error('Invalid JSON')

  const taskId = (body.taskId || '').trim()
  const status = body.status

  if (!taskId) return error('Missing taskId')
  if (!status || !ALLOWED_STATUS.has(status)) return error('Invalid status')

  const { data: updated, error: updateError } = await supabase
    .from('student_success_tasks')
    .update({ status })
    .eq('id', taskId)
    .select('id,status')
    .single()

  if (updateError) return error(updateError.message)
  return NextResponse.json({ ok: true, task: updated })
}

