import type { UserRole } from './types/roles'

/** Human-facing role names. Database values remain canonical lowercase roles. */
export const ROLE_LABELS: Record<UserRole, string> = {
  student: 'Student',
  parent: 'Parent',
  guardian: 'Guardian',
  counselor: 'Counselor',
  business: 'Business',
}

export function isFamilyRole(role: UserRole | null | undefined): boolean {
  return role === 'parent' || role === 'guardian'
}

export function familyActionCenterLabel(role: UserRole | null | undefined): string {
  if (role === 'parent') return 'Parent Action Center'
  if (role === 'guardian') return 'Guardian Action Center'
  return 'Family Action Center'
}

export function familyRoleNoun(role: UserRole | null | undefined): string {
  return role === 'guardian' ? 'guardian' : 'parent'
}
