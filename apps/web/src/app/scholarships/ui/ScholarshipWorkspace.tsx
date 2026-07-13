'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

type Scholarship = {
  id: string
  title: string
  organization?: string | null
  description?: string | null
  amount?: number | null
  deadline?: string | null
  application_url?: string | null
  state?: string | null
  minimum_gpa?: number | null
  career_tags?: string[] | null
  skill_tags?: string[] | null
}

type ApplicationTask = {
  id: string
  title: string
  description?: string | null
  category: string
  status: 'not_started' | 'in_progress' | 'done'
  due_date?: string | null
  upload_required?: boolean | null
  uploaded_file_id?: string | null
}

type ApplicationProgress = {
  total: number
  completed: number
  percentage: number
  nextTask: string | null
  overdue: number
  documentsNeeded: number
}

type Match = {
  scholarshipId: string
  matchScore: number
  readinessPercentage: number
  matchReason: string[]
  missingRequirements: string[]
  status: 'suggested' | 'saved' | 'applying' | 'submitted' | 'awarded' | 'rejected'
  scholarship: Scholarship
  applicationTasks?: ApplicationTask[]
  applicationProgress?: ApplicationProgress
}

type ResponseShape = {
  ok: boolean
  readiness?: {
    percentage: number
    label: string
    strengths: string[]
    missingRequirements: string[]
    topMissingRequirement: string | null
  }
  matches?: Match[]
  counts?: Record<string, number>
  estimatedValue?: number
  upcomingDeadlines?: Array<{ id: string; title: string; deadline: string | null }>
  error?: string
}

const tabs = ['suggested', 'saved', 'applying', 'submitted', 'awarded'] as const
const labels: Record<(typeof tabs)[number], string> = {
  suggested: 'Top Matches',
  saved: 'Saved',
  applying: 'Applying',
  submitted: 'Submitted',
  awarded: 'Awarded',
}

function money(value: number | null | undefined) {
  if (!value) return 'Amount varies'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

function date(value: string | null | undefined) {
  if (!value) return 'Rolling / TBD'
  return new Date(value).toLocaleDateString()
}

export default function ScholarshipWorkspace() {
  const [data, setData] = useState<ResponseShape | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>('suggested')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    const res = await fetch('/api/scholarships/matches', { credentials: 'include', cache: 'no-store' })
    const json = (await res.json().catch(() => null)) as ResponseShape | null
    setLoading(false)
    if (!res.ok || !json?.ok) {
      setError(json?.error || 'Could not load scholarship matches')
      return
    }
    setData(json)
  }

  useEffect(() => {
    void load()
  }, [])

  async function updateStatus(match: Match, status: Match['status']) {
    setBusyId(match.scholarshipId)
    setNotice(null)
    const res = await fetch('/api/scholarships/matches', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ scholarshipId: match.scholarshipId, status }),
    })
    const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null
    setBusyId(null)
    if (!res.ok || !json?.ok) {
      setError(json?.error || 'Could not update scholarship status')
      return
    }
    await load()
    if (tabs.includes(status as (typeof tabs)[number])) setActiveTab(status as (typeof tabs)[number])
    if (status === 'applying') {
      setNotice('Application workspace opened. MySRYear will help you track the checklist here; use the official application link when you are ready to complete the provider form.')
    }
  }


  async function updateTask(task: ApplicationTask, status: ApplicationTask['status']) {
    setBusyId(task.id)
    const res = await fetch('/api/scholarships/application-tasks', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ taskId: task.id, status }),
    })
    const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null
    setBusyId(null)
    if (!res.ok || !json?.ok) {
      setError(json?.error || 'Could not update application task')
      return
    }
    await load()
  }

  const visibleMatches = useMemo(() => {
    const matches = data?.matches || []
    if (activeTab === 'suggested') return matches.filter((match) => match.status === 'suggested').slice(0, 20)
    return matches.filter((match) => match.status === activeTab)
  }, [activeTab, data?.matches])

  if (loading) {
    return <div className="card p-8 text-center text-slate-700">Building scholarship matches from the active student profile...</div>
  }

  if (error) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
  }

  const readiness = data?.readiness

  return (
    <div className="space-y-8">
      <section className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div className="card p-6">
          <div className="badge">Scholarship Readiness</div>
          <div className="mt-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="text-5xl font-black tracking-tight">{readiness?.percentage ?? 0}%</div>
              <div className="mt-2 text-lg font-bold text-slate-800">{readiness?.label || 'Needs Foundation'}</div>
              <p className="mt-2 text-sm text-slate-600 max-w-2xl">
                A.U.R.A is using academics, portfolio, documents, LifePath career interests, and location to estimate scholarship readiness.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4 min-w-56">
              <div className="text-sm text-slate-600">Estimated available value</div>
              <div className="mt-1 text-2xl font-black">{money(data?.estimatedValue)}</div>
              <div className="mt-1 text-xs text-slate-500">Across current active matches</div>
            </div>
          </div>
          <div className="mt-6 grid md:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4">
              <div className="text-sm font-bold text-emerald-900">What is helping</div>
              <ul className="mt-3 space-y-2 text-sm text-emerald-900 list-disc pl-5">
                {(readiness?.strengths || []).slice(0, 5).map((item) => <li key={item}>{item}</li>)}
                {(readiness?.strengths || []).length === 0 ? <li>Start by adding GPA, transcript, resume, activities, and LifePath interests.</li> : null}
              </ul>
            </div>
            <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4">
              <div className="text-sm font-bold text-amber-900">Next missing requirement</div>
              <div className="mt-3 text-sm text-amber-900">{readiness?.topMissingRequirement || 'You have the core foundation in place.'}</div>
              <Link href="/portfolio" className="mt-4 inline-flex text-sm font-semibold text-amber-900 underline">Improve portfolio readiness</Link>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="text-sm font-semibold text-slate-600">Application Pipeline</div>
          <div className="mt-4 space-y-3">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 text-left ${activeTab === tab ? 'border-brand-400 bg-brand-50' : 'border-slate-200 hover:bg-slate-50'}`}
              >
                <span className="font-semibold">{labels[tab]}</span>
                <span className="badge">{data?.counts?.[tab] ?? 0}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="card p-6">
        {notice ? <div className="mb-4 rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-900">{notice}</div> : null}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black tracking-tight">{labels[activeTab]}</h2>
            <p className="mt-1 text-sm text-slate-600">Matches are generated from the active student profile, not keyword search.</p>
          </div>
          <Link href="/dashboard" className="btn-secondary">Back to Dashboard</Link>
        </div>

        <div className="mt-6 space-y-4">
          {visibleMatches.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-600">
              No scholarships in this status yet. Add profile signals or save a top match to begin tracking.
            </div>
          ) : visibleMatches.map((match) => (
            <article key={match.scholarshipId} className="rounded-2xl border border-slate-200 p-5">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className="badge">{match.matchScore}% match</span>
                    <span className="badge">{match.readinessPercentage}% ready</span>
                    {match.scholarship.state ? <span className="badge">{match.scholarship.state}</span> : null}
                  </div>
                  <h3 className="text-xl font-black tracking-tight">{match.scholarship.title}</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-700">{match.scholarship.organization || 'Scholarship Provider'} • {money(match.scholarship.amount)} • Deadline {date(match.scholarship.deadline)}</p>
                  {match.scholarship.description ? <p className="mt-3 text-sm text-slate-600 line-clamp-2">{match.scholarship.description}</p> : null}

                  <div className="mt-4 grid md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs font-bold text-slate-600 uppercase tracking-wide">Why this matches</div>
                      <ul className="mt-2 space-y-1 text-sm text-slate-700 list-disc pl-5">
                        {match.matchReason.slice(0, 4).map((reason) => <li key={reason}>{reason}</li>)}
                      </ul>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-600 uppercase tracking-wide">Missing requirements</div>
                      <ul className="mt-2 space-y-1 text-sm text-slate-700 list-disc pl-5">
                        {match.missingRequirements.length ? match.missingRequirements.slice(0, 4).map((item) => <li key={item}>{item}</li>) : <li>No major missing requirements detected.</li>}
                      </ul>
                    </div>
                  </div>

                  {(match.applicationTasks || []).length > 0 ? (
                    <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div>
                          <div className="text-sm font-black text-slate-900">MySRYear application workspace</div>
                          <div className="text-xs text-slate-600">This checklist does not submit the scholarship for you. It keeps tasks, documents, and reminders organized before you apply on the provider site.</div>
                          <div className="mt-1 text-xs text-slate-600">Next: {match.applicationProgress?.nextTask || 'All checklist items complete'}</div>
                        </div>
                        <div className="text-sm font-bold text-slate-800">{match.applicationProgress?.completed || 0}/{match.applicationProgress?.total || 0} done</div>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-white overflow-hidden">
                        <div className="h-full rounded-full bg-brand-500" style={{ width: `${match.applicationProgress?.percentage || 0}%` }} />
                      </div>
                      <div className="mt-4 space-y-2">
                        {(match.applicationTasks || []).map((task) => (
                          <label key={task.id} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm">
                            <input
                              type="checkbox"
                              className="mt-1 h-4 w-4"
                              checked={task.status === 'done'}
                              disabled={busyId === task.id}
                              onChange={(event) => updateTask(task, event.target.checked ? 'done' : 'not_started')}
                            />
                            <span className="min-w-0 flex-1">
                              <span className={task.status === 'done' ? 'font-bold text-slate-500 line-through' : 'font-bold text-slate-900'}>{task.title}</span>
                              {task.description ? <span className="mt-1 block text-xs text-slate-600">{task.description}</span> : null}
                              <span className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                                <span className="badge">{task.category.replace('_', ' ')}</span>
                                {task.due_date ? <span className="badge">Due {date(task.due_date)}</span> : null}
                                {task.upload_required ? <span className="badge">Document needed</span> : null}
                              </span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-col gap-2 lg:min-w-48">
                  {match.status === 'suggested' ? <button className="btn-secondary" disabled={busyId === match.scholarshipId} onClick={() => updateStatus(match, 'saved')}>Save to MySRYear</button> : null}
                  {match.status === 'saved' ? <button className="btn-primary" disabled={busyId === match.scholarshipId} onClick={() => updateStatus(match, 'applying')}>Open Application Workspace</button> : null}
                  {match.status === 'applying' ? <button className="btn-primary" disabled={busyId === match.scholarshipId} onClick={() => updateStatus(match, 'submitted')}>I Submitted This</button> : null}
                  {match.status === 'submitted' ? <button className="btn-secondary" disabled={busyId === match.scholarshipId} onClick={() => updateStatus(match, 'awarded')}>Mark Awarded</button> : null}
                  {match.scholarship.application_url ? (
                    <a className="btn-secondary text-center" href={match.scholarship.application_url} target="_blank" rel="noreferrer">
                      Open Official Application
                    </a>
                  ) : (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                      Official application link not added yet. Use the checklist here while you confirm the provider link.
                    </div>
                  )}
                  <div className="text-xs text-slate-500">MySRYear tracks your process. The scholarship provider receives your application only when you submit on their official site.</div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="card p-6">
        <h2 className="text-xl font-black tracking-tight">Deadline Timeline</h2>
        <div className="mt-4 space-y-3">
          {(data?.upcomingDeadlines || []).length === 0 ? <div className="text-sm text-slate-600">No upcoming deadlines yet.</div> : data?.upcomingDeadlines?.map((item) => (
            <div key={item.id} className="flex justify-between gap-4 rounded-xl border border-slate-200 p-3 text-sm">
              <span className="font-semibold">{item.title}</span>
              <span className="text-slate-600">{date(item.deadline)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
