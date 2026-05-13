import { createNextServerSupabaseClient } from '@mysryear/shared'
import { getActiveStudentProfileId } from '@/lib/student-profile'

export async function getLifePathCareerIdsForActiveStudent(): Promise<string[]> {
  const supabase = await createNextServerSupabaseClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) return []

  const studentProfileId = await getActiveStudentProfileId()
  if (!studentProfileId) return []

  const { data } = await supabase
    .from('student_career_interests')
    .select('career_id,rank')
    .eq('student_profile_id', studentProfileId)
    .order('rank', { ascending: true, nullsFirst: false })

  return (data || [])
    .map((r) => r.career_id as string)
    .filter((id) => typeof id === 'string' && id.length > 0)
}

