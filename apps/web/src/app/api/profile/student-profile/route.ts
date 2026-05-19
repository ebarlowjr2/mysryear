import { NextResponse } from 'next/server'
import { createNextServerSupabaseClient } from '@mysryear/shared'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

export async function PATCH(req: Request) {
  const supabase = await createNextServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return jsonError('Not authenticated', 401)

  const body = (await req.json().catch(() => null)) as
    | {
        studentProfileId?: string
        firstName?: string | null
        lastName?: string | null
        graduationYear?: number | null
        schoolId?: string | null
      }
    | null
  if (!body) return jsonError('Invalid JSON')

  const studentProfileId = body.studentProfileId
  if (!studentProfileId) return jsonError('Missing studentProfileId')

  const patch: Record<string, unknown> = {}
  if (body.firstName !== undefined) patch.first_name = body.firstName
  if (body.lastName !== undefined) patch.last_name = body.lastName
  if (body.graduationYear !== undefined) patch.graduation_year = body.graduationYear
  if (body.schoolId !== undefined) patch.school_id = body.schoolId

  if (Object.keys(patch).length === 0) return jsonError('No changes provided')

  const { data, error } = await supabase
    .from('student_profiles')
    .update(patch)
    .eq('id', studentProfileId)
    .select('id,first_name,last_name,graduation_year,school_id')
    .single()

  if (error) return jsonError(error.message)
  return NextResponse.json({ ok: true, studentProfile: data })
}

