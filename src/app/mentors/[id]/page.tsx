'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Building2, Mail, Calendar, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { MentorProfile, MentorAvailability, DayOfWeek } from '@mysryear/shared'

const CAREER_PATH_LABELS: Record<string, string> = {
  'cybersecurity': 'Cybersecurity',
  'software-engineering': 'Software Engineering',
  'it-help-desk': 'IT / Help Desk',
  'data-ai': 'Data & AI',
  'skilled-trades': 'Skilled Trades',
  'healthcare': 'Healthcare',
  'finance': 'Finance',
  'entrepreneurship': 'Entrepreneurship',
  'military': 'Military'
}

const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday'
}

const DAY_ORDER: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

export default function MentorDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [loading, setLoading] = useState(true)
  const [mentor, setMentor] = useState<MentorProfile | null>(null)
  const [availability, setAvailability] = useState<MentorAvailability[]>([])

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

        const { data: mentorData } = await supabase
          .from('mentor_profiles')
          .select(`
            *,
            profiles!mentor_profiles_user_id_fkey(full_name, org_name)
          `)
          .eq('id', params.id)
          .single()

        if (!mentorData) {
          router.push('/mentors')
          return
        }

        setMentor({
          ...mentorData,
          full_name: mentorData.profiles?.full_name || 'Anonymous Mentor',
          org_name: mentorData.profiles?.org_name || null,
          profiles: undefined
        } as MentorProfile)

        const { data: availData } = await supabase
          .from('mentor_availability')
          .select('*')
          .eq('mentor_user_id', mentorData.user_id)
          .eq('is_active', true)

        setAvailability(availData as MentorAvailability[] || [])
        setLoading(false)
      } catch (err) {
        console.error('Error loading mentor:', err)
        router.push('/mentors')
      }
    }

    loadData()
  }, [router, supabase, params.id])

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour % 12 || 12
    return `${hour12}:${minutes} ${ampm}`
  }

  const groupedAvailability = DAY_ORDER.reduce((acc, day) => {
    const slots = availability.filter(a => a.day_of_week === day)
    if (slots.length > 0) {
      acc[day] = slots
    }
    return acc
  }, {} as Record<DayOfWeek, MentorAvailability[]>)

  if (loading || !mentor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    )
  }

  return (
    <div className="container-prose py-14">
      <div className="mb-8">
        <Link href="/mentors" className="flex items-center gap-2 text-slate-600 hover:text-brand-600 mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Mentors
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                <span className="text-brand-600 font-bold text-2xl">
                  {mentor.full_name?.charAt(0) || 'M'}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-black">{mentor.full_name}</h1>
                <p className="text-brand-600 font-medium text-lg">{mentor.headline}</p>
                {mentor.org_name && (
                  <div className="flex items-center gap-1 text-slate-500 mt-1">
                    <Building2 className="w-4 h-4" />
                    <span>{mentor.org_name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {mentor.bio && (
            <div className="card p-6">
              <h2 className="text-lg font-bold mb-4">About</h2>
              <p className="text-slate-700 whitespace-pre-wrap">{mentor.bio}</p>
            </div>
          )}

          {mentor.career_paths && mentor.career_paths.length > 0 && (
            <div className="card p-6">
              <h2 className="text-lg font-bold mb-4">Career Expertise</h2>
              <div className="flex flex-wrap gap-2">
                {mentor.career_paths.map(path => (
                  <span
                    key={path}
                    className="px-3 py-1.5 rounded-lg bg-brand-100 text-brand-700 font-medium"
                  >
                    {CAREER_PATH_LABELS[path] || path}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Availability
            </h2>
            {Object.keys(groupedAvailability).length === 0 ? (
              <p className="text-slate-500">No availability set</p>
            ) : (
              <div className="space-y-3">
                {(Object.entries(groupedAvailability) as [DayOfWeek, MentorAvailability[]][]).map(([day, slots]) => (
                  <div key={day}>
                    <p className="font-medium text-slate-900">{DAY_LABELS[day]}</p>
                    <div className="text-sm text-slate-600">
                                            {slots.map((slot) => (
                                              <div key={slot.id} className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-bold mb-4">Connect</h2>
            <p className="text-slate-600 text-sm mb-4">
              Interested in connecting with this mentor? Reach out to schedule a session.
            </p>
            <button
              className="btn-primary w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
              onClick={() => alert('Mentor connection feature coming soon!')}
            >
              <Mail className="w-4 h-4" />
              Request Connection
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
