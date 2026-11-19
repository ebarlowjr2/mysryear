'use client'

import { useState } from 'react'
import { formatFamilyLinkCode } from '@mysryear/shared'
import CopyTextButton from '@/components/CopyTextButton'

export default function StudentFamilyLinkCodeCard() {
  const [code, setCode] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function createCode() {
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch('/api/profile/family-link', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'create_code' }),
      })
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean
        error?: string
        code?: string
        expiresAt?: string
      } | null
      if (!res.ok || !json?.ok || !json.code || !json.expiresAt) {
        setError(json?.error || 'Could not create a family link code')
        return
      }
      setCode(json.code)
      setExpiresAt(json.expiresAt)
      setMessage('Share this code only with the parent or guardian you want to connect.')
    } finally {
      setSaving(false)
    }
  }

  async function revokeCode() {
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch('/api/profile/family-link', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'revoke_code' }),
      })
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null
      if (!res.ok || !json?.ok) {
        setError(json?.error || 'Could not revoke the family link code')
        return
      }
      setCode(null)
      setExpiresAt(null)
      setMessage('Family link code revoked.')
    } finally {
      setSaving(false)
    }
  }

  const formattedCode = code ? formatFamilyLinkCode(code) : null
  const expirationLabel = expiresAt
    ? new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(
        new Date(expiresAt),
      )
    : null

  return (
    <div className="card border-brand-200 bg-brand-50 p-4">
      <div className="text-sm font-black text-brand-950">Connect a parent or guardian</div>
      <p className="mt-1 text-sm leading-6 text-slate-700">
        Create a one-time family link code instead of sharing your student profile ID. You approve
        every connection request.
      </p>

      {formattedCode ? (
        <div className="mt-4 rounded-xl border border-brand-200 bg-white p-4">
          <div className="font-mono text-xl font-black tracking-[0.16em] text-brand-950 sm:text-2xl">
            {formattedCode}
          </div>
          <p className="mt-2 text-xs text-slate-600">
            Expires at {expirationLabel}. Generating a new code invalidates this one.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <CopyTextButton text={formattedCode} label="Copy code" />
            <button type="button" className="btn-secondary" disabled={saving} onClick={createCode}>
              Generate new code
            </button>
            <button
              type="button"
              className="btn-secondary text-red-700"
              disabled={saving}
              onClick={revokeCode}
            >
              Revoke code
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn-primary mt-4" disabled={saving} onClick={createCode}>
          {saving ? 'Creating...' : 'Create family link code'}
        </button>
      )}

      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
          {message}
        </div>
      ) : null}
    </div>
  )
}
