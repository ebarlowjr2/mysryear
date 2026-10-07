'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import CopyTextButton from '@/components/CopyTextButton'

type School = { id: string; name: string; city: string | null; state: string | null }
type StudentProfile = {
  id: string
  first_name: string | null
  last_name: string | null
  graduation_year: number | null
  school_id?: string | null
  schools?: { name: string | null } | null
}
type RelationshipRow = { role: string; student_profile_id: string; created_at?: string }
type PendingInvite = {
  id: string
  student_profile_id: string
  invited_email: string | null
  relationship_role: string
  invite_type?: string | null
  status: string
  created_at: string
  expires_at?: string | null
}

function studentName(student: StudentProfile | null) {
  if (!student) return 'Student'
  return [student.first_name, student.last_name].filter(Boolean).join(' ') || 'Student'
}

export default function ActiveStudentConnectionCard({
  activeStudentProfileId,
  activeStudentProfile,
  linkedStudentProfiles,
  relationships,
  pendingInvites,
  schools,
  viewerRole,
}: {
  activeStudentProfileId: string | null
  activeStudentProfile: StudentProfile | null
  linkedStudentProfiles: StudentProfile[]
  relationships: RelationshipRow[]
  pendingInvites: PendingInvite[]
  schools: School[]
  viewerRole: 'parent' | 'guardian' | string | null
}) {
  const router = useRouter()
  const [mode, setMode] = useState<'link' | 'create' | null>(linkedStudentProfiles.length === 0 ? 'link' : null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [requestStudentProfileId, setRequestStudentProfileId] = useState('')
  const [requestStudentEmail, setRequestStudentEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [graduationYear, setGraduationYear] = useState('')
  const [schoolQuery, setSchoolQuery] = useState('')
  const [schoolId, setSchoolId] = useState<string | null>(null)
  const [addSchoolLater, setAddSchoolLater] = useState(true)
  const [claimEmail, setClaimEmail] = useState('')

  const relationship = relationships.find((rel) => rel.student_profile_id === activeStudentProfileId)
  const filteredSchools = useMemo(() => {
    const q = schoolQuery.trim().toLowerCase()
    if (!q) return schools.slice(0, 20)
    return schools.filter((school) => school.name.toLowerCase().includes(q)).slice(0, 20)
  }, [schoolQuery, schools])

  async function refreshWithMessage(nextMessage: string) {
    setMessage(nextMessage)
    router.refresh()
  }

  async function setActive(studentProfileId: string) {
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch('/api/profile/active-student-profile', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ studentProfileId }),
      })
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null
      if (!res.ok || !json?.ok) {
        setError(json?.error || 'Could not switch active student')
        return
      }
      await refreshWithMessage('Active student switched.')
    } finally {
      setSaving(false)
    }
  }

  async function requestAccess() {
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch('/api/profile/invites', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          studentProfileId: requestStudentProfileId.trim(),
          invitedEmail: requestStudentEmail.trim(),
          relationshipRole: viewerRole === 'guardian' ? 'guardian' : 'parent',
          inviteType: 'access_request',
        }),
      })
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null
      if (!res.ok || !json?.ok) {
        setError(json?.error || 'Could not send access request')
        return
      }
      setRequestStudentProfileId('')
      setRequestStudentEmail('')
      await refreshWithMessage('Access request sent. It will not grant access until the student approves it.')
    } finally {
      setSaving(false)
    }
  }

  async function createManagedStudent() {
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch('/api/profile/managed-student', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          schoolId: addSchoolLater ? null : schoolId,
          graduationYear: graduationYear.trim() ? Number(graduationYear) : null,
          relationshipRole: viewerRole === 'guardian' ? 'guardian' : 'parent',
          inviteStudentEmail: claimEmail.trim() || null,
        }),
      })
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null
      if (!res.ok || !json?.ok) {
        setError(json?.error || 'Could not create student profile')
        return
      }
      setFirstName('')
      setLastName('')
      setGraduationYear('')
      setClaimEmail('')
      setSchoolId(null)
      setSchoolQuery('')
      setAddSchoolLater(true)
      setMode(null)
      await refreshWithMessage('Student profile created and selected.')
    } finally {
      setSaving(false)
    }
  }

  async function sendClaimInvite() {
    if (!activeStudentProfileId) return
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch('/api/profile/invites', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          studentProfileId: activeStudentProfileId,
          invitedEmail: claimEmail.trim(),
          relationshipRole: 'student',
          inviteType: 'student_claim',
        }),
      })
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null
      if (!res.ok || !json?.ok) {
        setError(json?.error || 'Could not send claim invite')
        return
      }
      setClaimEmail('')
      await refreshWithMessage('Student claim invite sent.')
    } finally {
      setSaving(false)
    }
  }


  async function removeMyConnection() {
    if (!activeStudentProfileId) return
    const confirmed = window.confirm('Remove your connection to this student? You will lose access until a new invitation is accepted.')
    if (!confirmed) return
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch('/api/profile/relationships', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ studentProfileId: activeStudentProfileId }),
      })
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null
      if (!res.ok || !json?.ok) {
        setError(json?.error || 'Could not remove connection')
        return
      }
      await refreshWithMessage('Connection removed.')
    } finally {
      setSaving(false)
    }
  }

  async function revokeInvite(inviteId: string) {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/profile/invites', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ inviteId, action: 'revoke' }),
      })
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null
      if (!res.ok || !json?.ok) {
        setError(json?.error || 'Could not revoke invite')
        return
      }
      await refreshWithMessage('Invitation revoked.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card p-6 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="badge">Active Student Profile</div>
          <h2 className="mt-3 text-2xl font-black tracking-tight">
            {activeStudentProfile ? studentName(activeStudentProfile) : 'No student connected yet'}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-700">
            {activeStudentProfile
              ? 'This student controls the dashboard, LifePath, uploads, Parent Action Center, and family planning context.'
              : 'You can enter the family dashboard now. Link an existing student or create a managed profile when you are ready.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={() => setMode('link')}>Link Existing Student</button>
          <button type="button" className="btn-primary" onClick={() => setMode('create')}>Create Student Profile</button>
        </div>
      </div>

      {message ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{message}</div> : null}
      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div> : null}

      {linkedStudentProfiles.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Switch active student</label>
            <select className="input w-full px-4 py-3 rounded-lg" value={activeStudentProfileId || ''} onChange={(e) => setActive(e.target.value)} disabled={saving}>
              {linkedStudentProfiles.map((student) => (
                <option key={student.id} value={student.id}>
                  {studentName(student)}{student.graduation_year ? ` — Class of ${student.graduation_year}` : ''}{student.schools?.name ? ` • ${student.schools.name}` : ''}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-slate-600">Pending invitations do not appear here until accepted.</p>
          </div>
          {activeStudentProfile ? <CopyTextButton text={activeStudentProfile.id} label="Copy Student ID" /> : null}
        </div>
      ) : null}

      {activeStudentProfile ? (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Student</div>
            <div className="mt-1 font-black text-slate-950">{studentName(activeStudentProfile)}</div>
            <div className="mt-2 text-sm text-slate-700">Class of {activeStudentProfile.graduation_year || '—'}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">School</div>
            <div className="mt-1 font-black text-slate-950">{activeStudentProfile.schools?.name || 'Add later'}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Connection</div>
            <div className="mt-1 font-black text-slate-950">{relationship?.role || viewerRole || 'supporter'}</div>
            <div className="mt-2 text-sm text-emerald-700">Accepted relationship</div>
            {relationship?.role === 'parent' || relationship?.role === 'guardian' ? (
              <button type="button" className="mt-3 text-sm font-bold text-red-700 hover:text-red-800" disabled={saving} onClick={removeMyConnection}>
                Remove my connection
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {pendingInvites.length > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="font-black text-amber-950">Pending invitations</div>
          <div className="mt-3 space-y-2">
            {pendingInvites.map((invite) => (
              <div key={invite.id} className="flex flex-col gap-2 rounded-xl bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-slate-700">
                  <span className="font-bold text-slate-950">{invite.invite_type === 'student_claim' ? 'Student claim' : invite.invite_type === 'access_request' ? 'Access request' : 'Supporter invite'}</span>{' '}
                  to {invite.invited_email || 'recipient'} • {invite.relationship_role}
                  {invite.expires_at ? ` • expires ${new Date(invite.expires_at).toLocaleDateString()}` : ''}
                </div>
                <button type="button" className="btn-secondary" disabled={saving} onClick={() => revokeInvite(invite.id)}>Revoke</button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {mode === 'link' ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="font-black">Link existing student</div>
          <p className="mt-1 text-sm text-slate-700">Enter the student email and profile ID they share with you. Access begins only after the student accepts.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input className="input px-4 py-3 rounded-lg" value={requestStudentEmail} onChange={(e) => setRequestStudentEmail(e.target.value)} placeholder="student@example.com" />
            <input className="input px-4 py-3 rounded-lg" value={requestStudentProfileId} onChange={(e) => setRequestStudentProfileId(e.target.value)} placeholder="student_profile_id" />
          </div>
          <div className="mt-4 flex gap-3">
            <button type="button" className="btn-primary" disabled={saving || !requestStudentEmail.trim() || !requestStudentProfileId.trim()} onClick={requestAccess}>Send Access Request</button>
            <button type="button" className="btn-secondary" onClick={() => setMode(null)}>Cancel</button>
          </div>
        </div>
      ) : null}

      {mode === 'create' ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="font-black">Create managed student profile</div>
          <p className="mt-1 text-sm text-slate-700">Use this when your student is not ready to create an account. They can claim this profile later.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input className="input px-4 py-3 rounded-lg" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Student first name" />
            <input className="input px-4 py-3 rounded-lg" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Student last name" />
            <input className="input px-4 py-3 rounded-lg" value={graduationYear} onChange={(e) => setGraduationYear(e.target.value)} placeholder="Expected graduation year" inputMode="numeric" />
            <input className="input px-4 py-3 rounded-lg" value={claimEmail} onChange={(e) => setClaimEmail(e.target.value)} placeholder="Student email for claim invite (optional)" />
          </div>
          <div className="mt-4">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={addSchoolLater} onChange={(e) => { setAddSchoolLater(e.target.checked); if (e.target.checked) { setSchoolId(null); setSchoolQuery('') } }} />
              Add school later
            </label>
            {!addSchoolLater ? (
              <div className="mt-3">
                <input className="input w-full px-4 py-3 rounded-lg" value={schoolQuery} onChange={(e) => { setSchoolQuery(e.target.value); setSchoolId(null) }} placeholder="Search high school" />
                <div className="mt-2 max-h-40 overflow-auto rounded-xl border border-slate-200 bg-white">
                  {filteredSchools.map((school) => (
                    <button key={school.id} type="button" className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${schoolId === school.id ? 'bg-slate-50' : ''}`} onClick={() => { setSchoolId(school.id); setSchoolQuery(`${school.name}${school.city ? `, ${school.city}` : ''}${school.state ? `, ${school.state}` : ''}`) }}>
                      <div className="font-bold text-slate-950">{school.name}</div>
                      <div className="text-xs text-slate-600">{[school.city, school.state].filter(Boolean).join(', ')}</div>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <div className="mt-4 flex gap-3">
            <button type="button" className="btn-primary" disabled={saving || !firstName.trim() || !lastName.trim()} onClick={createManagedStudent}>Create Profile</button>
            <button type="button" className="btn-secondary" onClick={() => setMode(null)}>Cancel</button>
          </div>
        </div>
      ) : null}

      {activeStudentProfile ? (
        <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4">
          <div className="font-black text-brand-950">Invite student to claim this profile</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
            <input className="input px-4 py-3 rounded-lg" value={claimEmail} onChange={(e) => setClaimEmail(e.target.value)} placeholder="student@example.com" />
            <button type="button" className="btn-secondary" disabled={saving || !claimEmail.trim()} onClick={sendClaimInvite}>Send Claim Invite</button>
          </div>
          <p className="mt-2 text-xs text-slate-600">Claiming attaches the student login to this profile without duplicating it.</p>
        </div>
      ) : null}
    </div>
  )
}