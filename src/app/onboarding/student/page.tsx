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

export default function StudentOnboarding() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // School selection
  const [schoolSearch, setSchoolSearch] = useState('')
  const [schools, setSchools] = useState<School[]>([])
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [manualSchool, setManualSchool] = useState(false)
  const [manualSchoolName, setManualSchoolName] = useState('')
  const [manualSchoolCity, setManualSchoolCity] = useState('')
  const [manualSchoolState, setManualSchoolState] = useState('')
  
  // Profile info
  const [graduationYear, setGraduationYear] = useState<number>(new Date().getFullYear() + 1)
  const [state, setState] = useState('')
  const [county, setCounty] = useState('')

  const supabase = createClient()

  // Search schools
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
    if (school.state) setState(school.state)
  }

  const handleManualSchoolSubmit = async () => {
    if (!manualSchoolName) return

    setLoading(true)
    const { data, error } = await supabase
      .from('schools')
      .insert({
        name: manualSchoolName,
        city: manualSchoolCity || null,
        state: manualSchoolState || null
      })
      .select()
      .single()

    if (!error && data) {
      setSelectedSchool(data)
      setManualSchool(false)
      if (manualSchoolState) setState(manualSchoolState)
    }
    setLoading(false)
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

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          graduation_year: graduationYear,
          state: state || null,
          county: county || null,
          onboarding_complete: true
        })
        .eq('user_id', user.id)

      if (profileError) {
        setError('Failed to save profile')
        setLoading(false)
        return
      }

      // Join school if selected
      if (selectedSchool) {
        await supabase
          .from('school_members')
          .upsert({
            user_id: user.id,
            school_id: selectedSchool.id,
            role: 'student'
          })
      }

      router.push('/dashboard')
    } catch (err) {
      console.error('Error completing onboarding:', err)
      setError('An error occurred')
      setLoading(false)
    }
  }

  const currentYear = new Date().getFullYear()
  const graduationYears = [currentYear, currentYear + 1, currentYear + 2, currentYear + 3, currentYear + 4]

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="max-w-lg w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-black text-slate-900">Student Setup</h1>
          <p className="mt-2 text-slate-600">Let&apos;s get your profile ready</p>
        </div>

        <div className="card p-8">
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-slate-900">Find Your School</h2>
              
              {!manualSchool ? (
                <>
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
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="font-medium text-green-800">{selectedSchool.name}</div>
                      {(selectedSchool.city || selectedSchool.state) && (
                        <div className="text-sm text-green-600">
                          {[selectedSchool.city, selectedSchool.state].filter(Boolean).join(', ')}
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => setManualSchool(true)}
                    className="text-sm text-brand-600 hover:text-brand-700"
                  >
                    Can&apos;t find your school? Add it manually
                  </button>
                </>
              ) : (
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="School name"
                    className="input w-full px-4 py-3 rounded-lg"
                    value={manualSchoolName}
                    onChange={(e) => setManualSchoolName(e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="City"
                      className="input w-full px-4 py-3 rounded-lg"
                      value={manualSchoolCity}
                      onChange={(e) => setManualSchoolCity(e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="State"
                      className="input w-full px-4 py-3 rounded-lg"
                      value={manualSchoolState}
                      onChange={(e) => setManualSchoolState(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setManualSchool(false)}
                      className="flex-1 py-2 px-4 rounded-lg border border-slate-300 text-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleManualSchoolSubmit}
                      disabled={!manualSchoolName || loading}
                      className="flex-1 btn-primary py-2 px-4 rounded-lg disabled:opacity-50"
                    >
                      Add School
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={() => setStep(2)}
                className="w-full btn-primary py-3 px-4 rounded-lg font-semibold"
              >
                {selectedSchool ? 'Continue' : 'Skip for Now'}
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-slate-900">Graduation Info</h2>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Expected Graduation Year
                </label>
                <select
                  className="input w-full px-4 py-3 rounded-lg"
                  value={graduationYear}
                  onChange={(e) => setGraduationYear(parseInt(e.target.value))}
                >
                  {graduationYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  State (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., California"
                  className="input w-full px-4 py-3 rounded-lg"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  County (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Los Angeles"
                  className="input w-full px-4 py-3 rounded-lg"
                  value={county}
                  onChange={(e) => setCounty(e.target.value)}
                />
              </div>

              {error && (
                <div className="text-red-600 text-sm text-center p-3 rounded-lg bg-red-50 border border-red-200">
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 px-4 rounded-lg border border-slate-300 text-slate-700"
                >
                  Back
                </button>
                <button
                  onClick={handleComplete}
                  disabled={loading}
                  className="flex-1 btn-primary py-3 px-4 rounded-lg font-semibold disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Complete Setup'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
