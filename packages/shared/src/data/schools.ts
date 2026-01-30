// Schools data layer
import type { SupabaseClient } from '@supabase/supabase-js'
import type { School, SchoolMembership } from '../types'

export async function searchSchools(
  supabase: SupabaseClient,
  query: string,
  limit: number = 20
): Promise<School[]> {
  if (!query || query.length < 2) return []

  const { data, error } = await supabase
    .from('schools')
    .select('*')
    .ilike('name', `%${query}%`)
    .order('name')
    .limit(limit)

  if (error) {
    console.error('Error searching schools:', error)
    return []
  }

  return (data || []) as School[]
}

export async function getSchool(
  supabase: SupabaseClient,
  schoolId: string
): Promise<School | null> {
  const { data, error } = await supabase
    .from('schools')
    .select('*')
    .eq('id', schoolId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    console.error('Error fetching school:', error)
    return null
  }

  return data as School
}

export async function createSchool(
  supabase: SupabaseClient,
  name: string,
  city?: string,
  state?: string
): Promise<School | null> {
  const { data, error } = await supabase
    .from('schools')
    .insert({
      name,
      city: city || null,
      state: state || null
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating school:', error)
    return null
  }

  return data as School
}

export async function getUserSchoolMembership(
  supabase: SupabaseClient,
  userId: string
): Promise<SchoolMembership | null> {
  const { data, error } = await supabase
    .from('school_members')
    .select(`
      school_id,
      role,
      joined_at,
      schools (
        name
      )
    `)
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    console.error('Error fetching school membership:', error)
    return null
  }

  if (!data) return null

  return {
    school_id: data.school_id,
    school_name: (data.schools as any)?.name || 'Unknown School',
    role: data.role as 'student' | 'teacher',
    joined_at: data.joined_at
  }
}

export async function joinSchool(
  supabase: SupabaseClient,
  userId: string,
  schoolId: string,
  role: 'student' | 'teacher' = 'student'
): Promise<{ success: boolean; error: string | null }> {
  // First, leave any existing school
  await supabase
    .from('school_members')
    .delete()
    .eq('user_id', userId)

  // Join the new school
  const { error } = await supabase
    .from('school_members')
    .insert({
      user_id: userId,
      school_id: schoolId,
      role
    })

  if (error) {
    console.error('Error joining school:', error)
    return { success: false, error: error.message }
  }

  return { success: true, error: null }
}

export async function leaveSchool(
  supabase: SupabaseClient,
  userId: string
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('school_members')
    .delete()
    .eq('user_id', userId)

  if (error) {
    console.error('Error leaving school:', error)
    return { success: false, error: error.message }
  }

  return { success: true, error: null }
}
