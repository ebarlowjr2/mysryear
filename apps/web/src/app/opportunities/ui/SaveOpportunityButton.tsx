'use client'

import { useState } from 'react'

type Props = { opportunityId: string }

export default function SaveOpportunityButton({ opportunityId }: Props) {
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setSaving(true)
    setMessage(null)
    setError(null)
    const res = await fetch('/api/opportunities/interests', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ opportunityId, status: 'saved' }),
    })
    const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null
    setSaving(false)
    if (!res.ok || !json?.ok) {
      setError(json?.error || 'Could not save opportunity')
      return
    }
    setMessage('Saved to this student profile.')
  }

  return (
    <div>
      <button className="btn-secondary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Opportunity'}</button>
      {message ? <div className="mt-2 text-xs text-green-700">{message}</div> : null}
      {error ? <div className="mt-2 text-xs text-red-700">{error}</div> : null}
    </div>
  )
}
