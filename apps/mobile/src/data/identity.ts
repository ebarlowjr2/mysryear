import { supabase } from '../lib/supabase'

export type CanonicalRole = 'student' | 'parent' | 'guardian' | 'counselor'
export type RelationshipRole = CanonicalRole
export type InviteStatus = 'pending' | 'accepted' | 'declined' | 'expired'
export type InviteType = 'supporter_invite' | 'student_claim' | 'access_request'

export const CANONICAL_ROLES: CanonicalRole[] = ['student', 'parent', 'guardian', 'counselor']

export type School = {
  id: string
  name: string
  city: string | null
  state: string | null
  zip?: string | null
  nces_id?: string | null
}

export type AccountProfile = {
  id: string
  role: CanonicalRole | null
  onboarding_complete: boolean
  active_student_profile_id: string | null
  full_name?: string | null
  first_name?: string | null
  last_name?: string | null
  state?: string | null
  county?: string | null
  notifications_tasks?: boolean | null
  notifications_deadlines?: boolean | null
  notify_deadlines?: boolean | null
  notify_parent_updates?: boolean | null
  notify_link_requests?: boolean | null
  // Temporary compatibility only: old mobile builds used profiles.user_id.
  user_id?: string | null
}

export type StudentProfile = {
  id: string
  student_user_id: string | null
  created_by_user_id: string | null
  first_name: string | null
  last_name: string | null
  graduation_year: number | null
  grade_level?: string | null
  school_id: string | null
  schools?: { name: string | null; city?: string | null; state?: string | null } | null
}

export type FamilyRelationship = {
  id?: string
  student_profile_id: string
  user_id: string
  role: RelationshipRole
  created_at?: string
  student_profiles?: StudentProfile | null
}

export type RelationshipInvite = {
  id: string
  student_profile_id: string
  invited_email: string | null
  invited_user_id: string | null
  relationship_role: RelationshipRole
  invite_type?: InviteType | null
  status: InviteStatus
  created_by_user_id: string
  created_at: string
}

function toRole(value: unknown): CanonicalRole | null {
  if (CANONICAL_ROLES.includes(value as CanonicalRole)) return value as CanonicalRole
  // Legacy mobile roles are intentionally not canonical. Keep mapping conservative.
  if (value === 'teacher') return 'counselor'
  return null
}

function normalizeProfile(row: Record<string, unknown>): AccountProfile {
  return {
    ...row,
    id: row.id as string,
    role: toRole(row.role),
    onboarding_complete: Boolean(row.onboarding_complete),
    active_student_profile_id: (row.active_student_profile_id as string | null) ?? null,
  } as AccountProfile
}

export async function getCurrentProfile(userId: string): Promise<AccountProfile | null> {
  const byId = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (byId.data) return normalizeProfile(byId.data as Record<string, unknown>)

  // Temporary compatibility fallback for recovered mobile databases that still have profiles.user_id.
  const byLegacyUserId = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (byLegacyUserId.data) return normalizeProfile(byLegacyUserId.data as Record<string, unknown>)
  return null
}

export async function ensureCurrentProfile(
  userId: string,
  email?: string,
  role: CanonicalRole | null = null,
): Promise<AccountProfile | null> {
  const existing = await getCurrentProfile(userId)
  if (existing) return existing

  const base = {
    id: userId,
    role,
    full_name: email?.split('@')[0] || null,
    onboarding_complete: false,
  }

  const inserted = await supabase.from('profiles').insert(base).select('*').single()
  if (inserted.data) return normalizeProfile(inserted.data as Record<string, unknown>)

  // Legacy fallback only: some recovered mobile DBs required user_id instead of id.
  const legacyInserted = await supabase
    .from('profiles')
    .insert({ user_id: userId, role, full_name: email?.split('@')[0] || null, onboarding_complete: false })
    .select('*')
    .single()

  if (legacyInserted.data) return normalizeProfile(legacyInserted.data as Record<string, unknown>)
  console.warn('Failed to ensure profile:', inserted.error?.message || legacyInserted.error?.message)
  return null
}

export async function updateAccountProfile(
  userId: string,
  updates: Partial<AccountProfile>,
): Promise<{ success: boolean; error: string | null }> {
  const patch = { ...updates, updated_at: new Date().toISOString() }
  delete (patch as Record<string, unknown>).id
  delete (patch as Record<string, unknown>).user_id

  const byId = await supabase.from('profiles').update(patch).eq('id', userId)
  if (!byId.error) return { success: true, error: null }

  const byLegacy = await supabase.from('profiles').update(patch).eq('user_id', userId)
  if (!byLegacy.error) return { success: true, error: null }
  return { success: false, error: byId.error.message || byLegacy.error.message }
}

export async function getLinkedStudentProfiles(userId: string): Promise<StudentProfile[]> {
  const owned = await supabase
    .from('student_profiles')
    .select('id,student_user_id,created_by_user_id,first_name,last_name,graduation_year,grade_level,school_id,schools(name,city,state)')
    .eq('student_user_id', userId)

  const linked = await supabase
    .from('family_relationships')
    .select('student_profile_id,role,student_profiles(id,student_user_id,created_by_user_id,first_name,last_name,graduation_year,grade_level,school_id,schools(name,city,state))')
    .eq('user_id', userId)

  const map = new Map<string, StudentProfile>()
  for (const row of (owned.data || []) as unknown as StudentProfile[]) {
    if (row.id) map.set(row.id, row)
  }
  for (const rel of (linked.data || []) as unknown as Array<{ student_profiles: StudentProfile | null }>) {
    if (rel.student_profiles?.id) map.set(rel.student_profiles.id, rel.student_profiles)
  }
  return Array.from(map.values())
}

export async function getActiveStudentProfile(userId: string): Promise<StudentProfile | null> {
  const [profile, linked] = await Promise.all([getCurrentProfile(userId), getLinkedStudentProfiles(userId)])
  if (!linked.length) return null
  return linked.find((sp) => sp.id === profile?.active_student_profile_id) || linked[0]
}

export async function setActiveStudentProfile(
  userId: string,
  studentProfileId: string | null,
): Promise<{ success: boolean; error: string | null }> {
  return updateAccountProfile(userId, { active_student_profile_id: studentProfileId } as Partial<AccountProfile>)
}

export async function createStudentProfileForUser(input: {
  userId: string
  role: CanonicalRole
  firstName?: string | null
  lastName?: string | null
  graduationYear?: number | null
  schoolId?: string | null
}): Promise<{ studentProfile: StudentProfile | null; error: string | null }> {
  const studentUserId = input.role === 'student' ? input.userId : null
  const created = await supabase
    .from('student_profiles')
    .insert({
      student_user_id: studentUserId,
      created_by_user_id: input.userId,
      first_name: input.firstName || null,
      last_name: input.lastName || null,
      graduation_year: input.graduationYear || null,
      school_id: input.schoolId || null,
    })
    .select('id,student_user_id,created_by_user_id,first_name,last_name,graduation_year,grade_level,school_id,schools(name,city,state)')
    .single()

  if (created.error || !created.data) return { studentProfile: null, error: created.error?.message || 'Failed to create student profile' }

  const studentProfile = created.data as unknown as StudentProfile
  const rel = await supabase.from('family_relationships').insert({
    student_profile_id: studentProfile.id,
    user_id: input.userId,
    role: input.role,
  })
  if (rel.error && !/duplicate key/i.test(rel.error.message)) {
    return { studentProfile, error: rel.error.message }
  }

  await setActiveStudentProfile(input.userId, studentProfile.id)
  return { studentProfile, error: null }
}

export async function completeCanonicalOnboarding(input: {
  userId: string
  email?: string
  role: CanonicalRole
  firstName?: string | null
  lastName?: string | null
  graduationYear?: number | null
  schoolId?: string | null
}): Promise<{ success: boolean; error: string | null }> {
  await ensureCurrentProfile(input.userId, input.email, input.role)

  const profilePatch: Partial<AccountProfile> = {
    role: input.role,
    onboarding_complete: true,
    first_name: input.firstName || null,
    last_name: input.lastName || null,
    full_name: [input.firstName, input.lastName].filter(Boolean).join(' ') || null,
  }

  const profileUpdate = await updateAccountProfile(input.userId, profilePatch)
  if (!profileUpdate.success) return profileUpdate

  if (input.role === 'counselor') return { success: true, error: null }

  const created = await createStudentProfileForUser({
    userId: input.userId,
    role: input.role,
    firstName: input.firstName,
    lastName: input.lastName,
    graduationYear: input.graduationYear,
    schoolId: input.schoolId,
  })

  if (created.error) return { success: false, error: created.error }
  return { success: true, error: null }
}

export async function updateStudentProfile(
  studentProfileId: string,
  updates: Partial<Pick<StudentProfile, 'first_name' | 'last_name' | 'graduation_year' | 'school_id'>>,
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('student_profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', studentProfileId)
  return { success: !error, error: error?.message || null }
}

export async function getFamilyRelationships(studentProfileId: string): Promise<FamilyRelationship[]> {
  const { data, error } = await supabase
    .from('family_relationships')
    .select('*')
    .eq('student_profile_id', studentProfileId)
    .order('created_at', { ascending: true })
  if (error) {
    console.warn('Failed to load family relationships:', error.message)
    return []
  }
  return (data || []) as FamilyRelationship[]
}

export async function getPendingRelationshipInvites(userId: string): Promise<RelationshipInvite[]> {
  const profile = await getCurrentProfile(userId)
  const email = (await supabase.auth.getUser()).data.user?.email?.toLowerCase()
  let query = supabase
    .from('student_profile_relationship_invites')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  // RLS should scope this, but filtering by invited_user_id avoids pulling created invites when possible.
  if (profile?.id) query = query.or(`invited_user_id.eq.${userId}${email ? `,invited_email.eq.${email}` : ''}`)

  const { data, error } = await query
  if (error) {
    console.warn('Failed to load pending invites:', error.message)
    return []
  }
  return (data || []) as RelationshipInvite[]
}

export async function createRelationshipInvite(input: {
  userId: string
  studentProfileId: string
  invitedEmail: string
  relationshipRole: RelationshipRole
  inviteType?: InviteType
}): Promise<{ success: boolean; error: string | null }> {
  const row = {
    student_profile_id: input.studentProfileId,
    invited_email: input.invitedEmail.trim().toLowerCase(),
    relationship_role: input.relationshipRole,
    invite_type: input.inviteType || 'supporter_invite',
    status: 'pending',
    created_by_user_id: input.userId,
  }

  const { error } = await supabase.from('student_profile_relationship_invites').insert(row)
  if (!error) return { success: true, error: null }

  if (/invite_type.*schema cache|column .*invite_type.*does not exist/i.test(error.message)) {
    const { invite_type: _ignored, ...fallback } = row
    const retry = await supabase.from('student_profile_relationship_invites').insert(fallback)
    return { success: !retry.error, error: retry.error?.message || null }
  }
  return { success: false, error: error.message }
}

export async function acceptRelationshipInvite(inviteId: string): Promise<{ success: boolean; error: string | null }> {
  const { data: invite, error: inviteError } = await supabase
    .from('student_profile_relationship_invites')
    .select('*')
    .eq('id', inviteId)
    .single()

  if (inviteError || !invite) return { success: false, error: inviteError?.message || 'Invite not found' }

  const row = invite as RelationshipInvite
  if (row.relationship_role === 'student') {
    const rpc = await supabase.rpc('accept_student_claim_invite', { p_invite_id: inviteId })
    return { success: !rpc.error, error: rpc.error?.message || null }
  }

  if (row.invite_type === 'access_request') {
    const rpc = await supabase.rpc('approve_access_request', { p_invite_id: inviteId })
    return { success: !rpc.error, error: rpc.error?.message || null }
  }

  const { data: userData } = await supabase.auth.getUser()
  const userId = userData.user?.id
  if (!userId) return { success: false, error: 'Not authenticated' }

  const update = await supabase
    .from('student_profile_relationship_invites')
    .update({ status: 'accepted', invited_user_id: userId })
    .eq('id', inviteId)
  if (update.error) return { success: false, error: update.error.message }

  const rel = await supabase.from('family_relationships').insert({
    student_profile_id: row.student_profile_id,
    user_id: userId,
    role: row.relationship_role,
  })
  if (rel.error && !/duplicate key/i.test(rel.error.message)) return { success: false, error: rel.error.message }

  await setActiveStudentProfile(userId, row.student_profile_id)
  return { success: true, error: null }
}

export async function declineRelationshipInvite(inviteId: string): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('student_profile_relationship_invites')
    .update({ status: 'declined' })
    .eq('id', inviteId)
  return { success: !error, error: error?.message || null }
}

export async function requestStudentAccessByProfileId(input: {
  userId: string
  studentProfileId: string
  relationshipRole: 'parent' | 'guardian'
}): Promise<{ success: boolean; error: string | null }> {
  return createRelationshipInvite({
    userId: input.userId,
    studentProfileId: input.studentProfileId,
    invitedEmail: 'student-profile-owner@mysryear.local',
    relationshipRole: input.relationshipRole,
    inviteType: 'access_request',
  })
}
