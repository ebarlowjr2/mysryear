import type { UserRole } from '@mysryear/shared'

export const ROLE_DASHBOARD_PATHS: Record<UserRole, string> = {
  student: '/dashboard/student',
  parent: '/dashboard/family',
  guardian: '/dashboard/family',
  counselor: '/dashboard/counselor',
  business: '/business/dashboard',
}

export function dashboardPathForRole(role: UserRole | null | undefined) {
  if (!role) return '/dashboard/student'
  return ROLE_DASHBOARD_PATHS[role] || '/dashboard/student'
}

export function isFamilyRole(role: UserRole | null | undefined) {
  return role === 'parent' || role === 'guardian'
}

export function isStudentPlanningRole(role: UserRole | null | undefined) {
  return role === 'student' || role === 'parent' || role === 'guardian' || role === 'counselor'
}
