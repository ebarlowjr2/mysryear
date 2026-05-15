'use client'

import Link from 'next/link'
import { GraduationCap, CalendarClock, ClipboardList, FileText } from 'lucide-react'
import StatTile from '@/components/StatTile'
import DocUpload from '@/components/DocUpload'
import ReportCardVault from '@/components/ReportCardVault'
import { useAuthSession } from '@/lib/use-auth-session'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const router = useRouter()
  const { isAuthenticated } = useAuthSession()

  useEffect(() => {
    if (!isAuthenticated) return
    // Ensure first-time users land in a fully initialized state even if email-confirm redirects
    // bypass middleware session detection (common with verify links).
    fetch('/api/bootstrap', { method: 'POST' }).then(async (res) => {
      if (res.ok) return
      const json = (await res.json().catch(() => null)) as { error?: string } | null
      // If bootstrap cannot complete from metadata, send user to /onboarding to finish.
      if (json?.error) {
        router.push('/onboarding')
        router.refresh()
      }
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
          <h1 className="text-4xl font-black tracking-tight">Student Success Dashboard</h1>
          <p className="text-slate-700 mt-2">Check in each grading period—track progress year-round.</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatTile
          label="Academic Health"
          value="—"
          desc="Based on GPA, recent uploads, and checklist"
        />
        <StatTile
          label="Report Card Vault"
          value="—"
          desc="Upload records each grading period"
        />
        <StatTile
          label="LifePath Progress"
          value="—"
          desc="Careers selected + next action"
        />
        <StatTile
          label="Grade-Level Checklist"
          value="—"
          desc="9th–11th grade success steps"
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

      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        <ReportCardVault />
        <div className="card p-6">
          <h3 className="text-lg font-bold">Parent Action Center</h3>
          <p className="mt-2 text-sm text-slate-700">
            Quick actions to support the active student profile.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-700 list-disc pl-5">
            <li>Review the latest report card upload.</li>
            <li>Confirm LifePath career picks match goals.</li>
            <li>Help schedule a career conversation this week.</li>
            <li>Upload a transcript or test score document.</li>
          </ul>
          <div className="mt-4 text-xs text-slate-500">
            (We’ll personalize this by role and grade level next.)
          </div>
        </div>
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
