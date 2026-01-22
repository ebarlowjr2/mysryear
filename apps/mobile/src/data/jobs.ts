import { supabase } from '../lib/supabase'
import type { Profile } from './profile'

// Job post types matching the database schema
export type JobCategory = 'internship' | 'entry-level' | 'apprenticeship' | 'military program' | 'scholarship program'
export type LocationMode = 'local' | 'remote' | 'hybrid'

export interface JobPost {
  id: string
  owner_user_id: string
  org_name: string
  title: string
  category: JobCategory
  description: string | null
  apply_url: string | null
  location_mode: LocationMode
  state: string | null
  counties: string[]
  deadline: string | null
  is_published: boolean
  created_at: string
  updated_at: string
}

// Recruiter profile types
export type RecruiterType = 'military' | 'professional'

export interface RecruiterProfile {
  user_id: string
  org_name: string
  recruiter_type: RecruiterType
  bio: string | null
  contact_email: string | null
  contact_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateRecruiterProfilePayload {
  org_name: string
  recruiter_type: RecruiterType
  bio?: string | null
  contact_email?: string | null
  contact_url?: string | null
  is_active?: boolean
}

export interface UpdateRecruiterProfilePayload {
  org_name?: string
  recruiter_type?: RecruiterType
  bio?: string | null
  contact_email?: string | null
  contact_url?: string | null
  is_active?: boolean
}

export interface CreateJobPostPayload {
  org_name: string
  title: string
  category: JobCategory
  description?: string | null
  apply_url?: string | null
  location_mode?: LocationMode
  state?: string | null
  counties?: string[]
  deadline?: string | null
  is_published?: boolean
}

export interface UpdateJobPostPayload {
  org_name?: string
  title?: string
  category?: JobCategory
  description?: string | null
  apply_url?: string | null
  location_mode?: LocationMode
  state?: string | null
  counties?: string[]
  deadline?: string | null
  is_published?: boolean
}

// Category display configuration
export const JOB_CATEGORIES: { value: JobCategory; label: string; color: string; icon: string }[] = [
  { value: 'internship', label: 'Internship', color: '#3b82f6', icon: 'briefcase-outline' },
  { value: 'entry-level', label: 'Entry-Level', color: '#22c55e', icon: 'trending-up-outline' },
  { value: 'apprenticeship', label: 'Apprenticeship', color: '#f59e0b', icon: 'construct-outline' },
  { value: 'military program', label: 'Military Program', color: '#6366f1', icon: 'flag-outline' },
  { value: 'scholarship program', label: 'Scholarship Program', color: '#ec4899', icon: 'school-outline' },
]

export const RECRUITER_TYPES: { value: RecruiterType; label: string }[] = [
  { value: 'military', label: 'Military Recruiter' },
  { value: 'professional', label: 'Professional Recruiter' },
]

export const LOCATION_MODES: { value: LocationMode; label: string }[] = [
  { value: 'local', label: 'Local' },
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
]

/**
 * Get category display info (label and color)
 */
export function getCategoryInfo(category: JobCategory) {
  return JOB_CATEGORIES.find(c => c.value === category) || JOB_CATEGORIES[0]
}

/**
 * Get recruiter type label
 */
export function getRecruiterTypeLabel(type: RecruiterType): string {
  return RECRUITER_TYPES.find(t => t.value === type)?.label || type
}

// ============================================
// RECRUITER PROFILE FUNCTIONS
// ============================================

/**
 * Get current user's recruiter profile
 */
export async function getMyRecruiterProfile(userId: string): Promise<RecruiterProfile | null> {
  const { data, error } = await supabase
    .from('recruiter_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    console.error('Error fetching recruiter profile:', error)
    throw error
  }

  return data
}

/**
 * Create a recruiter profile
 */
export async function createRecruiterProfile(
  userId: string,
  payload: CreateRecruiterProfilePayload
): Promise<RecruiterProfile> {
  const { data, error } = await supabase
    .from('recruiter_profiles')
    .insert({
      user_id: userId,
      org_name: payload.org_name,
      recruiter_type: payload.recruiter_type,
      bio: payload.bio || null,
      contact_email: payload.contact_email || null,
      contact_url: payload.contact_url || null,
      is_active: payload.is_active ?? true,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating recruiter profile:', error)
    throw error
  }

  return data
}

/**
 * Update recruiter profile
 */
export async function updateRecruiterProfile(
  userId: string,
  patch: UpdateRecruiterProfilePayload
): Promise<RecruiterProfile> {
  const { data, error } = await supabase
    .from('recruiter_profiles')
    .update(patch)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating recruiter profile:', error)
    throw error
  }

  return data
}

/**
 * Delete recruiter profile
 */
export async function deleteRecruiterProfile(userId: string): Promise<void> {
  const { error } = await supabase
    .from('recruiter_profiles')
    .delete()
    .eq('user_id', userId)

  if (error) {
    console.error('Error deleting recruiter profile:', error)
    throw error
  }
}

// ============================================
// JOB POST FUNCTIONS
// ============================================

/**
 * List published job posts for students
 * Filters by location matching (remote/hybrid shown to all, local only to matching county/state)
 * Sorted by deadline (soonest first)
 */
export async function listJobsForUser(profile: Profile | null): Promise<JobPost[]> {
  const query = supabase
    .from('job_posts')
    .select('*')
    .eq('is_published', true)
    .order('deadline', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  const { data, error } = await query

  if (error) {
    console.error('Error fetching jobs:', error)
    throw error
  }

  const jobs = data || []

  // Client-side filtering for location matching
  if (profile?.state && profile?.county) {
    return jobs.filter(job => {
      if (job.location_mode === 'remote' || job.location_mode === 'hybrid') {
        return true
      }
      // Local jobs: check state and county match
      if (job.location_mode === 'local') {
        const stateMatches = job.state?.toLowerCase() === profile.state?.toLowerCase()
        const countyMatches = job.counties?.some(
          (c: string) => c.toLowerCase() === profile.county?.toLowerCase()
        )
        return stateMatches && countyMatches
      }
      return true
    })
  }

  // If user missing county/state, show only remote/hybrid
  return jobs.filter(job => 
    job.location_mode === 'remote' || job.location_mode === 'hybrid'
  )
}

/**
 * List job posts owned by a recruiter
 */
export async function listMyJobs(ownerUserId: string): Promise<JobPost[]> {
  const { data, error } = await supabase
    .from('job_posts')
    .select('*')
    .eq('owner_user_id', ownerUserId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching my jobs:', error)
    throw error
  }

  return data || []
}

/**
 * Get a single job post by ID
 */
export async function getJob(id: string): Promise<JobPost | null> {
  const { data, error } = await supabase
    .from('job_posts')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    console.error('Error fetching job:', error)
    throw error
  }

  return data
}

/**
 * Create a new job post
 */
export async function createJob(
  ownerUserId: string,
  payload: CreateJobPostPayload
): Promise<JobPost> {
  // Validate counties max 4
  if (payload.counties && payload.counties.length > 4) {
    throw new Error('Maximum 4 counties allowed')
  }

  const { data, error } = await supabase
    .from('job_posts')
    .insert({
      owner_user_id: ownerUserId,
      org_name: payload.org_name,
      title: payload.title,
      category: payload.category,
      description: payload.description || null,
      apply_url: payload.apply_url || null,
      location_mode: payload.location_mode || 'remote',
      state: payload.state || null,
      counties: payload.counties || [],
      deadline: payload.deadline || null,
      is_published: payload.is_published ?? true,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating job:', error)
    throw error
  }

  return data
}

/**
 * Update a job post
 */
export async function updateJob(
  id: string,
  patch: UpdateJobPostPayload
): Promise<JobPost> {
  // Validate counties max 4
  if (patch.counties && patch.counties.length > 4) {
    throw new Error('Maximum 4 counties allowed')
  }

  const { data, error } = await supabase
    .from('job_posts')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating job:', error)
    throw error
  }

  return data
}

/**
 * Delete a job post
 */
export async function deleteJob(id: string): Promise<void> {
  const { error } = await supabase
    .from('job_posts')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting job:', error)
    throw error
  }
}

/**
 * Format a date string for display
 */
export function formatDate(dateString: string | null): string {
  if (!dateString) return 'No deadline'
  
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Get days until deadline
 */
export function getDaysUntilDeadline(deadline: string | null): number | null {
  if (!deadline) return null
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const deadlineDate = new Date(deadline)
  deadlineDate.setHours(0, 0, 0, 0)
  
  const diffTime = deadlineDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return diffDays
}

/**
 * Parse counties from comma-separated string
 */
export function parseCounties(input: string): string[] {
  return input
    .split(',')
    .map(c => c.trim())
    .filter(c => c.length > 0)
    .slice(0, 4) // Enforce max 4
}

/**
 * Format counties array to display string
 */
export function formatCounties(counties: string[] | null): string {
  if (!counties || counties.length === 0) return ''
  return counties.join(', ')
}
