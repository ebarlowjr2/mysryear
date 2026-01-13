import { supabase } from '../lib/supabase'
import { VerificationStatus } from './verification'
import { School } from './schools'

export type TeacherProfile = {
  user_id: string
  title: string | null
  school_id: string | null
  verification_status: VerificationStatus
  created_at: string
  updated_at: string
}

export type TeacherProfileWithSchool = TeacherProfile & {
  school: School | null
}

export type TeacherProfileUpdate = Partial<{
  title: string | null
  school_id: string | null
}>

export const TEACHER_TITLES = [
  'Teacher',
  'Counselor',
  'Administrator',
  'Principal',
  'Vice Principal',
  'Department Head',
  'Coach',
  'Librarian',
  'Other Staff',
]

export async function getTeacherProfile(userId: string): Promise<TeacherProfileWithSchool | null> {
  const { data, error } = await supabase
    .from('teacher_profiles')
    .select(`
      *,
      schools (*)
    `)
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    return null
  }

  const profile = data as Record<string, unknown>
  return {
    user_id: profile.user_id as string,
    title: profile.title as string | null,
    school_id: profile.school_id as string | null,
    verification_status: profile.verification_status as VerificationStatus,
    created_at: profile.created_at as string,
    updated_at: profile.updated_at as string,
    school: profile.schools as School | null,
  }
}

export async function ensureTeacherProfile(userId: string): Promise<{ profile: TeacherProfile | null; error: string | null }> {
  const existing = await getTeacherProfile(userId)
  
  if (existing) {
    return { profile: existing, error: null }
  }

  const { data, error } = await supabase
    .from('teacher_profiles')
    .insert({
      user_id: userId,
      verification_status: 'unverified',
    })
    .select()
    .single()

  if (error) {
    return { profile: null, error: error.message }
  }

  return { profile: data as TeacherProfile, error: null }
}

export async function updateTeacherProfile(
  userId: string,
  updates: TeacherProfileUpdate
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('teacher_profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, error: null }
}
