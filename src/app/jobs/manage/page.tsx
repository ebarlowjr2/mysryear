'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Pencil, Trash2, Eye, EyeOff, Briefcase } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { Job, JobType, ExperienceLevel, CreateJobInput } from '@mysryear/shared'

const JOB_TYPE_LABELS: Record<JobType, string> = {
  full_time: 'Full Time',
  part_time: 'Part Time',
  internship: 'Internship',
  contract: 'Contract',
  seasonal: 'Seasonal'
}

const JOB_TYPES: JobType[] = ['full_time', 'part_time', 'internship', 'contract', 'seasonal']

const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  entry: 'Entry Level',
  mid: 'Mid Level',
  senior: 'Senior',
  any: 'Any Experience'
}

const EXPERIENCE_LEVELS: ExperienceLevel[] = ['entry', 'mid', 'senior', 'any']

export default function ManageJobsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [jobs, setJobs] = useState<Job[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingJob, setEditingJob] = useState<Job | null>(null)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const [formData, setFormData] = useState<CreateJobInput>({
    title: '',
    company_name: '',
    description: '',
    job_type: 'full_time',
    experience_level: 'entry',
    location: '',
    is_remote: false,
    salary_min: undefined,
    salary_max: undefined,
    deadline: '',
    requirements: '',
    contact_email: '',
    external_url: ''
  })

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

        if (profile.role !== 'recruiter') {
          router.push('/jobs')
          return
        }

        setUserId(user.id)

        const { data: jobsData } = await supabase
          .from('job_posts')
          .select('*')
          .eq('recruiter_user_id', user.id)
          .order('created_at', { ascending: false })

        setJobs(jobsData as Job[] || [])
        setLoading(false)
      } catch (err) {
        console.error('Error loading jobs:', err)
        setLoading(false)
      }
    }

    loadData()
  }, [router, supabase])

  const resetForm = () => {
    setFormData({
      title: '',
      company_name: '',
      description: '',
      job_type: 'full_time',
      experience_level: 'entry',
      location: '',
      is_remote: false,
      salary_min: undefined,
      salary_max: undefined,
      deadline: '',
      requirements: '',
      contact_email: '',
      external_url: ''
    })
    setEditingJob(null)
  }

  const openCreateModal = () => {
    resetForm()
    setShowModal(true)
  }

  const openEditModal = (job: Job) => {
    setEditingJob(job)
    setFormData({
      title: job.title,
      company_name: job.company_name,
      description: job.description || '',
      job_type: job.job_type,
      experience_level: job.experience_level,
      location: job.location || '',
      is_remote: job.is_remote,
      salary_min: job.salary_min || undefined,
      salary_max: job.salary_max || undefined,
      deadline: job.deadline || '',
      requirements: job.requirements || '',
      contact_email: job.contact_email || '',
      external_url: job.external_url || ''
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId || !formData.title || !formData.company_name) return

    setSaving(true)

    try {
      if (editingJob) {
        const { error } = await supabase
          .from('job_posts')
          .update({
            title: formData.title,
            company_name: formData.company_name,
            description: formData.description || null,
            job_type: formData.job_type,
            experience_level: formData.experience_level,
            location: formData.location || null,
            is_remote: formData.is_remote,
            salary_min: formData.salary_min || null,
            salary_max: formData.salary_max || null,
            deadline: formData.deadline || null,
            requirements: formData.requirements || null,
            contact_email: formData.contact_email || null,
            external_url: formData.external_url || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingJob.id)
          .eq('recruiter_user_id', userId)

        if (error) throw error

        setJobs(prev => prev.map(j => 
          j.id === editingJob.id 
            ? { ...j, ...formData, updated_at: new Date().toISOString() }
            : j
        ))
      } else {
        const { data, error } = await supabase
          .from('job_posts')
          .insert({
            recruiter_user_id: userId,
            title: formData.title,
            company_name: formData.company_name,
            description: formData.description || null,
            job_type: formData.job_type || 'full_time',
            experience_level: formData.experience_level || 'entry',
            location: formData.location || null,
            is_remote: formData.is_remote || false,
            salary_min: formData.salary_min || null,
            salary_max: formData.salary_max || null,
            deadline: formData.deadline || null,
            requirements: formData.requirements || null,
            contact_email: formData.contact_email || null,
            external_url: formData.external_url || null,
            is_active: true
          })
          .select()
          .single()

        if (error) throw error

        setJobs(prev => [data as Job, ...prev])
      }

      setShowModal(false)
      resetForm()
    } catch (err) {
      console.error('Error saving job:', err)
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (job: Job) => {
    if (!userId) return

    try {
      const { error } = await supabase
        .from('job_posts')
        .update({ is_active: !job.is_active, updated_at: new Date().toISOString() })
        .eq('id', job.id)
        .eq('recruiter_user_id', userId)

      if (error) throw error

      setJobs(prev => prev.map(j => 
        j.id === job.id ? { ...j, is_active: !j.is_active } : j
      ))
    } catch (err) {
      console.error('Error toggling job:', err)
    }
  }

  const deleteJob = async (job: Job) => {
    if (!userId || !confirm('Are you sure you want to delete this job posting?')) return

    try {
      const { error } = await supabase
        .from('job_posts')
        .delete()
        .eq('id', job.id)
        .eq('recruiter_user_id', userId)

      if (error) throw error

      setJobs(prev => prev.filter(j => j.id !== job.id))
    } catch (err) {
      console.error('Error deleting job:', err)
    }
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
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-slate-600 hover:text-brand-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-4xl font-black tracking-tight">Manage Jobs</h1>
            <p className="text-slate-700 mt-2">Create and manage job postings</p>
          </div>
        </div>
        <button
          onClick={openCreateModal}
          className="btn-primary px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Job
        </button>
      </div>

      {jobs.length === 0 ? (
        <div className="card p-12 text-center">
          <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No job postings yet</h3>
          <p className="text-slate-500 mb-4">Create your first job posting</p>
          <button
            onClick={openCreateModal}
            className="btn-primary px-4 py-2 rounded-lg font-semibold"
          >
            Create Job
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map(job => (
            <div key={job.id} className={`card p-6 ${!job.is_active ? 'opacity-60' : ''}`}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold">{job.title}</h3>
                    {!job.is_active && (
                      <span className="px-2 py-0.5 rounded text-xs bg-slate-200 text-slate-600">Inactive</span>
                    )}
                  </div>
                  <p className="text-slate-600">{job.company_name}</p>
                  <div className="flex gap-2 mt-2">
                    <span className="text-sm text-brand-600">{JOB_TYPE_LABELS[job.job_type]}</span>
                    <span className="text-sm text-slate-500">• {EXPERIENCE_LABELS[job.experience_level]}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleActive(job)}
                    className="p-2 rounded-lg hover:bg-slate-100"
                    title={job.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {job.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => openEditModal(job)}
                    className="p-2 rounded-lg hover:bg-slate-100"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteJob(job)}
                    className="p-2 rounded-lg hover:bg-red-50 text-red-600"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <h2 className="text-xl font-bold">
                {editingJob ? 'Edit Job' : 'Create Job'}
              </h2>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Job Title *</label>
                <input
                  type="text"
                  required
                  className="input w-full px-3 py-2 rounded-lg"
                  value={formData.title}
                  onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  className="input w-full px-3 py-2 rounded-lg"
                  value={formData.company_name}
                  onChange={e => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Job Type</label>
                  <select
                    className="input w-full px-3 py-2 rounded-lg"
                    value={formData.job_type}
                    onChange={e => setFormData(prev => ({ ...prev, job_type: e.target.value as JobType }))}
                  >
                    {JOB_TYPES.map(type => (
                      <option key={type} value={type}>{JOB_TYPE_LABELS[type]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Experience Level</label>
                  <select
                    className="input w-full px-3 py-2 rounded-lg"
                    value={formData.experience_level}
                    onChange={e => setFormData(prev => ({ ...prev, experience_level: e.target.value as ExperienceLevel }))}
                  >
                    {EXPERIENCE_LEVELS.map(level => (
                      <option key={level} value={level}>{EXPERIENCE_LABELS[level]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  className="input w-full px-3 py-2 rounded-lg min-h-[100px]"
                  value={formData.description || ''}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                  <input
                    type="text"
                    className="input w-full px-3 py-2 rounded-lg"
                    value={formData.location || ''}
                    onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  />
                </div>
                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_remote}
                      onChange={e => setFormData(prev => ({ ...prev, is_remote: e.target.checked }))}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Remote</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Salary Min</label>
                  <input
                    type="number"
                    min="0"
                    className="input w-full px-3 py-2 rounded-lg"
                    value={formData.salary_min || ''}
                    onChange={e => setFormData(prev => ({ ...prev, salary_min: e.target.value ? parseInt(e.target.value) : undefined }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Salary Max</label>
                  <input
                    type="number"
                    min="0"
                    className="input w-full px-3 py-2 rounded-lg"
                    value={formData.salary_max || ''}
                    onChange={e => setFormData(prev => ({ ...prev, salary_max: e.target.value ? parseInt(e.target.value) : undefined }))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Application Deadline</label>
                <input
                  type="date"
                  className="input w-full px-3 py-2 rounded-lg"
                  value={formData.deadline || ''}
                  onChange={e => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Requirements</label>
                <textarea
                  className="input w-full px-3 py-2 rounded-lg"
                  value={formData.requirements || ''}
                  onChange={e => setFormData(prev => ({ ...prev, requirements: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contact Email</label>
                <input
                  type="email"
                  className="input w-full px-3 py-2 rounded-lg"
                  value={formData.contact_email || ''}
                  onChange={e => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">External Application URL</label>
                <input
                  type="url"
                  className="input w-full px-3 py-2 rounded-lg"
                  placeholder="https://"
                  value={formData.external_url || ''}
                  onChange={e => setFormData(prev => ({ ...prev, external_url: e.target.value }))}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="flex-1 py-2 rounded-lg border border-slate-200 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !formData.title || !formData.company_name}
                  className="flex-1 btn-primary py-2 rounded-lg font-semibold disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingJob ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
