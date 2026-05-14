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
  const [saving, setSaving] = useState(false)

  async function setActive(studentProfileId: string) {
    setSaving(true)
    try {
      await fetch('/api/profile/active-student-profile', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ studentProfileId }),
      })
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
          value={activeStudentProfileId || ''}
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
      </div>
    </div>
  )
}

