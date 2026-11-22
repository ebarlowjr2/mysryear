'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CAREER_MATCH_DISCLAIMER,
  TRACKED_STATUS_LABELS,
  buildScholarshipDetail,
  formatAwardAmount,
  formatCatalogDate,
  type ScholarshipDiscoveryInput,
  type TrackedStatus,
} from '@mysryear/shared'

type ApiResponse = { ok: boolean; error?: string; hasActiveStudent?: boolean; now?: string; clockFixed?: boolean; input?: ScholarshipDiscoveryInput }

const NEXT_STEP: Partial<Record<TrackedStatus | 'none', { status: TrackedStatus; label: string }>> = {
  none: { status: 'saved', label: 'Save to my tracker' },
  saved: { status: 'applying', label: 'Start application checklist' },
  applying: { status: 'submitted', label: 'I submitted this' },
  submitted: { status: 'awarded', label: 'Mark awarded' },
}

export default function ScholarshipDetailView({ scholarshipId }: { scholarshipId: string }) {
  const [response, setResponse] = useState<ApiResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/scholarships/matches', { credentials: 'include', cache: 'no-store' })
    const json = (await res.json().catch(() => null)) as ApiResponse | null
    if (!res.ok || !json?.ok) setError(json?.error || 'Could not load this scholarship.')
    else setResponse(json)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const detail = useMemo(() => {
    if (!response?.input) return null
    const now = response.clockFixed && response.now ? new Date(response.now) : new Date()
    return buildScholarshipDetail(response.input, scholarshipId, now)
  }, [response, scholarshipId])

  async function setStatus(status: TrackedStatus) {
    setBusy(true)
    await fetch('/api/scholarships/matches', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ scholarshipId, status }),
    })
    setBusy(false)
    await load()
  }

  async function toggleTask(taskId: string, done: boolean) {
    await fetch('/api/scholarships/application-tasks', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ taskId, status: done ? 'done' : 'not_started' }),
    })
    await load()
  }

  if (error) return <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="alert">{error}</div>
  if (!response) return <div className="card p-8 text-center" role="status">Loading…</div>
  if (!detail) {
    return (
      <div className="card p-8 space-y-3">
        <h1 className="text-2xl font-black">This scholarship is no longer listed</h1>
        <p className="text-slate-700">It may have closed or failed a sponsor check. Awards you tracked stay in your tracker.</p>
        <Link className="btn-secondary inline-flex" href="/scholarships">Back to scholarships</Link>
      </div>
    )
  }

  const { entry, availability, trackedStatus, tasks, progress, careerMatch } = detail
  const next = NEXT_STEP[trackedStatus ?? 'none']

  return (
    <article className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]" data-scholarship-id={entry.id}>
      <div className="space-y-5 min-w-0">
        <Link href="/scholarships" className="text-sm font-semibold text-brand-700">← All scholarships</Link>
        <header>
          <h1 className="text-3xl font-black tracking-tight">{entry.title}</h1>
          <p className="mt-1 text-slate-700">{entry.organization}</p>
          {trackedStatus ? <span className="badge mt-3 inline-flex">{TRACKED_STATUS_LABELS[trackedStatus]}</span> : null}
        </header>
        {entry.earlyClosureNote ? <p className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">⚠ {entry.earlyClosureNote}</p> : null}
        {entry.eligibilitySummary ? (
          <section className="card p-5">
            <h2 className="font-black">Who can apply</h2>
            <p className="mt-2 text-slate-800">{entry.eligibilitySummary}</p>
          </section>
        ) : null}
        {careerMatch ? (
          <section className="card p-5">
            <h2 className="font-black">Why A.U.R.A. suggests this</h2>
            <ul className="mt-2 list-disc pl-5 text-slate-800">{careerMatch.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
            {careerMatch.toCheck.length ? (
              <>
                <h3 className="mt-3 text-sm font-bold text-slate-600">Still to check</h3>
                <ul className="list-disc pl-5 text-slate-700 text-sm">{careerMatch.toCheck.map((c) => <li key={c}>{c}</li>)}</ul>
              </>
            ) : null}
            <p className="mt-3 text-xs italic text-slate-600">{CAREER_MATCH_DISCLAIMER}</p>
          </section>
        ) : null}
        {trackedStatus ? (
          <section className="card p-5">
            <h2 className="font-black">Application checklist</h2>
            <p className="text-sm text-slate-600">{progress.completed}/{progress.total} done. You submit on the sponsor&apos;s official site.</p>
            <ul className="mt-3 space-y-2">
              {tasks.map((task) => (
                <li key={task.id}>
                  <label className="flex items-start gap-2 text-sm">
                    <input type="checkbox" className="mt-1" checked={task.status === 'done'} onChange={(e) => toggleTask(task.id, e.target.checked)} />
                    <span>{task.title}{task.due_date ? <span className="text-slate-500"> · due {task.due_date}</span> : null}</span>
                  </label>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <p className="text-xs text-slate-500">
          {entry.lastVerifiedAt ? `Checked on the sponsor page ${formatCatalogDate(entry.lastVerifiedAt)}.` : 'Not yet confirmed with the sponsor.'} {entry.attribution ?? ''}
        </p>
      </div>
      <aside className="card p-5 space-y-3 self-start">
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
          <dt className="text-slate-500">Award</dt><dd className="font-bold">{formatAwardAmount(entry)}</dd>
          <dt className="text-slate-500">Status</dt><dd className="font-semibold">{availability.label}</dd>
          {entry.opensAt ? (<><dt className="text-slate-500">Opens</dt><dd>{formatCatalogDate(entry.opensAt, entry.deadlineTimezone)}</dd></>) : null}
          {entry.state ? (<><dt className="text-slate-500">Location</dt><dd>{entry.state}</dd></>) : null}
        </dl>
        {availability.canApply && entry.applicationUrl ? (
          <a className="btn-primary w-full text-center" href={entry.applicationUrl} target="_blank" rel="noreferrer">Apply on official site ↗</a>
        ) : null}
        {response.hasActiveStudent && next ? (
          <button className="btn-secondary w-full" disabled={busy} onClick={() => setStatus(next.status)}>{next.label}</button>
        ) : null}
        {response.hasActiveStudent && trackedStatus === 'submitted' ? (
          <button className="btn-secondary w-full" disabled={busy} onClick={() => setStatus('rejected')}>Mark not awarded</button>
        ) : null}
        {entry.sourceUrl && entry.sourceUrl !== entry.applicationUrl ? (
          <a className="block text-sm text-brand-700 underline" href={entry.sourceUrl} target="_blank" rel="noreferrer">Sponsor information page ↗</a>
        ) : null}
      </aside>
    </article>
  )
}
