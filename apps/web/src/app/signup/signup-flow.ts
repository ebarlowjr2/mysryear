import type { UserRole } from '@mysryear/shared'

export type SchoolLevel = 'high_school' | 'college'

export type SignupFormState = {
  email: string
  password: string
  confirmPassword: string
  role: UserRole
  schoolLevel: SchoolLevel
  schoolId: string | null
  addSchoolLater: boolean
  graduationYear: number | ''
  organizationName: string
}

export const ACCOUNT_TYPE_LABELS: Record<UserRole, string> = {
  student: 'Student',
  parent: 'Parent',
  guardian: 'Guardian',
  counselor: 'Counselor',
  business: 'Business',
}

export const SIGNUP_FIELD_ORDER = [
  'email',
  'password',
  'confirmPassword',
  'accountType',
  'schoolLevel',
  'selectSchool',
  'graduationYear',
  'submit',
] as const

export function graduationYearLabel(schoolLevel: SchoolLevel) {
  return schoolLevel === 'college'
    ? 'Expected College Graduation Year'
    : 'Expected High School Graduation Year'
}

export function generateGraduationYears(currentYear = new Date().getFullYear()) {
  return Array.from({ length: 12 }, (_, index) => currentYear + index)
}

export function requiresSchoolFlow(role: UserRole) {
  return role === 'student' || role === 'counselor'
}

export function requiresGraduationYear(role: UserRole) {
  return role === 'student'
}

export function postSignupDestination(role: UserRole) {
  if (role === 'business') return '/business/onboarding'
  if (role === 'parent' || role === 'guardian') return '/profile'
  if (role === 'counselor') return '/profile'
  return '/dashboard'
}

export function validateSignupForm(input: SignupFormState) {
  const email = input.email.trim()
  if (!/^\S+@\S+\.\S+$/.test(email)) return 'Please enter a valid email address.'
  if (input.password.length < 8) return 'Password must be at least 8 characters.'
  if (!/[A-Za-z]/.test(input.password) || !/\d/.test(input.password)) {
    return 'Password must include at least one letter and one number.'
  }
  if (input.password !== input.confirmPassword) return 'Passwords do not match.'

  if (input.role === 'business' && !input.organizationName.trim()) {
    return 'Please enter your organization name.'
  }

  if (requiresSchoolFlow(input.role) && !input.addSchoolLater && !input.schoolId) {
    return 'Please select a school or choose Add My School Later.'
  }

  if (requiresGraduationYear(input.role)) {
    if (typeof input.graduationYear !== 'number' || !input.graduationYear) {
      return 'Please select your expected graduation year.'
    }
  }

  return null
}
