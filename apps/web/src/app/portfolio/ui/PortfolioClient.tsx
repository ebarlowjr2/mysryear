'use client'

import { useEffect, useState, type ChangeEvent } from 'react'
import Link from 'next/link'

type Kind = 'activities' | 'serviceHours' | 'achievements' | 'certifications'

type PortfolioItem = {
  id: string
  title?: string | null
  name?: string | null
  category?: string | null
  description?: string | null
  organization?: string | null
  provider?: string | null
  role?: string | null
  status?: 'planned' | 'in_progress' | 'completed' | null
  hours?: number | null
  supervisor_contact?: string | null
  start_date?: string | null
  end_date?: string | null
  service_date?: string | null
  earned_date?: string | null
  expiration_date?: string | null
  credential_id?: string | null
  uploaded_file_id?: string | null
  uploaded_files?: { id: string; file_name: string; file_path?: string | null; upload_context?: string | null; created_at?: string | null } | null
}

type PortfolioData = {
  ok: boolean
  studentProfileId: string | null
  activities: PortfolioItem[]
  serviceHours: PortfolioItem[]
  achievements: PortfolioItem[]
  certifications: PortfolioItem[]
  summary: {
    activitiesCount: number
    serviceHoursTotal: number
    achievementsCount: number
    certificationsCompleted: number
    proofDocumentsCount: number
    readinessLabel: string
    nextAction: string
    scholarshipReadinessScore: number
    scholarshipReadinessLabel: string
    scholarshipReadinessChecklist: Array<{ label: string; complete: boolean }>
    missingScholarshipItems: string[]
  }
  error?: string
}

type Draft = {
  kind: Kind
  id?: string
  title: string
  category: string
  description: string
  organization: string
  role: string
  hours: string
  supervisor_contact: string
  status: 'planned' | 'in_progress' | 'completed'
  start_date: string
  end_date: string
  service_date: string
  earned_date: string
  expiration_date: string
  credential_id: string
}

const emptyDraft: Draft = {
  kind: 'activities',
  title: '',
  category: '',
  description: '',
  organization: '',
  role: '',
  hours: '',
  supervisor_contact: '',
  status: 'planned',
  start_date: '',
  end_date: '',
  service_date: '',
  earned_date: '',
  expiration_date: '',
  credential_id: '',
}

const labels: Record<Kind, string> = {
  activities: 'Activities & Leadership',
  serviceHours: 'Volunteer / Service Hours',
  achievements: 'Awards & Achievements',
  certifications: 'Certifications',
}

function itemTitle(item: PortfolioItem) {
  return item.title || item.name || 'Untitled'
}

function dateRange(item: PortfolioItem) {
  if (item.service_date) return item.service_date
  if (item.earned_date) return item.earned_date
  if (item.start_date || item.end_date) return [item.start_date, item.end_date].filter(Boolean).join(' - ')
  return null
}

export default function PortfolioClient() {
  const [data, setData] = useState<PortfolioData | null>(null)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [saving, setSaving] = useState(false)
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setError(null)
    const res = await fetch('/api/portfolio')
    const json = (await res.json().catch(() => null)) as PortfolioData | null
    if (!res.ok || !json?.ok) {
      setError(json?.error || 'Failed to load portfolio')
      return
    }
    setData(json)
  }

  useEffect(() => {
    void load()
  }, [])


  function edit(kind: Kind, item: PortfolioItem) {
    setDraft({
      kind,
      id: item.id,
      title: item.title || item.name || '',
      category: item.category || '',
      description: item.description || '',
      organization: item.organization || item.provider || '',
      role: item.role || '',
      hours: item.hours == null ? '' : String(item.hours),
      supervisor_contact: item.supervisor_contact || '',
      status: item.status || 'planned',
      start_date: item.start_date || '',
      end_date: item.end_date || '',
      service_date: item.service_date || '',
      earned_date: item.earned_date || '',
      expiration_date: item.expiration_date || '',
      credential_id: item.credential_id || '',
    })
    setProofFile(null)
  }


  function proofContext(kind: Kind) {
    if (kind === 'certifications') return 'lifepath_certification'
    if (kind === 'serviceHours') return 'portfolio_service_hours'
    if (kind === 'achievements') return 'portfolio_achievement'
    return 'portfolio_activity'
  }

  async function uploadProofFile() {
    if (!proofFile) return null
    const form = new FormData()
    form.append('file', proofFile)
    form.append('upload_context', proofContext(draft.kind))
    const res = await fetch('/api/upload', { method: 'POST', body: form })
    const json = (await res.json().catch(() => null)) as { ok?: boolean; file?: { id: string }; error?: string } | null
    if (!res.ok || !json?.ok || !json.file?.id) {
      throw new Error(json?.error || 'Proof upload failed')
    }
    return json.file.id
  }

  function onProofFileChange(event: ChangeEvent<HTMLInputElement>) {
    setProofFile(event.target.files?.[0] || null)
  }

  async function save() {
    setSaving(true)
    setError(null)
    let uploadedFileId: string | undefined
    try {
      uploadedFileId = (await uploadProofFile()) || undefined
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Proof upload failed')
      setSaving(false)
      return
    }
    const body = {
      ...draft,
      name: draft.title,
      provider: draft.organization,
      hours: draft.hours ? Number(draft.hours) : 0,
      uploaded_file_id: uploadedFileId || undefined,
    }
    try {
      const res = await fetch('/api/portfolio', {
        method: draft.id ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null
      if (!res.ok || !json?.ok) {
        setError(json?.error || 'Save failed')
        return
      }
      setDraft({ ...emptyDraft, kind: draft.kind })
      setProofFile(null)
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function remove(kind: Kind, id: string) {
    setError(null)
    const res = await fetch('/api/portfolio', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind, id }),
    })
    const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null
    if (!res.ok || !json?.ok) {
      setError(json?.error || 'Delete failed')
      return
    }
    await load()
  }

  if (data && !data.studentProfileId) {
    return (
      <div className="card p-6">
        <h2 className="text-xl font-black">No active student profile</h2>
        <p className="mt-2 text-slate-700">Create or select a student profile before building a portfolio.</p>
        <Link href="/profile" className="btn-primary inline-flex mt-4">Go to Profile</Link>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5"><div className="text-sm text-slate-600">Activities</div><div className="text-3xl font-black">{data?.summary.activitiesCount ?? '…'}</div></div>
        <div className="card p-5"><div className="text-sm text-slate-600">Service Hours</div><div className="text-3xl font-black">{data?.summary.serviceHoursTotal ?? '…'}</div></div>
        <div className="card p-5"><div className="text-sm text-slate-600">Achievements</div><div className="text-3xl font-black">{data?.summary.achievementsCount ?? '…'}</div></div>
        <div className="card p-5"><div className="text-sm text-slate-600">Certifications</div><div className="text-3xl font-black">{data?.summary.certificationsCompleted ?? '…'}</div></div>
        <div className="card p-5 sm:col-span-2 lg:col-span-4"><div className="text-sm text-slate-600">Scholarship Readiness</div><div className="mt-1 flex items-end gap-3"><span className="text-3xl font-black">{data?.summary.scholarshipReadinessScore ?? '…'}%</span><span className="pb-1 text-sm font-semibold text-slate-600">{data?.summary.scholarshipReadinessLabel || 'Loading'}</span></div></div>
      </div>

      <div className="card p-6">
        <h2 className="text-xl font-black">Portfolio Readiness</h2>
        <p className="mt-2 text-slate-700">{data?.summary.readinessLabel || 'Loading'} — {data?.summary.nextAction || 'Add portfolio evidence.'}</p>
        {data?.summary.scholarshipReadinessChecklist?.length ? <div className="mt-4 grid sm:grid-cols-2 gap-2 text-sm">{data.summary.scholarshipReadinessChecklist.map((item) => <div key={item.label} className={item.complete ? 'text-emerald-700' : 'text-slate-600'}>{item.complete ? '[x]' : '[ ]'} {item.label}</div>)}</div> : null}
      </div>

      <div className="grid lg:grid-cols-[360px_1fr] gap-8">
        <div className="card p-6 h-fit">
          <h2 className="text-xl font-black">{draft.id ? 'Edit' : 'Add'} Portfolio Item</h2>
          <div className="mt-4 space-y-3">
            <label className="block text-sm font-semibold">Section</label>
            <select className="w-full rounded-lg border border-slate-300 p-3" value={draft.kind} onChange={(e) => setDraft({ ...emptyDraft, kind: e.target.value as Kind })}>
              {Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>

            <input className="w-full rounded-lg border border-slate-300 p-3" placeholder={draft.kind === 'certifications' ? 'Certification name' : 'Title'} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            <input className="w-full rounded-lg border border-slate-300 p-3" placeholder="Category/type" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} />
            <textarea className="w-full rounded-lg border border-slate-300 p-3" placeholder="Description/notes" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            <input className="w-full rounded-lg border border-slate-300 p-3" placeholder={draft.kind === 'certifications' ? 'Provider' : 'Organization'} value={draft.organization} onChange={(e) => setDraft({ ...draft, organization: e.target.value })} />

            {draft.kind === 'activities' ? <input className="w-full rounded-lg border border-slate-300 p-3" placeholder="Role/position" value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} /> : null}
            {draft.kind === 'serviceHours' ? <>
              <input className="w-full rounded-lg border border-slate-300 p-3" placeholder="Hours" type="number" min="0" value={draft.hours} onChange={(e) => setDraft({ ...draft, hours: e.target.value })} />
              <input className="w-full rounded-lg border border-slate-300 p-3" placeholder="Supervisor/contact" value={draft.supervisor_contact} onChange={(e) => setDraft({ ...draft, supervisor_contact: e.target.value })} />
              <input className="w-full rounded-lg border border-slate-300 p-3" type="date" value={draft.service_date} onChange={(e) => setDraft({ ...draft, service_date: e.target.value })} />
            </> : null}
            {draft.kind === 'certifications' ? <>
              <select className="w-full rounded-lg border border-slate-300 p-3" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as Draft['status'] })}>
                <option value="planned">Planned</option>
                <option value="in_progress">In progress</option>
                <option value="completed">Completed</option>
              </select>
              <input className="w-full rounded-lg border border-slate-300 p-3" placeholder="Credential ID" value={draft.credential_id} onChange={(e) => setDraft({ ...draft, credential_id: e.target.value })} />
            </> : null}
            {draft.kind === 'activities' ? <div className="grid grid-cols-2 gap-2"><input className="rounded-lg border border-slate-300 p-3" type="date" value={draft.start_date} onChange={(e) => setDraft({ ...draft, start_date: e.target.value })} /><input className="rounded-lg border border-slate-300 p-3" type="date" value={draft.end_date} onChange={(e) => setDraft({ ...draft, end_date: e.target.value })} /></div> : null}
            {(draft.kind === 'achievements' || draft.kind === 'certifications') ? <input className="w-full rounded-lg border border-slate-300 p-3" type="date" value={draft.earned_date} onChange={(e) => setDraft({ ...draft, earned_date: e.target.value })} /> : null}
            {draft.kind === 'certifications' ? <input className="w-full rounded-lg border border-slate-300 p-3" type="date" value={draft.expiration_date} onChange={(e) => setDraft({ ...draft, expiration_date: e.target.value })} /> : null}
            <label className="block text-sm font-semibold text-slate-700">Optional proof attachment</label>
            <input className="w-full rounded-lg border border-slate-300 p-3 text-sm" type="file" onChange={onProofFileChange} />
            {draft.id ? <p className="text-xs text-slate-500">To replace proof, add a new entry for now. Editing attached files will be refined later.</p> : null}

            <button className="btn-primary w-full" type="button" onClick={save} disabled={saving}>{saving ? 'Saving...' : draft.id ? 'Save Changes' : 'Add Item'}</button>
            {draft.id ? <button className="btn-secondary w-full" type="button" onClick={() => setDraft({ ...emptyDraft, kind: draft.kind })}>Cancel edit</button> : null}
          </div>
        </div>

        <div className="space-y-6">
          {(Object.keys(labels) as Kind[]).map((kind) => {
            const items = data?.[kind] || []
            return (
              <section key={kind} className="card p-6">
                <h2 className="text-xl font-black">{labels[kind]}</h2>
                <div className="mt-4 space-y-3">
                  {items.length === 0 ? <div className="text-sm text-slate-600">No entries yet.</div> : items.map((item) => (
                    <div key={item.id} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="font-bold text-slate-950">{itemTitle(item)}</div>
                          <div className="mt-1 text-sm text-slate-600">
                            {[item.category, item.organization || item.provider, item.role, dateRange(item)].filter(Boolean).join(' • ')}
                          </div>
                          {kind === 'serviceHours' ? <div className="mt-1 text-sm font-semibold">{Number(item.hours || 0)} hours</div> : null}
                          {kind === 'certifications' ? <div className="mt-1 text-sm font-semibold capitalize">{String(item.status || 'planned').replace('_', ' ')}</div> : null}
                          {item.description ? <div className="mt-2 text-sm text-slate-700">{item.description}</div> : null}
                          {item.uploaded_files?.file_name ? <div className="mt-3 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Proof: {item.uploaded_files.file_name}</div> : null}
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button className="btn-secondary" type="button" onClick={() => edit(kind, item)}>Edit</button>
                          <button className="btn-secondary" type="button" onClick={() => remove(kind, item.id)}>Delete</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
