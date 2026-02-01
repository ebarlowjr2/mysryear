'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Users, Building2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { MentorProfile } from '@mysryear/shared'

const CAREER_PATH_LABELS: Record<string, string> = {
  'cybersecurity': 'Cybersecurity',
  'software-engineering': 'Software Engineering',
  'it-help-desk': 'IT / Help Desk',
  'data-ai': 'Data & AI',
  'skilled-trades': 'Skilled Trades',
  'healthcare': 'Healthcare',
  'finance': 'Finance',
  'entrepreneurship': 'Entrepreneurship',
  'military': 'Military'
}

export default function MentorsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [mentors, setMentors] = useState<MentorProfile[]>([])
    const [filterPath, setFilterPath] = useState<string | 'all'>('all')

  const supabase = createClient()

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role, onboarding_complete')
          .eq('user_id', user.id)
          .single()

        if (!profile?.onboarding_complete) {
          router.push('/onboarding')
          return
        }

                if (profile.role === 'mentor') {
          router.push('/mentors/setup')
          return
        }

        const { data: mentorsData } = await supabase
          .from('mentor_profiles')
          .select(`
            *,
            profiles!mentor_profiles_user_id_fkey(full_name, org_name)
          `)
          .eq('is_active', true)
          .order('created_at', { ascending: false })

        const mappedMentors = (mentorsData || []).map(mentor => ({
          ...mentor,
          full_name: mentor.profiles?.full_name || 'Anonymous Mentor',
          org_name: mentor.profiles?.org_name || null,
          profiles: undefined
        })) as MentorProfile[]

        setMentors(mappedMentors)
        setLoading(false)
      } catch (err) {
        console.error('Error loading mentors:', err)
        setLoading(false)
      }
    }

    loadData()
  }, [router, supabase])

  const filteredMentors = filterPath === 'all'
    ? mentors
    : mentors.filter(m => m.career_paths?.includes(filterPath))

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    )
  }

  return (
    <div className="container-prose py-14">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard" className="text-slate-600 hover:text-brand-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-4xl font-black tracking-tight">Mentors</h1>
          <p className="text-slate-700 mt-2">Connect with professionals in your field of interest</p>
        </div>
      </div>

      <div className="mb-6">
        <p className="text-sm text-slate-600 mb-2">Filter by career path:</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterPath('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filterPath === 'all'
                ? 'bg-brand-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All
          </button>
          {Object.entries(CAREER_PATH_LABELS).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setFilterPath(id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filterPath === id
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filteredMentors.length === 0 ? (
        <div className="card p-12 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No mentors found</h3>
          <p className="text-slate-500">
            {filterPath === 'all' 
              ? 'Check back later for available mentors'
              : 'Try selecting a different career path'}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filteredMentors.map(mentor => (
            <div key={mentor.id} className="card p-6 hover:shadow-lg transition">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-brand-600 font-bold text-lg">
                    {mentor.full_name?.charAt(0) || 'M'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-slate-900 truncate">{mentor.full_name}</h3>
                  <p className="text-brand-600 font-medium">{mentor.headline}</p>
                  {mentor.org_name && (
                    <div className="flex items-center gap-1 text-slate-500 text-sm mt-1">
                      <Building2 className="w-3 h-3" />
                      <span>{mentor.org_name}</span>
                    </div>
                  )}
                </div>
              </div>

              {mentor.bio && (
                <p className="text-slate-600 mt-4 line-clamp-2">{mentor.bio}</p>
              )}

              {mentor.career_paths && mentor.career_paths.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-4">
                  {mentor.career_paths.slice(0, 3).map(path => (
                    <span
                      key={path}
                      className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600"
                    >
                      {CAREER_PATH_LABELS[path] || path}
                    </span>
                  ))}
                  {mentor.career_paths.length > 3 && (
                    <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600">
                      +{mentor.career_paths.length - 3} more
                    </span>
                  )}
                </div>
              )}

              <div className="mt-4">
                <Link
                  href={`/mentors/${mentor.id}`}
                  className="btn-primary px-4 py-2 rounded-lg text-sm font-medium inline-block"
                >
                  View Profile
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
