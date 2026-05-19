'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

type InviteRow = {
  id: string
  student_profile_id: string
  invited_email: string | null
  relationship_role: 'parent' | 'guardian' | 'counselor' | 'student'
  invite_type?: 'supporter_invite' | 'access_request' | null
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  created_at: string
}

export default function RelationshipInvites({
  activeStudentProfileId,
  invitesCreated,
  invitesReceived,
}: {
  activeStudentProfileId: string | null
  invitesCreated: InviteRow[]
  invitesReceived: InviteRow[]
}) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [relationshipRole, setRelationshipRole] = useState<'parent' | 'guardian' | 'counselor'>('parent')
  const [studentClaimEmail, setStudentClaimEmail] = useState('')
  const [requestStudentEmail, setRequestStudentEmail] = useState('')
  const [requestStudentProfileId, setRequestStudentProfileId] = useState('')
  const [requestRole, setRequestRole] = useState<'parent' | 'guardian'>('parent')
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

  async function createStudentClaimInvite() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/profile/invites', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          studentProfileId: activeStudentProfileId,
          invitedEmail: studentClaimEmail,
          relationshipRole: 'student',
        }),
      })
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null
      if (!res.ok || !json?.ok) {
        setError(json?.error || 'Invite failed')
        return
      }
      setStudentClaimEmail('')
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  async function createAccessRequest() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/profile/invites', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          studentProfileId: requestStudentProfileId,
          invitedEmail: requestStudentEmail,
          relationshipRole: requestRole,
          inviteType: 'access_request',
        }),
      })
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null
      if (!res.ok || !json?.ok) {
        setError(json?.error || 'Request failed')
        return
      }
      setRequestStudentEmail('')
      setRequestStudentProfileId('')
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
      <div className="card p-4">
        <div className="text-sm font-black">Invite a supporter</div>
        <p className="mt-1 text-sm text-slate-700">
          Invite a parent/guardian/counselor by email. They’ll see the invite after they create an account.
        </p>

        <div className="mt-4 grid sm:grid-cols-3 gap-3 items-end">
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
            <input
              className="input w-full px-4 py-3 rounded-lg"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="parent@example.com"
              disabled={saving}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Role</label>
            <select
              className="input w-full px-4 py-3 rounded-lg"
              value={relationshipRole}
              onChange={(e) => setRelationshipRole(e.target.value as 'parent' | 'guardian' | 'counselor')}
              disabled={saving}
            >
              <option value="parent">Parent</option>
              <option value="guardian">Guardian</option>
              <option value="counselor">Counselor (read/support)</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="mt-4 text-red-600 text-sm text-center p-3 rounded-lg bg-red-50 border border-red-200">
            {error}
          </div>
        )}

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

      <div className="card p-4">
        <div className="text-sm font-black">Invite student to claim this profile</div>
        <p className="mt-1 text-sm text-slate-700">
          For parent-led accounts: invite your student’s email so they can claim this student profile.
        </p>

        <div className="mt-4 grid sm:grid-cols-3 gap-3 items-end">
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Student email</label>
            <input
              className="input w-full px-4 py-3 rounded-lg"
              value={studentClaimEmail}
              onChange={(e) => setStudentClaimEmail(e.target.value)}
              placeholder="student@example.com"
              disabled={saving}
            />
          </div>
          <div className="sm:col-span-1">
            <button
              type="button"
              className="btn-secondary w-full"
              disabled={!activeStudentProfileId || saving || !studentClaimEmail.trim()}
              onClick={createStudentClaimInvite}
            >
              {saving ? 'Saving...' : 'Send claim invite'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card p-4">
          <div className="text-sm font-black">Invites you sent</div>
          <div className="mt-3 space-y-2">
            {created.length === 0 ? (
              <div className="text-sm text-slate-600">No invites yet.</div>
            ) : (
              created.map((i) => (
                <div key={i.id} className="flex items-center justify-between gap-3 border border-slate-200 rounded-lg p-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{i.invited_email || '—'}</div>
                    <div className="text-xs text-slate-600">
                      {i.relationship_role} • {i.status}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card p-4">
          <div className="text-sm font-black">Invites for you</div>
          <div className="mt-3 space-y-2">
            {received.length === 0 ? (
              <div className="text-sm text-slate-600">No invites yet.</div>
            ) : (
              received.map((i) => (
                <div key={i.id} className="flex items-center justify-between gap-3 border border-slate-200 rounded-lg p-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">
                      {i.invite_type === 'access_request' ? 'Access request' : 'Invite'}: {i.relationship_role}
                    </div>
                    <div className="text-xs text-slate-600">{i.status}</div>
                  </div>
                  {i.status === 'pending' ? (
                    <div className="flex items-center gap-2">
                      <button className="btn-secondary" disabled={saving} onClick={() => act(i.id, 'decline')}>
                        Decline
                      </button>
                      <button className="btn-primary" disabled={saving} onClick={() => act(i.id, 'accept')}>
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

      <div className="card p-4">
        <div className="text-sm font-black">Request access (parent/guardian)</div>
        <p className="mt-1 text-sm text-slate-700">
          If your student already has a profile, request access by entering the student’s email and the student profile ID. The student will approve or decline.
        </p>

        <div className="mt-4 grid sm:grid-cols-3 gap-3 items-end">
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Student email</label>
            <input
              className="input w-full px-4 py-3 rounded-lg"
              value={requestStudentEmail}
              onChange={(e) => setRequestStudentEmail(e.target.value)}
              placeholder="student@example.com"
              disabled={saving}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Your role</label>
            <select
              className="input w-full px-4 py-3 rounded-lg"
              value={requestRole}
              onChange={(e) => setRequestRole(e.target.value as 'parent' | 'guardian')}
              disabled={saving}
            >
              <option value="parent">Parent</option>
              <option value="guardian">Guardian</option>
            </select>
          </div>
        </div>

        <div className="mt-3">
          <label className="block text-sm font-semibold text-slate-700 mb-2">Student profile ID</label>
          <input
            className="input w-full px-4 py-3 rounded-lg"
            value={requestStudentProfileId}
            onChange={(e) => setRequestStudentProfileId(e.target.value)}
            placeholder="Paste the student_profile_id (UUID)"
            disabled={saving}
          />
          <p className="mt-2 text-xs text-slate-600">
            The student can find this on <span className="font-semibold">/profile</span> and share it with you.
          </p>
        </div>

        <div className="mt-4">
          <button
            type="button"
            className="btn-secondary"
            disabled={saving || !requestStudentEmail.trim() || !requestStudentProfileId.trim()}
            onClick={createAccessRequest}
          >
            {saving ? 'Saving...' : 'Send access request'}
          </button>
        </div>
      </div>
    </div>
  )
}
