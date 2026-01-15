import { supabase } from '../lib/supabase'

// Application types matching the database schema
export type ApplicationType = 'college' | 'scholarship' | 'program' | 'internship'
export type ApplicationStatus = 'not_started' | 'in_progress' | 'submitted' | 'accepted' | 'rejected' | 'waitlisted' | 'deferred'
export type EssayStatus = 'not_started' | 'draft' | 'completed'

export interface Application {
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

export interface CreateApplicationPayload {
  college_name: string
  program_name?: string | null
  application_type?: ApplicationType
  status?: ApplicationStatus
  deadline?: string | null
  date_applied?: string | null
  portal_url?: string | null
  contact_email?: string | null
  essay_status?: EssayStatus
  recommendation_count?: number
  fee_amount?: number | null
  notes?: string | null
}

export interface UpdateApplicationPayload {
  college_name?: string
  program_name?: string | null
  application_type?: ApplicationType
  status?: ApplicationStatus
  deadline?: string | null
  date_applied?: string | null
  portal_url?: string | null
  contact_email?: string | null
  essay_status?: EssayStatus
  recommendation_count?: number
  fee_amount?: number | null
  notes?: string | null
}

// Status display configuration
export const APPLICATION_STATUSES: { value: ApplicationStatus; label: string; color: string }[] = [
  { value: 'not_started', label: 'Not Started', color: '#94a3b8' },
  { value: 'in_progress', label: 'In Progress', color: '#f59e0b' },
  { value: 'submitted', label: 'Submitted', color: '#3b82f6' },
  { value: 'accepted', label: 'Accepted', color: '#22c55e' },
  { value: 'rejected', label: 'Rejected', color: '#ef4444' },
  { value: 'waitlisted', label: 'Waitlisted', color: '#8b5cf6' },
  { value: 'deferred', label: 'Deferred', color: '#f97316' },
]

export const APPLICATION_TYPES: { value: ApplicationType; label: string }[] = [
  { value: 'college', label: 'College' },
  { value: 'scholarship', label: 'Scholarship' },
  { value: 'program', label: 'Program' },
  { value: 'internship', label: 'Internship' },
]

export const ESSAY_STATUSES: { value: EssayStatus; label: string }[] = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'draft', label: 'Draft' },
  { value: 'completed', label: 'Completed' },
]

/**
 * Get status display info (label and color)
 */
export function getStatusInfo(status: ApplicationStatus) {
  return APPLICATION_STATUSES.find(s => s.value === status) || APPLICATION_STATUSES[0]
}

/**
 * List all applications for a user
 * Sorted by: upcoming deadline first (deadline asc nulls last), then updated_at desc
 */
export async function listApplications(userId: string): Promise<Application[]> {
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('user_id', userId)
    .order('deadline', { ascending: true, nullsFirst: false })
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching applications:', error)
    throw error
  }

  return data || []
}

/**
 * Get a single application by ID
 */
export async function getApplication(id: string): Promise<Application | null> {
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    console.error('Error fetching application:', error)
    throw error
  }

  return data
}

/**
 * Create a new application
 */
export async function createApplication(
  userId: string,
  payload: CreateApplicationPayload
): Promise<Application> {
  const { data, error } = await supabase
    .from('applications')
    .insert({
      user_id: userId,
      college_name: payload.college_name,
      program_name: payload.program_name || null,
      application_type: payload.application_type || 'college',
      status: payload.status || 'not_started',
      deadline: payload.deadline || null,
      date_applied: payload.date_applied || null,
      portal_url: payload.portal_url || null,
      contact_email: payload.contact_email || null,
      essay_status: payload.essay_status || 'not_started',
      recommendation_count: payload.recommendation_count || 0,
      fee_amount: payload.fee_amount || null,
      notes: payload.notes || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating application:', error)
    throw error
  }

  return data
}

/**
 * Update an existing application
 */
export async function updateApplication(
  id: string,
  patch: UpdateApplicationPayload
): Promise<Application> {
  const { data, error } = await supabase
    .from('applications')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating application:', error)
    throw error
  }

  return data
}

/**
 * Delete an application
 */
export async function deleteApplication(id: string): Promise<void> {
  const { error } = await supabase
    .from('applications')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting application:', error)
    throw error
  }
}

/**
 * Get count of applications by status
 */
export async function getApplicationCounts(userId: string): Promise<Record<ApplicationStatus, number>> {
  const applications = await listApplications(userId)
  
  const counts: Record<ApplicationStatus, number> = {
    not_started: 0,
    in_progress: 0,
    submitted: 0,
    accepted: 0,
    rejected: 0,
    waitlisted: 0,
    deferred: 0,
  }

  applications.forEach(app => {
    counts[app.status]++
  })

  return counts
}

/**
 * Get the next upcoming deadline (for active applications)
 */
export async function getNextDeadline(userId: string): Promise<Application | null> {
  const today = new Date().toISOString().split('T')[0]
  
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('user_id', userId)
    .not('status', 'in', '("accepted","rejected")')
    .not('deadline', 'is', null)
    .gte('deadline', today)
    .order('deadline', { ascending: true })
    .limit(1)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // No upcoming deadlines
    }
    console.error('Error fetching next deadline:', error)
    return null
  }

  return data
}

/**
 * Format a date string for display
 */
export function formatDate(dateString: string | null): string {
  if (!dateString) return 'Not set'
  
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
