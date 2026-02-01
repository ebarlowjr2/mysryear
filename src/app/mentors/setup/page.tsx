'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Clock, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { DayOfWeek } from '@mysryear/shared'

const CAREER_PATHS = [
  { id: 'cybersecurity', name: 'Cybersecurity' },
  { id: 'software-engineering', name: 'Software Engineering' },
  { id: 'it-help-desk', name: 'IT / Help Desk' },
  { id: 'data-ai', name: 'Data & AI' },
  { id: 'skilled-trades', name: 'Skilled Trades' },
  { id: 'healthcare', name: 'Healthcare' },
  { id: 'finance', name: 'Finance' },
  { id: 'entrepreneurship', name: 'Entrepreneurship' },
  { id: 'military', name: 'Military' },
]

const DAYS: { id: DayOfWeek; name: string }[] = [
  { id: 'monday', name: 'Monday' },
  { id: 'tuesday', name: 'Tuesday' },
  { id: 'wednesday', name: 'Wednesday' },
  { id: 'thursday', name: 'Thursday' },
  { id: 'friday', name: 'Friday' },
  { id: 'saturday', name: 'Saturday' },
  { id: 'sunday', name: 'Sunday' },
]

type AvailabilitySlot = {
  id?: string
  day_of_week: DayOfWeek
  start_time: string
  end_time: string
}

export default function MentorSetupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
    const [userId, setUserId] = useState<string | null>(null)

  const [headline, setHeadline] = useState('')
  const [bio, setBio] = useState('')
  const [selectedPaths, setSelectedPaths] = useState<string[]>([])
  const [isActive, setIsActive] = useState(true)
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([])

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

        if (profile.role !== 'mentor') {
          router.push('/mentors')
          return
        }

        setUserId(user.id)

        const { data: mentorData } = await supabase
          .from('mentor_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single()

                if (mentorData) {
                  setHeadline(mentorData.headline || '')
          setBio(mentorData.bio || '')
          setSelectedPaths(mentorData.career_paths || [])
          setIsActive(mentorData.is_active)
        }

        const { data: availData } = await supabase
          .from('mentor_availability')
          .select('*')
          .eq('mentor_user_id', user.id)
          .eq('is_active', true)

        if (availData && availData.length > 0) {
          setAvailabilitySlots(availData.map(a => ({
            id: a.id,
            day_of_week: a.day_of_week,
            start_time: a.start_time,
            end_time: a.end_time
          })))
        }

        setLoading(false)
      } catch (err) {
        console.error('Error loading mentor data:', err)
        setLoading(false)
      }
    }

    loadData()
  }, [router, supabase])

  const togglePath = (pathId: string) => {
    setSelectedPaths(prev => 
      prev.includes(pathId)
        ? prev.filter(p => p !== pathId)
        : [...prev, pathId]
    )
  }

  const addAvailabilitySlot = () => {
    setAvailabilitySlots(prev => [...prev, {
      day_of_week: 'monday',
      start_time: '09:00',
      end_time: '17:00'
    }])
  }

  const updateSlot = (index: number, field: keyof AvailabilitySlot, value: string) => {
    setAvailabilitySlots(prev => prev.map((slot, i) => 
      i === index ? { ...slot, [field]: value } : slot
    ))
  }

  const removeSlot = (index: number) => {
    setAvailabilitySlots(prev => prev.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!userId || !headline) return

    setSaving(true)

    try {
      const { error: profileError } = await supabase
        .from('mentor_profiles')
        .upsert({
          user_id: userId,
          headline,
          bio: bio || null,
          career_paths: selectedPaths.length > 0 ? selectedPaths : null,
          is_active: isActive,
          updated_at: new Date().toISOString()
        })

      if (profileError) throw profileError

      const { error: deleteError } = await supabase
        .from('mentor_availability')
        .delete()
        .eq('mentor_user_id', userId)

      if (deleteError) throw deleteError

      if (availabilitySlots.length > 0) {
        const { error: insertError } = await supabase
          .from('mentor_availability')
          .insert(
            availabilitySlots.map(slot => ({
              mentor_user_id: userId,
              day_of_week: slot.day_of_week,
              start_time: slot.start_time,
              end_time: slot.end_time,
              is_active: true
            }))
          )

        if (insertError) throw insertError
      }

      alert('Profile saved successfully!')
    } catch (err) {
      console.error('Error saving mentor profile:', err)
      alert('Failed to save profile')
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
          <Link href="/dashboard" className="text-slate-600 hover:text-brand-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-4xl font-black tracking-tight">Mentor Profile</h1>
            <p className="text-slate-700 mt-2">Manage your mentor profile and availability</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !headline}
          className="btn-primary px-4 py-2 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-bold mb-4">Profile Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Headline *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Software Engineer at Google"
                  className="input w-full px-3 py-2 rounded-lg"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Bio
                </label>
                <textarea
                  placeholder="Tell students about yourself and your experience..."
                  className="input w-full px-3 py-2 rounded-lg min-h-[120px]"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Career Paths You Can Mentor
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CAREER_PATHS.map(path => (
                    <button
                      key={path.id}
                      type="button"
                      onClick={() => togglePath(path.id)}
                      className={`p-2 text-sm rounded-lg border text-left transition-all ${
                        selectedPaths.includes(path.id)
                          ? 'border-brand-600 bg-brand-50 text-brand-700'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {path.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="isActive" className="text-sm text-slate-700">
                  Profile is active and visible to students
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Availability
              </h2>
              <button
                onClick={addAvailabilitySlot}
                className="text-brand-600 hover:text-brand-700 text-sm font-medium flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Slot
              </button>
            </div>

            {availabilitySlots.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No availability set</p>
                <button
                  onClick={addAvailabilitySlot}
                  className="text-brand-600 hover:underline text-sm mt-2"
                >
                  Add your first time slot
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {availabilitySlots.map((slot, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                    <select
                      className="input px-2 py-1 rounded text-sm flex-1"
                      value={slot.day_of_week}
                      onChange={(e) => updateSlot(index, 'day_of_week', e.target.value)}
                    >
                      {DAYS.map(day => (
                        <option key={day.id} value={day.id}>{day.name}</option>
                      ))}
                    </select>
                    <input
                      type="time"
                      className="input px-2 py-1 rounded text-sm"
                      value={slot.start_time}
                      onChange={(e) => updateSlot(index, 'start_time', e.target.value)}
                    />
                    <span className="text-slate-400">to</span>
                    <input
                      type="time"
                      className="input px-2 py-1 rounded text-sm"
                      value={slot.end_time}
                      onChange={(e) => updateSlot(index, 'end_time', e.target.value)}
                    />
                    <button
                      onClick={() => removeSlot(index)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-6 bg-brand-50 border-brand-200">
            <h3 className="font-bold text-brand-900 mb-2">Tips for Mentors</h3>
            <ul className="text-sm text-brand-800 space-y-1">
              <li>• Keep your headline clear and professional</li>
              <li>• Share your experience and what you can offer</li>
              <li>• Set realistic availability times</li>
              <li>• Select career paths you have expertise in</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
