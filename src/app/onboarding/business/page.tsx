'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function BusinessOnboarding() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [orgName, setOrgName] = useState('')
  const [orgState, setOrgState] = useState('')
  const [orgCounties, setOrgCounties] = useState('')
  const [website, setWebsite] = useState('')

  const supabase = createClient()

  const handleComplete = async () => {
    if (!orgName) {
      setError('Please enter your organization name')
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

      const counties = orgCounties
        .split(',')
        .map(c => c.trim())
        .filter(c => c.length > 0)

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          org_name: orgName,
          org_state: orgState || null,
          org_counties: counties.length > 0 ? counties : null,
          website: website || null,
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
          <h1 className="text-3xl font-black text-slate-900">Business Setup</h1>
          <p className="mt-2 text-slate-600">Tell us about your organization</p>
        </div>

        <div className="card p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Organization Name *
            </label>
            <input
              type="text"
              placeholder="Your company or organization name"
              className="input w-full px-4 py-3 rounded-lg"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              State (optional)
            </label>
            <input
              type="text"
              placeholder="e.g., California"
              className="input w-full px-4 py-3 rounded-lg"
              value={orgState}
              onChange={(e) => setOrgState(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Counties Served (optional)
            </label>
            <input
              type="text"
              placeholder="e.g., Los Angeles, Orange, San Diego"
              className="input w-full px-4 py-3 rounded-lg"
              value={orgCounties}
              onChange={(e) => setOrgCounties(e.target.value)}
            />
            <p className="mt-1 text-sm text-slate-500">Separate multiple counties with commas</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Website (optional)
            </label>
            <input
              type="url"
              placeholder="https://yourcompany.com"
              className="input w-full px-4 py-3 rounded-lg"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center p-3 rounded-lg bg-red-50 border border-red-200">
              {error}
            </div>
          )}

          <div className="pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-600 mb-4">
              You can create opportunities for students after completing setup.
            </p>
            <button
              onClick={handleComplete}
              disabled={loading || !orgName}
              className="w-full btn-primary py-3 px-4 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Complete Setup'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
