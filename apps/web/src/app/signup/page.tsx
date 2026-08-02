'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { createWebSupabaseClient, USER_ROLES, type UserRole } from '@mysryear/shared'
import {
  ACCOUNT_TYPE_LABELS,
  generateGraduationYears,
  graduationYearLabel,
  postSignupDestination,
  requiresGraduationYear,
  requiresSchoolFlow,
  validateSignupForm,
  type SchoolLevel,
} from './signup-flow'

type SchoolOption = {
  id: string
  name: string
  city: string | null
  state: string | null
  school_level?: SchoolLevel | null
  institution_identifier?: string | null
  active?: boolean | null
}

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState<UserRole>('student')
  const [schoolLevel, setSchoolLevel] = useState<SchoolLevel>('high_school')
  const [graduationYear, setGraduationYear] = useState<number | ''>('')
  const [schoolId, setSchoolId] = useState<string>('')
  const [addSchoolLater, setAddSchoolLater] = useState(false)
  const [schoolQuery, setSchoolQuery] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [schools, setSchools] = useState<SchoolOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const supabase = createWebSupabaseClient()
    const load = async () => {
      const withLevel = await supabase
        .from('schools')
        .select('id,name,city,state,school_level,institution_identifier,active')
        .eq('active', true)
        .order('name', { ascending: true })
        .limit(5000)
      if (!withLevel.error && withLevel.data) {
        setSchools(withLevel.data as SchoolOption[])
        return
      }

      const fallback = await supabase
        .from('schools')
        .select('id,name,city,state')
        .order('name', { ascending: true })
        .limit(5000)
      if (fallback.data) {
        setSchools(
          (fallback.data as SchoolOption[]).map((school) => ({
            ...school,
            school_level: 'high_school',
            active: true,
          })),
        )
      }
    }
    void load()
  }, [])

  const roleUsesSchoolFlow = requiresSchoolFlow(role)
  const roleUsesGraduationYear = requiresGraduationYear(role)

  const filteredSchools = useMemo(() => {
    const q = schoolQuery.trim().toLowerCase()
    return schools
      .filter((school) => (school.school_level || 'high_school') === schoolLevel)
      .filter(
        (school) =>
          !q ||
          [school.name, school.city, school.state, school.institution_identifier]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(q),
      )
      .slice(0, 50)
  }, [schoolLevel, schoolQuery, schools])

  const years = useMemo(() => generateGraduationYears(), [])

  function resetSchoolSelection(nextLevel = schoolLevel) {
    setSchoolLevel(nextLevel)
    setSchoolId('')
    setSchoolQuery('')
    setAddSchoolLater(false)
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const validationError = validateSignupForm({
        email,
        password,
        confirmPassword,
        role,
        schoolLevel,
        schoolId: schoolId || null,
        addSchoolLater,
        graduationYear,
        organizationName,
      })
      if (validationError) {
        setError(validationError)
        return
      }

      const supabase = createWebSupabaseClient()
      const redirectTo = `${window.location.origin}/auth/email-confirmed?next=${encodeURIComponent(postSignupDestination(role))}`
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            role,
            school_level: roleUsesSchoolFlow ? schoolLevel : null,
            graduation_year:
              roleUsesGraduationYear && typeof graduationYear === 'number' ? graduationYear : null,
            school_id: roleUsesSchoolFlow && !addSchoolLater ? schoolId || null : null,
            school_add_later: roleUsesSchoolFlow ? addSchoolLater : null,
            organization_name:
              role === 'business' || role === 'counselor' ? organizationName.trim() || null : null,
            post_signup_destination: postSignupDestination(role),
          },
        },
      })

      if (error) setError(error.message)
      else if (data.user)
        setMessage(
          'Check your email for the confirmation link. After confirming, you can return to MySRYear.',
        )
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.22),_transparent_32%),linear-gradient(135deg,#0f172a,#1e293b_45%,#111827)]" />
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 -right-32 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute bottom-0 -left-32 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        <div className="rounded-3xl border border-white/15 bg-white/95 p-6 shadow-2xl sm:p-8 text-slate-950">
          <div className="text-center">
            <div className="badge">MySRYear</div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Create Your Account
            </h1>
            <p className="mt-2 text-sm font-medium text-slate-600">
              Start with the basics. We’ll guide the next step based on your role.
            </p>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSignup} noValidate>
            <div>
              <label htmlFor="email" className="block text-sm font-bold text-slate-800 mb-2">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-950 placeholder:text-slate-400 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
                placeholder="student@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="password" className="block text-sm font-bold text-slate-800 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-950 placeholder:text-slate-400 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-bold text-slate-800 mb-2"
                >
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-950 placeholder:text-slate-400 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-bold text-slate-800 mb-2">
                Account Type
              </label>
              <select
                id="role"
                name="role"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
                value={role}
                onChange={(e) => {
                  setRole(e.target.value as UserRole)
                  setGraduationYear('')
                  setOrganizationName('')
                  resetSchoolSelection('high_school')
                }}
              >
                {USER_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ACCOUNT_TYPE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>

            {roleUsesSchoolFlow ? (
              <>
                <div>
                  <label
                    htmlFor="schoolLevel"
                    className="block text-sm font-bold text-slate-800 mb-2"
                  >
                    School Level
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(['high_school', 'college'] as SchoolLevel[]).map((level) => (
                      <button
                        key={level}
                        type="button"
                        className={`rounded-2xl border px-4 py-3 text-left font-bold transition ${schoolLevel === level ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-300 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50/60'}`}
                        onClick={() => resetSchoolSelection(level)}
                      >
                        {level === 'high_school' ? 'High School' : 'College'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="school" className="block text-sm font-bold text-slate-800 mb-2">
                    Select School
                  </label>
                  <input
                    id="school"
                    name="school"
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-950 placeholder:text-slate-400 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-100 disabled:bg-slate-100"
                    value={schoolQuery}
                    onChange={(e) => {
                      setSchoolQuery(e.target.value)
                      setSchoolId('')
                      setAddSchoolLater(false)
                    }}
                    placeholder={`Search your ${schoolLevel === 'college' ? 'college' : 'high school'}`}
                    disabled={addSchoolLater}
                  />
                  <div className="mt-2 max-h-48 overflow-auto rounded-2xl border border-slate-200 bg-white">
                    {addSchoolLater ? (
                      <div className="p-3 text-sm font-semibold text-slate-600">
                        You can add your school later from Profile.
                      </div>
                    ) : filteredSchools.length === 0 ? (
                      <div className="p-3 text-sm text-slate-600">
                        No matches. Use Add My School Later if needed.
                      </div>
                    ) : (
                      filteredSchools.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          className={`w-full px-3 py-2 text-left text-sm transition hover:bg-brand-50 ${schoolId === s.id ? 'bg-brand-50' : ''}`}
                          onClick={() => {
                            setSchoolId(s.id)
                            setAddSchoolLater(false)
                            setSchoolQuery(
                              `${s.name}${s.city ? `, ${s.city}` : ''}${s.state ? `, ${s.state}` : ''}`,
                            )
                          }}
                        >
                          <div className="font-bold text-slate-950">{s.name}</div>
                          <div className="text-xs text-slate-500">
                            {[s.city, s.state, s.institution_identifier]
                              .filter(Boolean)
                              .join(' • ')}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                  <button
                    type="button"
                    className={`mt-3 rounded-2xl border px-4 py-2 text-sm font-bold transition ${addSchoolLater ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}
                    onClick={() => {
                      setAddSchoolLater(true)
                      setSchoolId('')
                      setSchoolQuery('')
                    }}
                  >
                    Add My School Later
                  </button>
                </div>
              </>
            ) : null}

            {roleUsesGraduationYear ? (
              <div>
                <label
                  htmlFor="graduationYear"
                  className="block text-sm font-bold text-slate-800 mb-2"
                >
                  {graduationYearLabel(schoolLevel)}
                </label>
                <select
                  id="graduationYear"
                  name="graduationYear"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
                  value={graduationYear}
                  onChange={(e) => setGraduationYear(e.target.value ? Number(e.target.value) : '')}
                  required
                >
                  <option value="">Select year</option>
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {role === 'business' || role === 'counselor' ? (
              <div>
                <label
                  htmlFor="organizationName"
                  className="block text-sm font-bold text-slate-800 mb-2"
                >
                  {role === 'business'
                    ? 'Business / Organization Name'
                    : 'School or Organization Name (optional)'}
                </label>
                <input
                  id="organizationName"
                  name="organizationName"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-950 placeholder:text-slate-400 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  placeholder="Organization name"
                  required={role === 'business'}
                />
              </div>
            ) : null}

            {role === 'parent' || role === 'guardian' ? (
              <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4 text-sm font-semibold text-brand-800">
                After email confirmation, you’ll continue to Profile to invite or create a linked
                student profile.
              </div>
            ) : null}

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-center text-sm font-semibold text-red-700">
                {error}
              </div>
            ) : null}
            {message ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-center text-sm font-semibold text-emerald-700">
                {message}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-brand-600 px-4 py-3 font-black text-white shadow-soft transition hover:bg-brand-700 active:translate-y-px disabled:bg-slate-300 disabled:text-slate-600 disabled:shadow-none disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Account...' : 'Signup'}
            </button>

            <div className="text-center">
              <a href="/login" className="font-bold text-brand-700 transition hover:text-brand-800">
                Already have an account? Sign in
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
