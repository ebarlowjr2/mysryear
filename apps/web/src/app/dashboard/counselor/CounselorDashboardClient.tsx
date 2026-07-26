'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import ActiveStudentCard from '@/components/ActiveStudentCard'
import StudentSuccessChecklist from '@/components/StudentSuccessChecklist'
import StatTile from '@/components/StatTile'
import { BookOpenCheck, GraduationCap, ShieldCheck, Users } from 'lucide-react'

type DashboardTask = {
  id: string
  title: string
  description: string | null
  category: string | null
  status: 'not_started' | 'in_progress' | 'done'
  upload_required: boolean | null
}

type DashboardSummary = {
  ok: boolean
  studentProfileId: string | null
  viewerRole: string | null
  activeStudentProfile?: {
    id: string
    first_name: string | null
    last_name: string | null
    graduation_year: number | null
    schools?: { name: string | null } | null
  } | null
  latestAcademicRecordAt: string | null
  checklist?: { done: number; total: number }
  tasks?: DashboardTask[]
  academicHealth?: { score: number; label: string; nextAction: string }
  lifepath?: { selectedCareersCount: number }
  scholarships?: { readiness: { percentage: number; label: string }; currentMatches: number }
  portfolio?: { scholarshipReadinessScore?: number; nextAction: string }
  error?: string
}

export default function CounselorDashboardClient() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadSummary() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/dashboard/summary')
      const json = (await res.json().catch(() => null)) as DashboardSummary | null
      if (!res.ok || !json?.ok) {
        setError(json?.error || 'Failed to load counselor dashboard')
        return
      }
      setSummary(json)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadSummary()
  }, [])

  const studentName = summary?.activeStudentProfile
    ? [summary.activeStudentProfile.first_name, summary.activeStudentProfile.last_name]
        .filter(Boolean)
        .join(' ') || 'selected student'
    : 'selected student'

  return (
    <section className="container-prose py-14 space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="badge">Counselor Dashboard</div>
          <h1 className="mt-3 text-4xl font-black tracking-tight">Support {studentName}</h1>
          <p className="mt-2 max-w-2xl text-slate-700">
            Counselor access is read/support focused. Core student profile editing remains with the
            student and family.
          </p>
        </div>
        <Link href="/profile" className="btn-secondary shrink-0">
          Select Linked Student
        </Link>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          {error}
        </div>
      ) : null}

      {!loading && !summary?.studentProfileId ? (
        <div className="card p-8">
          <h2 className="text-2xl font-black">No approved student access yet</h2>
          <p className="mt-2 text-slate-700">
            Students or parents can invite you as a counselor. Once approved, linked students appear
            here.
          </p>
          <Link href="/profile" className="btn-primary mt-5 inline-flex">
            Open Profile
          </Link>
        </div>
      ) : null}

      <ActiveStudentCard studentProfile={summary?.activeStudentProfile || null} />

      <div className="rounded-xl border border-brand-200 bg-brand-50 p-5 text-sm text-slate-800">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-6 w-6 text-brand-700" />
          <div>
            <div className="font-black">Read/support access</div>
            <div className="mt-1">
              You can review planning data and support the student. Editing core profile fields is
              intentionally disabled for counselors in this release.
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Academic Health"
          value={loading ? '…' : `${summary?.academicHealth?.score ?? '—'}/100`}
          desc={summary?.academicHealth?.nextAction || 'Review academic status'}
        />
        <StatTile
          label="Report Card"
          value={loading ? '…' : summary?.latestAcademicRecordAt ? 'Uploaded' : 'Missing'}
          desc="Latest academic document"
        />
        <StatTile
          label="LifePath Careers"
          value={loading ? '…' : String(summary?.lifepath?.selectedCareersCount ?? 0)}
          desc="Career pathways selected"
        />
        <StatTile
          label="Checklist"
          value={
            loading ? '…' : `${summary?.checklist?.done ?? 0}/${summary?.checklist?.total ?? 0}`
          }
          desc="Grade-level progress"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Link href="/aura/lifepath" className="card p-6 hover:shadow-lg transition">
          <GraduationCap className="mb-4 h-8 w-8 text-brand-600" />
          <h3 className="font-black">LifePath Review</h3>
          <p className="mt-2 text-sm text-slate-600">Review selected careers and pathway health.</p>
        </Link>
        <Link href="/scholarships" className="card p-6 hover:shadow-lg transition">
          <BookOpenCheck className="mb-4 h-8 w-8 text-brand-600" />
          <h3 className="font-black">Scholarship Readiness</h3>
          <p className="mt-2 text-sm text-slate-600">See readiness and missing items.</p>
        </Link>
        <Link href="/profile" className="card p-6 hover:shadow-lg transition">
          <Users className="mb-4 h-8 w-8 text-brand-600" />
          <h3 className="font-black">Linked Students</h3>
          <p className="mt-2 text-sm text-slate-600">Manage approved student access.</p>
        </Link>
      </div>

      <StudentSuccessChecklist tasks={summary?.tasks || []} onChanged={loadSummary} readOnly />
    </section>
  )
}
