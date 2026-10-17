import { createClient } from '@supabase/supabase-js'
import {
  canManageReportCards,
  createNextServerSupabaseClient,
  getSupabaseEnv,
} from '@mysryear/shared'

export class GradesError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message)
  }
}
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function gradesSession(request?: Request) {
  const bearer = request?.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]
  const env = bearer ? getSupabaseEnv() : null
  const db =
    bearer && env
      ? createClient(env.url, env.anonKey, {
          global: { headers: { Authorization: `Bearer ${bearer}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : await createNextServerSupabaseClient()
  const { data, error } = await db.auth.getUser()
  if (error || !data.user) throw new GradesError('Please sign in to view grades.', 401)
  const profile = await db
    .from('profiles')
    .select('role,active_student_profile_id')
    .eq('id', data.user.id)
    .single()
  if (profile.error) throw new GradesError('Unable to load your account.', 503)
  if (!canManageReportCards(profile.data.role))
    throw new GradesError('Grades are available to students and authorized parents.', 403)
  return { db, user: data.user, profile: profile.data }
}

export async function requireGradeAccess(
  db: Awaited<ReturnType<typeof gradesSession>>['db'],
  studentId: string,
) {
  if (!UUID.test(studentId)) throw new GradesError('Select a student profile.')
  const { data, error } = await db.rpc('can_manage_report_card', { p_student_id: studentId })
  if (error)
    throw new GradesError('Grades setup is not available yet. Please try again later.', 503)
  if (!data) throw new GradesError('You no longer have permission to manage this student.', 403)
}

export function gradesError(error: unknown) {
  return Response.json(
    {
      error:
        error instanceof GradesError
          ? error.message
          : 'Unable to complete this request. Please try again.',
    },
    {
      status: error instanceof GradesError ? error.status : 500,
      headers: { 'Cache-Control': 'no-store' },
    },
  )
}

export async function validatePhoto(file: File) {
  if (!file.size || file.size > 3 * 1024 * 1024)
    throw new GradesError('Choose a photo smaller than 3 MB.')
  const bytes = Buffer.from(await file.arrayBuffer())
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  const webp = bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP'
  const type = jpeg ? 'image/jpeg' : png ? 'image/png' : webp ? 'image/webp' : null
  if (!type || file.type !== type)
    throw new GradesError('Use a JPG, PNG, or WebP photo. For HEIC, choose a JPG export.')
  return { bytes, type, extension: jpeg ? 'jpg' : png ? 'png' : 'webp' }
}
