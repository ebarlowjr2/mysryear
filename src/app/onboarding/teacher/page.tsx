'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type School = {
  id: string
  name: string
  city: string | null
  state: string | null
}

export default function TeacherOnboarding() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // School selection
  const [schoolSearch, setSchoolSearch] = useState('')
  const [schools, setSchools] = useState<School[]>([])
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  
  // Profile info
  const [jobTitle, setJobTitle] = useState('')
  const [department, setDepartment] = useState('')

  const supabase = createClient()

  useEffect(() => {
    const searchSchools = async () => {
      if (schoolSearch.length < 2) {
        setSchools([])
        return
      }

      setSearchLoading(true)
      const { data, error } = await supabase
        .from('schools')
        .select('id, name, city, state')
        .ilike('name', `%${schoolSearch}%`)
        .limit(10)

      if (!error && data) {
        setSchools(data)
      }
      setSearchLoading(false)
    }

    const debounce = setTimeout(searchSchools, 300)
    return () => clearTimeout(debounce)
  }, [schoolSearch, supabase])

  const handleSchoolSelect = (school: School) => {
    setSelectedSchool(school)
    setSchoolSearch(school.name)
    setSchools([])
  }

  const handleComplete = async () => {
    if (!selectedSchool) {
      setError('Please select your school')
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

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          job_title: jobTitle || null,
          department: department || null,
          onboarding_complete: true
        })
        .eq('user_id', user.id)

      if (profileError) {
        setError('Failed to save profile')
        setLoading(false)
        return
      }

      await supabase
        .from('school_members')
        .upsert({
          user_id: user.id,
          school_id: selectedSchool.id,
          role: 'teacher'
        })

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
          <h1 className="text-3xl font-black text-slate-900">Teacher Setup</h1>
          <p className="mt-2 text-slate-600">Let&apos;s get your profile ready</p>
        </div>

        <div className="card p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Your School *
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search for your school..."
                className="input w-full px-4 py-3 rounded-lg"
                value={schoolSearch}
                onChange={(e) => setSchoolSearch(e.target.value)}
              />
              {searchLoading && (
                <div className="absolute right-3 top-3">
                  <div className="animate-spin h-5 w-5 border-2 border-brand-600 border-t-transparent rounded-full"></div>
                </div>
              )}
              {schools.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                  {schools.map(school => (
                    <button
                      key={school.id}
                      onClick={() => handleSchoolSelect(school)}
                      className="w-full px-4 py-3 text-left hover:bg-slate-50 border-b border-slate-100 last:border-0"
                    >
                      <div className="font-medium text-slate-900">{school.name}</div>
                      {(school.city || school.state) && (
                        <div className="text-sm text-slate-500">
                          {[school.city, school.state].filter(Boolean).join(', ')}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedSchool && (
              <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="font-medium text-green-800">{selectedSchool.name}</div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Job Title (optional)
            </label>
            <input
              type="text"
              placeholder="e.g., Math Teacher, Counselor"
              className="input w-full px-4 py-3 rounded-lg"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Department (optional)
            </label>
            <input
              type="text"
              placeholder="e.g., Mathematics, Guidance"
              className="input w-full px-4 py-3 rounded-lg"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center p-3 rounded-lg bg-red-50 border border-red-200">
              {error}
            </div>
          )}

          <button
            onClick={handleComplete}
            disabled={loading || !selectedSchool}
            className="w-full btn-primary py-3 px-4 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Complete Setup'}
          </button>
        </div>
      </div>
    </div>
  )
}
