// Jobs data layer
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Job, CreateJobInput, UpdateJobInput } from '../types'

export async function getJobs(
  supabase: SupabaseClient,
  options?: {
    activeOnly?: boolean
    limit?: number
    offset?: number
  }
): Promise<Job[]> {
  let query = supabase
    .from('job_posts')
    .select('*')
    .order('created_at', { ascending: false })

  if (options?.activeOnly !== false) {
    query = query.eq('is_active', true)
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 20) - 1)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching jobs:', error)
    return []
  }

  return data as Job[]
}

export async function getJobById(
  supabase: SupabaseClient,
  id: string
): Promise<Job | null> {
  const { data, error } = await supabase
    .from('job_posts')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching job:', error)
    return null
  }

  return data as Job
}

export async function getRecruiterJobs(
  supabase: SupabaseClient,
  recruiterUserId: string
): Promise<Job[]> {
  const { data, error } = await supabase
    .from('job_posts')
    .select('*')
    .eq('recruiter_user_id', recruiterUserId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching recruiter jobs:', error)
    return []
  }

  return data as Job[]
}

export async function createJob(
  supabase: SupabaseClient,
  recruiterUserId: string,
  input: CreateJobInput
): Promise<{ job: Job | null; error: string | null }> {
  const { data, error } = await supabase
    .from('job_posts')
    .insert({
      recruiter_user_id: recruiterUserId,
      title: input.title,
      company_name: input.company_name,
      description: input.description || null,
      job_type: input.job_type || 'full_time',
      experience_level: input.experience_level || 'entry',
      location: input.location || null,
      is_remote: input.is_remote || false,
      salary_min: input.salary_min || null,
      salary_max: input.salary_max || null,
      deadline: input.deadline || null,
      requirements: input.requirements || null,
      contact_email: input.contact_email || null,
      external_url: input.external_url || null,
      is_active: true
    })
    .select()
    .single()

  if (error) {
    return { job: null, error: error.message }
  }

  return { job: data as Job, error: null }
}

export async function updateJob(
  supabase: SupabaseClient,
  id: string,
  recruiterUserId: string,
  updates: UpdateJobInput
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('job_posts')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('recruiter_user_id', recruiterUserId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, error: null }
}

export async function deleteJob(
  supabase: SupabaseClient,
  id: string,
  recruiterUserId: string
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('job_posts')
    .delete()
    .eq('id', id)
    .eq('recruiter_user_id', recruiterUserId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, error: null }
}

export async function toggleJobActive(
  supabase: SupabaseClient,
  id: string,
  recruiterUserId: string,
  isActive: boolean
): Promise<{ success: boolean; error: string | null }> {
  return updateJob(supabase, id, recruiterUserId, { is_active: isActive })
}
