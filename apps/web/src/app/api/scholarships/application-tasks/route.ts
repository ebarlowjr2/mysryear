import { NextResponse } from 'next/server'
import { createNextServerSupabaseClient, type ScholarshipApplicationTaskStatus } from '@mysryear/shared'
import { getActiveStudentProfileId } from '@/lib/student-profile'

const STATUSES = new Set<ScholarshipApplicationTaskStatus>(['not_started', 'in_progress', 'done'])

function error(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

export async function PATCH(req: Request) {
  const supabase = await createNextServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return error('Not authenticated', 401)

  const studentProfileId = await getActiveStudentProfileId()
  if (!studentProfileId) return error('No active student profile', 404)

  const body = (await req.json().catch(() => null)) as { taskId?: unknown; status?: unknown; uploadedFileId?: unknown } | null
  const taskId = typeof body?.taskId === 'string' ? body.taskId : null
  const status = typeof body?.status === 'string' && STATUSES.has(body.status as ScholarshipApplicationTaskStatus)
    ? body.status as ScholarshipApplicationTaskStatus
    : null
  const uploadedFileId = typeof body?.uploadedFileId === 'string' ? body.uploadedFileId : undefined

  if (!taskId || !status) return error('Missing taskId or valid status')

  const patch: Record<string, string | null> = {
    status,
    completed_at: status === 'done' ? new Date().toISOString() : null,
  }
  if (uploadedFileId !== undefined) patch.uploaded_file_id = uploadedFileId || null

  const { error: updateError } = await supabase
    .from('scholarship_application_tasks')
    .update(patch)
    .eq('id', taskId)
    .eq('student_profile_id', studentProfileId)

  if (updateError) return error(updateError.message)
  return NextResponse.json({ ok: true })
}
