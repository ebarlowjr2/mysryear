import { NextResponse } from 'next/server'
import { createNextServerSupabaseClient } from '@mysryear/shared'
import { getActiveStudentProfileId } from '@/lib/student-profile'

const STATUSES = new Set(['saved', 'interested', 'applied', 'accepted', 'declined', 'completed'])

function error(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

function cleanText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export async function GET() {
  const supabase = await createNextServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return error('Not authenticated', 401)

  const studentProfileId = await getActiveStudentProfileId()
  if (!studentProfileId) return NextResponse.json({ ok: true, interests: [] })

  const { data, error: listError } = await supabase
    .from('student_opportunity_interests')
    .select('id,opportunity_id,status,notes,created_at')
    .eq('student_profile_id', studentProfileId)
    .order('created_at', { ascending: false })

  if (listError) return error(listError.message)
  return NextResponse.json({ ok: true, interests: data || [] })
}

export async function POST(req: Request) {
  const supabase = await createNextServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return error('Not authenticated', 401)

  const studentProfileId = await getActiveStudentProfileId()
  if (!studentProfileId) return error('No active student profile', 404)

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return error('Invalid JSON')
  const opportunityId = cleanText(body.opportunityId)
  if (!opportunityId) return error('Missing opportunity id')
  const status = cleanText(body.status) || 'saved'

  const { data, error: upsertError } = await supabase
    .from('student_opportunity_interests')
    .upsert({
      student_profile_id: studentProfileId,
      opportunity_id: opportunityId,
      status: STATUSES.has(status) ? status : 'saved',
      notes: cleanText(body.notes),
    }, { onConflict: 'student_profile_id,opportunity_id' })
    .select('*')
    .single()

  if (upsertError) return error(upsertError.message)
  return NextResponse.json({ ok: true, interest: data })
}
