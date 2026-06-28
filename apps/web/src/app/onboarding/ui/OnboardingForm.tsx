'use client'

import { USER_ROLES, type UserRole } from '@mysryear/shared'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type School = { id: string; name: string; city: string | null; state: string | null }

export default function OnboardingForm({
  defaultRole,
  schools,
}: {
  defaultRole: UserRole
  schools: School[]
}) {
  const router = useRouter()
  const [role, setRole] = useState<UserRole>(defaultRole)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [graduationYear, setGraduationYear] = useState<number | ''>('')
  const [schoolQuery, setSchoolQuery] = useState('')
  const [schoolId, setSchoolId] = useState<string | null>(null)
  const [organizationName, setOrganizationName] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [industry, setIndustry] = useState('')
  const [website, setWebsite] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filteredSchools = useMemo(() => {
    const q = schoolQuery.trim().toLowerCase()
    if (!q) return schools.slice(0, 50)
    return schools.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 50)
  }, [schoolQuery, schools])

  const needsStudentProfile = role === 'student' || role === 'parent' || role === 'guardian'
  const needsSchoolAndGradYear = role === 'student'
  const isBusiness = role === 'business'
  const canSubmit =
    !loading &&
    USER_ROLES.includes(role) &&
    (!needsStudentProfile || Boolean(graduationYear)) &&
    (!needsSchoolAndGradYear || Boolean(schoolId)) &&
    (!isBusiness || Boolean(organizationName.trim()))

  async function submit() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          role,
          studentProfile: needsStudentProfile
            ? {
                firstName: firstName || undefined,
                lastName: lastName || undefined,
                graduationYear: typeof graduationYear === 'number' ? graduationYear : undefined,
                schoolId,
              }
            : undefined,
          businessProfile: isBusiness
            ? {
                organizationName,
                contactName,
                contactEmail,
                industry,
                website,
              }
            : undefined,
        }),
      })

      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null
      if (!res.ok || !json?.ok) {
        setError(json?.error || 'Onboarding failed')
        return
      }

      router.push(role === 'business' ? '/business/dashboard' : '/dashboard')
      router.refresh()
    } catch {
      setError('Onboarding failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Account type</label>
          <select className="input w-full px-4 py-3 rounded-lg" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
            <option value="student">Student</option>
            <option value="parent">Parent</option>
            <option value="guardian">Guardian</option>
            <option value="counselor">Counselor</option>
            <option value="business">Business</option>
          </select>
          <p className="mt-2 text-xs text-slate-600">
            Businesses can post internships, volunteer roles, job shadowing, apprenticeships, and student programs.
          </p>
        </div>
      </div>

      {isBusiness ? (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block text-sm font-semibold text-slate-700">
              Organization name
              <input className="input mt-2 w-full px-4 py-3 rounded-lg" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} placeholder="Company or organization" required />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Industry
              <input className="input mt-2 w-full px-4 py-3 rounded-lg" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Technology, Healthcare..." />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Contact name
              <input className="input mt-2 w-full px-4 py-3 rounded-lg" value={contactName} onChange={(e) => setContactName(e.target.value)} />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Contact email
              <input className="input mt-2 w-full px-4 py-3 rounded-lg" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
            </label>
            <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">
              Website
              <input className="input mt-2 w-full px-4 py-3 rounded-lg" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." />
            </label>
          </div>
        </div>
      ) : null}

      {needsStudentProfile && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Student first name</label>
              <input className="input w-full px-4 py-3 rounded-lg" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Student last name</label>
              <input className="input w-full px-4 py-3 rounded-lg" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Graduation year</label>
              <input className="input w-full px-4 py-3 rounded-lg" value={graduationYear} onChange={(e) => setGraduationYear(e.target.value ? Number(e.target.value) : '')} placeholder="e.g. 2028" inputMode="numeric" />
              <p className="mt-2 text-xs text-slate-600">Required to personalize timelines.</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">High school</label>
              <input className="input w-full px-4 py-3 rounded-lg" value={schoolQuery} onChange={(e) => { setSchoolQuery(e.target.value); setSchoolId(null) }} placeholder="Search your school" />
              {role === 'student' && !schoolId && <p className="mt-2 text-xs text-slate-600">Required for student onboarding.</p>}
              <div className="mt-2 max-h-48 overflow-auto border border-slate-200 rounded-lg bg-white">
                {filteredSchools.length === 0 ? <div className="p-3 text-sm text-slate-600">No matches</div> : filteredSchools.map((s) => (
                  <button key={s.id} type="button" className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${schoolId === s.id ? 'bg-slate-50' : ''}`} onClick={() => { setSchoolId(s.id); setSchoolQuery(`${s.name}${s.city ? `, ${s.city}` : ''}${s.state ? `, ${s.state}` : ''}`) }}>
                    <div className="font-semibold text-slate-900">{s.name}</div>
                    <div className="text-xs text-slate-600">{[s.city, s.state].filter(Boolean).join(', ')}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {role === 'counselor' ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          Counselor access requires a student, parent, or guardian invitation. You can complete setup now and manage linked students later.
        </div>
      ) : null}

      {error && <div className="text-red-600 text-sm text-center p-3 rounded-lg bg-red-50 border border-red-200">{error}</div>}

      <div className="flex items-center gap-3">
        <button type="button" className="btn-primary" onClick={submit} disabled={!canSubmit}>{loading ? 'Saving...' : 'Finish setup'}</button>
        <div className="text-xs text-slate-600">You can manage profiles and relationships later in <span className="font-semibold">/profile</span>.</div>
      </div>
    </div>
  )
}
