// Profiles data layer
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Profile, ProfileUpdate, UserRole } from '../types'

export async function getProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    console.error('Error fetching profile:', error)
    return null
  }

  return data as Profile
}

export async function ensureProfile(
  supabase: SupabaseClient,
  userId: string,
  email?: string
): Promise<{ profile: Profile | null; error: Error | null }> {
  const existingProfile = await getProfile(supabase, userId)
  
  if (existingProfile) {
    return { profile: existingProfile, error: null }
  }

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      user_id: userId,
      full_name: email?.split('@')[0] || null,
      onboarding_complete: false
    })
    .select()
    .single()

  if (error) {
    console.warn('Failed to create profile:', error.message)
    return { profile: null, error: error as Error }
  }

  return { profile: data as Profile, error: null }
}

export async function updateProfile(
  supabase: SupabaseClient,
  userId: string,
  updates: ProfileUpdate
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('profiles')
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

export async function setRole(
  supabase: SupabaseClient,
  userId: string,
  role: UserRole
): Promise<{ success: boolean; error: string | null }> {
  return updateProfile(supabase, userId, { role })
}

export async function completeOnboarding(
  supabase: SupabaseClient,
  userId: string
): Promise<{ success: boolean; error: string | null }> {
  return updateProfile(supabase, userId, { onboarding_complete: true })
}

export async function getProfileByEmail(
  supabase: SupabaseClient,
  email: string
): Promise<Profile | null> {
  // First get the user by email from auth.users (requires service role)
  // For client-side, we need to use a different approach
  const { data, error } = await supabase
    .from('profiles')
    .select('*, auth_users:user_id(email)')
    .limit(100)

  if (error) {
    console.error('Error searching profiles:', error)
    return null
  }

  // This is a simplified approach - in production, use an Edge Function
  // to securely look up users by email
  return null
}

// Role-specific profile helpers
export function isStudent(profile: Profile | null): boolean {
  return profile?.role === 'student'
}

export function isParent(profile: Profile | null): boolean {
  return profile?.role === 'parent'
}

export function isTeacher(profile: Profile | null): boolean {
  return profile?.role === 'teacher'
}

export function isBusiness(profile: Profile | null): boolean {
  return profile?.role === 'business'
}

export function isMentor(profile: Profile | null): boolean {
  return profile?.role === 'mentor'
}

export function isRecruiter(profile: Profile | null): boolean {
  return profile?.role === 'recruiter'
}

export function needsOnboarding(profile: Profile | null): boolean {
  return profile !== null && !profile.onboarding_complete
}

export function getDisplayName(profile: Profile | null): string {
  if (!profile) return 'User'
  if (profile.first_name && profile.last_name) {
    return `${profile.first_name} ${profile.last_name}`
  }
  if (profile.full_name) return profile.full_name
  return 'User'
}
