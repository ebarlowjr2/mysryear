'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type StudentProfileRow = {
  id: string
  first_name: string | null
  last_name: string | null
  graduation_year: number | null
  schools: { name: string | null } | null
}

export default function ActiveStudentProfileSelector({
  activeStudentProfileId,
  studentProfiles,
}: {
  activeStudentProfileId: string | null
  studentProfiles: StudentProfileRow[]
}) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState(activeStudentProfileId || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function setActive(studentProfileId: string) {
    setSaving(true)
    setError(null)
    const prev = selectedId
    setSelectedId(studentProfileId)
    try {
      const res = await fetch('/api/profile/active-student-profile', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ studentProfileId }),
      })
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null
      if (!res.ok || !json?.ok) {
        setError(json?.error || 'Failed to set active student profile')
        setSelectedId(prev)
        return
      }
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  if (studentProfiles.length === 0) {
    return (
      <div className="text-sm text-slate-700">
        No student profiles are linked to this account yet. Complete onboarding to create one.
      </div>
    )
  }

  return (
    <div className="grid sm:grid-cols-2 gap-4 items-end">
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          Active student profile
        </label>
        <select
          className="input w-full px-4 py-3 rounded-lg"
          value={selectedId}
          onChange={(e) => setActive(e.target.value)}
          disabled={saving}
        >
          {studentProfiles.map((p) => {
            const name = [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Student'
            const meta = [p.graduation_year ? `Class of ${p.graduation_year}` : null, p.schools?.name || null]
              .filter(Boolean)
              .join(' • ')
            return (
              <option key={p.id} value={p.id}>
                {name}
                {meta ? ` — ${meta}` : ''}
              </option>
            )
          })}
        </select>
        <p className="mt-2 text-xs text-slate-600">
          This selection controls which student’s LifePath, uploads, and planning data you’re viewing.
        </p>
        {error && (
          <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
