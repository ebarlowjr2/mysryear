import { describe, expect, it } from 'vitest'
import { canManageReportCards, emptyReportCard, parseReportCard } from './report-cards'
import { ninthGradeReportCard } from './__fixtures__/report-card'
const fixture = () => structuredClone(ninthGradeReportCard)

describe('digital report-card normalization', () => {
  it('preserves the sample layout without identifying information or fabricated grades', () => {
    const result = parseReportCard(fixture(), true)
    expect(result.grade_level).toBe('9')
    expect(result.courses).toHaveLength(8)
    expect(result.courses[0].grades[1]).toEqual({ period: 'Q2', numeric: null, letter: null })
    expect(result.courses[3].grades[0].numeric).toBeNull()
    expect(result.attendance).toEqual({ scope: 'Year to date', absences: 2, tardies: 1 })
    expect(result).not.toHaveProperty('gpa')
  })
  it.each(['guardian', 'counselor', 'business', 'admin', '', null])('denies role %s', (role) => {
    expect(canManageReportCards(role)).toBe(false)
  })
  it.each(['student', 'parent'])('allows role %s subject to relationship authorization', (role) => {
    expect(canManageReportCards(role)).toBe(true)
  })
  it('does not let extraction choose student ownership or copy personal fields', () => {
    expect(
      parseReportCard({
        ...fixture(),
        student_profile_id: 'other',
        student_name: 'Private',
        address: 'Private',
        status: 'saved',
      }),
    ).toEqual(fixture())
  })
  it.each([-1, 101, NaN, Infinity, '82'])('rejects invalid numeric grade %s', (score) => {
    const card = fixture()
    ;(card.courses[0].grades[0] as { numeric: unknown }).numeric = score
    expect(() => parseReportCard(card)).toThrow()
  })
  it('preserves zero as a real grade', () => {
    const card = fixture()
    card.courses[0].grades[0].numeric = 0
    expect(parseReportCard(card).courses[0].grades[0].numeric).toBe(0)
  })
  it('rejects duplicate grading periods instead of collapsing values', () => {
    const card = fixture()
    card.courses[0].grades[1].period = 'q1'
    expect(() => parseReportCard(card)).toThrow('unique')
  })
  it.each(['2026-2026', '2026-2028', '26-27'])('rejects invalid academic year %s', (year) => {
    expect(() => parseReportCard({ ...fixture(), school_year: year })).toThrow()
  })
  it('does not change the academic year on January 1', () => {
    expect(emptyReportCard(new Date(2027, 0, 1)).school_year).toBe('2026-2027')
    expect(emptyReportCard(new Date(2027, 6, 1)).school_year).toBe('2027-2028')
  })
  it('accepts partial extraction but prevents incomplete saves', () => {
    expect(parseReportCard(emptyReportCard()).courses).toEqual([])
    expect(() => parseReportCard(emptyReportCard(), true)).toThrow('Review')
  })
  it('does not silently override a real sixth-grade source', () => {
    expect(parseReportCard({ ...fixture(), grade_level: '6' }).grade_level).toBe('6')
  })
  it('rejects invalid attendance', () => {
    const card = fixture()
    card.attendance.absences = -1
    expect(() => parseReportCard(card)).toThrow()
  })
})
