import { describe, expect, it } from 'vitest'
import {
  highSchoolGradeFromGraduationYear,
  mergeParentActionCompletions,
  parentActionTemplatesForStudent,
} from './parent-actions'

describe('parent action templates', () => {
  it('keeps January in the same academic grade instead of advancing on calendar year', () => {
    expect(highSchoolGradeFromGraduationYear(2030, new Date('2027-01-15T12:00:00Z'))).toBe('9')
    expect(highSchoolGradeFromGraduationYear(2030, new Date('2027-08-15T12:00:00Z'))).toBe('10')
  })

  it('returns grade-specific high-school parent actions and a college/unknown fallback', () => {
    expect(parentActionTemplatesForStudent({ graduationYear: 2030, asOf: new Date('2027-01-15T12:00:00Z') })[0]?.key).toBe('g9_review_grad_requirements')
    expect(parentActionTemplatesForStudent({ graduationYear: 2027, asOf: new Date('2026-09-01T12:00:00Z') })[0]?.key).toBe('g12_deadline_calendar')
    expect(parentActionTemplatesForStudent({ graduationYear: 2030, schoolLevel: 'college' })[0]?.key).toBe('general_confirm_student_goals')
    expect(parentActionTemplatesForStudent({ graduationYear: null })[0]?.key).toBe('general_confirm_student_goals')
  })

  it('merges completion state per parent without mutating student checklist tasks', () => {
    const templates = parentActionTemplatesForStudent({ graduationYear: 2030, asOf: new Date('2027-01-15T12:00:00Z') })
    const items = mergeParentActionCompletions(templates, [
      { action_key: templates[0].key, status: 'completed', completed_at: '2026-08-09T12:00:00Z' },
    ])
    expect(items[0].completed).toBe(true)
    expect(items[1].completed).toBe(false)
  })
})
