import type { SupabaseClient } from '@supabase/supabase-js'

export async function isJobTracked(
  supabase: SupabaseClient,
  jobId: string
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data, error } = await supabase
    .from('user_tracked_jobs')
    .select('job_id')
    .eq('user_id', user.id)
    .eq('job_id', jobId)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error checking job tracked status:', error)
  }

  return !!data
}

export async function trackJob(
  supabase: SupabaseClient,
  jobId: string
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { error } = await supabase
    .from('user_tracked_jobs')
    .insert({ user_id: user.id, job_id: jobId })

  if (error) {
    console.error('Error tracking job:', error)
    return false
  }

  return true
}

export async function untrackJob(
  supabase: SupabaseClient,
  jobId: string
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { error } = await supabase
    .from('user_tracked_jobs')
    .delete()
    .eq('user_id', user.id)
    .eq('job_id', jobId)

  if (error) {
    console.error('Error untracking job:', error)
    return false
  }

  return true
}

export async function listTrackedJobs(supabase: SupabaseClient): Promise<string[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('user_tracked_jobs')
    .select('job_id')
    .eq('user_id', user.id)

  if (error) {
    console.error('Error listing tracked jobs:', error)
    return []
  }

  return data.map(row => row.job_id)
}

export async function isOpportunityTracked(
  supabase: SupabaseClient,
  opportunityId: string
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data, error } = await supabase
    .from('user_tracked_opportunities')
    .select('opportunity_id')
    .eq('user_id', user.id)
    .eq('opportunity_id', opportunityId)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error checking opportunity tracked status:', error)
  }

  return !!data
}

export async function trackOpportunity(
  supabase: SupabaseClient,
  opportunityId: string
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { error } = await supabase
    .from('user_tracked_opportunities')
    .insert({ user_id: user.id, opportunity_id: opportunityId })

  if (error) {
    console.error('Error tracking opportunity:', error)
    return false
  }

  return true
}

export async function untrackOpportunity(
  supabase: SupabaseClient,
  opportunityId: string
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { error } = await supabase
    .from('user_tracked_opportunities')
    .delete()
    .eq('user_id', user.id)
    .eq('opportunity_id', opportunityId)

  if (error) {
    console.error('Error untracking opportunity:', error)
    return false
  }

  return true
}

export async function listTrackedOpportunities(supabase: SupabaseClient): Promise<string[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('user_tracked_opportunities')
    .select('opportunity_id')
    .eq('user_id', user.id)

  if (error) {
    console.error('Error listing tracked opportunities:', error)
    return []
  }

  return data.map(row => row.opportunity_id)
}

export function withTrackedFlag<T extends { id: string }>(
  items: T[],
  trackedIdsSet: Set<string>
): (T & { isTracked: boolean })[] {
  return items.map(item => ({
    ...item,
    isTracked: trackedIdsSet.has(item.id)
  }))
}
