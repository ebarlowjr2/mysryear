'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const RECRUITER_TYPES = [
  { value: 'corporate', label: 'Corporate Recruiter' },
  { value: 'agency', label: 'Staffing Agency' },
  { value: 'university', label: 'University Admissions' },
  { value: 'military', label: 'Military Recruiter' },
  { value: 'trade', label: 'Trade/Apprenticeship' },
  { value: 'other', label: 'Other' },
]

export default function RecruiterOnboarding() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [orgName, setOrgName] = useState('')
  const [recruiterType, setRecruiterType] = useState('')
  const [bio, setBio] = useState('')

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

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          org_name: orgName,
          onboarding_complete: true
        })
        .eq('user_id', user.id)

      if (profileError) {
        setError('Failed to save profile')
        setLoading(false)
        return
      }

      // Create recruiter profile
      const { error: recruiterError } = await supabase
        .from('recruiter_profiles')
        .upsert({
          user_id: user.id,
          org_name: orgName,
          recruiter_type: recruiterType || null,
          bio: bio || null,
          is_active: true
        })

      if (recruiterError) {
        console.error('Error creating recruiter profile:', recruiterError)
        // Continue anyway - recruiter profile can be created later
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
          <h1 className="text-3xl font-black text-slate-900">Recruiter Setup</h1>
          <p className="mt-2 text-slate-600">Create your recruiter profile</p>
        </div>

        <div className="card p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Organization Name *
            </label>
            <input
              type="text"
              placeholder="Your company or organization"
              className="input w-full px-4 py-3 rounded-lg"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Recruiter Type (optional)
            </label>
            <select
              className="input w-full px-4 py-3 rounded-lg"
              value={recruiterType}
              onChange={(e) => setRecruiterType(e.target.value)}
            >
              <option value="">Select type...</option>
              {RECRUITER_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Bio (optional)
            </label>
            <textarea
              placeholder="Tell students about what you're recruiting for..."
              className="input w-full px-4 py-3 rounded-lg min-h-[100px]"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center p-3 rounded-lg bg-red-50 border border-red-200">
              {error}
            </div>
          )}

          <div className="pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-600 mb-4">
              You can post job listings after completing setup.
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
