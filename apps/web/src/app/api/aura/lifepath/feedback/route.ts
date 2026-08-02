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

  const url = new URL(req.url)
  const careerId = cleanText(url.searchParams.get('careerId'))
  const studentProfileId = cleanText(url.searchParams.get('studentProfileId')) || (await getActiveStudentProfileId())
  if (!studentProfileId) return jsonError('No active student profile')

  let query = supabase
    .from('lifepath_feedback')
    .select('id,student_profile_id,career_id,author_user_id,author_role,note,created_at,updated_at')
    .eq('student_profile_id', studentProfileId)
    .order('created_at', { ascending: false })

  if (careerId) query = query.eq('career_id', careerId)

  const { data, error } = await query.limit(50)
  if (error) return jsonError(error.message)
  return NextResponse.json({ ok: true, feedback: data || [] })
}

export async function POST(req: Request) {
  const supabase = await createNextServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return jsonError('Not authenticated', 401)

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle()
  const role = cleanText(profile?.role)
  if (role !== 'parent' && role !== 'guardian' && role !== 'student') return jsonError('Only students and linked family can add LifePath feedback', 403)

  const body = (await req.json().catch(() => null)) as { studentProfileId?: unknown; careerId?: unknown; note?: unknown } | null
  const studentProfileId = cleanText(body?.studentProfileId) || (await getActiveStudentProfileId())
  const careerId = cleanText(body?.careerId)
  const note = cleanText(body?.note)

  if (!studentProfileId) return jsonError('No active student profile')
  if (!note) return jsonError('Note is required')

  const { data, error } = await supabase
    .from('lifepath_feedback')
    .insert({ student_profile_id: studentProfileId, career_id: careerId, author_user_id: session.user.id, author_role: role, note })
    .select('id,student_profile_id,career_id,author_user_id,author_role,note,created_at,updated_at')
    .single()

  if (error) return jsonError(error.message)
  return NextResponse.json({ ok: true, feedback: data })
}

export async function PATCH(req: Request) {
  const supabase = await createNextServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return jsonError('Not authenticated', 401)

  const body = (await req.json().catch(() => null)) as { id?: unknown; note?: unknown } | null
  const id = cleanText(body?.id)
  const note = cleanText(body?.note)
  if (!id || !note) return jsonError('id and note are required')

  const { data, error } = await supabase
    .from('lifepath_feedback')
    .update({ note, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('author_user_id', session.user.id)
    .select('id,student_profile_id,career_id,author_user_id,author_role,note,created_at,updated_at')
    .single()

  if (error) return jsonError(error.message)
  return NextResponse.json({ ok: true, feedback: data })
}

export async function DELETE(req: Request) {
  const supabase = await createNextServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return jsonError('Not authenticated', 401)

  const url = new URL(req.url)
  const id = cleanText(url.searchParams.get('id'))
  if (!id) return jsonError('id is required')

  const { error } = await supabase.from('lifepath_feedback').delete().eq('id', id).eq('author_user_id', session.user.id)
  if (error) return jsonError(error.message)
  return NextResponse.json({ ok: true })
}
