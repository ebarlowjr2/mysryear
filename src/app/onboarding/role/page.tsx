'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type UserRole = 'student' | 'parent' | 'teacher' | 'business' | 'mentor' | 'recruiter'

const ROLES: { value: UserRole; label: string; description: string; icon: string }[] = [
  { value: 'student', label: 'Student', description: 'High school student planning for graduation', icon: '🎓' },
  { value: 'parent', label: 'Parent', description: 'Parent supporting a student', icon: '👨‍👩‍👧' },
  { value: 'teacher', label: 'Teacher', description: 'Educator at a school', icon: '📚' },
  { value: 'business', label: 'Business', description: 'Organization offering opportunities', icon: '🏢' },
  { value: 'mentor', label: 'Mentor', description: 'Professional offering guidance', icon: '🤝' },
  { value: 'recruiter', label: 'Recruiter', description: 'Recruiting for jobs or programs', icon: '💼' },
]

export default function RoleSelection() {
  const router = useRouter()
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleContinue = async () => {
    if (!selectedRole) return

    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: selectedRole })
        .eq('user_id', user.id)

      if (updateError) {
        setError('Failed to save role')
        setLoading(false)
        return
      }

      // Route to role-specific onboarding
      router.push(`/onboarding/${selectedRole}`)
    } catch (err) {
      console.error('Error saving role:', err)
      setError('An error occurred')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-black text-slate-900">Welcome to My Senior Year</h1>
          <p className="mt-2 text-slate-600">Tell us about yourself to get started</p>
        </div>

        <div className="card p-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">I am a...</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ROLES.map(role => (
              <button
                key={role.value}
                onClick={() => setSelectedRole(role.value)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  selectedRole === role.value
                    ? 'border-brand-600 bg-brand-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{role.icon}</span>
                  <div>
                    <div className="font-semibold text-slate-900">{role.label}</div>
                    <div className="text-sm text-slate-600">{role.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {error && (
            <div className="mt-4 text-red-600 text-sm text-center p-3 rounded-lg bg-red-50 border border-red-200">
              {error}
            </div>
          )}

          <button
            onClick={handleContinue}
            disabled={!selectedRole || loading}
            className="mt-6 btn-primary w-full py-3 px-4 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
