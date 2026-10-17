import {
  gradesSession,
  gradesError,
  GradesError,
  requireGradeAccess,
  UUID,
} from '@/lib/grades/access'
export async function GET(request: Request) {
  try {
    const { db } = await gradesSession(request)
    const id = new URL(request.url).searchParams.get('id') || ''
    if (!UUID.test(id)) throw new GradesError('Invalid report card.')
    const { data, error } = await db
      .from('student_report_cards')
      .select('source_path,student_profile_id')
      .eq('id', id)
      .maybeSingle()
    if (error || !data?.source_path) throw new GradesError('Source photo is unavailable.', 404)
    await requireGradeAccess(db, data.student_profile_id)
    const source = await db.storage.from('report-card-sources').download(data.source_path)
    if (source.error || !source.data) throw new GradesError('Source photo is unavailable.', 404)
    return new Response(source.data, {
      headers: {
        'Content-Type': source.data.type,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Disposition': 'inline; filename="report-card.jpg"',
      },
    })
  } catch (error) {
    return gradesError(error)
  }
}
