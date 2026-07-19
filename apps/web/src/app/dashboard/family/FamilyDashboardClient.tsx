'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import ActiveStudentCard from '@/components/ActiveStudentCard'
import ReportCardVault from '@/components/ReportCardVault'
import StudentSuccessChecklist from '@/components/StudentSuccessChecklist'
import StatTile from '@/components/StatTile'
import { BriefcaseBusiness, FileText, GraduationCap, HeartHandshake, Trophy } from 'lucide-react'

type DashboardTask = {
  id: string
  title: string
  description: string | null
  category: string | null
  status: 'not_started' | 'in_progress' | 'done'
  upload_required: boolean | null
}

type DashboardOpportunity = {
  id: string
  title: string
  opportunity_type: string
  career_category: string | null
  city: string | null
  state: string | null
  remote_available: boolean | null
  deadline: string | null
  business_profiles?: { organization_name: string | null } | null
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
  opportunities?: DashboardOpportunity[]
  scholarships?: {
    readiness: { percentage: number; label: string }
    currentMatches: number
    availableValue: number
    applicationsInProgress: number
    topMissingRequirement: string | null
  }
  portfolio?: {
    activitiesCount: number
    serviceHoursTotal: number
    achievementsCount: number
    certificationsCompleted: number
    readinessLabel: string
    nextAction: string
  }
  error?: string
}

export default function FamilyDashboardClient() {
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
        setError(json?.error || 'Failed to load family dashboard')
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

  const checklistDone = summary?.checklist?.done ?? 0
  const checklistTotal = summary?.checklist?.total ?? 0
  const reportCardValue = summary?.latestAcademicRecordAt ? 'Updated' : 'Missing'
  const scholarshipReady =
    typeof summary?.scholarships?.readiness?.percentage === 'number'
      ? `${summary.scholarships.readiness.percentage}%`
      : '—'
  const activeStudentName = summary?.activeStudentProfile
    ? [summary.activeStudentProfile.first_name, summary.activeStudentProfile.last_name]
        .filter(Boolean)
        .join(' ') || 'your student'
    : 'your student'

  return (
    <section className="container-prose py-14 space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="badge">Family Dashboard</div>
          <h1 className="mt-3 text-4xl font-black tracking-tight">Support {activeStudentName}</h1>
          <p className="mt-2 max-w-2xl text-slate-700">
            Review academics, documents, LifePath progress, and next actions for the active student
            profile.
          </p>
        </div>
        <Link href="/profile" className="btn-secondary shrink-0">
          Switch / Manage Students
        </Link>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          {error}
        </div>
      ) : null}

      {!loading && !summary?.studentProfileId ? (
        <div className="card p-8">
          <h2 className="text-2xl font-black">No student profile selected yet</h2>
          <p className="mt-2 text-slate-700">
            Link to a student or create a managed student profile before using the family dashboard.
          </p>
          <Link href="/profile" className="btn-primary mt-5 inline-flex">
            Open Profile
          </Link>
        </div>
      ) : null}

      <ActiveStudentCard studentProfile={summary?.activeStudentProfile || null} />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Academic Health"
          value={loading ? '…' : `${summary?.academicHealth?.score ?? '—'}/100`}
          desc={summary?.academicHealth?.nextAction || 'Review grades each period'}
        />
        <StatTile
          label="Report Card Vault"
          value={loading ? '…' : reportCardValue}
          desc={
            summary?.latestAcademicRecordAt
              ? `Latest: ${new Date(summary.latestAcademicRecordAt).toLocaleDateString()}`
              : 'Upload the newest report card'
          }
        />
        <StatTile
          label="LifePath Careers"
          value={loading ? '…' : String(summary?.lifepath?.selectedCareersCount ?? 0)}
          desc="Confirm career choices together"
        />
        <StatTile
          label="Checklist"
          value={loading ? '…' : `${checklistDone}/${checklistTotal}`}
          desc="Grade-level success steps"
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="card p-6">
          <div className="flex items-start gap-3">
            <HeartHandshake className="mt-1 h-7 w-7 text-brand-600" />
            <div>
              <h2 className="text-xl font-black">Parent Action Center</h2>
              <p className="mt-2 text-sm text-slate-700">
                Concrete ways to help this grading period.
              </p>
            </div>
          </div>
          <ul className="mt-5 space-y-2 text-sm text-slate-700 list-disc pl-5">
            <li>Review the latest report card or transcript upload.</li>
            <li>Confirm LifePath choices match the student’s interests and budget.</li>
            <li>Help schedule one career conversation or campus/program visit.</li>
            <li>Check scholarship readiness and missing documents.</li>
          </ul>
        </div>
        <ReportCardVault />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/aura/lifepath" className="card p-6 hover:shadow-lg transition">
          <GraduationCap className="mb-4 h-8 w-8 text-brand-600" />
          <h3 className="font-black">LifePath</h3>
          <p className="mt-2 text-sm text-slate-600">View career paths and next tasks.</p>
        </Link>
        <Link href="/scholarships" className="card p-6 hover:shadow-lg transition">
          <Trophy className="mb-4 h-8 w-8 text-brand-600" />
          <h3 className="font-black">Scholarships</h3>
          <p className="mt-2 text-sm text-slate-600">Readiness: {scholarshipReady}</p>
        </Link>
        <Link href="/portfolio" className="card p-6 hover:shadow-lg transition">
          <FileText className="mb-4 h-8 w-8 text-brand-600" />
          <h3 className="font-black">Portfolio</h3>
          <p className="mt-2 text-sm text-slate-600">
            Activities, awards, service, certifications.
          </p>
        </Link>
        <Link href="/opportunities" className="card p-6 hover:shadow-lg transition">
          <BriefcaseBusiness className="mb-4 h-8 w-8 text-brand-600" />
          <h3 className="font-black">Opportunities</h3>
          <p className="mt-2 text-sm text-slate-600">Review active internships and programs.</p>
        </Link>
      </div>

      <StudentSuccessChecklist tasks={summary?.tasks || []} onChanged={loadSummary} />
    </section>
  )
}
