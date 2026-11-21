import { describe, expect, it } from 'vitest'
import { ninthGradeReportCard } from '../../../../../packages/shared/src/__fixtures__/report-card'
import { groupReportCardsBySchoolYear } from './year-groups'

describe('groupReportCardsBySchoolYear', () => {
  it('keeps report cards together by year and opens newest years first', () => {
    const groups = groupReportCardsBySchoolYear([
      { id: 'one', data: { ...ninthGradeReportCard, school_year: '2025-2026' } },
      { id: 'two', data: { ...ninthGradeReportCard, school_year: '2026-2027' } },
      { id: 'three', data: { ...ninthGradeReportCard, school_year: '2025-2026' } },
    ])

    expect(groups.map((group) => group.schoolYear)).toEqual(['2026-2027', '2025-2026'])
    expect(groups[1].records.map((record) => record.id)).toEqual(['one', 'three'])
  })

  it('keeps unexpected legacy records available at the end of the list', () => {
    const groups = groupReportCardsBySchoolYear([
      { id: 'known', data: ninthGradeReportCard },
      { id: 'legacy', data: { ...ninthGradeReportCard, school_year: null } },
    ])

    expect(groups.map((group) => group.schoolYear)).toEqual([
      '2026-2027',
      'School year not reported',
    ])
  })
})
