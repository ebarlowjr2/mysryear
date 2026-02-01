'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Pencil, Trash2, Eye, EyeOff, Briefcase } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { Opportunity, OpportunityType, CreateOpportunityInput } from '@mysryear/shared'

const OPPORTUNITY_TYPE_LABELS: Record<OpportunityType, string> = {
  internship: 'Internship',
  apprenticeship: 'Apprenticeship',
  job_shadow: 'Job Shadow',
  volunteer: 'Volunteer',
  workshop: 'Workshop',
  other: 'Other'
}

const OPPORTUNITY_TYPES: OpportunityType[] = ['internship', 'apprenticeship', 'job_shadow', 'volunteer', 'workshop', 'other']

export default function ManageOpportunitiesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingOpp, setEditingOpp] = useState<Opportunity | null>(null)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const [formData, setFormData] = useState<CreateOpportunityInput>({
    title: '',
    description: '',
    opportunity_type: 'internship',
    location: '',
    is_remote: false,
    deadline: '',
    spots_available: undefined,
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

        if (profile.role !== 'business') {
          router.push('/opportunities')
          return
        }

        setUserId(user.id)

        const { data: opps } = await supabase
          .from('opportunities')
          .select('*')
          .eq('business_user_id', user.id)
          .order('created_at', { ascending: false })

        setOpportunities(opps as Opportunity[] || [])
        setLoading(false)
      } catch (err) {
        console.error('Error loading opportunities:', err)
        setLoading(false)
      }
    }

    loadData()
  }, [router, supabase])

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      opportunity_type: 'internship',
      location: '',
      is_remote: false,
      deadline: '',
      spots_available: undefined,
      requirements: '',
      contact_email: '',
      external_url: ''
    })
    setEditingOpp(null)
  }

  const openCreateModal = () => {
    resetForm()
    setShowModal(true)
  }

  const openEditModal = (opp: Opportunity) => {
    setEditingOpp(opp)
    setFormData({
      title: opp.title,
      description: opp.description || '',
      opportunity_type: opp.opportunity_type,
      location: opp.location || '',
      is_remote: opp.is_remote,
      deadline: opp.deadline || '',
      spots_available: opp.spots_available || undefined,
      requirements: opp.requirements || '',
      contact_email: opp.contact_email || '',
      external_url: opp.external_url || ''
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId || !formData.title) return

    setSaving(true)

    try {
      if (editingOpp) {
        const { error } = await supabase
          .from('opportunities')
          .update({
            title: formData.title,
            description: formData.description || null,
            opportunity_type: formData.opportunity_type,
            location: formData.location || null,
            is_remote: formData.is_remote,
            deadline: formData.deadline || null,
            spots_available: formData.spots_available || null,
            requirements: formData.requirements || null,
            contact_email: formData.contact_email || null,
            external_url: formData.external_url || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingOpp.id)
          .eq('business_user_id', userId)

        if (error) throw error

        setOpportunities(prev => prev.map(o => 
          o.id === editingOpp.id 
            ? { ...o, ...formData, updated_at: new Date().toISOString() }
            : o
        ))
      } else {
        const { data, error } = await supabase
          .from('opportunities')
          .insert({
            business_user_id: userId,
            title: formData.title,
            description: formData.description || null,
            opportunity_type: formData.opportunity_type || 'other',
            location: formData.location || null,
            is_remote: formData.is_remote || false,
            deadline: formData.deadline || null,
            spots_available: formData.spots_available || null,
            requirements: formData.requirements || null,
            contact_email: formData.contact_email || null,
            external_url: formData.external_url || null,
            is_active: true
          })
          .select()
          .single()

        if (error) throw error

        setOpportunities(prev => [data as Opportunity, ...prev])
      }

      setShowModal(false)
      resetForm()
    } catch (err) {
      console.error('Error saving opportunity:', err)
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (opp: Opportunity) => {
    if (!userId) return

    try {
      const { error } = await supabase
        .from('opportunities')
        .update({ is_active: !opp.is_active, updated_at: new Date().toISOString() })
        .eq('id', opp.id)
        .eq('business_user_id', userId)

      if (error) throw error

      setOpportunities(prev => prev.map(o => 
        o.id === opp.id ? { ...o, is_active: !o.is_active } : o
      ))
    } catch (err) {
      console.error('Error toggling opportunity:', err)
    }
  }

  const deleteOpportunity = async (opp: Opportunity) => {
    if (!userId || !confirm('Are you sure you want to delete this opportunity?')) return

    try {
      const { error } = await supabase
        .from('opportunities')
        .delete()
        .eq('id', opp.id)
        .eq('business_user_id', userId)

      if (error) throw error

      setOpportunities(prev => prev.filter(o => o.id !== opp.id))
    } catch (err) {
      console.error('Error deleting opportunity:', err)
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
            <h1 className="text-4xl font-black tracking-tight">Manage Opportunities</h1>
            <p className="text-slate-700 mt-2">Create and manage opportunities for students</p>
          </div>
        </div>
        <button
          onClick={openCreateModal}
          className="btn-primary px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Opportunity
        </button>
      </div>

      {opportunities.length === 0 ? (
        <div className="card p-12 text-center">
          <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No opportunities yet</h3>
          <p className="text-slate-500 mb-4">Create your first opportunity for students</p>
          <button
            onClick={openCreateModal}
            className="btn-primary px-4 py-2 rounded-lg font-semibold"
          >
            Create Opportunity
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {opportunities.map(opp => (
            <div key={opp.id} className={`card p-6 ${!opp.is_active ? 'opacity-60' : ''}`}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold">{opp.title}</h3>
                    {!opp.is_active && (
                      <span className="px-2 py-0.5 rounded text-xs bg-slate-200 text-slate-600">Inactive</span>
                    )}
                  </div>
                  <span className="text-sm text-brand-600">{OPPORTUNITY_TYPE_LABELS[opp.opportunity_type]}</span>
                  {opp.description && (
                    <p className="text-slate-600 mt-2 line-clamp-2">{opp.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleActive(opp)}
                    className="p-2 rounded-lg hover:bg-slate-100"
                    title={opp.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {opp.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => openEditModal(opp)}
                    className="p-2 rounded-lg hover:bg-slate-100"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteOpportunity(opp)}
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
                {editingOpp ? 'Edit Opportunity' : 'Create Opportunity'}
              </h2>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  className="input w-full px-3 py-2 rounded-lg"
                  value={formData.title}
                  onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                <select
                  className="input w-full px-3 py-2 rounded-lg"
                  value={formData.opportunity_type}
                  onChange={e => setFormData(prev => ({ ...prev, opportunity_type: e.target.value as OpportunityType }))}
                >
                  {OPPORTUNITY_TYPES.map(type => (
                    <option key={type} value={type}>{OPPORTUNITY_TYPE_LABELS[type]}</option>
                  ))}
                </select>
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">Deadline</label>
                  <input
                    type="date"
                    className="input w-full px-3 py-2 rounded-lg"
                    value={formData.deadline || ''}
                    onChange={e => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Spots Available</label>
                  <input
                    type="number"
                    min="1"
                    className="input w-full px-3 py-2 rounded-lg"
                    value={formData.spots_available || ''}
                    onChange={e => setFormData(prev => ({ ...prev, spots_available: e.target.value ? parseInt(e.target.value) : undefined }))}
                  />
                </div>
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
                  disabled={saving || !formData.title}
                  className="flex-1 btn-primary py-2 rounded-lg font-semibold disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingOpp ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
