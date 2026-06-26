import { NextResponse } from 'next/server'
import { createNextServerSupabaseClient } from '@mysryear/shared'
import { getActiveStudentProfileId } from '@/lib/student-profile'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

function cleanText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export async function GET(req: Request) {
  const supabase = await createNextServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) return jsonError('Not authenticated', 401)

  const studentProfileId = await getActiveStudentProfileId()
  if (!studentProfileId) return jsonError('No active student profile', 400)

  const url = new URL(req.url)
  const careerId = cleanText(url.searchParams.get('careerId'))

  let query = supabase
    .from('lifepath_tasks')
    .select('*, uploaded_files(id,file_name,file_path,upload_context,created_at)')
    .eq('student_profile_id', studentProfileId)
    .order('created_at', { ascending: true })

  if (careerId) {
    query = query.or(`career_id.eq.${careerId},career_id.is.null`)
  }

  const { data, error } = await query
  if (error) return jsonError(error.message, 400)
  return NextResponse.json({ ok: true, tasks: data || [] })
}

export async function PATCH(req: Request) {
  const supabase = await createNextServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) return jsonError('Not authenticated', 401)

  const studentProfileId = await getActiveStudentProfileId()
  if (!studentProfileId) return jsonError('No active student profile', 400)

  const body = (await req.json().catch(() => null)) as { id?: unknown; status?: unknown; uploaded_file_id?: unknown } | null
  const id = cleanText(body?.id)
  const status = cleanText(body?.status)
  const uploadedFileId = cleanText(body?.uploaded_file_id)

  if (!id) return jsonError('Missing task id')
  if (status && !['todo', 'doing', 'done'].includes(status)) return jsonError('Invalid status')

  const patch: Record<string, string | null> = {}
  if (status) patch.status = status
  if (body && 'uploaded_file_id' in body) patch.uploaded_file_id = uploadedFileId
  if (!Object.keys(patch).length) return jsonError('No task updates provided')

  const { data, error } = await supabase
    .from('lifepath_tasks')
    .update(patch)
    .eq('id', id)
    .eq('student_profile_id', studentProfileId)
    .select('*, uploaded_files(id,file_name,file_path,upload_context,created_at)')
    .single()

  if (error) return jsonError(error.message, 400)
  return NextResponse.json({ ok: true, task: data })
}
