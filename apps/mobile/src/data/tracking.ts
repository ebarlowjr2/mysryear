import { supabase } from '../lib/supabase'

// Types for tracked items
export type TrackedOpportunity = {
  user_id: string
  opportunity_id: string
  created_at: string
}

export type TrackedJob = {
  user_id: string
  job_id: string
  created_at: string
}

// ============ OPPORTUNITIES TRACKING ============

/**
 * Check if an opportunity is tracked by the current user
 */
export async function isOpportunityTracked(opportunityId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data, error } = await supabase
    .from('user_tracked_opportunities')
    .select('opportunity_id')
    .eq('user_id', user.id)
    .eq('opportunity_id', opportunityId)
    .maybeSingle()

  if (error) {
    console.error('Failed to check tracked opportunity:', error)
    return false
  }

  return !!data
}

/**
 * Track an opportunity
 */
export async function trackOpportunity(opportunityId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { error } = await supabase
    .from('user_tracked_opportunities')
    .insert({ user_id: user.id, opportunity_id: opportunityId })

  if (error) {
    console.error('Failed to track opportunity:', error)
    return false
  }

  return true
}

/**
 * Untrack an opportunity
 */
export async function untrackOpportunity(opportunityId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { error } = await supabase
    .from('user_tracked_opportunities')
    .delete()
    .eq('user_id', user.id)
    .eq('opportunity_id', opportunityId)

  if (error) {
    console.error('Failed to untrack opportunity:', error)
    return false
  }

  return true
}

/**
 * Get all tracked opportunity IDs for the current user
 */
export async function getTrackedOpportunityIds(): Promise<string[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('user_tracked_opportunities')
    .select('opportunity_id')
    .eq('user_id', user.id)

  if (error) {
    console.error('Failed to get tracked opportunities:', error)
    return []
  }

  return data?.map(item => item.opportunity_id) || []
}

// ============ JOBS TRACKING ============

/**
 * Check if a job is tracked by the current user
 */
export async function isJobTracked(jobId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data, error } = await supabase
    .from('user_tracked_jobs')
    .select('job_id')
    .eq('user_id', user.id)
    .eq('job_id', jobId)
    .maybeSingle()

  if (error) {
    console.error('Failed to check tracked job:', error)
    return false
  }

  return !!data
}

/**
 * Track a job
 */
export async function trackJob(jobId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { error } = await supabase
    .from('user_tracked_jobs')
    .insert({ user_id: user.id, job_id: jobId })

  if (error) {
    console.error('Failed to track job:', error)
    return false
  }

  return true
}

/**
 * Untrack a job
 */
export async function untrackJob(jobId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { error } = await supabase
    .from('user_tracked_jobs')
    .delete()
    .eq('user_id', user.id)
    .eq('job_id', jobId)

  if (error) {
    console.error('Failed to untrack job:', error)
    return false
  }

  return true
}

/**
 * Get all tracked job IDs for the current user
 */
export async function getTrackedJobIds(): Promise<string[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('user_tracked_jobs')
    .select('job_id')
    .eq('user_id', user.id)

  if (error) {
    console.error('Failed to get tracked jobs:', error)
    return []
  }

  return data?.map(item => item.job_id) || []
}

// ============ TRACKED ITEMS WITH DEADLINES (for local notifications) ============

export type TrackedItemWithDeadline = {
  id: string
  title: string
  deadline: string
  type: 'job' | 'opportunity'
}

/**
 * Get all tracked jobs with deadlines for the current user
 * Used for scheduling local deadline reminders
 */
export async function getTrackedJobsWithDeadlines(): Promise<TrackedItemWithDeadline[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('user_tracked_jobs')
    .select(`
      job_id,
      job_posts!inner (
        id,
        title,
        deadline
      )
    `)
    .eq('user_id', user.id)

  if (error) {
    console.error('Failed to get tracked jobs with deadlines:', error)
    return []
  }

  // Transform to TrackedItemWithDeadline format
  return (data || [])
    .filter((item: any) => item.job_posts?.deadline)
    .map((item: any) => ({
      id: item.job_posts.id,
      title: item.job_posts.title,
      deadline: item.job_posts.deadline,
      type: 'job' as const,
    }))
}

/**
 * Get all tracked opportunities with deadlines for the current user
 * Used for scheduling local deadline reminders
 */
export async function getTrackedOpportunitiesWithDeadlines(): Promise<TrackedItemWithDeadline[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('user_tracked_opportunities')
    .select(`
      opportunity_id,
      opportunities!inner (
        id,
        title,
        deadline
      )
    `)
    .eq('user_id', user.id)

  if (error) {
    console.error('Failed to get tracked opportunities with deadlines:', error)
    return []
  }

  // Transform to TrackedItemWithDeadline format
  return (data || [])
    .filter((item: any) => item.opportunities?.deadline)
    .map((item: any) => ({
      id: item.opportunities.id,
      title: item.opportunities.title,
      deadline: item.opportunities.deadline,
      type: 'opportunity' as const,
    }))
}
