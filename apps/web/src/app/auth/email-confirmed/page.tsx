'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { createWebSupabaseClient } from '@mysryear/shared'

type State = 'checking' | 'confirmed' | 'invalid'

export default function EmailConfirmedPage() {
  const [state, setState] = useState<State>('checking')
  const [details, setDetails] = useState('')

  const nextHref = useMemo(() => {
    if (typeof window === 'undefined') return '/dashboard'
    const next = new URLSearchParams(window.location.search).get('next')
    return next && next.startsWith('/') ? next : '/dashboard'
  }, [])

  useEffect(() => {
    const supabase = createWebSupabaseClient()
    const url = new URL(window.location.href)
    const code = url.searchParams.get('code')
    const errorDescription =
      url.searchParams.get('error_description') || url.searchParams.get('error')

    async function verify() {
      if (errorDescription) {
        setDetails(errorDescription)
        setState('invalid')
        return
      }
      if (!code) {
        setDetails('This confirmation link is missing a validation token or has already been used.')
        setState('invalid')
        return
      }
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        setDetails(error.message)
        setState('invalid')
        return
      }
      try {
        await fetch('/api/bootstrap', { method: 'POST' })
      } catch {
        // Confirmation still succeeded; app can finish setup after sign-in if bootstrap is unavailable.
      }
      setState('confirmed')
    }
    void verify()
  }, [])

  return (
    <section className="container-prose py-16">
      <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-soft">
        <div className="badge">MySRYear</div>
        {state === 'checking' ? (
          <>
            <h1 className="mt-4 text-3xl font-black text-slate-950">Confirming your email…</h1>
            <p className="mt-3 text-slate-700">
              Give us a moment while Supabase validates your confirmation link.
            </p>
          </>
        ) : state === 'confirmed' ? (
          <>
            <h1 className="mt-4 text-3xl font-black text-slate-950">
              Your email has been confirmed.
            </h1>
            <p className="mt-3 text-slate-700">
              You may now return to the MySRYear app or website and close this window.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href={nextHref} className="btn-primary">
                Return to MySRYear
              </Link>
              <Link href="/login" className="btn-secondary">
                Sign in on web
              </Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="mt-4 text-3xl font-black text-slate-950">
              This confirmation link is invalid or expired.
            </h1>
            <p className="mt-3 text-slate-700">
              {details || 'Please request a new confirmation email or sign in again.'}
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/login" className="btn-primary">
                Sign in
              </Link>
              <Link href="/signup" className="btn-secondary">
                Create a new account
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
