'use client'

import { useEffect, useState } from 'react'
import { Building2, Loader2, Save } from 'lucide-react'
import { getBusinessProfile, ensureBusinessProfile, updateBusinessProfile, BusinessProfileData, INDUSTRIES } from '@/lib/business'

interface BusinessOrgSectionProps {
  userId: string
}

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
  'Wisconsin', 'Wyoming'
]

export default function BusinessOrgSection({ userId }: BusinessOrgSectionProps) {
  const [, setProfile] = useState<BusinessProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [orgName, setOrgName] = useState('')
  const [orgWebsite, setOrgWebsite] = useState('')
  const [orgEmail, setOrgEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [industry, setIndustry] = useState('')
  const [hqState, setHqState] = useState('')
  const [hqCounty, setHqCounty] = useState('')

  useEffect(() => {
    loadProfile()
  }, [userId])

  async function loadProfile() {
    setLoading(true)
    let data = await getBusinessProfile(userId)
    
    if (!data) {
      data = await ensureBusinessProfile(userId)
    }

    setProfile(data)
    setOrgName(data.orgName || '')
    setOrgWebsite(data.orgWebsite || '')
    setOrgEmail(data.orgEmail || '')
    setPhone(data.phone || '')
    setIndustry(data.industry || '')
    setHqState(data.hqState || '')
    setHqCounty(data.hqCounty || '')
    setLoading(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    const result = await updateBusinessProfile(userId, {
      orgName: orgName || null,
      orgWebsite: orgWebsite || null,
      orgEmail: orgEmail || null,
      phone: phone || null,
      industry: industry || null,
      hqState: hqState || null,
      hqCounty: hqCounty || null,
    })

    if (result.success) {
      setSuccess('Organization profile updated successfully!')
      if (result.data) {
        setProfile(result.data)
      }
    } else {
      setError(result.error || 'Failed to update profile')
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <div className="card p-6 mb-8">
        <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
          <Building2 className="w-5 h-5 text-brand-600" />
          Organization
        </h2>
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
        </div>
      </div>
    )
  }

  return (
    <div className="card p-6 mb-8">
      <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
        <Building2 className="w-5 h-5 text-brand-600" />
        Organization
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {success}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Organization Name
            </label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="input w-full px-4 py-3 rounded-lg"
              placeholder="Enter organization name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Website
            </label>
            <input
              type="url"
              value={orgWebsite}
              onChange={(e) => setOrgWebsite(e.target.value)}
              className="input w-full px-4 py-3 rounded-lg"
              placeholder="https://example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Contact Email
            </label>
            <input
              type="email"
              value={orgEmail}
              onChange={(e) => setOrgEmail(e.target.value)}
              className="input w-full px-4 py-3 rounded-lg"
              placeholder="contact@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Phone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input w-full px-4 py-3 rounded-lg"
              placeholder="(555) 123-4567"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Industry
            </label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="input w-full px-4 py-3 rounded-lg"
            >
              <option value="">Select industry</option>
              {INDUSTRIES.map((ind) => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              HQ State
            </label>
            <select
              value={hqState}
              onChange={(e) => setHqState(e.target.value)}
              className="input w-full px-4 py-3 rounded-lg"
            >
              <option value="">Select state</option>
              {US_STATES.map((state) => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              HQ County
            </label>
            <input
              type="text"
              value={hqCounty}
              onChange={(e) => setHqCounty(e.target.value)}
              className="input w-full px-4 py-3 rounded-lg"
              placeholder="Enter county"
            />
          </div>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={saving}
            className="btn-gradient px-6 py-3 rounded-lg flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            Save Changes
          </button>
        </div>
      </form>
    </div>
  )
}
