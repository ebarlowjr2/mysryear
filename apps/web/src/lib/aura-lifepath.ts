import { redirect } from 'next/navigation'
import { createNextServerSupabaseClient, type UserRole } from '@mysryear/shared'
import { requireSessionProfile } from '@/lib/auth'
import { getActiveStudentProfileId } from '@/lib/student-profile'

export type LifePathMode = 'student' | 'linked-student' | 'parent-simulation'

export type LifePathRouteContext = {
  userId: string
  role: UserRole | null
  mode: LifePathMode
  officialStudentProfileId: string | null
  canEditOfficialLifePath: boolean
  canAddFeedback: boolean
  dashboardHref: string
  auraHref: string
  lifePathHref: string
}

export type LinkedStudentSummary = {
  id: string
  first_name: string | null
  last_name: string | null
  graduation_year: number | null
  school_id?: string | null
  schools?: { name: string | null } | null
}

export function dashboardHrefForRole(role: UserRole | null) {
  if (role === 'business') return '/business/dashboard'
  if (role === 'parent' || role === 'guardian') return '/dashboard/family'
  if (role === 'counselor') return '/dashboard/counselor'
  return '/dashboard/student'
}

export function isFamilyRole(role: UserRole | null) {
  return role === 'parent' || role === 'guardian'
}

export async function requireAuraLifePathContext(
  returnPath: string,
): Promise<LifePathRouteContext> {
  const sp = await requireSessionProfile(returnPath)
  if (sp.role === 'business') redirect('/business/dashboard')

  const officialStudentProfileId = await getActiveStudentProfileId()
  const mode: LifePathMode = sp.role === 'student' ? 'student' : 'linked-student'
  const canEditOfficialLifePath = sp.role === 'student'
  const canAddFeedback = isFamilyRole(sp.role)

  return {
    userId: sp.user.id,
    role: sp.role,
    mode,
    officialStudentProfileId,
    canEditOfficialLifePath,
    canAddFeedback,
    dashboardHref: dashboardHrefForRole(sp.role),
    auraHref: '/aura',
    lifePathHref: '/aura/lifepath',
  }
}

export async function listLinkedStudentProfilesForCurrentUser(): Promise<LinkedStudentSummary[]> {
  const supabase = await createNextServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return []

  const { data: relationships } = await supabase
    .from('family_relationships')
    .select(
      'student_profile_id,role,student_profiles(id,first_name,last_name,graduation_year,school_id,schools(name))',
    )
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: true })

  const map = new Map<string, LinkedStudentSummary>()
  for (const row of (relationships || []) as unknown as Array<{
    student_profiles?: LinkedStudentSummary | LinkedStudentSummary[] | null
  }>) {
    const student = Array.isArray(row.student_profiles)
      ? row.student_profiles[0]
      : row.student_profiles
    if (student?.id) map.set(student.id, student)
  }

  return Array.from(map.values())
}

export async function getCareerIdsForStudentProfile(
  studentProfileId: string | null,
): Promise<string[]> {
  if (!studentProfileId) return []
  const supabase = await createNextServerSupabaseClient()
  const { data, error } = await supabase
    .from('student_career_interests')
    .select('career_id,rank')
    .eq('student_profile_id', studentProfileId)
    .order('rank', { ascending: true, nullsFirst: false })

  if (error) return []
  return (data || []).map((row) => row.career_id as string).filter(Boolean)
}
