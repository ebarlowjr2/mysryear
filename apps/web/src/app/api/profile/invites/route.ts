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
        inviteType?: 'supporter_invite' | 'access_request'
      }
    | null
  if (!body) return jsonError('Invalid JSON')

  const studentProfileId = body.studentProfileId
  const invitedEmail = (body.invitedEmail || '').trim().toLowerCase()
  const relationshipRole = body.relationshipRole
  const inviteType = body.inviteType || 'supporter_invite'

  if (!studentProfileId) return jsonError('Missing studentProfileId')
  if (!invitedEmail) return jsonError('Missing invitedEmail')
  if (!relationshipRole) return jsonError('Missing relationshipRole')

  const { data, error } = await supabase
    .from('student_profile_relationship_invites')
    .insert({
      student_profile_id: studentProfileId,
      invited_email: invitedEmail,
      relationship_role: relationshipRole,
      invite_type: inviteType,
      status: 'pending',
      created_by_user_id: session.user.id,
    })
    .select('*')
    .single()

  // Some environments may not yet have the `invite_type` column applied (Supabase schema cache / migration lag).
  // Retry without the column so the core invite flow still works.
  if (error && /invite_type.*schema cache|column .*invite_type.* does not exist/i.test(error.message)) {
    // Access requests REQUIRE invite_type + the additional RLS policy. Without it, they will be blocked by RLS.
    if (inviteType === 'access_request') {
      return jsonError(
        "Access requests aren't enabled on this Supabase project yet. Run supabase/migrations/20260519133000_parent_access_requests.sql in the SQL Editor and then reload the API schema cache.",
        400,
      )
    }
    const { data: data2, error: error2 } = await supabase
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
    if (error2) return jsonError(error2.message)
    return NextResponse.json({ ok: true, invite: data2 })
  }

  if (error && inviteType === 'access_request' && /row-level security/i.test(error.message)) {
    return jsonError(
      "Access request was blocked by RLS. Confirm you've run supabase/migrations/20260519133000_parent_access_requests.sql and reloaded the Supabase API schema cache.",
      400,
    )
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
        action?: 'accept' | 'decline'
      }
    | null
  if (!body) return jsonError('Invalid JSON')

  const inviteId = body.inviteId
  const action = body.action
  if (!inviteId) return jsonError('Missing inviteId')
  if (!action) return jsonError('Missing action')

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
