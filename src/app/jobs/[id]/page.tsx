'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, Calendar, ExternalLink, Building2, Mail, DollarSign, Bookmark } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { isJobTracked, trackJob, untrackJob } from '@mysryear/shared'
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

export default function JobDetailPage() {
  const router = useRouter()
  const params = useParams()
    const [loading, setLoading] = useState(true)
    const [job, setJob] = useState<Job | null>(null)
    const [isTracked, setIsTracked] = useState(false)
    const [trackingLoading, setTrackingLoading] = useState(false)

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
          .select('onboarding_complete')
          .eq('user_id', user.id)
          .single()

        if (!profile?.onboarding_complete) {
          router.push('/onboarding')
          return
        }

        const { data: jobData } = await supabase
          .from('job_posts')
          .select('*')
          .eq('id', params.id)
          .single()

        if (!jobData) {
          router.push('/jobs')
          return
        }

                setJob(jobData as Job)

                const tracked = await isJobTracked(supabase, jobData.id)
                setIsTracked(tracked)

                setLoading(false)
      } catch (err) {
        console.error('Error loading job:', err)
        router.push('/jobs')
      }
    }

    loadData()
  }, [router, supabase, params.id])

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

    const formatSalary = (min: number | null, max: number | null) => {
      if (!min && !max) return null
      if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()}`
      if (min) return `From $${min.toLocaleString()}`
      if (max) return `Up to $${max.toLocaleString()}`
      return null
    }

    const handleToggleTracking = async () => {
      if (!job) return
      setTrackingLoading(true)
      if (isTracked) {
        const success = await untrackJob(supabase, job.id)
        if (success) setIsTracked(false)
      } else {
        const success = await trackJob(supabase, job.id)
        if (success) setIsTracked(true)
      }
      setTrackingLoading(false)
    }

  if (loading || !job) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    )
  }

  return (
    <div className="container-prose py-14">
      <div className="mb-8">
        <Link href="/jobs" className="flex items-center gap-2 text-slate-600 hover:text-brand-600 mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Jobs
        </Link>

                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex gap-2 mb-2">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-brand-100 text-brand-700">
                        {JOB_TYPE_LABELS[job.job_type]}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        {EXPERIENCE_LABELS[job.experience_level]}
                      </span>
                    </div>
                    <h1 className="text-3xl font-black tracking-tight mt-2">{job.title}</h1>
                    <div className="flex items-center gap-2 text-slate-600 mt-2">
                      <Building2 className="w-5 h-5" />
                      <span className="text-lg">{job.company_name}</span>
                    </div>
                  </div>
                  <button
                    onClick={handleToggleTracking}
                    disabled={trackingLoading}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                      isTracked
                        ? 'bg-brand-100 text-brand-700 hover:bg-brand-200'
                        : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                    } disabled:opacity-50`}
                  >
                    <Bookmark className={`w-4 h-4 ${isTracked ? 'fill-current' : ''}`} />
                    {trackingLoading ? 'Saving...' : isTracked ? 'Saved' : 'Save'}
                  </button>
                </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {job.description && (
            <div className="card p-6">
              <h2 className="text-lg font-bold mb-4">Description</h2>
              <p className="text-slate-700 whitespace-pre-wrap">{job.description}</p>
            </div>
          )}

          {job.requirements && (
            <div className="card p-6">
              <h2 className="text-lg font-bold mb-4">Requirements</h2>
              <p className="text-slate-700 whitespace-pre-wrap">{job.requirements}</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-bold mb-4">Details</h2>
            <div className="space-y-4">
              {(job.location || job.is_remote) && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="font-medium">Location</p>
                    <p className="text-slate-600">
                      {job.is_remote ? 'Remote' : job.location}
                    </p>
                  </div>
                </div>
              )}

              {formatSalary(job.salary_min, job.salary_max) && (
                <div className="flex items-start gap-3">
                  <DollarSign className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="font-medium">Salary</p>
                    <p className="text-slate-600">{formatSalary(job.salary_min, job.salary_max)}</p>
                  </div>
                </div>
              )}

              {job.deadline && (
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="font-medium">Application Deadline</p>
                    <p className="text-slate-600">{formatDate(job.deadline)}</p>
                  </div>
                </div>
              )}

              {job.contact_email && (
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="font-medium">Contact</p>
                    <a href={`mailto:${job.contact_email}`} className="text-brand-600 hover:underline">
                      {job.contact_email}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-bold mb-4">Apply</h2>
            {job.external_url ? (
              <a
                href={job.external_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Apply Now
              </a>
            ) : job.contact_email ? (
              <a
                href={`mailto:${job.contact_email}?subject=Application for ${job.title}`}
                className="btn-primary w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4" />
                Email to Apply
              </a>
            ) : (
              <p className="text-slate-500 text-center">Contact the company directly to apply</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
