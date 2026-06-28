'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { BusinessOpportunity } from './business-types'

type Props = { opportunity: BusinessOpportunity }

export default function BusinessOpportunityActions({ opportunity }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function setStatus(status: 'closed' | 'archived' | 'active') {
    setBusy(true)
    setError(null)
    const res = await fetch('/api/business/opportunities', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...opportunity, status }),
    })
    const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null
    setBusy(false)
    if (!res.ok || !json?.ok) {
      setError(json?.error || 'Could not update posting')
      return
    }
    router.refresh()
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button className="btn-secondary" disabled={busy} onClick={() => setStatus('active')}>Open</button>
        <button className="btn-secondary" disabled={busy} onClick={() => setStatus('closed')}>Close</button>
        <button className="btn-secondary" disabled={busy} onClick={() => setStatus('archived')}>Archive</button>
      </div>
      {error ? <div className="text-xs text-red-600">{error}</div> : null}
    </div>
  )
}
