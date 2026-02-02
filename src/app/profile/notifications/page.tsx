'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Bell, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase'

type NotificationPrefs = {
  notify_link_requests: boolean
  notify_deadlines: boolean
  notify_parent_updates: boolean
  deadline_lead_days: number
}

export default function NotificationPreferencesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    notify_link_requests: true,
    notify_deadlines: true,
    notify_parent_updates: true,
    deadline_lead_days: 3
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
          .select('role, onboarding_complete, notify_link_requests, notify_deadlines, notify_parent_updates, deadline_lead_days')
          .eq('user_id', user.id)
          .single()

        if (!profile?.onboarding_complete) {
          router.push('/onboarding')
          return
        }

        setUserRole(profile.role)
        setPrefs({
          notify_link_requests: profile.notify_link_requests ?? true,
          notify_deadlines: profile.notify_deadlines ?? true,
          notify_parent_updates: profile.notify_parent_updates ?? true,
          deadline_lead_days: profile.deadline_lead_days ?? 3
        })

        setLoading(false)
      } catch (err) {
        console.error('Error loading preferences:', err)
        setLoading(false)
      }
    }

    loadData()
  }, [router, supabase])

  const handleSave = async () => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('profiles')
        .update({
          notify_link_requests: prefs.notify_link_requests,
          notify_deadlines: prefs.notify_deadlines,
          notify_parent_updates: prefs.notify_parent_updates,
          deadline_lead_days: prefs.deadline_lead_days
        })
        .eq('user_id', user.id)

      if (error) throw error

      alert('Preferences saved successfully!')
    } catch (err) {
      console.error('Error saving preferences:', err)
      alert('Failed to save preferences')
    } finally {
      setSaving(false)
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
          <Link href="/profile" className="text-slate-600 hover:text-brand-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-4xl font-black tracking-tight">Notification Preferences</h1>
            <p className="text-slate-700 mt-2">Manage how you receive notifications</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary px-4 py-2 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="card p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <Bell className="w-5 h-5 text-slate-400 mt-0.5" />
            <div>
              <p className="font-medium">Link Requests</p>
              <p className="text-sm text-slate-600">
                Get notified when someone requests to link with you
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={prefs.notify_link_requests}
              onChange={(e) => setPrefs(prev => ({ ...prev, notify_link_requests: e.target.checked }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
          </label>
        </div>

        <div className="border-t border-slate-100"></div>

        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <Bell className="w-5 h-5 text-slate-400 mt-0.5" />
            <div>
              <p className="font-medium">Deadlines & Reminders</p>
              <p className="text-sm text-slate-600">
                Get notified about upcoming task and application deadlines
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={prefs.notify_deadlines}
              onChange={(e) => setPrefs(prev => ({ ...prev, notify_deadlines: e.target.checked }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
          </label>
        </div>

        {prefs.notify_deadlines && (
          <div className="ml-8 p-4 bg-slate-50 rounded-lg">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Remind me before deadlines
            </label>
            <select
              value={prefs.deadline_lead_days}
              onChange={(e) => setPrefs(prev => ({ ...prev, deadline_lead_days: parseInt(e.target.value) }))}
              className="input px-3 py-2 rounded-lg w-full max-w-xs"
            >
              <option value={1}>1 day before</option>
              <option value={3}>3 days before</option>
              <option value={7}>7 days before</option>
            </select>
          </div>
        )}

        {userRole === 'parent' && (
          <>
            <div className="border-t border-slate-100"></div>

            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <Bell className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="font-medium">Parent Updates</p>
                  <p className="text-sm text-slate-600">
                    Get notified about your linked student&apos;s activity
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs.notify_parent_updates}
                  onChange={(e) => setPrefs(prev => ({ ...prev, notify_parent_updates: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
              </label>
            </div>
          </>
        )}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> These preferences control your in-app notifications. Push notifications are available on the mobile app.
        </p>
      </div>
    </div>
  )
}
