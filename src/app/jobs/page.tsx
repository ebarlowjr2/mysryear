'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Briefcase, MapPin, Calendar, ExternalLink, ArrowLeft, DollarSign, Building2, Bookmark } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { listTrackedJobs } from '@mysryear/shared'
import type { Job, JobType, ExperienceLevel } from '@mysryear/shared'

const JOB_TYPE_LABELS: Record<JobType, string> = {
  full_time: 'Full Time',
  part_time: 'Part Time',
  internship: 'Internship',
  contract: 'Contract',
  seasonal: 'Seasonal'
}

const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  entry: 'Entry Level',
  mid: 'Mid Level',
  senior: 'Senior',
  any: 'Any Experience'
}

export default function JobsPage() {
  const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [jobs, setJobs] = useState<Job[]>([])
    const [filterType, setFilterType] = useState<JobType | 'all'>('all')
    const [viewMode, setViewMode] = useState<'all' | 'saved'>('all')
    const [trackedJobIds, setTrackedJobIds] = useState<Set<string>>(new Set())

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

                if (profile.role === 'recruiter') {
          router.push('/jobs/manage')
          return
        }

        const { data: jobsData } = await supabase
          .from('job_posts')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })

                setJobs(jobsData as Job[] || [])

                const trackedIds = await listTrackedJobs(supabase)
                setTrackedJobIds(new Set(trackedIds))

                setLoading(false)
      } catch (err) {
        console.error('Error loading jobs:', err)
        setLoading(false)
      }
    }

    loadData()
  }, [router, supabase])

    const baseJobs = viewMode === 'saved'
      ? jobs.filter(j => trackedJobIds.has(j.id))
      : jobs

    const filteredJobs = filterType === 'all'
      ? baseJobs
      : baseJobs.filter(j => j.job_type === filterType)

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const formatSalary = (min: number | null, max: number | null) => {
    if (!min && !max) return null
    if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()}`
    if (min) return `From $${min.toLocaleString()}`
    if (max) return `Up to $${max.toLocaleString()}`
    return null
  }

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
          <h1 className="text-4xl font-black tracking-tight">Job Board</h1>
          <p className="text-slate-700 mt-2">Find jobs and career opportunities</p>
        </div>
      </div>

            <div className="mb-6 space-y-4">
              <div className="flex gap-2 border-b border-slate-200">
                <button
                  onClick={() => setViewMode('all')}
                  className={`px-4 py-2 font-medium transition border-b-2 -mb-px ${
                    viewMode === 'all'
                      ? 'border-brand-600 text-brand-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Jobs
                </button>
                <button
                  onClick={() => setViewMode('saved')}
                  className={`px-4 py-2 font-medium transition border-b-2 -mb-px flex items-center gap-2 ${
                    viewMode === 'saved'
                      ? 'border-brand-600 text-brand-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Bookmark className="w-4 h-4" />
                  Saved ({trackedJobIds.size})
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    filterType === 'all'
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  All Types
                </button>
                {(Object.keys(JOB_TYPE_LABELS) as JobType[]).map(type => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      filterType === type
                        ? 'bg-brand-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {JOB_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>

      {filteredJobs.length === 0 ? (
        <div className="card p-12 text-center">
          <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No jobs found</h3>
          <p className="text-slate-500">Check back later for new job postings</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredJobs.map(job => (
            <div key={job.id} className="card p-6 hover:shadow-lg transition">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{job.title}</h3>
                  <div className="flex items-center gap-2 text-slate-600 mt-1">
                    <Building2 className="w-4 h-4" />
                    <span>{job.company_name}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-brand-100 text-brand-700">
                    {JOB_TYPE_LABELS[job.job_type]}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                    {EXPERIENCE_LABELS[job.experience_level]}
                  </span>
                </div>
              </div>

              {job.description && (
                <p className="text-slate-600 mb-4 line-clamp-2">{job.description}</p>
              )}

              <div className="flex flex-wrap gap-4 text-sm text-slate-500 mb-4">
                {(job.location || job.is_remote) && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{job.is_remote ? 'Remote' : job.location}</span>
                  </div>
                )}
                {formatSalary(job.salary_min, job.salary_max) && (
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    <span>{formatSalary(job.salary_min, job.salary_max)}</span>
                  </div>
                )}
                {job.deadline && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>Apply by: {formatDate(job.deadline)}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Link
                  href={`/jobs/${job.id}`}
                  className="btn-primary px-4 py-2 rounded-lg text-sm font-medium"
                >
                  View Details
                </Link>
                {job.external_url && (
                  <a
                    href={job.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 hover:bg-slate-50"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Apply
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
