'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import FamilyLinkRequestForm from './FamilyLinkRequestForm'
import StudentFamilyLinkCodeCard from './StudentFamilyLinkCodeCard'

type InviteRow = {
  id: string
  student_profile_id: string
  invited_email: string | null
  relationship_role: 'parent' | 'guardian' | 'counselor' | 'student'
  invite_type?: 'supporter_invite' | 'access_request' | 'student_claim' | null
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'revoked'
  created_at: string
}

function formatRole(role: InviteRow['relationship_role']) {
  return role.charAt(0).toUpperCase() + role.slice(1)
}

function receivedInviteTitle(invite: InviteRow) {
  if (invite.invite_type === 'access_request') {
    return `${formatRole(invite.relationship_role)} connection request`
  }

  if (invite.invite_type === 'student_claim') {
    return 'Student profile claim invitation'
  }

  return `${formatRole(invite.relationship_role)} invitation`
}

export default function RelationshipInvites({
  activeStudentProfileId,
  invitesCreated,
  invitesReceived,
  viewerRole,
}: {
  activeStudentProfileId: string | null
  invitesCreated: InviteRow[]
  invitesReceived: InviteRow[]
  viewerRole: string | null
}) {
  const router = useRouter()
  const isStudent = viewerRole === 'student'
  const isFamily = viewerRole === 'parent' || viewerRole === 'guardian'
  const [email, setEmail] = useState('')
  const [relationshipRole, setRelationshipRole] = useState<'parent' | 'guardian' | 'counselor'>(
    'parent',
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const created = useMemo(() => invitesCreated || [], [invitesCreated])
  const received = useMemo(() => invitesReceived || [], [invitesReceived])

  async function createInvite() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/profile/invites', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          studentProfileId: activeStudentProfileId,
          invitedEmail: email,
          relationshipRole,
        }),
      })
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null
      if (!res.ok || !json?.ok) {
        setError(json?.error || 'Invite failed')
        return
      }
      setEmail('')
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  async function act(inviteId: string, action: 'accept' | 'decline') {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/profile/invites', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ inviteId, action }),
      })
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null
      if (!res.ok || !json?.ok) {
        setError(json?.error || 'Action failed')
        return
      }
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {isStudent ? (
        <div className="card p-4">
          <div className="text-sm font-black">Invite a supporter</div>
          <p className="mt-1 text-sm text-slate-700">
            Invite a parent, guardian, or counselor by email. They will see the invite after they
            create an account.
          </p>

          <div className="mt-4 grid items-end gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
              <input
                className="input w-full rounded-lg px-4 py-3"
                name="invite_supporter_email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="parent@example.com"
                autoComplete="email"
                disabled={saving}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Role</label>
              <select
                className="input w-full rounded-lg px-4 py-3"
                value={relationshipRole}
                onChange={(e) =>
                  setRelationshipRole(e.target.value as 'parent' | 'guardian' | 'counselor')
                }
                disabled={saving}
              >
                <option value="parent">Parent</option>
                <option value="guardian">Guardian</option>
                <option value="counselor">Counselor (read/support)</option>
              </select>
            </div>
          </div>

          {error ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-center text-sm text-red-600">
              {error}
            </div>
          ) : null}

          <div className="mt-4">
            <button
              type="button"
              className="btn-primary"
              disabled={!activeStudentProfileId || saving || !email.trim()}
              onClick={createInvite}
            >
              {saving ? 'Saving...' : 'Send invite'}
            </button>
          </div>
        </div>
      ) : null}

      {isFamily ? (
        <div className="card p-4">
          <div className="text-sm font-black">Connect to a student</div>
          <p className="mt-1 text-sm text-slate-700">
            Use a family link code or request access by email. The student must approve before your
            account can access their profile.
          </p>
          <div className="mt-4">
            <FamilyLinkRequestForm onSuccess={() => router.refresh()} />
          </div>
          <Link href="/dashboard/family" className="btn-secondary mt-4 inline-flex">
            Manage student profiles
          </Link>
        </div>
      ) : null}

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card p-4">
          <div className="text-sm font-black">Invites you sent</div>
          <div className="mt-3 space-y-2">
            {created.length === 0 ? (
              <div className="text-sm text-slate-600">No invites yet.</div>
            ) : (
              created.map((i) => (
                <div
                  key={i.id}
                  className="flex items-center justify-between gap-3 border border-slate-200 rounded-lg p-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{i.invited_email || '—'}</div>
                    <div className="text-xs text-slate-600">
                      {formatRole(i.relationship_role)} • {i.status}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card p-4">
          <div className="text-sm font-black">
            {isStudent ? 'Connection requests awaiting your approval' : 'Invites for you'}
          </div>
          {isStudent ? (
            <p className="mt-1 text-sm text-slate-700">
              Accept only a parent or guardian you know. They cannot access your profile unless you
              approve their request.
            </p>
          ) : null}
          <div className="mt-3 space-y-2">
            {received.length === 0 ? (
              <div className="text-sm text-slate-600">No invites yet.</div>
            ) : (
              received.map((i) => (
                <div
                  key={i.id}
                  className="flex items-center justify-between gap-3 border border-slate-200 rounded-lg p-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{receivedInviteTitle(i)}</div>
                    <div className="text-xs text-slate-600">
                      {isStudent && i.invite_type === 'access_request' && i.status === 'pending'
                        ? 'Awaiting your decision'
                        : i.status}
                    </div>
                  </div>
                  {i.status === 'pending' ? (
                    <div className="flex items-center gap-2">
                      <button
                        className="btn-secondary"
                        disabled={saving}
                        onClick={() => act(i.id, 'decline')}
                      >
                        Decline
                      </button>
                      <button
                        className="btn-primary"
                        disabled={saving}
                        onClick={() => act(i.id, 'accept')}
                      >
                        Accept
                      </button>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {isStudent ? <StudentFamilyLinkCodeCard /> : null}
    </div>
  )
}
