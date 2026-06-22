import {
  ensureCurrentProfile,
  getCurrentProfile,
  getActiveStudentProfile,
  getLinkedStudentProfiles,
  updateAccountProfile,
  updateStudentProfile,
  type AccountProfile,
  type CanonicalRole,
  type StudentProfile,
} from './identity'
import { getUserSchoolMembership, type SchoolMembership } from './schools'

export type UserRole = CanonicalRole

export type Profile = AccountProfile & {
  // Legacy mobile fields remain optional display fallbacks only.
  school?: string | null
  graduation_year?: number | null
  graduation_date?: string | null
  org_name?: string | null
  website?: string | null
  created_at?: string
  updated_at?: string
}

export type ProfileWithSchool = Profile & {
  schoolMembership: SchoolMembership | null
  activeStudentProfile: StudentProfile | null
  linkedStudentProfiles: StudentProfile[]
}

export async function getProfile(userId: string): Promise<Profile | null> {
  return getCurrentProfile(userId) as Promise<Profile | null>
}

export async function ensureProfile(userId: string, email?: string): Promise<{ profile: Profile | null; error: Error | null }> {
  const profile = await ensureCurrentProfile(userId, email)
  return { profile: profile as Profile | null, error: null }
}

export async function updateProfile(
  userId: string,
  updates: Partial<Omit<Profile, 'id' | 'user_id' | 'created_at' | 'updated_at'>>,
): Promise<{ error: Error | null }> {
  const { success, error } = await updateAccountProfile(userId, updates as Partial<AccountProfile>)
  return { error: success ? null : new Error(error || 'Failed to update profile') }
}

export async function completeOnboarding(userId: string): Promise<{ error: Error | null }> {
  return updateProfile(userId, { onboarding_complete: true })
}

export async function getMyProfile(userId: string): Promise<ProfileWithSchool | null> {
  const [profile, schoolMembership, activeStudentProfile, linkedStudentProfiles] = await Promise.all([
    getCurrentProfile(userId),
    // Legacy/reference only. Canonical school is activeStudentProfile.school_id.
    getUserSchoolMembership(userId),
    getActiveStudentProfile(userId),
    getLinkedStudentProfiles(userId),
  ])
  if (!profile) return null

  return {
    ...(profile as Profile),
    schoolMembership,
    activeStudentProfile,
    linkedStudentProfiles,
    graduation_year: activeStudentProfile?.graduation_year ?? null,
  }
}

export type ProfileUpdate = Partial<{
  first_name: string | null
  last_name: string | null
  full_name: string | null
  graduation_year: number | null
  graduation_date: string | null
  state: string | null
  county: string | null
  org_name: string | null
  website: string | null
  notifications_tasks: boolean
  notifications_deadlines: boolean
}>

export async function updateMyProfile(
  userId: string,
  updates: ProfileUpdate,
  activeStudentProfileId?: string | null,
): Promise<{ success: boolean; error: string | null }> {
  const { graduation_year: graduationYear, ...profileUpdates } = updates
  const profileResult = await updateAccountProfile(userId, profileUpdates as Partial<AccountProfile>)
  if (!profileResult.success) return profileResult

  if (graduationYear !== undefined && activeStudentProfileId) {
    return updateStudentProfile(activeStudentProfileId, { graduation_year: graduationYear })
  }

  return { success: true, error: null }
}

export async function getMySchool(userId: string): Promise<SchoolMembership | null> {
  // Legacy/reference only. New code should prefer activeStudentProfile.schools.
  return getUserSchoolMembership(userId)
}
