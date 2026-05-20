'use client'

import Link from 'next/link'
import CopyTextButton from '@/components/CopyTextButton'

type ActiveStudentProfile = {
  id: string
  first_name: string | null
  last_name: string | null
  graduation_year: number | null
  schools?: { name: string | null } | null
}

export default function ActiveStudentCard({
  studentProfile,
}: {
  studentProfile: ActiveStudentProfile | null
}) {
  if (!studentProfile) return null

  const name =
    [studentProfile.first_name, studentProfile.last_name].filter(Boolean).join(' ') || 'Student'

  return (
    <div className="card p-6 mb-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="badge">Active Student</div>
          <h2 className="mt-2 text-xl font-black tracking-tight">{name}</h2>
          <div className="mt-2 text-sm text-slate-700 space-y-1">
            <div>
              <span className="font-semibold">Graduation year:</span>{' '}
              {studentProfile.graduation_year || '—'}
            </div>
            <div>
              <span className="font-semibold">School:</span> {studentProfile.schools?.name || '—'}
            </div>
          </div>
        </div>

        <div className="shrink-0 flex flex-col gap-2">
          <Link href="/profile" className="btn-secondary text-center">
            Change
          </Link>
          <CopyTextButton text={studentProfile.id} label="Copy ID" />
        </div>
      </div>

      <div className="mt-3 text-xs text-slate-600">
        This selection controls which student’s dashboard, LifePath, uploads, and checklists you’re viewing.
      </div>
    </div>
  )
}

