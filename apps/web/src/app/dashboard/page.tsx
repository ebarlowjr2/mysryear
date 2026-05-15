'use client'

import Link from 'next/link'
import { GraduationCap, CalendarClock, ClipboardList, FileText } from 'lucide-react'
import StatTile from '@/components/StatTile'
import DocUpload from '@/components/DocUpload'
import { useAuthSession } from '@/lib/use-auth-session'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const router = useRouter()
  const { isAuthenticated } = useAuthSession()
  const [bootstrapError, setBootstrapError] = useState<string | null>(null)

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

  const upcomingDates = [
    { date: 'Oct 15', event: 'FAFSA opens' },
    { date: 'Nov 1', event: 'Early Action deadline' },
    { date: 'Nov 15', event: 'Scholarship applications due' },
    { date: 'Dec 1', event: 'Regular decision apps open' },
  ]

  return (
    <div className="container-prose py-14">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-black tracking-tight">Dashboard</h1>
          <p className="text-slate-700 mt-2">Your senior year, organized and stress-less</p>
        </div>
      </div>

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

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatTile
          label="Scholarships"
          value="12 matches"
          desc="Filtered by GPA, state, and interests"
        />
        <StatTile
          label="Admissions Deadlines"
          value="4 upcoming"
          desc="Early Action and Regular Decision"
        />
        <StatTile
          label="Application Tasks"
          value="7 pending"
          desc="Essays, recommendations, transcripts"
        />
        <StatTile
          label="Checklist Items"
          value="15 completed"
          desc="Senior year milestones on track"
        />
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

        <Link href="/resources" className="card p-6 hover:shadow-lg transition">
          <FileText className="w-8 h-8 text-brand-600 mb-4" />
          <h3 className="text-lg font-bold mb-2">Resources</h3>
          <p className="text-slate-600 text-sm">Essays, resumes, and guides</p>
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
