import React from 'react'
import { getSession } from '@/lib/auth'
import StatTile from '@/components/StatTile'
import DocUpload from '@/components/DocUpload'

export const dynamic = 'force-dynamic'

export default async function OpenDashboard() {
  const session = await getSession()
  if (!session) {
    return (
      <div className="container-prose py-20">
        <div className="max-w-xl mx-auto card p-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Open Dashboard</h1>
          <p className="mt-3 text-slate-700">
            Please sign in to access your dashboard, track scholarships, deadlines, and store
            documents.
          </p>
          <div className="mt-6 flex justify-center">
            <a href="/auth" className="btn-primary">
              Sign in
            </a>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Hook this to Auth0 or Supabase Auth by replacing <code>getSession()</code>.
          </p>
        </div>
      </div>
    )
  }
  const stats = [
    { label: 'Scholarships Applied', value: '4', desc: '2 awaiting responses' },
    { label: 'Scholarships To Apply', value: '12', desc: '3 due this month' },
    { label: 'Admissions Deadlines', value: 'Nov 1 / Jan 1', desc: 'EA / RD highlights' },
    { label: 'Application Tasks', value: '9', desc: '4 due this week' },
    { label: 'FAFSA® Status', value: 'In progress', desc: 'Started Oct 2' },
    { label: 'Recommenders', value: '2', desc: '1 reminder pending' },
  ]
  return (
    <div className="container-prose py-10">
      <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Open Dashboard</h1>
      <p className="mt-2 text-slate-700">
        Welcome back{session?.user?.name ? `, ${session.user.name}` : ''}.
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {stats.map((s, i) => (
          <StatTile key={i} label={s.label} value={s.value} desc={s.desc} />
        ))}
      </div>
      <div className="mt-8 grid md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-bold">Upcoming Dates</h3>
          <ul className="mt-3 list-disc ml-5 text-slate-700 space-y-2">
            <li>Oct 15 – Scholarship: Community Impact</li>
            <li>Nov 1 – Early Action deadline (State U)</li>
            <li>Dec 1 – STEM for All Grant</li>
          </ul>
          <div className="mt-4 flex gap-3">
            <a className="btn-secondary" href="/planner">
              View Planner
            </a>
            <a className="btn-primary" href="/open-dashboard/scholarships">
              Track Scholarships
            </a>
          </div>
        </div>
        <DocUpload />
      </div>
    </div>
  )
}
