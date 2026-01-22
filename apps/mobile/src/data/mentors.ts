import { supabase } from '../lib/supabase'
import type { Profile } from './profile'

// Mentor profile types matching the database schema
export interface MentorProfile {
  user_id: string
  headline: string | null
  bio: string | null
  career_paths: string[]
  is_active: boolean
  is_remote: boolean
  state: string | null
  county: string | null
  contact_email: string | null
  contact_url: string | null
  created_at: string
  updated_at: string
}

// Mentor profile with user info for display
export interface MentorWithProfile extends MentorProfile {
  full_name: string | null
}

// Mentor availability types
export interface MentorAvailability {
  id: string
  user_id: string
  day_of_week: number // 0-6 (Sunday-Saturday)
  start_time: string // HH:MM:SS format
  end_time: string // HH:MM:SS format
  timezone: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateMentorProfilePayload {
  headline?: string | null
  bio?: string | null
  career_paths?: string[]
  is_active?: boolean
  is_remote?: boolean
  state?: string | null
  county?: string | null
  contact_email?: string | null
  contact_url?: string | null
}

export interface UpdateMentorProfilePayload {
  headline?: string | null
  bio?: string | null
  career_paths?: string[]
  is_active?: boolean
  is_remote?: boolean
  state?: string | null
  county?: string | null
  contact_email?: string | null
  contact_url?: string | null
}

export interface CreateAvailabilityPayload {
  day_of_week: number
  start_time: string
  end_time: string
  timezone?: string
  is_active?: boolean
}

export interface UpdateAvailabilityPayload {
  day_of_week?: number
  start_time?: string
  end_time?: string
  timezone?: string
  is_active?: boolean
}

// Day of week display configuration
export const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
]

/**
 * Get day label from day number
 */
export function getDayLabel(dayOfWeek: number): string {
  return DAYS_OF_WEEK.find(d => d.value === dayOfWeek)?.label || ''
}

/**
 * Get short day label from day number
 */
export function getDayShortLabel(dayOfWeek: number): string {
  return DAYS_OF_WEEK.find(d => d.value === dayOfWeek)?.short || ''
}

/**
 * Format time string for display (HH:MM:SS -> h:mm AM/PM)
 */
export function formatTime(timeString: string): string {
  const [hours, minutes] = timeString.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
}

// ============================================
// MENTOR PROFILE FUNCTIONS
// ============================================

/**
 * Get current user's mentor profile
 */
export async function getMyMentorProfile(userId: string): Promise<MentorProfile | null> {
  const { data, error } = await supabase
    .from('mentor_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    console.error('Error fetching mentor profile:', error)
    throw error
  }

  return data
}

/**
 * Create a mentor profile
 */
export async function createMentorProfile(
  userId: string,
  payload: CreateMentorProfilePayload
): Promise<MentorProfile> {
  const { data, error } = await supabase
    .from('mentor_profiles')
    .insert({
      user_id: userId,
      headline: payload.headline || null,
      bio: payload.bio || null,
      career_paths: payload.career_paths || [],
      is_active: payload.is_active ?? true,
      is_remote: payload.is_remote ?? true,
      state: payload.state || null,
      county: payload.county || null,
      contact_email: payload.contact_email || null,
      contact_url: payload.contact_url || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating mentor profile:', error)
    throw error
  }

  return data
}

/**
 * Update mentor profile
 */
export async function updateMentorProfile(
  userId: string,
  patch: UpdateMentorProfilePayload
): Promise<MentorProfile> {
  const { data, error } = await supabase
    .from('mentor_profiles')
    .update(patch)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating mentor profile:', error)
    throw error
  }

  return data
}

/**
 * Delete mentor profile
 */
export async function deleteMentorProfile(userId: string): Promise<void> {
  const { error } = await supabase
    .from('mentor_profiles')
    .delete()
    .eq('user_id', userId)

  if (error) {
    console.error('Error deleting mentor profile:', error)
    throw error
  }
}

/**
 * List all active mentors (for student discovery)
 * Optionally filter by career path, remote only, or location
 */
export async function listMentors(filters?: {
  careerPath?: string
  remoteOnly?: boolean
  state?: string
  county?: string
}): Promise<MentorWithProfile[]> {
  let query = supabase
    .from('mentor_profiles')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  // Filter by remote only
  if (filters?.remoteOnly) {
    query = query.eq('is_remote', true)
  }

  // Filter by career path (contains)
  if (filters?.careerPath) {
    query = query.contains('career_paths', [filters.careerPath])
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching mentors:', error)
    throw error
  }

  const mentors = data || []

  // Get user profiles for names
  if (mentors.length === 0) {
    return []
  }

  const userIds = mentors.map(m => m.user_id)
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('user_id, full_name')
    .in('user_id', userIds)

  if (profileError) {
    console.error('Error fetching mentor user profiles:', profileError)
    // Return mentors without names on error
    return mentors.map(m => ({ ...m, full_name: null }))
  }

  // Create a map of user_id -> full_name
  const nameMap = new Map<string, string | null>()
  profiles?.forEach(p => {
    nameMap.set(p.user_id, p.full_name)
  })

  // Client-side location filtering if needed
  let filteredMentors = mentors
  if (filters?.state && filters?.county) {
    filteredMentors = mentors.filter(m => {
      // Remote mentors are always shown
      if (m.is_remote) return true
      // Local mentors: check state and county match
      const stateMatches = m.state?.toLowerCase() === filters.state?.toLowerCase()
      const countyMatches = m.county?.toLowerCase() === filters.county?.toLowerCase()
      return stateMatches && countyMatches
    })
  }

  return filteredMentors.map(m => ({
    ...m,
    full_name: nameMap.get(m.user_id) || null,
  }))
}

/**
 * Get a single mentor by user ID with profile info
 */
export async function getMentor(userId: string): Promise<MentorWithProfile | null> {
  const { data, error } = await supabase
    .from('mentor_profiles')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    console.error('Error fetching mentor:', error)
    throw error
  }

  // Get user profile for name
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('user_id', userId)
    .single()

  if (profileError) {
    console.error('Error fetching mentor user profile:', profileError)
    return { ...data, full_name: null }
  }

  return { ...data, full_name: profile?.full_name || null }
}

// ============================================
// MENTOR AVAILABILITY FUNCTIONS
// ============================================

/**
 * Get mentor's availability slots
 */
export async function getMentorAvailability(userId: string): Promise<MentorAvailability[]> {
  const { data, error } = await supabase
    .from('mentor_availability')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true })

  if (error) {
    console.error('Error fetching mentor availability:', error)
    throw error
  }

  return data || []
}

/**
 * Get all availability for a mentor (including inactive, for editing)
 */
export async function getMyAvailability(userId: string): Promise<MentorAvailability[]> {
  const { data, error } = await supabase
    .from('mentor_availability')
    .select('*')
    .eq('user_id', userId)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true })

  if (error) {
    console.error('Error fetching my availability:', error)
    throw error
  }

  return data || []
}

/**
 * Create availability slot
 */
export async function createAvailability(
  userId: string,
  payload: CreateAvailabilityPayload
): Promise<MentorAvailability> {
  const { data, error } = await supabase
    .from('mentor_availability')
    .insert({
      user_id: userId,
      day_of_week: payload.day_of_week,
      start_time: payload.start_time,
      end_time: payload.end_time,
      timezone: payload.timezone || 'America/New_York',
      is_active: payload.is_active ?? true,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating availability:', error)
    throw error
  }

  return data
}

/**
 * Update availability slot
 */
export async function updateAvailability(
  id: string,
  patch: UpdateAvailabilityPayload
): Promise<MentorAvailability> {
  const { data, error } = await supabase
    .from('mentor_availability')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating availability:', error)
    throw error
  }

  return data
}

/**
 * Delete availability slot
 */
export async function deleteAvailability(id: string): Promise<void> {
  const { error } = await supabase
    .from('mentor_availability')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting availability:', error)
    throw error
  }
}

/**
 * Get availability for next N days (for mentor detail preview)
 */
export function getUpcomingAvailability(
  availability: MentorAvailability[],
  daysAhead: number = 7
): { date: Date; dayLabel: string; slots: MentorAvailability[] }[] {
  const today = new Date()
  const result: { date: Date; dayLabel: string; slots: MentorAvailability[] }[] = []

  for (let i = 0; i < daysAhead; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() + i)
    const dayOfWeek = date.getDay()

    const slots = availability.filter(a => a.day_of_week === dayOfWeek)
    if (slots.length > 0) {
      result.push({
        date,
        dayLabel: getDayLabel(dayOfWeek),
        slots,
      })
    }
  }

  return result
}

/**
 * Check if mentor has availability today
 */
export function hasAvailabilityToday(availability: MentorAvailability[]): boolean {
  const today = new Date().getDay()
  return availability.some(a => a.day_of_week === today && a.is_active)
}
