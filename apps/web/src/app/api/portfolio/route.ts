import { NextResponse } from 'next/server'
import { createNextServerSupabaseClient, computePortfolioSummary } from '@mysryear/shared'
import { getActiveStudentProfileId } from '@/lib/student-profile'

const TABLES = {
  activities: 'student_activities',
  serviceHours: 'student_service_hours',
  achievements: 'student_achievements',
  certifications: 'student_certifications',
} as const

type Kind = keyof typeof TABLES

function error(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

function isKind(value: unknown): value is Kind {
  return typeof value === 'string' && value in TABLES
}

function cleanText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function cleanDate(value: unknown) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null
}

function payloadFor(kind: Kind, body: Record<string, unknown>, studentProfileId: string, userId: string) {
  const base = {
    student_profile_id: studentProfileId,
    created_by_user_id: userId,
    category: cleanText(body.category),
    description: cleanText(body.description),
    uploaded_file_id: cleanText(body.uploaded_file_id),
  }

  if (kind === 'activities') {
    return {
      ...base,
      title: cleanText(body.title),
      organization: cleanText(body.organization),
      role: cleanText(body.role),
      start_date: cleanDate(body.start_date),
      end_date: cleanDate(body.end_date),
    }
  }

  if (kind === 'serviceHours') {
    return {
      ...base,
      title: cleanText(body.title),
      organization: cleanText(body.organization),
      service_date: cleanDate(body.service_date),
      hours: Number(body.hours || 0),
      supervisor_contact: cleanText(body.supervisor_contact),
    }
  }

  if (kind === 'achievements') {
    return {
      ...base,
      title: cleanText(body.title),
      organization: cleanText(body.organization),
      earned_date: cleanDate(body.earned_date),
    }
  }

  return {
    ...base,
    name: cleanText(body.name || body.title),
    provider: cleanText(body.provider || body.organization),
    status: ['planned', 'in_progress', 'completed'].includes(String(body.status)) ? String(body.status) : 'planned',
    earned_date: cleanDate(body.earned_date),
    expiration_date: cleanDate(body.expiration_date),
    credential_id: cleanText(body.credential_id),
  }
}

async function requireSession() {
  const supabase = await createNextServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return { supabase, session }
}

export async function GET() {
  const { supabase, session } = await requireSession()
  if (!session) return error('Not authenticated', 401)

  const studentProfileId = await getActiveStudentProfileId()
  if (!studentProfileId) {
    return NextResponse.json({
      ok: true,
      studentProfileId: null,
      activities: [],
      serviceHours: [],
      achievements: [],
      certifications: [],
      summary: computePortfolioSummary({ activitiesCount: 0, serviceHoursTotal: 0, achievementsCount: 0, certificationsCompleted: 0, proofDocumentsCount: 0 }),
    })
  }

  const [activities, serviceHours, achievements, certifications] = await Promise.all([
    supabase.from(TABLES.activities).select('*, uploaded_files(id,file_name,file_path,upload_context,created_at)').eq('student_profile_id', studentProfileId).order('created_at', { ascending: false }),
    supabase.from(TABLES.serviceHours).select('*, uploaded_files(id,file_name,file_path,upload_context,created_at)').eq('student_profile_id', studentProfileId).order('created_at', { ascending: false }),
    supabase.from(TABLES.achievements).select('*, uploaded_files(id,file_name,file_path,upload_context,created_at)').eq('student_profile_id', studentProfileId).order('created_at', { ascending: false }),
    supabase.from(TABLES.certifications).select('*, uploaded_files(id,file_name,file_path,upload_context,created_at)').eq('student_profile_id', studentProfileId).order('created_at', { ascending: false }),
  ])

  const firstError = activities.error || serviceHours.error || achievements.error || certifications.error
  if (firstError) return error(firstError.message)

  const serviceHoursTotal = (serviceHours.data || []).reduce((sum, row) => sum + Number(row.hours || 0), 0)
  const certificationsCompleted = (certifications.data || []).filter((row) => row.status === 'completed').length
  const proofDocumentsCount = [activities.data, serviceHours.data, achievements.data, certifications.data]
    .flatMap((rows) => rows || [])
    .filter((row) => Boolean(row.uploaded_file_id)).length

  return NextResponse.json({
    ok: true,
    studentProfileId,
    activities: activities.data || [],
    serviceHours: serviceHours.data || [],
    achievements: achievements.data || [],
    certifications: certifications.data || [],
    summary: computePortfolioSummary({
      activitiesCount: (activities.data || []).length,
      serviceHoursTotal,
      achievementsCount: (achievements.data || []).length,
      certificationsCompleted,
      proofDocumentsCount,
    }),
  })
}

export async function POST(req: Request) {
  const { supabase, session } = await requireSession()
  if (!session) return error('Not authenticated', 401)

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!body || !isKind(body.kind)) return error('Invalid portfolio kind')

  const studentProfileId = await getActiveStudentProfileId()
  if (!studentProfileId) return error('No active student profile', 404)

  const payload = payloadFor(body.kind, body, studentProfileId, session.user.id)
  if (!('title' in payload ? payload.title : payload.name)) return error('Missing title/name')
  if (body.kind === 'serviceHours' && Number((payload as { hours?: number }).hours || 0) < 0) return error('Hours cannot be negative')

  const { data, error: insertError } = await supabase.from(TABLES[body.kind]).insert(payload).select('*').single()
  if (insertError) return error(insertError.message)
  return NextResponse.json({ ok: true, item: data })
}

export async function PATCH(req: Request) {
  const { supabase, session } = await requireSession()
  if (!session) return error('Not authenticated', 401)

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!body || !isKind(body.kind)) return error('Invalid portfolio kind')
  const id = cleanText(body.id)
  if (!id) return error('Missing id')

  const studentProfileId = await getActiveStudentProfileId()
  if (!studentProfileId) return error('No active student profile', 404)

  const payload = payloadFor(body.kind, body, studentProfileId, session.user.id)
  const { data, error: updateError } = await supabase
    .from(TABLES[body.kind])
    .update(payload)
    .eq('id', id)
    .eq('student_profile_id', studentProfileId)
    .select('*')
    .single()
  if (updateError) return error(updateError.message)
  return NextResponse.json({ ok: true, item: data })
}

export async function DELETE(req: Request) {
  const { supabase, session } = await requireSession()
  if (!session) return error('Not authenticated', 401)

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!body || !isKind(body.kind)) return error('Invalid portfolio kind')
  const id = cleanText(body.id)
  if (!id) return error('Missing id')

  const studentProfileId = await getActiveStudentProfileId()
  if (!studentProfileId) return error('No active student profile', 404)

  const { error: deleteError } = await supabase
    .from(TABLES[body.kind])
    .delete()
    .eq('id', id)
    .eq('student_profile_id', studentProfileId)
  if (deleteError) return error(deleteError.message)
  return NextResponse.json({ ok: true })
}
