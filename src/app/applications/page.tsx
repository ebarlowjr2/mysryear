'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Plus, Trash2, Edit2, X, Calendar, ArrowLeft, ExternalLink, CalendarPlus } from 'lucide-react'

type ApplicationStatus = 'not_started' | 'in_progress' | 'submitted' | 'accepted' | 'rejected' | 'waitlisted' | 'deferred'
type ApplicationType = 'college' | 'scholarship' | 'program' | 'internship'
type EssayStatus = 'not_started' | 'draft' | 'completed'

type Application = {
  id: string
  user_id: string
  college_name: string
  program_name: string | null
  application_type: ApplicationType
  status: ApplicationStatus
  deadline: string | null
  date_applied: string | null
  portal_url: string | null
  contact_email: string | null
  essay_status: EssayStatus
  recommendation_count: number
  fee_amount: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

const APPLICATION_STATUSES: { value: ApplicationStatus; label: string; color: string }[] = [
  { value: 'not_started', label: 'Not Started', color: 'bg-slate-100 text-slate-600' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'submitted', label: 'Submitted', color: 'bg-blue-100 text-blue-700' },
  { value: 'accepted', label: 'Accepted', color: 'bg-green-100 text-green-700' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-700' },
  { value: 'waitlisted', label: 'Waitlisted', color: 'bg-purple-100 text-purple-700' },
  { value: 'deferred', label: 'Deferred', color: 'bg-orange-100 text-orange-700' },
]

const APPLICATION_TYPES: { value: ApplicationType; label: string }[] = [
  { value: 'college', label: 'College' },
  { value: 'scholarship', label: 'Scholarship' },
  { value: 'program', label: 'Program' },
  { value: 'internship', label: 'Internship' },
]

export default function ApplicationsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [applications, setApplications] = useState<Application[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingApp, setEditingApp] = useState<Application | null>(null)
  const [filter, setFilter] = useState<'all' | ApplicationStatus>('all')

  const supabase = createClient()

  useEffect(() => {
    loadApplications()
  }, [])

  const loadApplications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', user.id)
        .order('deadline', { ascending: true, nullsFirst: false })

      if (error) {
        console.error('Error loading applications:', error)
        return
      }

      setApplications(data || [])
      setLoading(false)
    } catch (err) {
      console.error('Error:', err)
      setLoading(false)
    }
  }

  const createApplication = async (appData: Partial<Application>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('applications')
        .insert({
          user_id: user.id,
          college_name: appData.college_name,
          program_name: appData.program_name || null,
          application_type: appData.application_type || 'college',
          status: appData.status || 'not_started',
          deadline: appData.deadline || null,
          date_applied: appData.date_applied || null,
          portal_url: appData.portal_url || null,
          contact_email: appData.contact_email || null,
          essay_status: appData.essay_status || 'not_started',
          recommendation_count: appData.recommendation_count || 0,
          fee_amount: appData.fee_amount || null,
          notes: appData.notes || null,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating application:', error)
        return
      }

      setApplications(prev => [data, ...prev].sort((a, b) => {
        if (!a.deadline) return 1
        if (!b.deadline) return -1
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
      }))
      setShowCreateModal(false)
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const updateApplication = async (appId: string, updates: Partial<Application>) => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', appId)
        .select()
        .single()

      if (error) {
        console.error('Error updating application:', error)
        return
      }

      setApplications(prev => prev.map(a => a.id === appId ? data : a).sort((a, b) => {
        if (!a.deadline) return 1
        if (!b.deadline) return -1
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
      }))
      setEditingApp(null)
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const deleteApplication = async (appId: string) => {
    if (!confirm('Delete this application?')) return

    try {
      const { error } = await supabase
        .from('applications')
        .delete()
        .eq('id', appId)

      if (error) {
        console.error('Error deleting application:', error)
        return
      }

      setApplications(prev => prev.filter(a => a.id !== appId))
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const addToPlanner = async (app: Application) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('user_tasks')
        .insert({
          user_id: user.id,
          title: `${app.college_name} Application`,
          category: 'Applications',
          status: 'todo',
          month: 'Aug-Sep',
          due_date: app.deadline,
          notes: app.program_name ? `Program: ${app.program_name}` : null,
          pinned: false
        })

      if (error) {
        console.error('Error adding to planner:', error)
        alert('Failed to add to planner')
        return
      }

      alert('Added to planner!')
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const filteredApps = applications.filter(app => {
    if (filter === 'all') return true
    return app.status === filter
  })

  const statusCounts = applications.reduce((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-slate-600 hover:text-brand-600">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl font-black text-slate-900">Applications</h1>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2 py-2 px-4 rounded-lg"
          >
            <Plus className="w-5 h-5" />
            Add Application
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              filter === 'all' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            All ({applications.length})
          </button>
          {APPLICATION_STATUSES.map(status => (
            <button
              key={status.value}
              onClick={() => setFilter(status.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                filter === status.value ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              {status.label} ({statusCounts[status.value] || 0})
            </button>
          ))}
        </div>

        {filteredApps.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-slate-500">No applications yet. Start tracking your first application!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredApps.map(app => (
              <ApplicationCard
                key={app.id}
                app={app}
                onEdit={() => setEditingApp(app)}
                onDelete={() => deleteApplication(app.id)}
                onAddToPlanner={() => addToPlanner(app)}
              />
            ))}
          </div>
        )}

        {showCreateModal && (
          <ApplicationModal
            onClose={() => setShowCreateModal(false)}
            onSave={createApplication}
          />
        )}

        {editingApp && (
          <ApplicationModal
            app={editingApp}
            onClose={() => setEditingApp(null)}
            onSave={(data) => updateApplication(editingApp.id, data)}
          />
        )}
      </div>
    </div>
  )
}

function ApplicationCard({
  app,
  onEdit,
  onDelete,
  onAddToPlanner
}: {
  app: Application
  onEdit: () => void
  onDelete: () => void
  onAddToPlanner: () => void
}) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getDaysUntil = (dateStr: string | null) => {
    if (!dateStr) return null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const deadline = new Date(dateStr)
    deadline.setHours(0, 0, 0, 0)
    const diff = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  const statusInfo = APPLICATION_STATUSES.find(s => s.value === app.status) || APPLICATION_STATUSES[0]
  const daysUntil = getDaysUntil(app.deadline)
  const isOverdue = daysUntil !== null && daysUntil < 0 && !['accepted', 'rejected', 'submitted'].includes(app.status)

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-slate-900">{app.college_name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>
          
          {app.program_name && (
            <p className="text-sm text-slate-600 mt-1">{app.program_name}</p>
          )}
          
          <div className="flex flex-wrap items-center gap-3 mt-2">
            {app.deadline && (
              <span className={`text-sm flex items-center gap-1 ${isOverdue ? 'text-red-600' : 'text-slate-500'}`}>
                <Calendar className="w-4 h-4" />
                {formatDate(app.deadline)}
                {daysUntil !== null && (
                  <span className="ml-1">
                    ({daysUntil === 0 ? 'Today' : daysUntil > 0 ? `${daysUntil}d left` : `${Math.abs(daysUntil)}d ago`})
                  </span>
                )}
              </span>
            )}
            {app.portal_url && (
              <a
                href={app.portal_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1"
              >
                <ExternalLink className="w-4 h-4" />
                Portal
              </a>
            )}
          </div>
          
          {app.notes && (
            <p className="text-sm text-slate-500 mt-2 line-clamp-2">{app.notes}</p>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={onAddToPlanner}
            className="p-2 text-slate-400 hover:text-brand-600"
            title="Add to Planner"
          >
            <CalendarPlus className="w-4 h-4" />
          </button>
          <button
            onClick={onEdit}
            className="p-2 text-slate-400 hover:text-brand-600"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-slate-400 hover:text-red-600"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

function ApplicationModal({
  app,
  onClose,
  onSave
}: {
  app?: Application
  onClose: () => void
  onSave: (data: Partial<Application>) => void
}) {
  const [collegeName, setCollegeName] = useState(app?.college_name || '')
  const [programName, setProgramName] = useState(app?.program_name || '')
  const [appType, setAppType] = useState<ApplicationType>(app?.application_type || 'college')
  const [status, setStatus] = useState<ApplicationStatus>(app?.status || 'not_started')
  const [deadline, setDeadline] = useState(app?.deadline || '')
  const [portalUrl, setPortalUrl] = useState(app?.portal_url || '')
  const [notes, setNotes] = useState(app?.notes || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!collegeName.trim()) return

    onSave({
      college_name: collegeName.trim(),
      program_name: programName.trim() || null,
      application_type: appType,
      status,
      deadline: deadline || null,
      portal_url: portalUrl.trim() || null,
      notes: notes.trim() || null
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold">{app ? 'Edit Application' : 'New Application'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">College/Institution *</label>
            <input
              type="text"
              value={collegeName}
              onChange={(e) => setCollegeName(e.target.value)}
              className="input w-full px-4 py-2 rounded-lg"
              placeholder="e.g., Harvard University"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Program Name</label>
            <input
              type="text"
              value={programName}
              onChange={(e) => setProgramName(e.target.value)}
              className="input w-full px-4 py-2 rounded-lg"
              placeholder="e.g., Computer Science"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select
                value={appType}
                onChange={(e) => setAppType(e.target.value as ApplicationType)}
                className="input w-full px-4 py-2 rounded-lg"
              >
                {APPLICATION_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
                className="input w-full px-4 py-2 rounded-lg"
              >
                {APPLICATION_STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Deadline</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="input w-full px-4 py-2 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Portal URL</label>
            <input
              type="url"
              value={portalUrl}
              onChange={(e) => setPortalUrl(e.target.value)}
              className="input w-full px-4 py-2 rounded-lg"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input w-full px-4 py-2 rounded-lg min-h-[80px]"
              placeholder="Additional details..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!collegeName.trim()}
              className="flex-1 btn-primary py-2 px-4 rounded-lg disabled:opacity-50"
            >
              {app ? 'Save Changes' : 'Create Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
