import { NextResponse } from 'next/server'
import { createNextServerSupabaseClient } from '@mysryear/shared'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

function cleanText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export async function POST(req: Request) {
  const supabase = await createNextServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return jsonError('Not authenticated', 401)

  const body = (await req.json().catch(() => null)) as
    | {
        firstName?: string
        lastName?: string
        schoolId?: string | null
        graduationYear?: number | null
        relationshipRole?: 'parent' | 'guardian'
        inviteStudentEmail?: string | null
      }
    | null
  if (!body) return jsonError('Invalid JSON')

  const relationshipRole = body.relationshipRole === 'guardian' ? 'guardian' : 'parent'
  const { data: createdId, error: createError } = await supabase.rpc('create_managed_student_profile', {
    p_first_name: cleanText(body.firstName),
    p_last_name: cleanText(body.lastName),
    p_school_id: body.schoolId || null,
    p_graduation_year: body.graduationYear || null,
    p_relationship_role: relationshipRole,
  })
  if (createError) return jsonError(createError.message)

  const studentProfileId = String(createdId || '')
  const inviteEmail = cleanText(body.inviteStudentEmail)
  let inviteId: string | null = null
  if (studentProfileId && inviteEmail) {
    const { data: claimInviteId, error: inviteError } = await supabase.rpc('create_student_claim_invite', {
      p_student_profile_id: studentProfileId,
      p_invited_email: inviteEmail,
      p_expires_days: 14,
    })
    if (inviteError) return jsonError(inviteError.message)
    inviteId = claimInviteId ? String(claimInviteId) : null
  }

  return NextResponse.json({ ok: true, studentProfileId, inviteId })
}
