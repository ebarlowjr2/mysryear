import { parseReportCard } from '@mysryear/shared'
import {
  gradesSession,
  gradesError,
  GradesError,
  requireGradeAccess,
  validatePhoto,
  UUID,
} from '@/lib/grades/access'

export async function GET(request: Request) {
  try {
    const { db, user, profile } = await gradesSession(request)
    const relationships = await db
      .from('family_relationships')
      .select('student_profile_id')
      .eq('user_id', user.id)
      .eq('role', 'parent')
    if (relationships.error) throw new GradesError('Unable to load connected students.', 503)
    let query = db
      .from('student_profiles')
      .select('id,first_name,last_name,grade_level,graduation_year')
    query =
      profile.role === 'student'
        ? query.eq('student_user_id', user.id)
        : query.in(
            'id',
            (relationships.data || []).map((r) => r.student_profile_id),
          )
    const result = await query.order('created_at')
    if (result.error) throw new GradesError('Unable to load connected students.', 503)
    const students = result.data || []
    const requested = new URL(request.url).searchParams.get('student')
    const active =
      requested ||
      (students.some((s) => s.id === profile.active_student_profile_id)
        ? profile.active_student_profile_id
        : students[0]?.id) ||
      null
    let records: unknown[] = []
    if (active) {
      await requireGradeAccess(db, active)
      const result = await db
        .from('student_report_cards')
        .select('id,student_profile_id,data,created_at,reviewed_at,source_path')
        .eq('student_profile_id', active)
        .order('created_at', { ascending: false })
        .limit(100)
      if (result.error)
        throw new GradesError(
          'Digital report cards are not available yet. Please try again later.',
          503,
        )
      records = result.data || []
    }
    return Response.json(
      {
        students,
        activeStudentId: active,
        records,
        analysisAvailable: Boolean(
          process.env.OPENAI_API_KEY && process.env.REPORT_CARD_ANALYSIS_MODEL,
        ),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    return gradesError(error)
  }
}

export async function PATCH(request: Request) {
  try {
    const { db, user } = await gradesSession(request)
    const body = await request.json()
    await requireGradeAccess(db, body.studentId)
    const { error } = await db
      .from('profiles')
      .update({ active_student_profile_id: body.studentId })
      .eq('id', user.id)
    if (error) throw new GradesError('Unable to switch students.', 503)
    return Response.json({ ok: true })
  } catch (error) {
    return gradesError(error)
  }
}

export async function POST(request: Request) {
  try {
    const { db, user } = await gradesSession(request)
    if (Number(request.headers.get('content-length')) > 4 * 1024 * 1024)
      throw new GradesError('Photo is too large.', 413)
    const form = await request.formData()
    const studentId = String(form.get('studentId') || '')
    const id = String(form.get('id') || '')
    await requireGradeAccess(db, studentId)
    if (!UUID.test(id) || form.get('reviewed') !== 'true')
      throw new GradesError('Review and confirm the report card first.')
    let data
    try {
      data = parseReportCard(JSON.parse(String(form.get('data'))), true)
    } catch (error) {
      throw new GradesError(error instanceof Error ? error.message : 'Invalid report card.')
    }
    // Retry after a lost response returns the saved record without re-uploading the source.
    const existing = await db
      .from('student_report_cards')
      .select('id,created_by_user_id,student_profile_id')
      .eq('id', id)
      .maybeSingle()
    if (existing.error) throw new GradesError('Grades setup is not available yet.', 503)
    if (existing.data) {
      if (
        existing.data.created_by_user_id !== user.id ||
        existing.data.student_profile_id !== studentId
      )
        throw new GradesError('Invalid report ID.', 403)
      return Response.json({ id, ok: true })
    }
    let sourcePath: string | null = null
    const file = form.get('photo')
    if (file instanceof File && file.size) {
      const photo = await validatePhoto(file)
      sourcePath = `${studentId}/${user.id}/${id}.${photo.extension}`
      const uploaded = await db.storage
        .from('report-card-sources')
        .upload(sourcePath, photo.bytes, { contentType: photo.type, upsert: false })
      // An immutable source may exist from an interrupted prior save; the RPC checks ownership.
      if (uploaded.error && !/already exists|duplicate/i.test(uploaded.error.message))
        throw new GradesError(
          'Could not save the source photo. Your grades have not been saved.',
          503,
        )
    }
    const saved = await db.rpc('save_student_report_card', {
      p_id: id,
      p_student_id: studentId,
      p_data: data,
      p_source_path: sourcePath,
    })
    if (saved.error) {
      // Storage policy permits removing only an unreferenced source owned by this caller.
      // If a save completed but its response was lost, the saved source stays protected.
      if (sourcePath) await db.storage.from('report-card-sources').remove([sourcePath])
      throw new GradesError(
        'Could not save the report card. Check your student access and try again.',
        400,
      )
    }
    return Response.json({ id: saved.data, ok: true })
  } catch (error) {
    return gradesError(error)
  }
}
