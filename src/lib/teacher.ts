import { createClient, Database, VerificationStatus } from './supabase'

type TeacherProfile = Database['public']['Tables']['teacher_profiles']['Row']
type TeacherProfileInsert = Database['public']['Tables']['teacher_profiles']['Insert']
type TeacherProfileUpdate = Database['public']['Tables']['teacher_profiles']['Update']
type School = Database['public']['Tables']['schools']['Row']

export interface TeacherProfileData {
  userId: string
  title: string | null
  schoolId: string | null
  schoolName: string | null
  verificationStatus: VerificationStatus
  createdAt: string
  updatedAt: string
}

export interface SchoolData {
  id: string
  name: string
  district: string | null
  city: string | null
  state: string | null
}

function mapToTeacherProfileData(profile: TeacherProfile, school?: School | null): TeacherProfileData {
  return {
    userId: profile.user_id,
    title: profile.title,
    schoolId: profile.school_id,
    schoolName: school?.name || null,
    verificationStatus: profile.verification_status,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  }
}

export async function getTeacherProfile(userId: string): Promise<TeacherProfileData | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('teacher_profiles')
    .select(`
      *,
      schools (
        id,
        name,
        district,
        city,
        state
      )
    `)
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    return null
  }

  return mapToTeacherProfileData(data, data.schools as School | null)
}

export async function ensureTeacherProfile(userId: string): Promise<TeacherProfileData> {
  const supabase = createClient()
  
  const existing = await getTeacherProfile(userId)
  if (existing) {
    return existing
  }

  const newProfile: TeacherProfileInsert = {
    user_id: userId,
    verification_status: 'unverified',
  }

  const { data, error } = await supabase
    .from('teacher_profiles')
    .insert(newProfile)
    .select()
    .single()

  if (error || !data) {
    console.error('Error creating teacher profile:', error)
    return {
      userId,
      title: null,
      schoolId: null,
      schoolName: null,
      verificationStatus: 'unverified',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }

  return mapToTeacherProfileData(data)
}

export interface TeacherProfilePatch {
  title?: string | null
  schoolId?: string | null
}

export async function updateTeacherProfile(
  userId: string,
  patch: TeacherProfilePatch
): Promise<{ success: boolean; error?: string; data?: TeacherProfileData }> {
  const supabase = createClient()
  
  const updateData: TeacherProfileUpdate = {
    updated_at: new Date().toISOString(),
  }

  if (patch.title !== undefined) updateData.title = patch.title
  if (patch.schoolId !== undefined) updateData.school_id = patch.schoolId

  const { data, error } = await supabase
    .from('teacher_profiles')
    .update(updateData)
    .eq('user_id', userId)
    .select(`
      *,
      schools (
        id,
        name,
        district,
        city,
        state
      )
    `)
    .single()

  if (error) {
    console.error('Error updating teacher profile:', error)
    return { success: false, error: 'Failed to update teacher profile' }
  }

  return { success: true, data: mapToTeacherProfileData(data, data.schools as School | null) }
}

export async function listSchools(state?: string): Promise<SchoolData[]> {
  const supabase = createClient()
  
  let query = supabase
    .from('schools')
    .select('*')
    .order('name', { ascending: true })

  if (state) {
    query = query.eq('state', state)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching schools:', error)
    return []
  }

  return (data || []).map((school) => ({
    id: school.id,
    name: school.name,
    district: school.district,
    city: school.city,
    state: school.state,
  }))
}

export const TEACHER_TITLES = [
  'Teacher',
  'Counselor',
  'Administrator',
  'Principal',
  'Vice Principal',
  'Department Head',
  'Other',
] as const
