'use client'

import React, { useEffect, useMemo, useState } from 'react'

type Status = 'Not started' | 'In progress' | 'Submitted' | 'Accepted' | 'Waitlisted' | 'Denied'

type AppType = 'College' | 'Trade/Apprenticeship' | 'Military' | 'Scholarship' | 'Other'
type Round = 'EA' | 'ED' | 'RD' | 'Rolling' | 'N/A'

type Checklist = {
  transcript: boolean
  testScores: boolean
  letters: boolean
  essays: boolean
  appFeePaid: boolean
  fafsa: boolean
}

type Application = {
  id: string
  name: string // School / Program / Scholarship
  program?: string // Major or track
  type: AppType
  round: Round
  deadline?: string // ISO yyyy-mm-dd
  portal?: string // URL
  fee?: number | null
  recommenders?: string // Comma-separated names/emails
  notes?: string
  status: Status
  checklist: Checklist
  lastUpdated: string // ISO
}

const STATUS_OPTIONS: Status[] = [
  'Not started',
  'In progress',
  'Submitted',
  'Accepted',
  'Waitlisted',
  'Denied',
]
const TYPE_OPTIONS: AppType[] = [
  'College',
  'Trade/Apprenticeship',
  'Military',
  'Scholarship',
  'Other',
]
const ROUND_OPTIONS: Round[] = ['EA', 'ED', 'RD', 'Rolling', 'N/A']

const STORAGE_KEY = 'msy_applications_v1'

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function daysUntil(iso?: string) {
  if (!iso) return null
  const d = new Date(iso + 'T00:00:00')
  const diff = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  return diff
}

function fmtDate(iso?: string) {
  if (!iso) return '—'
  try {
    const d = new Date(iso + 'T00:00:00')
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return iso
  }
}

function toICS(app: Application) {
  if (!app.deadline) return ''
  const dt = app.deadline.replace(/-/g, '')
  const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const summary = `Application deadline — ${app.name}${app.program ? ' (' + app.program + ')' : ''}`
  const descLines = [
    app.portal ? `Portal: ${app.portal}` : '',
    app.notes ? `Notes: ${app.notes}` : '',
  ]
    .filter(Boolean)
    .join('\\n')
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//My SR Year//Applications//EN',
    'BEGIN:VEVENT',
    `UID:${app.id}@mysryear`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${dt}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${descLines}`,
    app.portal ? `URL:${app.portal}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\\r\\n')
}

function download(filename: string, content: string, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export default function ApplicationsPage() {
  const [apps, setApps] = useState<Application[]>([])
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setApps(JSON.parse(raw))
    } catch {}
  }, [])
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(apps))
  }, [apps])

  const [editingId, setEditingId] = useState<string | null>(null)
  const editing = apps.find((a) => a.id === editingId) || null

  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<Status | 'All'>('All')
  const [sortKey, setSortKey] = useState<'deadline' | 'name' | 'status'>('deadline')

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const rows = apps.filter((a) => {
      const matchesQ =
        !needle ||
        [a.name, a.program, a.portal, a.notes, a.recommenders]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(needle)
      const matchesStatus = statusFilter === 'All' || a.status === statusFilter
      return matchesQ && matchesStatus
    })
    rows.sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name)
      if (sortKey === 'status')
        return STATUS_OPTIONS.indexOf(a.status) - STATUS_OPTIONS.indexOf(b.status)
      const ad = a.deadline || '9999-12-31'
      const bd = b.deadline || '9999-12-31'
      return ad.localeCompare(bd)
    })
    return rows
  }, [apps, q, statusFilter, sortKey])

  const counts = useMemo(() => {
    const byStatus = Object.fromEntries(STATUS_OPTIONS.map((s) => [s, 0])) as Record<Status, number>
    for (const a of apps) byStatus[a.status]++
    const nearest =
      [...apps]
        .filter((a) => a.deadline && daysUntil(a.deadline)! >= 0)
        .sort((a, b) => (a.deadline || '').localeCompare(b.deadline || ''))[0] || null
    return { byStatus, nearest }
  }, [apps])

  function upsertApp(payload: Omit<Application, 'id' | 'lastUpdated'> & { id?: string }) {
    const base: Application = {
      id: payload.id || uid(),
      name: payload.name,
      program: payload.program,
      type: payload.type,
      round: payload.round,
      deadline: payload.deadline || undefined,
      portal: payload.portal || undefined,
      fee: payload.fee ?? null,
      recommenders: payload.recommenders || undefined,
      notes: payload.notes || undefined,
      status: payload.status,
      checklist: payload.checklist,
      lastUpdated: new Date().toISOString(),
    }
    setApps((prev) => {
      const i = prev.findIndex((a) => a.id === base.id)
      if (i >= 0) {
        const next = [...prev]
        next[i] = base
        return next
      }
      return [base, ...prev]
    })
    setEditingId(null)
  }

  function removeApp(id: string) {
    if (!confirm('Delete this application?')) return
    setApps((prev) => prev.filter((a) => a.id !== id))
  }

  function updateStatus(id: string, status: Status) {
    setApps((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status, lastUpdated: new Date().toISOString() } : a)),
    )
  }

  function updateChecklist(id: string, key: keyof Checklist, val: boolean) {
    setApps((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              checklist: { ...a.checklist, [key]: val },
              lastUpdated: new Date().toISOString(),
            }
          : a,
      ),
    )
  }

  function exportCSV() {
    const header = [
      'Name',
      'Program',
      'Type',
      'Round',
      'Deadline',
      'Status',
      'Portal',
      'Fee',
      'Recommenders',
      'Notes',
    ]
    const rows = apps.map((a) => [
      a.name,
      a.program || '',
      a.type,
      a.round,
      a.deadline || '',
      a.status,
      a.portal || '',
      a.fee ?? '',
      a.recommenders || '',
      (a.notes || '').replace(/\n/g, ' '),
    ])
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    download('applications.csv', csv, 'text/csv')
  }

  function exportJSON() {
    download('applications.json', JSON.stringify(apps, null, 2), 'application/json')
  }

  return (
    <div className="container-prose py-10">
      <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Applications</h1>
      <p className="mt-2 text-slate-700">
        Add each school/program, track deadlines & tasks, and mark status. Data saves to your
        browser (local).
      </p>

      {/* Top stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <Stat label="Not started" value={counts.byStatus['Not started']} />
        <Stat label="In progress" value={counts.byStatus['In progress']} />
        <Stat label="Submitted" value={counts.byStatus['Submitted']} />
        <Stat
          label="Next deadline"
          value={counts.nearest ? fmtDate(counts.nearest.deadline) : '—'}
          note={
            counts.nearest
              ? `${daysUntil(counts.nearest.deadline)} days • ${counts.nearest.name}`
              : ''
          }
        />
      </div>

      {/* Add / Edit form */}
      <div className="card p-6 mt-8">
        <h2 className="text-xl font-bold">{editing ? 'Edit application' : 'Add application'}</h2>
        <AppForm
          key={editing?.id || 'new'}
          initial={
            editing || {
              id: '',
              name: '',
              program: '',
              type: 'College',
              round: 'N/A',
              deadline: '',
              portal: '',
              fee: null,
              recommenders: '',
              notes: '',
              status: 'Not started',
              checklist: {
                transcript: false,
                testScores: false,
                letters: false,
                essays: false,
                appFeePaid: false,
                fafsa: false,
              },
              lastUpdated: todayISO(),
            }
          }
          onCancel={() => setEditingId(null)}
          onSubmit={(values) => upsertApp(values)}
        />
      </div>

      {/* Controls */}
      <div className="card p-4 mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <input
          className="border rounded-2xl px-3 py-2"
          placeholder="Search (school, program, notes...)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="border rounded-2xl px-3 py-2"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as Status | 'All')}
        >
          <option>All</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          className="border rounded-2xl px-3 py-2"
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as 'deadline' | 'name' | 'status')}
        >
          <option value="deadline">Sort by deadline</option>
          <option value="name">Sort by name</option>
          <option value="status">Sort by status</option>
        </select>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="btn-secondary w-full">
            Export CSV
          </button>
          <button onClick={exportJSON} className="btn-secondary w-full">
            Export JSON
          </button>
        </div>
      </div>

      {/* List */}
      <div className="mt-6 space-y-4">
        {filtered.length === 0 && (
          <div className="text-slate-500 text-sm">No applications yet. Add one above!</div>
        )}
        {filtered.map((a) => (
          <div key={a.id} className="card p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <div className="text-lg font-bold truncate">
                  {a.name}
                  {a.program ? ` — ${a.program}` : ''}
                </div>
                <div className="text-sm text-slate-600 flex flex-wrap gap-3 mt-1">
                  <span>
                    <b>{a.type}</b> • {a.round}
                  </span>
                  <span>
                    Deadline: <b>{fmtDate(a.deadline)}</b>
                    {a.deadline ? ` (${daysUntil(a.deadline)}d)` : ''}
                  </span>
                  {a.portal && (
                    <a
                      className="text-brand-700 underline"
                      href={a.portal}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Portal
                    </a>
                  )}
                  {a.fee != null && <span>Fee: ${a.fee}</span>}
                  <span>
                    Status: <b>{a.status}</b>
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="btn-secondary" onClick={() => setEditingId(a.id)}>
                  Edit
                </button>
                <button className="btn" onClick={() => updateStatus(a.id, 'Submitted')}>
                  Mark Submitted
                </button>
                <button
                  className="btn"
                  onClick={() => {
                    if (!a.deadline) return alert('Add a deadline first.')
                    download(
                      `${a.name.replace(/\W+/g, '_')}_deadline.ics`,
                      toICS(a),
                      'text/calendar',
                    )
                  }}
                >
                  Add .ics
                </button>
                <button className="btn" onClick={() => removeApp(a.id)}>
                  Delete
                </button>
              </div>
            </div>

            {/* Checklist */}
            <div className="mt-4 grid sm:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
              {(
                [
                  ['transcript', 'Transcript sent'],
                  ['testScores', 'Test scores sent'],
                  ['letters', 'Letters requested'],
                  ['essays', 'Essays completed'],
                  ['appFeePaid', 'Application fee paid'],
                  ['fafsa', 'FAFSA completed'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={a.checklist[key]}
                    onChange={(e) => updateChecklist(a.id, key, e.target.checked)}
                  />
                  {label}
                </label>
              ))}
            </div>

            {/* Extra */}
            {(a.recommenders || a.notes) && (
              <div className="mt-3 text-sm text-slate-700 space-y-1">
                {a.recommenders && (
                  <div>
                    <b>Recommenders:</b> {a.recommenders}
                  </div>
                )}
                {a.notes && (
                  <div className="whitespace-pre-wrap">
                    <b>Notes:</b> {a.notes}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function Stat({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="card p-4">
      <div className="text-sm text-slate-600">{label}</div>
      <div className="text-2xl font-black mt-1">{value}</div>
      {note && <div className="text-xs text-slate-500 mt-1">{note}</div>}
    </div>
  )
}

function AppForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial: Application
  onSubmit: (a: Omit<Application, 'id' | 'lastUpdated'> & { id?: string }) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState(initial)

  function set<K extends keyof Application>(key: K, value: Application[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return alert('Please enter a school/program name.')
    onSubmit({
      id: form.id || undefined,
      name: form.name.trim(),
      program: form.program?.trim() || '',
      type: form.type,
      round: form.round,
      deadline: form.deadline || '',
      portal: form.portal?.trim() || '',
      fee: (form.fee ?? null) === null || isNaN(Number(form.fee)) ? null : Number(form.fee),
      recommenders: form.recommenders?.trim() || '',
      notes: form.notes || '',
      status: form.status,
      checklist: form.checklist,
    })
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold">School / Program / Scholarship</label>
          <input
            className="border rounded-2xl px-3 py-2 w-full"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="e.g., State University"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold">Major / Track (optional)</label>
          <input
            className="border rounded-2xl px-3 py-2 w-full"
            value={form.program || ''}
            onChange={(e) => set('program', e.target.value)}
            placeholder="e.g., Computer Science"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-semibold">Type</label>
          <select
            className="border rounded-2xl px-3 py-2 w-full"
            value={form.type}
            onChange={(e) => set('type', e.target.value as AppType)}
          >
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold">Round</label>
          <select
            className="border rounded-2xl px-3 py-2 w-full"
            value={form.round}
            onChange={(e) => set('round', e.target.value as Round)}
          >
            {ROUND_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold">Deadline</label>
          <input
            type="date"
            className="border rounded-2xl px-3 py-2 w-full"
            value={form.deadline || ''}
            onChange={(e) => set('deadline', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold">Status</label>
          <select
            className="border rounded-2xl px-3 py-2 w-full"
            value={form.status}
            onChange={(e) => set('status', e.target.value as Status)}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-semibold">Application Portal (URL)</label>
          <input
            className="border rounded-2xl px-3 py-2 w-full"
            value={form.portal || ''}
            onChange={(e) => set('portal', e.target.value)}
            placeholder="https://..."
          />
        </div>
        <div>
          <label className="block text-sm font-semibold">Application Fee (USD)</label>
          <input
            className="border rounded-2xl px-3 py-2 w-full"
            value={form.fee ?? ''}
            onChange={(e) => set('fee', e.target.value === '' ? null : Number(e.target.value))}
            inputMode="numeric"
            placeholder="e.g., 65"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold">Recommenders</label>
          <input
            className="border rounded-2xl px-3 py-2 w-full"
            value={form.recommenders || ''}
            onChange={(e) => set('recommenders', e.target.value)}
            placeholder="Names/emails, comma separated"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold">Notes</label>
        <textarea
          className="border rounded-2xl px-3 py-2 w-full min-h-[90px]"
          value={form.notes || ''}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="Essay topics, visit dates, aid notes, etc."
        />
      </div>

      <div className="grid sm:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
        {(
          [
            ['transcript', 'Transcript sent'],
            ['testScores', 'Test scores sent'],
            ['letters', 'Letters requested'],
            ['essays', 'Essays completed'],
            ['appFeePaid', 'Application fee paid'],
            ['fafsa', 'FAFSA completed'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.checklist[key]}
              onChange={(e) => set('checklist', { ...form.checklist, [key]: e.target.checked })}
            />
            {label}
          </label>
        ))}
      </div>

      <div className="mt-2 flex gap-2">
        <button type="submit" className="btn-primary">
          {form.id ? 'Save changes' : 'Add application'}
        </button>
        {form.id && (
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
