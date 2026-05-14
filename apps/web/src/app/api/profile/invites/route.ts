import { NextResponse } from 'next/server'
import { createNextServerSupabaseClient } from '@mysryear/shared'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

export async function POST(req: Request) {
  const supabase = await createNextServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return jsonError('Not authenticated', 401)

  const body = (await req.json().catch(() => null)) as
    | {
        studentProfileId?: string
        invitedEmail?: string
        relationshipRole?: 'parent' | 'guardian' | 'counselor'
      }
    | null
  if (!body) return jsonError('Invalid JSON')

  const studentProfileId = body.studentProfileId
  const invitedEmail = (body.invitedEmail || '').trim()
  const relationshipRole = body.relationshipRole

  if (!studentProfileId) return jsonError('Missing studentProfileId')
  if (!invitedEmail) return jsonError('Missing invitedEmail')
  if (!relationshipRole) return jsonError('Missing relationshipRole')

  const { data, error } = await supabase
    .from('student_profile_relationship_invites')
    .insert({
      student_profile_id: studentProfileId,
      invited_email: invitedEmail,
      relationship_role: relationshipRole,
      status: 'pending',
      created_by_user_id: session.user.id,
    })
    .select('*')
    .single()

  if (error) return jsonError(error.message)
  return NextResponse.json({ ok: true, invite: data })
}

export async function PATCH(req: Request) {
  const supabase = await createNextServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return jsonError('Not authenticated', 401)

  const body = (await req.json().catch(() => null)) as
    | {
        inviteId?: string
        action?: 'accept' | 'decline'
      }
    | null
  if (!body) return jsonError('Invalid JSON')

  const inviteId = body.inviteId
  const action = body.action
  if (!inviteId) return jsonError('Missing inviteId')
  if (!action) return jsonError('Missing action')

  const nextStatus = action === 'accept' ? 'accepted' : 'declined'

  const { data: invite, error: updateError } = await supabase
    .from('student_profile_relationship_invites')
    .update({ status: nextStatus, invited_user_id: session.user.id })
    .eq('id', inviteId)
    .select('*')
    .single()

  if (updateError) return jsonError(updateError.message)

  if (action === 'accept') {
    const { error: relError } = await supabase.from('family_relationships').insert({
      student_profile_id: invite.student_profile_id,
      user_id: session.user.id,
      role: invite.relationship_role,
    })
    if (relError && !/duplicate key/i.test(relError.message)) return jsonError(relError.message)
  }

  return NextResponse.json({ ok: true, invite })
}

