import { NextResponse } from 'next/server'
import { createNextServerSupabaseClient } from '@mysryear/shared'
import { getActiveStudentProfileId } from '@/lib/student-profile'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

export async function GET() {
  const supabase = await createNextServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) return jsonError('Not authenticated', 401)

  const studentProfileId = await getActiveStudentProfileId()
  if (!studentProfileId) return jsonError('No active student profile', 400)

  const { data, error } = await supabase
    .from('student_career_interests')
    .select('career_id,rank')
    .eq('student_profile_id', studentProfileId)
    .order('rank', { ascending: true, nullsFirst: false })

  if (error) return jsonError(error.message, 400)

  const careerIds = (data || [])
    .map((r) => r.career_id as string)
    .filter((id) => typeof id === 'string' && id.length > 0)

  return NextResponse.json({ ok: true, studentProfileId, careerIds })
}

export async function PUT(req: Request) {
  const supabase = await createNextServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) return jsonError('Not authenticated', 401)

  const studentProfileId = await getActiveStudentProfileId()
  if (!studentProfileId) return jsonError('No active student profile', 400)

  let payload: { careerIds?: unknown } | null = null
  try {
    payload = (await req.json()) as { careerIds?: unknown }
  } catch {
    payload = null
  }

  const raw = payload?.careerIds
  if (!Array.isArray(raw)) return jsonError('careerIds must be an array', 400)

  const careerIds = raw.filter((x): x is string => typeof x === 'string').slice(0, 5)

  const { error: deleteError } = await supabase
    .from('student_career_interests')
    .delete()
    .eq('student_profile_id', studentProfileId)

  if (deleteError) return jsonError(deleteError.message, 400)

  if (careerIds.length === 0) {
    return NextResponse.json({ ok: true, studentProfileId, careerIds: [] })
  }

  const { error: insertError } = await supabase.from('student_career_interests').insert(
    careerIds.map((careerId, idx) => ({
      student_profile_id: studentProfileId,
      career_id: careerId,
      rank: idx + 1,
      created_by_user_id: session.user.id,
    })),
  )

  if (insertError) return jsonError(insertError.message, 400)

  return NextResponse.json({ ok: true, studentProfileId, careerIds })
}

export async function DELETE() {
  const supabase = await createNextServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) return jsonError('Not authenticated', 401)

  const studentProfileId = await getActiveStudentProfileId()
  if (!studentProfileId) return jsonError('No active student profile', 400)

  const { error } = await supabase
    .from('student_career_interests')
    .delete()
    .eq('student_profile_id', studentProfileId)

  if (error) return jsonError(error.message, 400)

  return NextResponse.json({ ok: true })
}

