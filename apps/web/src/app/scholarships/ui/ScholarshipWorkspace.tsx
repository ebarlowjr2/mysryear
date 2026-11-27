'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  SCHOLARSHIP_FIELDS,
  SCHOLARSHIP_FIELD_TAGS,
  TRACKED_STATUSES,
  TRACKED_STATUS_LABELS,
  buildScholarshipDiscovery,
  formatAwardAmount,
  type CatalogCard,
  type ScholarshipCatalogFilters,
  type ScholarshipDiscoveryInput,
  type ScholarshipFieldTag,
  type TrackedAward,
  type TrackedStatus,
} from '@mysryear/shared'

type ApiResponse = {
  ok: boolean
  error?: string
  hasActiveStudent?: boolean
  now?: string
  clockFixed?: boolean
  input?: ScholarshipDiscoveryInput
}

const US_STATES = 'AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' ')

const READINESS_LINKS: Record<string, string> = {
  gpa: '/grades',
  transcript: '/grades',
  resume: '/portfolio',
  service: '/portfolio',
  activity: '/portfolio',
  achievement: '/portfolio',
  certification: '/portfolio',
  careers: '/aura/lifepath/select',
}

const NEXT_STEP: Partial<Record<TrackedStatus, { status: TrackedStatus; label: string }>> = {
  saved: { status: 'applying', label: 'Start checklist' },
  applying: { status: 'submitted', label: 'I submitted this' },
  submitted: { status: 'awarded', label: 'Mark awarded' },
}

export default function ScholarshipWorkspace() {
  const [response, setResponse] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [state, setState] = useState('')
  const [field, setField] = useState<ScholarshipFieldTag | ''>('')
  const [within, setWithin] = useState<string>('')
  const [level, setLevel] = useState<'any' | 'high-school' | 'college'>('any')
  const [page, setPage] = useState(1)
  const [trackerTab, setTrackerTab] = useState<TrackedStatus>('saved')

  const load = useCallback(async () => {
    setLoadError(null)
    const res = await fetch('/api/scholarships/matches', { credentials: 'include', cache: 'no-store' })
    const json = (await res.json().catch(() => null)) as ApiResponse | null
    setLoading(false)
    if (!res.ok || !json?.ok || !json.input) {
      setLoadError(json?.error || 'Scholarships could not be loaded.')
      return
    }
    setResponse(json)
  }, [])

  useEffect(() => {
    void load()
    // Recompute when the student returns from the LifePath picker or switches
    // the active student in another tab.
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [load])

  const filters: ScholarshipCatalogFilters = useMemo(
    () => ({ query, state, field, deadlineWithinDays: within ? Number(within) : null, level }),
    [query, state, field, within, level],
  )

  const discovery = useMemo(() => {
    if (!response?.input) return null
    const now = response.clockFixed && response.now ? new Date(response.now) : new Date()
    return buildScholarshipDiscovery(response.input, { now, filters, page })
  }, [response, filters, page])

  function update<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v)
      setPage(1)
    }
  }

  async function setStatus(scholarshipId: string, status: TrackedStatus, title: string) {
    setBusyId(scholarshipId)
    setNotice(null)
    const res = await fetch('/api/scholarships/matches', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ scholarshipId, status }),
    })
    const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null
    setBusyId(null)
    if (!res.ok || !json?.ok) {
      setNotice(json?.error || 'Could not update this scholarship.')
      return
    }
    setNotice(`${title}: ${TRACKED_STATUS_LABELS[status]}.`)
    await load()
  }

  async function toggleTask(taskId: string, done: boolean) {
    setBusyId(taskId)
    await fetch('/api/scholarships/application-tasks', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ taskId, status: done ? 'done' : 'not_started' }),
    })
    setBusyId(null)
    await load()
  }

  if (loading) {
    return <div className="card p-8 text-center text-slate-700" role="status">Loading open scholarships…</div>
  }
  if (loadError || !discovery || !response?.input) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900" role="alert">
        {loadError || 'Scholarships could not be loaded.'}{' '}
        <button className="underline font-semibold" onClick={() => void load()}>Try again</button>
      </div>
    )
  }

  const canTrack = Boolean(response.hasActiveStudent)
  const { catalog, forYou, tracker, readiness } = discovery
  const trackerItems = tracker.items.filter((i) => i.status === trackerTab)

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-8 min-w-0">
        {notice ? <div className="rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm text-brand-900" role="status">{notice}</div> : null}

        <section aria-labelledby="open-heading" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="open-heading" className="text-2xl font-black tracking-tight">Open scholarships</h2>
              <p className="text-sm text-slate-600">
                {catalog.state === 'unavailable'
                  ? 'Listings are temporarily unavailable.'
                  : `${catalog.openCount} open now${catalog.upcomingCount ? ` · ${catalog.upcomingCount} opening soon` : ''} · each checked on the sponsor's official page`}
              </p>
            </div>
          </div>

          <form className="card p-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5" role="search" onSubmit={(e) => e.preventDefault()}>
            <label className="text-sm font-semibold sm:col-span-2 xl:col-span-2">
              Search
              <input className="input mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" type="search" value={query} onChange={(e) => update(setQuery)(e.target.value)} placeholder="Award, sponsor, major…" />
            </label>
            <label className="text-sm font-semibold">
              Location
              <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value={state} onChange={(e) => update(setState)(e.target.value)}>
                <option value="">Anywhere</option>
                <option value="national">National awards only</option>
                {US_STATES.map((s) => <option key={s} value={s}>National + {s}</option>)}
              </select>
            </label>
            <label className="text-sm font-semibold">
              Field
              <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value={field} onChange={(e) => update(setField)(e.target.value as ScholarshipFieldTag | '')}>
                <option value="">All fields</option>
                {SCHOLARSHIP_FIELD_TAGS.map((t) => <option key={t} value={t}>{SCHOLARSHIP_FIELDS[t].label}</option>)}
              </select>
            </label>
            <label className="text-sm font-semibold">
              Deadline
              <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value={within} onChange={(e) => update(setWithin)(e.target.value)}>
                <option value="">Any deadline</option>
                <option value="14">Closing in 2 weeks</option>
                <option value="30">Closing in 30 days</option>
                <option value="60">Closing in 60 days</option>
              </select>
            </label>
            <fieldset className="text-sm sm:col-span-2 xl:col-span-5 flex flex-wrap gap-4 items-center">
              <legend className="sr-only">Who can apply</legend>
              {(['any', 'high-school', 'college'] as const).map((l) => (
                <label key={l} className="inline-flex items-center gap-2">
                  <input type="radio" name="level" checked={level === l} onChange={() => update(setLevel)(l)} />
                  {l === 'any' ? 'Everyone' : l === 'high-school' ? 'Open to high school students' : 'College students'}
                </label>
              ))}
            </fieldset>
          </form>

          {catalog.state !== 'ok' ? (
            <div className={`rounded-xl border p-4 text-sm ${catalog.state === 'unavailable' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-slate-200 bg-slate-50 text-slate-700'}`} role="status" data-testid={`catalog-${catalog.state}`}>
              {catalog.message}
            </div>
          ) : null}

          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2" data-testid="open-scholarships" aria-label="Open scholarships">
            {catalog.page.items.map((card) => (
              <li key={card.scholarshipId} className="min-w-0">
                <AwardCard card={card} canTrack={canTrack} busy={busyId === card.scholarshipId} onSave={() => setStatus(card.scholarshipId, 'saved', card.entry.title)} />
              </li>
            ))}
          </ul>

          {catalog.page.pageCount > 1 ? (
            <nav className="flex items-center justify-between gap-3" aria-label="Scholarship pages">
              <button className="btn-secondary" disabled={!catalog.page.hasPrevious} onClick={() => setPage(catalog.page.page - 1)}>Previous</button>
              <span className="text-sm text-slate-600" aria-live="polite">Page {catalog.page.page} of {catalog.page.pageCount} · {catalog.page.total} awards</span>
              <button className="btn-secondary" disabled={!catalog.page.hasNext} onClick={() => setPage(catalog.page.page + 1)}>Next</button>
            </nav>
          ) : null}
        </section>

        <section aria-labelledby="foryou-heading" className="card p-5 bg-indigo-50/60 border-indigo-100 space-y-3" data-testid="for-you">
          <h2 id="foryou-heading" className="text-xl font-black tracking-tight">For your A.U.R.A. career plans</h2>
          {forYou.careers.length ? (
            <p className="text-sm text-slate-700">Based on {forYou.careers.map((c) => `#${c.rank} ${c.title}`).join(' · ')}. <Link className="underline" href="/aura/lifepath/select">Change plans</Link></p>
          ) : null}
          {forYou.state !== 'ok' ? (
            <div className="text-sm text-slate-700 space-y-3">
              <p>{forYou.message}</p>
              {forYou.state === 'needs-interests' ? <Link className="btn-primary inline-flex" href="/aura/lifepath/select">Choose career interests</Link> : null}
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {forYou.items.map((m) => (
                <li key={m.scholarshipId} className="min-w-0 break-words rounded-xl bg-white border border-slate-200 p-4">
                  <Link href={`/scholarships/${m.scholarshipId}`} className="font-black text-slate-900 hover:underline">{m.entry.title}</Link>
                  <p className="text-xs text-slate-600 mt-1">{m.availability.label} · {formatAwardAmount(m.entry)}</p>
                  <p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-500">Why it appears</p>
                  <ul className="text-sm text-slate-800 list-disc pl-5">{m.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
                  {m.toCheck.length ? (
                    <>
                      <p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-500">Still to check</p>
                      <ul className="text-sm text-slate-600 list-disc pl-5">{m.toCheck.map((c) => <li key={c}>{c}</li>)}</ul>
                    </>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {forYou.state === 'ok' ? <p className="text-xs italic text-slate-600">{forYou.disclaimer}</p> : null}
        </section>

        <section aria-labelledby="tracker-heading" className="card p-5 space-y-4" data-testid="tracker">
          <h2 id="tracker-heading" className="text-xl font-black tracking-tight">My scholarship tracker</h2>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Tracker status">
            {TRACKED_STATUSES.map((s) => (
              <button key={s} role="tab" aria-selected={trackerTab === s} className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${trackerTab === s ? 'border-brand-500 bg-brand-50 text-brand-900' : 'border-slate-200'}`} onClick={() => setTrackerTab(s)}>
                {TRACKED_STATUS_LABELS[s]} ({tracker.counts[s]})
              </button>
            ))}
          </div>
          {trackerItems.length === 0 ? (
            <p className="text-sm text-slate-600">Nothing marked {TRACKED_STATUS_LABELS[trackerTab].toLowerCase()} yet{trackerTab === 'saved' ? ' — save an open scholarship to start tracking it.' : '.'}</p>
          ) : (
            <ul className="space-y-3">
              {trackerItems.map((item) => (
                <TrackerItem key={item.scholarshipId} item={item} busyId={busyId} onStatus={setStatus} onTask={toggleTask} />
              ))}
            </ul>
          )}
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-6 self-start">
        <section className="card p-5" aria-labelledby="deadlines-heading">
          <h2 id="deadlines-heading" className="font-black">Upcoming deadlines</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {discovery.upcomingDeadlines.length === 0 ? <li className="text-slate-600">No upcoming deadlines.</li> : null}
            {discovery.upcomingDeadlines.map((d) => (
              <li key={d.scholarshipId}>
                <Link className="font-semibold hover:underline" href={`/scholarships/${d.scholarshipId}`}>{d.title}</Link>
                <div className="text-slate-600">{d.label}{d.tracked ? ' · tracked' : ''}</div>
              </li>
            ))}
          </ul>
        </section>
        {canTrack ? (
          <section className="card p-5" aria-labelledby="readiness-heading">
            <h2 id="readiness-heading" className="font-black">Strengthen your applications</h2>
            <p className="text-sm text-slate-600 mt-1">Profile {readiness.percentage}% complete. Not required to browse or apply.</p>
            <ul className="mt-3 space-y-2 text-sm">
              {readiness.actions.slice(0, 4).map((a) => (
                <li key={a.key}><Link className="text-brand-700 font-semibold hover:underline" href={READINESS_LINKS[a.key] ?? '/portfolio'}>{a.label} →</Link></li>
              ))}
              {readiness.actions.length === 0 ? <li className="text-slate-700">Your scholarship profile basics are in place.</li> : null}
            </ul>
          </section>
        ) : null}
      </aside>
    </div>
  )
}

function AwardCard({ card, canTrack, busy, onSave }: { card: CatalogCard; canTrack: boolean; busy: boolean; onSave: () => void }) {
  const { entry, availability } = card
  return (
    <article className="card h-full min-w-0 break-words p-5 flex flex-col gap-2" data-scholarship-id={card.scholarshipId}>
      <h3 className="text-lg font-black leading-snug">
        <Link href={`/scholarships/${card.scholarshipId}`} className="hover:underline">{entry.title}</Link>
      </h3>
      <p className="text-sm text-slate-600">{entry.organization}</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 text-sm">
        <dt className="text-slate-500">Award</dt>
        <dd className="font-bold">{formatAwardAmount(entry)}</dd>
        <dt className="text-slate-500">{availability.state === 'upcoming' ? 'Window' : 'Deadline'}</dt>
        <dd className={`font-semibold ${availability.closingSoon ? 'text-amber-700' : ''}`}>{availability.label}</dd>
      </dl>
      {entry.eligibilitySummary ? <p className="text-sm text-slate-700 line-clamp-3">{entry.eligibilitySummary}</p> : null}
      {entry.earlyClosureNote ? <p className="text-xs text-amber-800 bg-amber-50 rounded-lg p-2">⚠ {entry.earlyClosureNote}</p> : null}
      <div className="mt-auto flex flex-wrap gap-2 pt-2">
        {availability.canApply && entry.applicationUrl ? (
          <a className="btn-primary" href={entry.applicationUrl} target="_blank" rel="noreferrer" aria-label={`Apply to ${entry.title} on the official site (opens in a new tab)`}>Apply ↗</a>
        ) : (
          <span className="btn-secondary opacity-60 cursor-not-allowed" aria-disabled="true">Not open yet</span>
        )}
        {card.trackedStatus ? (
          <span className="badge self-center">{TRACKED_STATUS_LABELS[card.trackedStatus]}</span>
        ) : canTrack ? (
          <button className="btn-secondary" disabled={busy} onClick={onSave} aria-label={`Save ${entry.title}`}>{busy ? 'Saving…' : 'Save'}</button>
        ) : null}
        <Link className="text-sm font-semibold text-brand-700 self-center hover:underline" href={`/scholarships/${card.scholarshipId}`}>Details</Link>
      </div>
    </article>
  )
}

function TrackerItem({
  item,
  busyId,
  onStatus,
  onTask,
}: {
  item: TrackedAward
  busyId: string | null
  onStatus: (id: string, status: TrackedStatus, title: string) => void
  onTask: (taskId: string, done: boolean) => void
}) {
  const next = NEXT_STEP[item.status]
  const title = item.entry?.title ?? 'Scholarship'
  return (
    <li className="rounded-xl border border-slate-200 p-4">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <Link href={`/scholarships/${item.scholarshipId}`} className="font-black hover:underline">{title}</Link>
          <p className="text-sm text-slate-600">{item.availability?.label ?? 'Details unavailable'}</p>
          {item.progress.total ? <p className="text-xs text-slate-500 mt-1">{item.progress.completed}/{item.progress.total} tasks done · Next: {item.progress.nextTask ?? 'all done'}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2 items-start">
          {next ? <button className="btn-secondary" disabled={busyId === item.scholarshipId} onClick={() => onStatus(item.scholarshipId, next.status, title)}>{next.label}</button> : null}
          {item.status === 'submitted' ? <button className="btn-secondary" disabled={busyId === item.scholarshipId} onClick={() => onStatus(item.scholarshipId, 'rejected', title)}>Not awarded</button> : null}
          {item.availability?.canApply && item.entry?.applicationUrl ? <a className="btn-primary" href={item.entry.applicationUrl} target="_blank" rel="noreferrer">Apply ↗</a> : null}
        </div>
      </div>
      {item.tasks.length ? (
        <ul className="mt-3 space-y-1">
          {item.tasks.map((task) => (
            <li key={task.id}>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1" checked={task.status === 'done'} disabled={busyId === task.id} onChange={(e) => onTask(task.id, e.target.checked)} />
                <span className={task.status === 'done' ? 'line-through text-slate-500' : ''}>
                  {task.title}{task.due_date ? <span className="text-slate-500"> · due {task.due_date}</span> : null}
                </span>
              </label>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  )
}
