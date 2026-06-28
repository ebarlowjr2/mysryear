'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { labelFromValue, opportunityStatuses, opportunityTypes, type BusinessOpportunity } from './business-types'

type Props = { initialOpportunity?: Partial<BusinessOpportunity> | null; mode: 'create' | 'edit' }

const blank = {
  title: '',
  opportunity_type: 'internship',
  description: '',
  location_type: '',
  city: '',
  state: '',
  remote_available: false,
  age_min: '',
  grade_min: '',
  grade_max: '',
  career_category: '',
  related_career_ids: '',
  skills: '',
  application_url: '',
  contact_email: '',
  deadline: '',
  start_date: '',
  end_date: '',
  paid: false,
  compensation: '',
  hours_required: '',
  status: 'active',
}

export default function OpportunityForm({ initialOpportunity, mode }: Props) {
  const router = useRouter()
  const [form, setForm] = useState({
    ...blank,
    ...Object.fromEntries(
      Object.entries(initialOpportunity || {}).map(([key, value]) => [
        key,
        Array.isArray(value) ? value.join(', ') : value ?? (key === 'remote_available' || key === 'paid' ? false : ''),
      ]),
    ),
  } as typeof blank & { id?: string })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function update(field: keyof typeof blank, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const payload = {
      ...form,
      id: initialOpportunity?.id,
      age_min: form.age_min ? Number(form.age_min) : null,
    }
    const res = await fetch('/api/business/opportunities', {
      method: mode === 'edit' ? 'PATCH' : 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; opportunity?: BusinessOpportunity } | null
    setSaving(false)
    if (!res.ok || !json?.ok) {
      setError(json?.error || 'Could not save opportunity')
      return
    }
    router.push('/business/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="card p-6 space-y-5">
      <div>
        <h2 className="text-xl font-black tracking-tight">{mode === 'edit' ? 'Edit Opportunity' : 'Create Opportunity'}</h2>
        <p className="mt-1 text-sm text-slate-600">Active opportunities appear on the student and parent board.</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">
          Title
          <input className="input mt-2 w-full px-4 py-3 rounded-lg" value={form.title} onChange={(e) => update('title', e.target.value)} required />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Type
          <select className="input mt-2 w-full px-4 py-3 rounded-lg" value={form.opportunity_type} onChange={(e) => update('opportunity_type', e.target.value)}>
            {opportunityTypes.map((type) => <option key={type} value={type}>{labelFromValue(type)}</option>)}
          </select>
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Status
          <select className="input mt-2 w-full px-4 py-3 rounded-lg" value={form.status} onChange={(e) => update('status', e.target.value)}>
            {opportunityStatuses.map((status) => <option key={status} value={status}>{labelFromValue(status)}</option>)}
          </select>
        </label>
        <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">
          Description
          <textarea className="input mt-2 w-full px-4 py-3 rounded-lg min-h-36" value={form.description} onChange={(e) => update('description', e.target.value)} required />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Career category
          <input className="input mt-2 w-full px-4 py-3 rounded-lg" value={form.career_category} onChange={(e) => update('career_category', e.target.value)} placeholder="Technology, Healthcare..." />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Related career IDs
          <input className="input mt-2 w-full px-4 py-3 rounded-lg" value={form.related_career_ids} onChange={(e) => update('related_career_ids', e.target.value)} placeholder="software-engineer, cloud-engineer" />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Location type
          <input className="input mt-2 w-full px-4 py-3 rounded-lg" value={form.location_type} onChange={(e) => update('location_type', e.target.value)} placeholder="In-person, hybrid, remote" />
        </label>
        <label className="flex items-center gap-3 text-sm font-semibold text-slate-700 pt-8">
          <input type="checkbox" checked={Boolean(form.remote_available)} onChange={(e) => update('remote_available', e.target.checked)} />
          Remote available
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          City
          <input className="input mt-2 w-full px-4 py-3 rounded-lg" value={form.city} onChange={(e) => update('city', e.target.value)} />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          State
          <input className="input mt-2 w-full px-4 py-3 rounded-lg" value={form.state} onChange={(e) => update('state', e.target.value.toUpperCase())} maxLength={2} />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Minimum age
          <input className="input mt-2 w-full px-4 py-3 rounded-lg" value={form.age_min} onChange={(e) => update('age_min', e.target.value)} inputMode="numeric" />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Grade range
          <div className="grid grid-cols-2 gap-2 mt-2">
            <input className="input w-full px-4 py-3 rounded-lg" value={form.grade_min} onChange={(e) => update('grade_min', e.target.value)} placeholder="Min" />
            <input className="input w-full px-4 py-3 rounded-lg" value={form.grade_max} onChange={(e) => update('grade_max', e.target.value)} placeholder="Max" />
          </div>
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Skills
          <input className="input mt-2 w-full px-4 py-3 rounded-lg" value={form.skills} onChange={(e) => update('skills', e.target.value)} placeholder="Communication, Python, Welding" />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Application URL
          <input className="input mt-2 w-full px-4 py-3 rounded-lg" value={form.application_url} onChange={(e) => update('application_url', e.target.value)} placeholder="https://..." />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Contact email
          <input className="input mt-2 w-full px-4 py-3 rounded-lg" type="email" value={form.contact_email} onChange={(e) => update('contact_email', e.target.value)} />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Deadline
          <input className="input mt-2 w-full px-4 py-3 rounded-lg" type="date" value={form.deadline} onChange={(e) => update('deadline', e.target.value)} />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Start date
          <input className="input mt-2 w-full px-4 py-3 rounded-lg" type="date" value={form.start_date} onChange={(e) => update('start_date', e.target.value)} />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          End date
          <input className="input mt-2 w-full px-4 py-3 rounded-lg" type="date" value={form.end_date} onChange={(e) => update('end_date', e.target.value)} />
        </label>
        <label className="flex items-center gap-3 text-sm font-semibold text-slate-700 pt-8">
          <input type="checkbox" checked={Boolean(form.paid)} onChange={(e) => update('paid', e.target.checked)} />
          Paid opportunity
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Compensation
          <input className="input mt-2 w-full px-4 py-3 rounded-lg" value={form.compensation} onChange={(e) => update('compensation', e.target.value)} placeholder="$15/hr, stipend, unpaid" />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Hours required
          <input className="input mt-2 w-full px-4 py-3 rounded-lg" value={form.hours_required} onChange={(e) => update('hours_required', e.target.value)} placeholder="5 hrs/week" />
        </label>
      </div>
      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      <div className="flex gap-3">
        <button className="btn-primary" disabled={saving}>{saving ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Create Posting'}</button>
        <button type="button" className="btn-secondary" onClick={() => router.push('/business/dashboard')}>Cancel</button>
      </div>
    </form>
  )
}
