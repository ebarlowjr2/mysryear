'use client'

import { type FormEvent, useState } from 'react'
import {
  formatFamilyLinkCode,
  isValidFamilyLinkCode,
  normalizeFamilyLinkCode,
} from '@mysryear/shared'

type RequestMethod = 'code' | 'email'

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export default function FamilyLinkRequestForm({
  onSuccess,
}: {
  onSuccess?: (message: string) => void
}) {
  const [method, setMethod] = useState<RequestMethod>('code')
  const [code, setCode] = useState('')
  const [studentEmail, setStudentEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setMessage(null)

    if (method === 'code' && !isValidFamilyLinkCode(code)) {
      setError('Enter the full 16-character family link code.')
      setSaving(false)
      return
    }
    if (method === 'email' && !isEmail(studentEmail)) {
      setError('Enter a valid student email address.')
      setSaving(false)
      return
    }

    try {
      const res = await fetch('/api/profile/family-link', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(
          method === 'code'
            ? { action: 'request_by_code', code }
            : { action: 'request_by_email', studentEmail },
        ),
      })
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean
        error?: string
        message?: string
        result?: string
      } | null

      if (!res.ok || !json?.ok) {
        setError(json?.error || 'Could not send a connection request')
        return
      }

      const nextMessage =
        method === 'email'
          ? json.message ||
            'If that student can receive requests, they will see your connection request when they sign in.'
          : json.result === 'already_connected'
            ? 'You are already connected to this student.'
            : json.result === 'pending'
              ? 'Your connection request is already waiting for student approval.'
              : 'Request sent. The student must approve it before you can view their profile.'

      setMessage(nextMessage)
      if (method === 'code') setCode('')
      if (method === 'email') setStudentEmail('')
      onSuccess?.(nextMessage)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="space-y-4" onSubmit={(event) => void submit(event)}>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Student connection method">
        <button
          type="button"
          className={method === 'code' ? 'btn-primary' : 'btn-secondary'}
          aria-pressed={method === 'code'}
          onClick={() => {
            setMethod('code')
            setError(null)
            setMessage(null)
          }}
        >
          Enter family link code
        </button>
        <button
          type="button"
          className={method === 'email' ? 'btn-primary' : 'btn-secondary'}
          aria-pressed={method === 'email'}
          onClick={() => {
            setMethod('email')
            setError(null)
            setMessage(null)
          }}
        >
          Request by email
        </button>
      </div>

      {method === 'code' ? (
        <div>
          <label
            className="mb-2 block text-sm font-semibold text-slate-700"
            htmlFor="family-link-code"
          >
            Family link code
          </label>
          <input
            id="family-link-code"
            className="input w-full px-4 py-3 font-mono uppercase tracking-[0.14em] rounded-lg"
            value={formatFamilyLinkCode(code)}
            onChange={(event) => setCode(normalizeFamilyLinkCode(event.target.value))}
            placeholder="ABCD-EFGH-IJKL-MNOP"
            autoCapitalize="characters"
            autoComplete="one-time-code"
            disabled={saving}
          />
          <p className="mt-2 text-xs leading-5 text-slate-600">
            Ask your student to create a one-time code from their Profile. The code expires after 15
            minutes.
          </p>
        </div>
      ) : (
        <div>
          <label
            className="mb-2 block text-sm font-semibold text-slate-700"
            htmlFor="family-link-email"
          >
            Student email address
          </label>
          <input
            id="family-link-email"
            type="email"
            className="input w-full px-4 py-3 rounded-lg"
            value={studentEmail}
            onChange={(event) => setStudentEmail(event.target.value)}
            placeholder="student@example.com"
            autoComplete="email"
            disabled={saving}
          />
          <p className="mt-2 text-xs leading-5 text-slate-600">
            The student still has to approve the request. We do not confirm whether an email has a
            MySRYear account.
          </p>
        </div>
      )}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
          {message}
        </div>
      ) : null}

      <button
        type="submit"
        className="btn-primary"
        disabled={
          saving || (method === 'code' ? !isValidFamilyLinkCode(code) : !isEmail(studentEmail))
        }
      >
        {saving
          ? 'Sending...'
          : method === 'code'
            ? 'Request connection'
            : 'Send connection request'}
      </button>
    </form>
  )
}
