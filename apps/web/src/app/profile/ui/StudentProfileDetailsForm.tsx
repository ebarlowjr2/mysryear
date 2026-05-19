'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type School = { id: string; name: string; city: string | null; state: string | null }

export default function StudentProfileDetailsForm({
  studentProfileId,
  initialFirstName,
  initialLastName,
  initialGraduationYear,
  initialSchoolId,
  schools,
}: {
  studentProfileId: string | null
  initialFirstName: string | null
  initialLastName: string | null
  initialGraduationYear: number | null
  initialSchoolId: string | null
  schools: School[]
}) {
  const router = useRouter()
  const [firstName, setFirstName] = useState(initialFirstName || '')
  const [lastName, setLastName] = useState(initialLastName || '')
  const [graduationYear, setGraduationYear] = useState<string>(initialGraduationYear ? String(initialGraduationYear) : '')
  const [schoolQuery, setSchoolQuery] = useState('')
  const [schoolId, setSchoolId] = useState<string | null>(initialSchoolId || null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const filteredSchools = useMemo(() => {
    const q = schoolQuery.trim().toLowerCase()
    if (!q) return schools.slice(0, 25)
    return schools.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 25)
  }, [schoolQuery, schools])

  async function save() {
    if (!studentProfileId) return
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch('/api/profile/student-profile', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          studentProfileId,
          firstName: firstName || null,
          lastName: lastName || null,
          graduationYear: graduationYear.trim() ? Number(graduationYear) : null,
          schoolId,
        }),
      })
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null
      if (!res.ok || !json?.ok) {
        setError(json?.error || 'Save failed')
        return
      }
      setSuccess('Saved')
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card p-4">
      <div className="text-sm font-black">Student profile details</div>
      <p className="mt-1 text-sm text-slate-700">
        Update the active student profile. (Students and linked parent/guardian/admin can edit core fields.)
      </p>

      <div className="mt-4 grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">First name</label>
          <input className="input w-full px-4 py-3 rounded-lg" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Last name</label>
          <input className="input w-full px-4 py-3 rounded-lg" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
      </div>

      <div className="mt-4 grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Graduation year</label>
          <input
            className="input w-full px-4 py-3 rounded-lg"
            value={graduationYear}
            onChange={(e) => setGraduationYear(e.target.value)}
            placeholder="e.g. 2030"
            inputMode="numeric"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">High school</label>
          <input
            className="input w-full px-4 py-3 rounded-lg"
            value={schoolQuery}
            onChange={(e) => setSchoolQuery(e.target.value)}
            placeholder="Search"
          />
          <div className="mt-2 max-h-40 overflow-auto border border-slate-200 rounded-lg bg-white">
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
                  <div className="text-xs text-slate-600">{[s.city, s.state].filter(Boolean).join(', ')}</div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {(error || success) && (
        <div
          className={`mt-4 text-sm text-center p-3 rounded-lg border ${
            error ? 'text-red-700 bg-red-50 border-red-200' : 'text-emerald-800 bg-emerald-50 border-emerald-200'
          }`}
        >
          {error || success}
        </div>
      )}

      <div className="mt-4">
        <button type="button" className="btn-primary" disabled={!studentProfileId || saving} onClick={save}>
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}

