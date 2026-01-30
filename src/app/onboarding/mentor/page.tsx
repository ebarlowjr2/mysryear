'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const CAREER_PATHS = [
  { id: 'cybersecurity', name: 'Cybersecurity' },
  { id: 'software-engineering', name: 'Software Engineering' },
  { id: 'it-help-desk', name: 'IT / Help Desk' },
  { id: 'data-ai', name: 'Data & AI' },
  { id: 'skilled-trades', name: 'Skilled Trades' },
  { id: 'healthcare', name: 'Healthcare' },
  { id: 'finance', name: 'Finance' },
  { id: 'entrepreneurship', name: 'Entrepreneurship' },
  { id: 'military', name: 'Military' },
]

export default function MentorOnboarding() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [headline, setHeadline] = useState('')
  const [bio, setBio] = useState('')
  const [selectedPaths, setSelectedPaths] = useState<string[]>([])
  const [orgName, setOrgName] = useState('')

  const supabase = createClient()

  const togglePath = (pathId: string) => {
    setSelectedPaths(prev => 
      prev.includes(pathId)
        ? prev.filter(p => p !== pathId)
        : [...prev, pathId]
    )
  }

  const handleComplete = async () => {
    if (!headline) {
      setError('Please enter a headline')
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
          org_name: orgName || null,
          onboarding_complete: true
        })
        .eq('user_id', user.id)

      if (profileError) {
        setError('Failed to save profile')
        setLoading(false)
        return
      }

      // Create mentor profile
      const { error: mentorError } = await supabase
        .from('mentor_profiles')
        .upsert({
          user_id: user.id,
          headline,
          bio: bio || null,
          career_paths: selectedPaths.length > 0 ? selectedPaths : null,
          is_active: true
        })

      if (mentorError) {
        console.error('Error creating mentor profile:', mentorError)
        // Continue anyway - mentor profile can be created later
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
          <h1 className="text-3xl font-black text-slate-900">Mentor Setup</h1>
          <p className="mt-2 text-slate-600">Create your mentor profile</p>
        </div>

        <div className="card p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Headline *
            </label>
            <input
              type="text"
              placeholder="e.g., Software Engineer at Google"
              className="input w-full px-4 py-3 rounded-lg"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Organization (optional)
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
              Bio (optional)
            </label>
            <textarea
              placeholder="Tell students about yourself and your experience..."
              className="input w-full px-4 py-3 rounded-lg min-h-[100px]"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Career Paths You Can Mentor (optional)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CAREER_PATHS.map(path => (
                <button
                  key={path.id}
                  type="button"
                  onClick={() => togglePath(path.id)}
                  className={`p-2 text-sm rounded-lg border text-left transition-all ${
                    selectedPaths.includes(path.id)
                      ? 'border-brand-600 bg-brand-50 text-brand-700'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {path.name}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center p-3 rounded-lg bg-red-50 border border-red-200">
              {error}
            </div>
          )}

          <div className="pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-600 mb-4">
              You can set your availability for mentoring sessions later.
            </p>
            <button
              onClick={handleComplete}
              disabled={loading || !headline}
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
