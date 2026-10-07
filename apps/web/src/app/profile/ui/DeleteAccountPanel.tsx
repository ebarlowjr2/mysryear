'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createWebSupabaseClient } from '@mysryear/shared'

export default function DeleteAccountPanel() {
  const router = useRouter()
  const [confirmation, setConfirmation] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const confirmed = confirmation.trim().toUpperCase() === 'DELETE'

  const deleteAccount = async () => {
    if (!confirmed || deleting) return

    setDeleting(true)
    setError(null)

    try {
      const response = await fetch('/api/account/delete', { method: 'DELETE' })
      const body = (await response.json().catch(() => null)) as { error?: string } | null
      if (!response.ok) throw new Error(body?.error || 'Could not delete your account.')

      const supabase = createWebSupabaseClient()
      await supabase.auth.signOut({ scope: 'local' })
      router.replace('/login?accountDeleted=1')
      router.refresh()
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : 'Could not delete your account.',
      )
      setDeleting(false)
    }
  }

  return (
    <div className="card border-red-200 p-8">
      <div className="text-xs font-bold uppercase tracking-[0.18em] text-red-700">Danger Zone</div>
      <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">Delete Account</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700">
        This permanently removes your account. Student-owned or unclaimed managed profiles, their
        planning records, and their uploaded files will also be deleted. Records belonging to a
        different linked student remain with that student.
      </p>
      <label className="mt-5 block text-sm font-bold text-slate-800" htmlFor="delete-confirmation">
        Type DELETE to confirm
      </label>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <input
          id="delete-confirmation"
          className="input rounded-lg px-4 py-3 sm:max-w-xs"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          autoComplete="off"
          disabled={deleting}
        />
        <button
          type="button"
          className="rounded-lg bg-red-700 px-5 py-3 font-bold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!confirmed || deleting}
          onClick={deleteAccount}
        >
          {deleting ? 'Deleting account…' : 'Permanently Delete Account'}
        </button>
      </div>
      {error ? <p className="mt-3 text-sm font-semibold text-red-700">{error}</p> : null}
    </div>
  )
}
