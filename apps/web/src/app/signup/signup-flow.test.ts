import { describe, expect, it } from 'vitest'
import {
  ACCOUNT_TYPE_LABELS,
  SIGNUP_FIELD_ORDER,
  generateGraduationYears,
  graduationYearLabel,
  postSignupDestination,
  validateSignupForm,
  type SignupFormState,
} from './signup-flow'

const base: SignupFormState = {
  email: 'student@example.com',
  password: 'Password1',
  confirmPassword: 'Password1',
  role: 'student',
  schoolLevel: 'high_school',
  schoolId: 'school-1',
  addSchoolLater: false,
  graduationYear: 2030,
  organizationName: '',
}

describe('signup flow', () => {
  it('keeps the required field order', () => {
    expect(SIGNUP_FIELD_ORDER).toEqual([
      'email',
      'password',
      'confirmPassword',
      'accountType',
      'schoolLevel',
      'selectSchool',
      'graduationYear',
      'submit',
    ])
  })

  it('uses title-case labels while preserving lowercase role values', () => {
    expect(ACCOUNT_TYPE_LABELS.student).toBe('Student')
    expect(ACCOUNT_TYPE_LABELS.parent).toBe('Parent')
    expect(Object.keys(ACCOUNT_TYPE_LABELS)).toContain('business')
  })

  it('generates graduation years dynamically and labels by school level', () => {
    expect(generateGraduationYears(2026).slice(0, 3)).toEqual([2026, 2027, 2028])
    expect(graduationYearLabel('high_school')).toBe('Expected High School Graduation Year')
    expect(graduationYearLabel('college')).toBe('Expected College Graduation Year')
  })

  it('validates email/password matching and school add-later', () => {
    expect(validateSignupForm({ ...base, email: 'bad' })).toBe(
      'Please enter a valid email address.',
    )
    expect(validateSignupForm({ ...base, password: 'short', confirmPassword: 'short' })).toBe(
      'Password must be at least 8 characters.',
    )
    expect(validateSignupForm({ ...base, confirmPassword: 'Password2' })).toBe(
      'Passwords do not match.',
    )
    expect(validateSignupForm({ ...base, schoolId: '', addSchoolLater: false })).toBe(
      'Please select a school or choose Add My School Later.',
    )
    expect(validateSignupForm({ ...base, schoolId: '', addSchoolLater: true })).toBeNull()
  })

  it('branches role-specific post-signup destinations', () => {
    expect(postSignupDestination('student')).toBe('/dashboard')
    expect(postSignupDestination('parent')).toBe('/profile')
    expect(postSignupDestination('guardian')).toBe('/profile')
    expect(postSignupDestination('counselor')).toBe('/profile')
    expect(postSignupDestination('business')).toBe('/business/onboarding')
  })
})
