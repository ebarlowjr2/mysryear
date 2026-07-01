'use client'

import Link from 'next/link'
import { GraduationCap, CalendarClock, ClipboardList, Trophy, BriefcaseBusiness } from 'lucide-react'
import StatTile from '@/components/StatTile'
import DocUpload from '@/components/DocUpload'
import ReportCardVault from '@/components/ReportCardVault'
import StudentSuccessChecklist from '@/components/StudentSuccessChecklist'
import ActiveStudentCard from '@/components/ActiveStudentCard'
import { useAuthSession } from '@/lib/use-auth-session'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

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
  scholarships?: { readiness: { percentage: number; label: string }; currentMatches: number; availableValue: number; applicationsInProgress: number; topMissingRequirement: string | null }
  portfolio?: { activitiesCount: number; serviceHoursTotal: number; achievementsCount: number; certificationsCompleted: number; proofDocumentsCount: number; readinessLabel: string; nextAction: string; scholarshipReadinessScore: number; scholarshipReadinessLabel: string }
  error?: string
}

export default function Dashboard() {
  const router = useRouter()
  const { isAuthenticated } = useAuthSession()
  const [bootstrapError, setBootstrapError] = useState<string | null>(null)
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) return
    // Ensure first-time users land in a fully initialized state even if email-confirm redirects
    // bypass middleware session detection (common with verify links).
    fetch('/api/bootstrap', { method: 'POST' }).then(async (res) => {
      if (res.ok) return
      const json = (await res.json().catch(() => null)) as { error?: string } | null
      if (json?.error) setBootstrapError(json.error)
    })
  }, [isAuthenticated, router])

  async function loadSummary() {
    if (!isAuthenticated) return
    setLoadingSummary(true)
    setSummaryError(null)
    try {
      const res = await fetch('/api/dashboard/summary')
      const json = (await res.json().catch(() => null)) as DashboardSummary | null
      if (!res.ok || !json?.ok) {
        setSummaryError(json?.error || 'Failed to load dashboard')
        return
      }
      setSummary(json)
    } finally {
      setLoadingSummary(false)
    }
  }

  useEffect(() => {
    void loadSummary()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  const upcomingDates = [
    { date: 'Oct 15', event: 'FAFSA opens' },
    { date: 'Nov 1', event: 'Early Action deadline' },
    { date: 'Nov 15', event: 'Scholarship applications due' },
    { date: 'Dec 1', event: 'Regular decision apps open' },
  ]

  const checklistDone = summary?.checklist?.done ?? null
  const checklistTotal = summary?.checklist?.total ?? null
  const checklistValue =
    typeof checklistDone === 'number' && typeof checklistTotal === 'number'
      ? `${checklistDone}/${checklistTotal}`
      : '—'

  const academicHealthValue =
    typeof summary?.academicHealth?.score === 'number' ? `${summary.academicHealth.score}/100` : '—'
  const academicHealthDesc =
    typeof summary?.academicHealth?.label === 'string'
      ? `${summary.academicHealth.label} • ${summary.academicHealth.nextAction || ''}`.trim()
      : 'Based on GPA, recent uploads, and checklist'

  const reportCardValue = summary?.latestAcademicRecordAt ? 'Updated' : 'Missing'
  const reportCardDesc = summary?.latestAcademicRecordAt
    ? `Latest upload: ${new Date(summary.latestAcademicRecordAt).toLocaleDateString()}`
    : 'Upload records each grading period'

  const lifepathValue =
    typeof summary?.lifepath?.selectedCareersCount === 'number'
      ? String(summary.lifepath.selectedCareersCount)
      : '—'

  const scholarshipReadinessValue = typeof summary?.scholarships?.readiness?.percentage === 'number' ? `${summary.scholarships.readiness.percentage}%` : '—'
  const scholarshipValue = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(summary?.scholarships?.availableValue || 0)

  const viewerRole = (summary?.viewerRole as string | null) || null
  const showParentActionCenter = viewerRole === 'parent' || viewerRole === 'guardian' || viewerRole === 'admin'
  const showCounselorInfo = viewerRole === 'counselor'
  const showBusinessPanel = viewerRole === 'business'

  return (
    <div className="container-prose py-14">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-black tracking-tight">Student Success Dashboard</h1>
          <p className="text-slate-700 mt-2">Check in each grading period—track progress year-round.</p>
        </div>
      </div>

      <ActiveStudentCard studentProfile={summary?.activeStudentProfile || null} />

      {showBusinessPanel ? (
        <div className="mb-6 rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm text-slate-800">
          <div className="font-semibold">Business account</div>
          <div className="mt-1">Manage your organization profile and career opportunity postings from the business dashboard.</div>
          <div className="mt-3"><Link href="/business/dashboard" className="btn-primary inline-flex">Open Business Dashboard</Link></div>
        </div>
      ) : null}

      {showCounselorInfo ? (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-800">
          <div className="font-semibold">Counselor access</div>
          <div className="mt-1">
            Counselors currently have read/support access only. Editing core profile fields and checklist completion is
            reserved for the student and parent/guardian.
          </div>
        </div>
      ) : null}

      {bootstrapError && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="font-semibold">Finish setup</div>
          <div className="mt-1">{bootstrapError}</div>
          <div className="mt-3">
            <Link href="/onboarding" className="btn-secondary inline-flex">
              Continue Setup
            </Link>
          </div>
        </div>
      )}

      {summaryError ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          {summaryError}
        </div>
      ) : null}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatTile
          label="Academic Health"
          value={loadingSummary ? '…' : academicHealthValue}
          desc={academicHealthDesc}
        />
        <StatTile
          label="Report Card Vault"
          value={loadingSummary ? '…' : reportCardValue}
          desc={reportCardDesc}
        />
        <StatTile
          label="LifePath Progress"
          value={loadingSummary ? '…' : lifepathValue}
          desc="Careers selected"
        />
        <StatTile
          label="Grade-Level Checklist"
          value={loadingSummary ? '…' : checklistValue}
          desc="9th–11th grade success steps"
        />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatTile label="Activities" value={loadingSummary ? '…' : String(summary?.portfolio?.activitiesCount ?? 0)} desc="Clubs, jobs, sports, leadership" />
        <StatTile label="Service Hours" value={loadingSummary ? '…' : String(summary?.portfolio?.serviceHoursTotal ?? 0)} desc="Volunteer and community work" />
        <StatTile label="Achievements" value={loadingSummary ? '…' : String(summary?.portfolio?.achievementsCount ?? 0)} desc="Awards and honors" />
        <StatTile label="Certifications" value={loadingSummary ? '…' : String(summary?.portfolio?.certificationsCompleted ?? 0)} desc={summary?.portfolio?.readinessLabel || 'Portfolio progress'} />
        <StatTile label="Scholarship Ready" value={loadingSummary ? '…' : scholarshipReadinessValue} desc={summary?.scholarships?.readiness?.label || 'Profile-based matching'} />
      </div>

      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4">Upcoming Dates</h3>
          <div className="space-y-3">
            {upcomingDates.map((item, i) => (
              <div
                key={i}
                className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0"
              >
                <span className="font-medium">{item.event}</span>
                <span className="text-sm text-slate-600">{item.date}</span>
              </div>
            ))}
          </div>
        </div>

        <DocUpload />
      </div>



      <div className="card p-6 mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold">{showParentActionCenter ? 'Scholarship Action Center' : 'Scholarship Readiness'}</h3>
            <p className="mt-2 text-sm text-slate-700">
              {showParentActionCenter
                ? 'Review scholarship matches, missing documents, and deadlines with your student.'
                : 'A.U.R.A is matching scholarships using academics, portfolio, LifePath, uploads, and location.'}
            </p>
          </div>
          <Link href="/scholarships" className="btn-secondary shrink-0">View Scholarships</Link>
        </div>
        <div className="mt-5 grid md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-xs font-semibold text-slate-500">Readiness</div>
            <div className="mt-1 text-2xl font-black">{loadingSummary ? '…' : scholarshipReadinessValue}</div>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-xs font-semibold text-slate-500">Current Matches</div>
            <div className="mt-1 text-2xl font-black">{loadingSummary ? '…' : String(summary?.scholarships?.currentMatches ?? 0)}</div>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-xs font-semibold text-slate-500">Money Available</div>
            <div className="mt-1 text-2xl font-black">{loadingSummary ? '…' : scholarshipValue}</div>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-xs font-semibold text-slate-500">Next Requirement</div>
            <div className="mt-1 text-sm font-bold text-slate-800">{summary?.scholarships?.topMissingRequirement || 'Build scholarship matches'}</div>
          </div>
        </div>
      </div>

      <div className="card p-6 mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold">{showParentActionCenter ? 'Opportunities to review with your student' : 'Career Opportunities'}</h3>
            <p className="mt-2 text-sm text-slate-700">
              {showParentActionCenter
                ? 'Review internships, volunteer roles, workshops, and career exposure opportunities together.'
                : 'Explore internships, volunteer roles, workshops, apprenticeships, and career events.'}
            </p>
          </div>
          <Link href="/opportunities" className="btn-secondary shrink-0">View Board</Link>
        </div>
        <div className="mt-5 grid md:grid-cols-3 gap-4">
          {(summary?.opportunities || []).length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600 md:col-span-3">No active opportunities posted yet.</div>
          ) : (
            (summary?.opportunities || []).map((opportunity) => (
              <Link key={opportunity.id} href={`/opportunities/${opportunity.id}`} className="rounded-xl border border-slate-200 p-4 hover:bg-slate-50 transition">
                <div className="text-xs font-semibold text-brand-700">{opportunity.opportunity_type.replaceAll('_', ' ')}</div>
                <div className="mt-1 font-bold text-slate-900 line-clamp-2">{opportunity.title}</div>
                <div className="mt-2 text-xs text-slate-600">{opportunity.business_profiles?.organization_name || opportunity.career_category || 'Business partner'}</div>
                <div className="mt-1 text-xs text-slate-500">{[opportunity.city, opportunity.state].filter(Boolean).join(', ') || (opportunity.remote_available ? 'Remote' : 'Location TBD')}</div>
              </Link>
            ))
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        <ReportCardVault />
        <div className="card p-6">
          <h3 className="text-lg font-bold">{showParentActionCenter ? 'Parent Action Center' : 'What to do next'}</h3>
          <p className="mt-2 text-sm text-slate-700">
            Quick actions for the active student profile.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-700 list-disc pl-5">
            {showParentActionCenter ? (
              <>
                <li>Review the latest report card upload.</li>
                <li>Confirm LifePath career picks match goals.</li>
                <li>Help schedule a career conversation this week.</li>
                <li>Upload a transcript or test score document.</li>
              </>
            ) : (
              <>
                <li>Upload your latest report card or progress report.</li>
                <li>Mark 1–2 checklist items done this week.</li>
                <li>Pick or review your LifePath career interests.</li>
                <li>Invite a parent/guardian/counselor to support you.</li>
              </>
            )}
          </ul>
          <div className="mt-4 text-xs text-slate-500">
            (We’ll personalize this by role and grade level next.)
          </div>
        </div>
      </div>

      <div className="mb-8">
        <StudentSuccessChecklist
          tasks={summary?.tasks || []}
          onChanged={loadSummary}
          readOnly={viewerRole === 'counselor'}
        />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link href="/open-dashboard/applications" className="card p-6 hover:shadow-lg transition">
          <ClipboardList className="w-8 h-8 text-brand-600 mb-4" />
          <h3 className="text-lg font-bold mb-2">Applications</h3>
          <p className="text-slate-600 text-sm">Track college and program applications</p>
        </Link>

        <Link href="/scholarships" className="card p-6 hover:shadow-lg transition">
          <GraduationCap className="w-8 h-8 text-brand-600 mb-4" />
          <h3 className="text-lg font-bold mb-2">Scholarships</h3>
          <p className="text-slate-600 text-sm">Find funding opportunities</p>
        </Link>

        <Link href="/planner" className="card p-6 hover:shadow-lg transition">
          <CalendarClock className="w-8 h-8 text-brand-600 mb-4" />
          <h3 className="text-lg font-bold mb-2">Planner</h3>
          <p className="text-slate-600 text-sm">Senior year timeline and tasks</p>
        </Link>

        <Link href="/opportunities" className="card p-6 hover:shadow-lg transition">
          <BriefcaseBusiness className="w-8 h-8 text-brand-600 mb-4" />
          <h3 className="text-lg font-bold mb-2">Opportunities</h3>
          <p className="text-slate-600 text-sm">Internships, volunteer roles, job shadowing, and workshops</p>
        </Link>

        <Link href="/portfolio" className="card p-6 hover:shadow-lg transition">
          <Trophy className="w-8 h-8 text-brand-600 mb-4" />
          <h3 className="text-lg font-bold mb-2">Portfolio</h3>
          <p className="text-slate-600 text-sm">Activities, service, awards, certifications</p>
        </Link>

        <Link href="/open-dashboard/scholarships" className="card p-6 hover:shadow-lg transition">
          <GraduationCap className="w-8 h-8 text-brand-600 mb-4" />
          <h3 className="text-lg font-bold mb-2">Enhanced Scholarships</h3>
          <p className="text-slate-600 text-sm">Advanced filtering and tracking</p>
        </Link>
      </div>
    </div>
  )
}
