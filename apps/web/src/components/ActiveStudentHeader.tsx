import Link from 'next/link'
import type { ActiveStudentProfileSummary } from '@/lib/student-profile'

export default function ActiveStudentHeader({
  studentProfile,
}: {
  studentProfile: ActiveStudentProfileSummary | null
}) {
  if (!studentProfile) return null

  const name =
    [studentProfile.first_name, studentProfile.last_name].filter(Boolean).join(' ') || 'Student'

  return (
    <div className="card p-4 mb-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-slate-600">Active student</div>
          <div className="mt-1 font-black truncate">{name}</div>
          <div className="mt-1 text-xs text-slate-600">
            {studentProfile.schools?.name || '—'}
            {studentProfile.graduation_year ? ` • Class of ${studentProfile.graduation_year}` : ''}
          </div>
        </div>
        <Link href="/profile" className="btn-secondary shrink-0">
          Change
        </Link>
      </div>
    </div>
  )
}

