'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { BusinessProfile } from './business-types'

type Props = { initialProfile?: Partial<BusinessProfile> | null }

export default function BusinessProfileForm({ initialProfile }: Props) {
  const router = useRouter()
  const [form, setForm] = useState({
    organization_name: initialProfile?.organization_name || '',
    contact_name: initialProfile?.contact_name || '',
    contact_email: initialProfile?.contact_email || '',
    phone: initialProfile?.phone || '',
    website: initialProfile?.website || '',
    industry: initialProfile?.industry || '',
    description: initialProfile?.description || '',
    address_city: initialProfile?.address_city || '',
    address_state: initialProfile?.address_state || '',
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setMessage(null)
    const res = await fetch('/api/business/profile', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null
    setSaving(false)
    if (!res.ok || !json?.ok) {
      setError(json?.error || 'Could not save business profile')
      return
    }
    setMessage('Business profile saved.')
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="card p-6 space-y-4">
      <div>
        <h2 className="text-xl font-black tracking-tight">Business Profile</h2>
        <p className="mt-1 text-sm text-slate-600">This public profile appears on active opportunity postings.</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block text-sm font-semibold text-slate-700">
          Organization name
          <input className="input mt-2 w-full px-4 py-3 rounded-lg" value={form.organization_name} onChange={(e) => update('organization_name', e.target.value)} required />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Industry
          <input className="input mt-2 w-full px-4 py-3 rounded-lg" value={form.industry} onChange={(e) => update('industry', e.target.value)} placeholder="Technology, Healthcare, Skilled Trades..." />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Contact name
          <input className="input mt-2 w-full px-4 py-3 rounded-lg" value={form.contact_name} onChange={(e) => update('contact_name', e.target.value)} />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Contact email
          <input className="input mt-2 w-full px-4 py-3 rounded-lg" type="email" value={form.contact_email} onChange={(e) => update('contact_email', e.target.value)} />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Phone
          <input className="input mt-2 w-full px-4 py-3 rounded-lg" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Website
          <input className="input mt-2 w-full px-4 py-3 rounded-lg" value={form.website} onChange={(e) => update('website', e.target.value)} placeholder="https://..." />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          City
          <input className="input mt-2 w-full px-4 py-3 rounded-lg" value={form.address_city} onChange={(e) => update('address_city', e.target.value)} />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          State
          <input className="input mt-2 w-full px-4 py-3 rounded-lg" value={form.address_state} onChange={(e) => update('address_state', e.target.value.toUpperCase())} maxLength={2} placeholder="AL" />
        </label>
      </div>
      <label className="block text-sm font-semibold text-slate-700">
        Description
        <textarea className="input mt-2 w-full px-4 py-3 rounded-lg min-h-28" value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Tell students and parents what your organization does." />
      </label>
      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      {message ? <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{message}</div> : null}
      <button className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Business Profile'}</button>
    </form>
  )
}
