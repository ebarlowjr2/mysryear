import {
  gradesSession,
  gradesError,
  GradesError,
  requireGradeAccess,
  validatePhoto,
} from '@/lib/grades/access'
import { extractReportCard } from '@/lib/grades/extract'
export const maxDuration = 60
export async function POST(request: Request) {
  try {
    const { db } = await gradesSession(request)
    if (Number(request.headers.get('content-length')) > 4 * 1024 * 1024)
      throw new GradesError('Photo is too large.', 413)
    const form = await request.formData()
    const studentId = String(form.get('studentId') || '')
    await requireGradeAccess(db, studentId)
    if (form.get('consent') !== 'true')
      throw new GradesError('Confirm permission to analyze this photo.')
    const file = form.get('photo')
    if (!(file instanceof File)) throw new GradesError('Choose a report-card photo.')
    const { bytes, type } = await validatePhoto(file)
    if (!process.env.OPENAI_API_KEY || !process.env.REPORT_CARD_ANALYSIS_MODEL)
      throw new GradesError(
        'Photo analysis is not configured yet. You can enter the grades manually.',
        503,
      )
    const limit = await db.rpc('reserve_report_card_analysis', { p_student_id: studentId })
    if (limit.error) throw new GradesError('Unable to start analysis. Please try again later.', 503)
    if (!limit.data)
      throw new GradesError(
        'You have reached the hourly photo-analysis limit. Please try later or enter grades manually.',
        429,
      )
    return Response.json(
      { data: await extractReportCard(bytes, type) },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    return gradesError(error)
  }
}
