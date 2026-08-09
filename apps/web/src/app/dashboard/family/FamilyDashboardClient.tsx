'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import ActiveStudentConnectionCard from './ActiveStudentConnectionCard'
import ReportCardVault from '@/components/ReportCardVault'
import StudentSuccessChecklist from '@/components/StudentSuccessChecklist'
import StatTile from '@/components/StatTile'
import { BriefcaseBusiness, CheckCircle2, FileText, GraduationCap, HeartHandshake, Trophy } from 'lucide-react'

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

type School = { id: string; name: string; city: string | null; state: string | null }
type ParentAction = { key: string; title: string; description: string; completionWindow: string; deepLink?: string; completed: boolean; completedAt: string | null }
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
  linkedStudentProfiles?: { id: string; first_name: string | null; last_name: string | null; graduation_year: number | null; schools?: { name: string | null } | null }[]
  relationships?: { role: string; student_profile_id: string; created_at?: string }[]
  pendingInvites?: { id: string; student_profile_id: string; invited_email: string | null; relationship_role: string; invite_type?: string | null; status: string; created_at: string; expires_at?: string | null }[]
  parentActions?: ParentAction[]
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

export default function FamilyDashboardClient({ schools }: { schools: School[] }) {
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

      <ActiveStudentConnectionCard
        activeStudentProfileId={summary?.studentProfileId || null}
        activeStudentProfile={summary?.activeStudentProfile || null}
        linkedStudentProfiles={summary?.linkedStudentProfiles || []}
        relationships={summary?.relationships || []}
        pendingInvites={summary?.pendingInvites || []}
        schools={schools}
        viewerRole={summary?.viewerRole || null}
      />

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
                Grade-aware actions for how you can support the active student this term.
              </p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {(summary?.parentActions || []).length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                Link or create a student profile to unlock grade-aware parent actions.
              </div>
            ) : (
              (summary?.parentActions || []).slice(0, 5).map((action) => (
                <ParentActionRow key={action.key} studentProfileId={summary?.studentProfileId || null} action={action} onChanged={loadSummary} />
              ))
            )}
          </div>
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


function ParentActionRow({ studentProfileId, action, onChanged }: { studentProfileId: string | null; action: ParentAction; onChanged: () => void }) {
  const [saving, setSaving] = useState(false)

  async function toggle() {
    if (!studentProfileId) return
    setSaving(true)
    try {
      await fetch('/api/parent-actions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ studentProfileId, actionKey: action.key, completed: !action.completed }),
      })
      onChanged()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`rounded-xl border p-4 ${action.completed ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-start gap-3">
        <button type="button" onClick={toggle} disabled={saving || !studentProfileId} className="mt-0.5 shrink-0" aria-label={action.completed ? 'Mark parent action incomplete' : 'Complete parent action'}>
          <CheckCircle2 className={`h-5 w-5 ${action.completed ? 'text-emerald-600' : 'text-slate-300'}`} />
        </button>
        <div className="min-w-0">
          <div className="font-bold text-slate-950">{action.title}</div>
          <div className="mt-1 text-sm text-slate-700">{action.description}</div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
            <span>{action.completionWindow}</span>
            {action.deepLink ? <Link href={action.deepLink} className="text-brand-700 hover:text-brand-800">Open related tool</Link> : null}
          </div>
        </div>
      </div>
    </div>
  )
}
