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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filteredSchools = useMemo(() => {
    const q = schoolQuery.trim().toLowerCase()
    if (!q) return schools.slice(0, 50)
    return schools
      .filter((s) => s.name.toLowerCase().includes(q))
      .slice(0, 50)
  }, [schoolQuery, schools])

  const needsStudentProfile = role === 'student' || role === 'parent' || role === 'guardian'

  const needsSchoolAndGradYear = role === 'student'
  const canSubmit =
    !loading &&
    USER_ROLES.includes(role) &&
    (!needsStudentProfile || Boolean(graduationYear)) &&
    (!needsSchoolAndGradYear || Boolean(schoolId))

  async function submit() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
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
        }),
      })

      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null
      if (!res.ok || !json?.ok) {
        setError(json?.error || 'Onboarding failed')
        return
      }

      router.push('/dashboard')
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
          <select
            className="input w-full px-4 py-3 rounded-lg"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
          >
            <option value="student">Student</option>
            <option value="parent">Parent</option>
            <option value="guardian">Guardian</option>
            <option value="counselor">Counselor</option>
          </select>
          <p className="mt-2 text-xs text-slate-600">
            Counselors are currently read/support access only by invitation.
          </p>
        </div>
      </div>

      {needsStudentProfile && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Student first name</label>
              <input
                className="input w-full px-4 py-3 rounded-lg"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Student last name</label>
              <input
                className="input w-full px-4 py-3 rounded-lg"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Graduation year</label>
              <input
                className="input w-full px-4 py-3 rounded-lg"
                value={graduationYear}
                onChange={(e) => setGraduationYear(e.target.value ? Number(e.target.value) : '')}
                placeholder="e.g. 2028"
                inputMode="numeric"
              />
              <p className="mt-2 text-xs text-slate-600">Required to personalize timelines.</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">High school</label>
              <input
                className="input w-full px-4 py-3 rounded-lg"
                value={schoolQuery}
                onChange={(e) => {
                  setSchoolQuery(e.target.value)
                  setSchoolId(null)
                }}
                placeholder="Search your school"
              />
              {role === 'student' && !schoolId && (
                <p className="mt-2 text-xs text-slate-600">Required for student onboarding.</p>
              )}
              <div className="mt-2 max-h-48 overflow-auto border border-slate-200 rounded-lg bg-white">
                {filteredSchools.length === 0 ? (
                  <div className="p-3 text-sm text-slate-600">No matches</div>
                ) : (
                  filteredSchools.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${
                        schoolId === s.id ? 'bg-slate-50' : ''
                      }`}
                      onClick={() => {
                        setSchoolId(s.id)
                        setSchoolQuery(`${s.name}${s.city ? `, ${s.city}` : ''}${s.state ? `, ${s.state}` : ''}`)
                      }}
                    >
                      <div className="font-semibold text-slate-900">{s.name}</div>
                      <div className="text-xs text-slate-600">
                        {[s.city, s.state].filter(Boolean).join(', ')}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="text-red-600 text-sm text-center p-3 rounded-lg bg-red-50 border border-red-200">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="btn-primary"
          onClick={submit}
          disabled={!canSubmit}
        >
          {loading ? 'Saving...' : 'Finish setup'}
        </button>
        <div className="text-xs text-slate-600">
          You can manage profiles and relationships later in <span className="font-semibold">/profile</span>.
        </div>
      </div>
    </div>
  )
}
