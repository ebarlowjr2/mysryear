import { describe, expect, it } from 'vitest'
import { familyActionCenterLabel, familyRoleNoun, isFamilyRole, ROLE_LABELS } from './role-presentation'

describe('role presentation helpers', () => {
  it('keeps title-cased display labels separate from lowercase database roles', () => {
    expect(ROLE_LABELS).toEqual({
      student: 'Student',
      parent: 'Parent',
      guardian: 'Guardian',
      counselor: 'Counselor',
      business: 'Business',
    })
  })

  it('treats parent and guardian as family roles without conflating their labels', () => {
    expect(isFamilyRole('parent')).toBe(true)
    expect(isFamilyRole('guardian')).toBe(true)
    expect(isFamilyRole('student')).toBe(false)
    expect(familyActionCenterLabel('parent')).toBe('Parent Action Center')
    expect(familyActionCenterLabel('guardian')).toBe('Guardian Action Center')
    expect(familyRoleNoun('guardian')).toBe('guardian')
  })
})
