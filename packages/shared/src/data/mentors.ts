// Mentors data layer
import type { SupabaseClient } from '@supabase/supabase-js'
import type { MentorProfile, CreateMentorProfileInput, UpdateMentorProfileInput, MentorAvailability, CreateAvailabilityInput, UpdateAvailabilityInput } from '../types'

export async function getMentors(
  supabase: SupabaseClient,
  options?: {
    activeOnly?: boolean
    careerPath?: string
    limit?: number
    offset?: number
  }
): Promise<MentorProfile[]> {
  let query = supabase
    .from('mentor_profiles')
    .select(`
      *,
      profiles!mentor_profiles_user_id_fkey(full_name, org_name)
    `)
    .order('created_at', { ascending: false })

  if (options?.activeOnly !== false) {
    query = query.eq('is_active', true)
  }

  if (options?.careerPath) {
    query = query.contains('career_paths', [options.careerPath])
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 20) - 1)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching mentors:', error)
    return []
  }

  return (data || []).map(mentor => ({
    ...mentor,
    full_name: mentor.profiles?.full_name || null,
    org_name: mentor.profiles?.org_name || null,
    profiles: undefined
  })) as MentorProfile[]
}

export async function getMentorById(
  supabase: SupabaseClient,
  id: string
): Promise<MentorProfile | null> {
  const { data, error } = await supabase
    .from('mentor_profiles')
    .select(`
      *,
      profiles!mentor_profiles_user_id_fkey(full_name, org_name)
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching mentor:', error)
    return null
  }

  return {
    ...data,
    full_name: data.profiles?.full_name || null,
    org_name: data.profiles?.org_name || null,
    profiles: undefined
  } as MentorProfile
}

export async function getMentorByUserId(
  supabase: SupabaseClient,
  userId: string
): Promise<MentorProfile | null> {
  const { data, error } = await supabase
    .from('mentor_profiles')
    .select(`
      *,
      profiles!mentor_profiles_user_id_fkey(full_name, org_name)
    `)
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    console.error('Error fetching mentor profile:', error)
    return null
  }

  return {
    ...data,
    full_name: data.profiles?.full_name || null,
    org_name: data.profiles?.org_name || null,
    profiles: undefined
  } as MentorProfile
}

export async function createMentorProfile(
  supabase: SupabaseClient,
  userId: string,
  input: CreateMentorProfileInput
): Promise<{ mentor: MentorProfile | null; error: string | null }> {
  const { data, error } = await supabase
    .from('mentor_profiles')
    .upsert({
      user_id: userId,
      headline: input.headline,
      bio: input.bio || null,
      career_paths: input.career_paths || null,
      is_active: true
    })
    .select()
    .single()

  if (error) {
    return { mentor: null, error: error.message }
  }

  return { mentor: data as MentorProfile, error: null }
}

export async function updateMentorProfile(
  supabase: SupabaseClient,
  userId: string,
  updates: UpdateMentorProfileInput
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('mentor_profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, error: null }
}

// Mentor Availability functions

export async function getMentorAvailability(
  supabase: SupabaseClient,
  mentorUserId: string
): Promise<MentorAvailability[]> {
  const { data, error } = await supabase
    .from('mentor_availability')
    .select('*')
    .eq('mentor_user_id', mentorUserId)
    .eq('is_active', true)
    .order('day_of_week')

  if (error) {
    console.error('Error fetching mentor availability:', error)
    return []
  }

  return data as MentorAvailability[]
}

export async function createAvailability(
  supabase: SupabaseClient,
  mentorUserId: string,
  input: CreateAvailabilityInput
): Promise<{ availability: MentorAvailability | null; error: string | null }> {
  const { data, error } = await supabase
    .from('mentor_availability')
    .insert({
      mentor_user_id: mentorUserId,
      day_of_week: input.day_of_week,
      start_time: input.start_time,
      end_time: input.end_time,
      is_active: true
    })
    .select()
    .single()

  if (error) {
    return { availability: null, error: error.message }
  }

  return { availability: data as MentorAvailability, error: null }
}

export async function updateAvailability(
  supabase: SupabaseClient,
  id: string,
  mentorUserId: string,
  updates: UpdateAvailabilityInput
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('mentor_availability')
    .update(updates)
    .eq('id', id)
    .eq('mentor_user_id', mentorUserId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, error: null }
}

export async function deleteAvailability(
  supabase: SupabaseClient,
  id: string,
  mentorUserId: string
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('mentor_availability')
    .delete()
    .eq('id', id)
    .eq('mentor_user_id', mentorUserId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, error: null }
}

export async function setMentorAvailability(
  supabase: SupabaseClient,
  mentorUserId: string,
  slots: CreateAvailabilityInput[]
): Promise<{ success: boolean; error: string | null }> {
  // Delete existing availability
  const { error: deleteError } = await supabase
    .from('mentor_availability')
    .delete()
    .eq('mentor_user_id', mentorUserId)

  if (deleteError) {
    return { success: false, error: deleteError.message }
  }

  if (slots.length === 0) {
    return { success: true, error: null }
  }

  // Insert new availability
  const { error: insertError } = await supabase
    .from('mentor_availability')
    .insert(
      slots.map(slot => ({
        mentor_user_id: mentorUserId,
        day_of_week: slot.day_of_week,
        start_time: slot.start_time,
        end_time: slot.end_time,
        is_active: true
      }))
    )

  if (insertError) {
    return { success: false, error: insertError.message }
  }

  return { success: true, error: null }
}
