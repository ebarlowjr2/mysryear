import { supabase } from '../lib/supabase'

export type School = {
  id: string
  name: string
  city: string | null
  state: string | null
  zip: string | null
  nces_id: string | null
  created_at: string
}

export type SchoolMembership = {
  id: string
  school_id: string
  user_id: string
  role: 'student' | 'teacher' | 'staff' | 'admin'
  created_at: string
  school?: School
}

export async function searchSchools(query: string): Promise<School[]> {
  if (!query.trim()) return []

  const { data, error } = await supabase
    .from('schools')
    .select('*')
    .ilike('name', `%${query}%`)
    .limit(20)

  if (error) {
    console.warn('Failed to search schools:', error.message)
    return []
  }

  return data as School[]
}

export async function getSchool(schoolId: string): Promise<School | null> {
  const { data, error } = await supabase
    .from('schools')
    .select('*')
    .eq('id', schoolId)
    .single()

  if (error || !data) return null
  return data as School
}

export async function getUserSchoolMembership(userId: string): Promise<SchoolMembership | null> {
  const { data, error } = await supabase
    .from('school_memberships')
    .select(`
      *,
      schools (*)
    `)
    .eq('user_id', userId)
    .single()

  if (error || !data) return null

  const membership = data as Record<string, unknown>
  return {
    id: membership.id as string,
    school_id: membership.school_id as string,
    user_id: membership.user_id as string,
    role: membership.role as 'student' | 'teacher' | 'staff' | 'admin',
    created_at: membership.created_at as string,
    school: membership.schools as School | undefined,
  }
}

export async function joinSchool(
  userId: string,
  schoolId: string,
  role: 'student' | 'teacher' | 'staff' = 'student'
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('school_memberships')
    .insert({
      user_id: userId,
      school_id: schoolId,
      role,
    })

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'You are already a member of this school' }
    }
    return { success: false, error: error.message }
  }

  return { success: true, error: null }
}

export async function leaveSchool(membershipId: string): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('school_memberships')
    .delete()
    .eq('id', membershipId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, error: null }
}

export async function createSchool(school: {
  name: string
  city?: string
  state?: string
  zip?: string
}): Promise<{ school: School | null; error: string | null }> {
  const { data, error } = await supabase
    .from('schools')
    .insert({
      name: school.name,
      city: school.city || null,
      state: school.state || null,
      zip: school.zip || null,
    })
    .select()
    .single()

  if (error) {
    return { school: null, error: error.message }
  }

  return { school: data as School, error: null }
}

export async function getSchoolMembers(schoolId: string): Promise<number> {
  const { count, error } = await supabase
    .from('school_memberships')
    .select('*', { count: 'exact', head: true })
    .eq('school_id', schoolId)

  if (error) {
    console.warn('Failed to get school members count:', error.message)
    return 0
  }

  return count || 0
}
