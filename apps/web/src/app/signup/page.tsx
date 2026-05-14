'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { createWebSupabaseClient } from '@mysryear/shared'
import { USER_ROLES, type UserRole } from '@mysryear/shared'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('student')
  const [graduationYear, setGraduationYear] = useState<number | ''>('')
  const [schoolId, setSchoolId] = useState<string>('')
  const [schoolQuery, setSchoolQuery] = useState('')
  const [schools, setSchools] = useState<
    { id: string; name: string; city: string | null; state: string | null }[]
  >([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    // Schools are public-readable by design (RLS allows select all).
    const supabase = createWebSupabaseClient()
    const load = async () => {
      try {
        const { data } = await supabase
          .from('schools')
          .select('id,name,city,state')
          .order('name', { ascending: true })
          .limit(5000)
        if (data) setSchools(data)
      } catch {
        // ignore
      }
    }
    void load()
  }, [])

  const filteredSchools = useMemo(() => {
    const q = schoolQuery.trim().toLowerCase()
    if (!q) return schools.slice(0, 50)
    return schools.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 50)
  }, [schoolQuery, schools])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      if (role === 'student') {
        if (typeof graduationYear !== 'number' || !graduationYear) {
          setError('Please enter your graduation year.')
          return
        }
        if (!schoolId) {
          setError('Please select your high school from the list.')
          return
        }
      }

      const supabase = createWebSupabaseClient()
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role,
            graduation_year: typeof graduationYear === 'number' ? graduationYear : null,
            school_id: schoolId || null,
          },
        },
      })

      if (error) {
        setError(error.message)
      } else if (data.user) {
        setMessage('Check your email for the confirmation link!')
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-slate-900/50 to-slate-900"></div>

      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-32 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 -left-32 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold gradient-text">Create your account</h2>
          <p className="mt-2 text-sm text-gray-400">Join My Senior Year platform</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSignup}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="input w-full px-4 py-3 rounded-lg"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="input w-full px-4 py-3 rounded-lg"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-300 mb-2">
                Account type
              </label>
              <select
                id="role"
                name="role"
                className="input w-full px-4 py-3 rounded-lg"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
              >
                {USER_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {role === 'student' && (
              <>
                <div>
                  <label
                    htmlFor="graduationYear"
                    className="block text-sm font-medium text-gray-300 mb-2"
                  >
                    Graduation year
                  </label>
                  <input
                    id="graduationYear"
                    name="graduationYear"
                    className="input w-full px-4 py-3 rounded-lg"
                    value={graduationYear}
                    onChange={(e) => setGraduationYear(e.target.value ? Number(e.target.value) : '')}
                    placeholder="e.g. 2030"
                    inputMode="numeric"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="school"
                    className="block text-sm font-medium text-gray-300 mb-2"
                  >
                    High school
                  </label>
                  <input
                    id="school"
                    name="school"
                    className="input w-full px-4 py-3 rounded-lg"
                    value={schoolQuery}
                    onChange={(e) => {
                      setSchoolQuery(e.target.value)
                      setSchoolId('')
                    }}
                    placeholder="Search your school"
                    required
                  />
                  <div className="mt-2 max-h-48 overflow-auto border border-white/10 rounded-lg bg-black/20">
                    {filteredSchools.length === 0 ? (
                      <div className="p-3 text-sm text-gray-300">No matches</div>
                    ) : (
                      filteredSchools.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-white/10 ${
                            schoolId === s.id ? 'bg-white/10' : ''
                          }`}
                          onClick={() => {
                            setSchoolId(s.id)
                            setSchoolQuery(
                              `${s.name}${s.city ? `, ${s.city}` : ''}${s.state ? `, ${s.state}` : ''}`,
                            )
                          }}
                        >
                          <div className="font-semibold text-gray-100">{s.name}</div>
                          <div className="text-xs text-gray-400">
                            {[s.city, s.state].filter(Boolean).join(', ')}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {error && (
            <div className="text-red-400 text-sm text-center p-3 rounded-lg bg-red-900/20 border border-red-500/20">
              {error}
            </div>
          )}

          {message && (
            <div className="text-green-400 text-sm text-center p-3 rounded-lg bg-green-900/20 border border-green-500/20">
              {message}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="btn-gradient w-full py-3 px-4 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Sign up'}
            </button>
          </div>

          <div className="text-center">
            <a
              href="/login"
              className="font-medium text-purple-400 hover:text-purple-300 transition-colors"
            >
              Already have an account? Sign in
            </a>
          </div>
        </form>
      </div>
    </div>
  )
}
