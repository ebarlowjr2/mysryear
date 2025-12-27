import { supabase } from '../lib/supabase'

export type UserRole = 'student' | 'parent' | 'teacher' | 'business'

export type Profile = {
  id: string
  user_id: string
  full_name: string | null
  role: UserRole | null
  school: string | null
  graduation_year: number | null
  onboarding_complete: boolean
  created_at: string
  updated_at: string
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !data) return null
  return data as Profile
}

export async function ensureProfile(userId: string, email?: string): Promise<{ profile: Profile | null; error: Error | null }> {
  const existingProfile = await getProfile(userId)
  
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

export async function updateProfile(userId: string, updates: Partial<Omit<Profile, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)

  return { error: error as Error | null }
}

export async function completeOnboarding(userId: string): Promise<{ error: Error | null }> {
  return updateProfile(userId, { onboarding_complete: true })
}
