'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function ParentOnboarding() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [linkNow, setLinkNow] = useState<boolean | null>(null)
  const [studentEmail, setStudentEmail] = useState('')
  const [linkMessage, setLinkMessage] = useState<string | null>(null)

  const supabase = createClient()

  const handleLinkStudent = async () => {
    if (!studentEmail) {
      setError('Please enter your student\'s email')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Call the link-student Edge Function
      const { data, error: fnError } = await supabase.functions.invoke('link-student', {
        body: { student_email: studentEmail }
      })

      if (fnError) {
        setError(fnError.message || 'Failed to send link request')
        setLoading(false)
        return
      }

      if (data?.error) {
        setError(data.error)
        setLoading(false)
        return
      }

      setLinkMessage('Link request sent! Your student will need to accept it.')
      setStudentEmail('')
    } catch (err) {
      console.error('Error linking student:', err)
      setError('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          onboarding_complete: true
        })
        .eq('user_id', user.id)

      if (profileError) {
        setError('Failed to save profile')
        setLoading(false)
        return
      }

      router.push('/dashboard')
    } catch (err) {
      console.error('Error completing onboarding:', err)
      setError('An error occurred')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="max-w-lg w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-black text-slate-900">Parent Setup</h1>
          <p className="mt-2 text-slate-600">Connect with your student</p>
        </div>

        <div className="card p-8 space-y-6">
          {linkNow === null ? (
            <>
              <h2 className="text-xl font-semibold text-slate-900">
                Would you like to link your student&apos;s account now?
              </h2>
              <p className="text-slate-600">
                Linking allows you to view your student&apos;s progress and assign tasks.
              </p>
              
              <div className="flex gap-4">
                <button
                  onClick={() => setLinkNow(true)}
                  className="flex-1 btn-primary py-3 px-4 rounded-lg font-semibold"
                >
                  Yes, Link Now
                </button>
                <button
                  onClick={() => setLinkNow(false)}
                  className="flex-1 py-3 px-4 rounded-lg border border-slate-300 text-slate-700 font-semibold"
                >
                  Later
                </button>
              </div>
            </>
          ) : linkNow ? (
            <>
              <h2 className="text-xl font-semibold text-slate-900">
                Enter your student&apos;s email
              </h2>
              <p className="text-slate-600">
                We&apos;ll send them a request to link accounts.
              </p>

              <input
                type="email"
                placeholder="student@email.com"
                className="input w-full px-4 py-3 rounded-lg"
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
              />

              {error && (
                <div className="text-red-600 text-sm text-center p-3 rounded-lg bg-red-50 border border-red-200">
                  {error}
                </div>
              )}

              {linkMessage && (
                <div className="text-green-600 text-sm text-center p-3 rounded-lg bg-green-50 border border-green-200">
                  {linkMessage}
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => setLinkNow(null)}
                  className="flex-1 py-3 px-4 rounded-lg border border-slate-300 text-slate-700"
                >
                  Back
                </button>
                <button
                  onClick={handleLinkStudent}
                  disabled={loading || !studentEmail}
                  className="flex-1 btn-primary py-3 px-4 rounded-lg font-semibold disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send Request'}
                </button>
              </div>

              <button
                onClick={handleComplete}
                className="w-full text-brand-600 hover:text-brand-700 font-medium"
              >
                Skip and continue to dashboard
              </button>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-slate-900">
                You&apos;re all set!
              </h2>
              <p className="text-slate-600">
                You can link your student&apos;s account later from your profile settings.
              </p>

              {error && (
                <div className="text-red-600 text-sm text-center p-3 rounded-lg bg-red-50 border border-red-200">
                  {error}
                </div>
              )}

              <button
                onClick={handleComplete}
                disabled={loading}
                className="w-full btn-primary py-3 px-4 rounded-lg font-semibold disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Go to Dashboard'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
