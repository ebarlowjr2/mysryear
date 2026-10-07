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
        relationshipRole?: 'parent' | 'guardian' | 'counselor' | 'student'
        inviteType?: 'supporter_invite' | 'access_request' | 'student_claim'
      }
    | null
  if (!body) return jsonError('Invalid JSON')

  const studentProfileId = body.studentProfileId
  const invitedEmail = (body.invitedEmail || '').trim().toLowerCase()
  const relationshipRole = body.relationshipRole
  const inviteType = body.inviteType || (relationshipRole === 'student' ? 'student_claim' : 'supporter_invite')

  if (!studentProfileId) return jsonError('Missing studentProfileId')
  if (!invitedEmail) return jsonError('Missing invitedEmail')
  if (!relationshipRole) return jsonError('Missing relationshipRole')

  const { data: existingPending } = await supabase
    .from('student_profile_relationship_invites')
    .select('id')
    .eq('student_profile_id', studentProfileId)
    .eq('invited_email', invitedEmail)
    .eq('relationship_role', relationshipRole)
    .eq('status', 'pending')
    .limit(1)
    .maybeSingle()
  if (existingPending?.id) {
    return NextResponse.json({ ok: true, invite: existingPending, duplicate: true })
  }

  if (relationshipRole === 'student') {
    const { data: inviteId, error: rpcError } = await supabase.rpc('create_student_claim_invite', {
      p_student_profile_id: studentProfileId,
      p_invited_email: invitedEmail,
      p_expires_days: 14,
    })
    if (rpcError) return jsonError(rpcError.message)
    return NextResponse.json({ ok: true, invite: { id: inviteId, student_profile_id: studentProfileId, invited_email: invitedEmail, relationship_role: 'student', invite_type: 'student_claim', status: 'pending' } })
  }

  const { data, error } = await supabase
    .from('student_profile_relationship_invites')
    .insert({
      student_profile_id: studentProfileId,
      invited_email: invitedEmail,
      relationship_role: relationshipRole,
      invite_type: inviteType,
      status: 'pending',
      expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      created_by_user_id: session.user.id,
    })
    .select('*')
    .single()

  // Some environments may not yet have the `invite_type` column applied (Supabase schema cache / migration lag).
  // Retry without the column so the core invite flow still works.
  if (error && /invite_type.*schema cache|column .*invite_type.* does not exist/i.test(error.message)) {
    const { data: data2, error: error2 } = await supabase
      .from('student_profile_relationship_invites')
      .insert({
        student_profile_id: studentProfileId,
        invited_email: invitedEmail,
        relationship_role: relationshipRole,
        status: 'pending',
        expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        created_by_user_id: session.user.id,
      })
      .select('*')
      .single()
    if (error2) return jsonError(error2.message)
    return NextResponse.json({ ok: true, invite: data2 })
  }

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
        action?: 'accept' | 'decline' | 'revoke'
      }
    | null
  if (!body) return jsonError('Invalid JSON')

  const inviteId = body.inviteId
  const action = body.action
  if (!inviteId) return jsonError('Missing inviteId')
  if (!action) return jsonError('Missing action')

  if (action === 'revoke') {
    const { data: invite, error: revokeError } = await supabase
      .from('student_profile_relationship_invites')
      .update({ status: 'revoked', revoked_at: new Date().toISOString() })
      .eq('id', inviteId)
      .eq('status', 'pending')
      .select('*')
      .single()
    if (revokeError) return jsonError(revokeError.message)
    return NextResponse.json({ ok: true, invite })
  }

  const nextStatus = action === 'accept' ? 'accepted' : 'declined'

  if (action === 'accept') {
    // If this is a student-claim invite (parent-led onboarding), accept via RPC
    // so the student can attach to the student_profiles row even when RLS would block updates.
    const { data: inviteForType, error: inviteReadErr } = await supabase
      .from('student_profile_relationship_invites')
      .select('id,relationship_role,invite_type')
      .eq('id', inviteId)
      .single()
    if (inviteReadErr) {
      // Back-compat: older envs without invite_type column.
      if (/invite_type.*schema cache|column .*invite_type.* does not exist/i.test(inviteReadErr.message)) {
        const { data: inviteForType2, error: inviteReadErr2 } = await supabase
          .from('student_profile_relationship_invites')
          .select('id,relationship_role')
          .eq('id', inviteId)
          .single()
        if (inviteReadErr2) return jsonError(inviteReadErr2.message)

        if (inviteForType2.relationship_role === 'student') {
          const { error: rpcErr } = await supabase.rpc('accept_student_claim_invite', {
            p_invite_id: inviteId,
          })
          if (rpcErr) return jsonError(rpcErr.message)

          const { data: invite, error: reloadErr } = await supabase
            .from('student_profile_relationship_invites')
            .select('*')
            .eq('id', inviteId)
            .single()
          if (reloadErr) return jsonError(reloadErr.message)
          return NextResponse.json({ ok: true, invite })
        }
      } else {
        return jsonError(inviteReadErr.message)
      }
    }

    if (!inviteForType) return jsonError('Invite not found')

    if (inviteForType.relationship_role === 'student') {
      const { error: rpcErr } = await supabase.rpc('accept_student_claim_invite', {
        p_invite_id: inviteId,
      })
      if (rpcErr) return jsonError(rpcErr.message)

      // Return the updated invite row for UI refresh.
      const { data: invite, error: reloadErr } = await supabase
        .from('student_profile_relationship_invites')
        .select('*')
        .eq('id', inviteId)
        .single()
      if (reloadErr) return jsonError(reloadErr.message)
      return NextResponse.json({ ok: true, invite })
    }

    if (inviteForType.invite_type === 'access_request') {
      const { error: rpcErr } = await supabase.rpc('approve_access_request', {
        p_invite_id: inviteId,
      })
      if (rpcErr) return jsonError(rpcErr.message)

      const { data: invite, error: reloadErr } = await supabase
        .from('student_profile_relationship_invites')
        .select('*')
        .eq('id', inviteId)
        .single()
      if (reloadErr) return jsonError(reloadErr.message)
      return NextResponse.json({ ok: true, invite })
    }
  }

  // Default path: accept/decline supporter invites, then add family_relationships row on accept.
  const { data: candidate, error: candidateError } = await supabase
    .from('student_profile_relationship_invites')
    .select('id,status,expires_at,revoked_at')
    .eq('id', inviteId)
    .single()
  if (candidateError) return jsonError(candidateError.message)
  if (!candidate || candidate.status !== 'pending' || candidate.revoked_at) {
    return jsonError('Invite is not pending or has been revoked', 409)
  }
  if (candidate.expires_at && new Date(candidate.expires_at).getTime() <= Date.now()) {
    return jsonError('Invite has expired', 410)
  }

  const { data: invite, error: updateError } = await supabase
    .from('student_profile_relationship_invites')
    .update({
      status: nextStatus,
      invited_user_id: session.user.id,
      accepted_at: action === 'accept' ? new Date().toISOString() : null,
      declined_at: action === 'decline' ? new Date().toISOString() : null,
    })
    .eq('id', inviteId)
    .eq('status', 'pending')
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
