// Applications data layer
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Application, CreateApplicationInput, UpdateApplicationInput, ApplicationStatus, ApplicationType, EssayStatus } from '../types'

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

export function getStatusInfo(status: ApplicationStatus) {
  return APPLICATION_STATUSES.find(s => s.value === status) || APPLICATION_STATUSES[0]
}

export async function listApplications(
  supabase: SupabaseClient,
  userId: string
): Promise<Application[]> {
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

  return (data || []) as Application[]
}

export async function getApplication(
  supabase: SupabaseClient,
  id: string
): Promise<Application | null> {
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    console.error('Error fetching application:', error)
    throw error
  }

  return data as Application
}

export async function createApplication(
  supabase: SupabaseClient,
  userId: string,
  input: CreateApplicationInput
): Promise<Application> {
  const { data, error } = await supabase
    .from('applications')
    .insert({
      user_id: userId,
      college_name: input.college_name,
      program_name: input.program_name || null,
      application_type: input.application_type || 'college',
      status: input.status || 'not_started',
      deadline: input.deadline || null,
      date_applied: input.date_applied || null,
      portal_url: input.portal_url || null,
      contact_email: input.contact_email || null,
      essay_status: input.essay_status || 'not_started',
      recommendation_count: input.recommendation_count || 0,
      fee_amount: input.fee_amount || null,
      notes: input.notes || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating application:', error)
    throw error
  }

  return data as Application
}

export async function updateApplication(
  supabase: SupabaseClient,
  id: string,
  input: UpdateApplicationInput
): Promise<Application> {
  const { data, error } = await supabase
    .from('applications')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating application:', error)
    throw error
  }

  return data as Application
}

export async function deleteApplication(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from('applications')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting application:', error)
    throw error
  }
}

export async function getApplicationCounts(
  supabase: SupabaseClient,
  userId: string
): Promise<Record<ApplicationStatus, number>> {
  const applications = await listApplications(supabase, userId)
  
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

export async function getNextApplicationDeadline(
  supabase: SupabaseClient,
  userId: string
): Promise<Application | null> {
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
    if (error.code === 'PGRST116') return null
    console.error('Error fetching next deadline:', error)
    return null
  }

  return data as Application
}

// Utility functions
export function formatDate(dateString: string | null): string {
  if (!dateString) return 'Not set'
  
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

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
