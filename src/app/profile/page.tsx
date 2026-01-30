'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type Profile = {
  id: string
  user_id: string
  full_name: string | null
  first_name: string | null
  last_name: string | null
  role: string | null
  graduation_year: number | null
  graduation_date: string | null
  state: string | null
  county: string | null
  org_name: string | null
  verification_status: string | null
  onboarding_complete: boolean
}

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  
  // Form state
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [graduationYear, setGraduationYear] = useState<number | null>(null)

  const supabase = createClient()

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (error) {
          setError('Failed to load profile')
          setLoading(false)
          return
        }

        setProfile(data)
        setFirstName(data.first_name || '')
        setLastName(data.last_name || '')
        setGraduationYear(data.graduation_year)
        setLoading(false)
      } catch (err) {
        console.error('Error loading profile:', err)
        setError('An error occurred')
        setLoading(false)
      }
    }

    loadProfile()
  }, [router, supabase])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: firstName || null,
          last_name: lastName || null,
          full_name: [firstName, lastName].filter(Boolean).join(' ') || null,
          graduation_year: graduationYear,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)

      if (error) {
        setError('Failed to save profile')
        setSaving(false)
        return
      }

      setSuccess('Profile saved successfully')
      setSaving(false)
    } catch (err) {
      console.error('Error saving profile:', err)
      setError('An error occurred')
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    )
  }

  const currentYear = new Date().getFullYear()
  const graduationYears = [currentYear, currentYear + 1, currentYear + 2, currentYear + 3, currentYear + 4]

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-black text-slate-900">Profile</h1>
          <a href="/dashboard" className="text-brand-600 hover:text-brand-700 font-medium">
            Back to Dashboard
          </a>
        </div>

        {/* Verification Status Banner */}
        {profile?.verification_status && profile.verification_status !== 'verified' && (
          <div className={`mb-6 p-4 rounded-lg ${
            profile.verification_status === 'pending'
              ? 'bg-yellow-50 border border-yellow-200'
              : 'bg-slate-50 border border-slate-200'
          }`}>
            <div className="flex items-center gap-2">
              {profile.verification_status === 'pending' ? (
                <>
                  <span className="text-yellow-600">Verification Pending</span>
                  <span className="text-sm text-yellow-600">Your verification request is being reviewed.</span>
                </>
              ) : (
                <>
                  <span className="text-slate-600">Not Verified</span>
                  <span className="text-sm text-slate-500">Request verification to unlock additional features.</span>
                </>
              )}
            </div>
          </div>
        )}

        {profile?.verification_status === 'verified' && (
          <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200">
            <div className="flex items-center gap-2">
              <span className="text-green-600 font-medium">Verified Account</span>
            </div>
          </div>
        )}

        <div className="card p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                First Name
              </label>
              <input
                type="text"
                className="input w-full px-4 py-3 rounded-lg"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Last Name
              </label>
              <input
                type="text"
                className="input w-full px-4 py-3 rounded-lg"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Role
            </label>
            <div className="px-4 py-3 bg-slate-100 rounded-lg text-slate-600 capitalize">
              {profile?.role || 'Not set'}
            </div>
          </div>

          {(profile?.role === 'student' || profile?.role === 'teacher') && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Graduation Year
              </label>
              <select
                className="input w-full px-4 py-3 rounded-lg"
                value={graduationYear || ''}
                onChange={(e) => setGraduationYear(e.target.value ? parseInt(e.target.value) : null)}
              >
                <option value="">Select year...</option>
                {graduationYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          )}

          {profile?.org_name && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Organization
              </label>
              <div className="px-4 py-3 bg-slate-100 rounded-lg text-slate-600">
                {profile.org_name}
              </div>
            </div>
          )}

          {error && (
            <div className="text-red-600 text-sm text-center p-3 rounded-lg bg-red-50 border border-red-200">
              {error}
            </div>
          )}

          {success && (
            <div className="text-green-600 text-sm text-center p-3 rounded-lg bg-green-50 border border-green-200">
              {success}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full btn-primary py-3 px-4 rounded-lg font-semibold disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Role-specific sections */}
        {profile?.role === 'parent' && (
          <div className="card p-6 mt-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Linked Students</h2>
            <p className="text-slate-600 mb-4">
              Manage your linked student accounts from the parent dashboard.
            </p>
            <a
              href="/parent"
              className="inline-block btn-primary py-2 px-4 rounded-lg font-medium"
            >
              Go to Parent Dashboard
            </a>
          </div>
        )}

        {profile?.role === 'mentor' && (
          <div className="card p-6 mt-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Mentor Profile</h2>
            <p className="text-slate-600 mb-4">
              Manage your mentor profile and availability settings.
            </p>
            <a
              href="/mentor/setup"
              className="inline-block btn-primary py-2 px-4 rounded-lg font-medium"
            >
              Edit Mentor Profile
            </a>
          </div>
        )}

        {profile?.role === 'recruiter' && (
          <div className="card p-6 mt-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Recruiter Profile</h2>
            <p className="text-slate-600 mb-4">
              Manage your recruiter profile and job postings.
            </p>
            <a
              href="/recruiter/setup"
              className="inline-block btn-primary py-2 px-4 rounded-lg font-medium"
            >
              Edit Recruiter Profile
            </a>
          </div>
        )}

        {/* Sign Out */}
        <div className="mt-8 text-center">
          <button
            onClick={handleSignOut}
            className="text-red-600 hover:text-red-700 font-medium"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
