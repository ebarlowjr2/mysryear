import { describe, it, expect } from 'vitest'
import { validateRow } from './validate'
import { normalizeImportRecord } from './normalize'
import type { NormalizedScholarshipRow } from './types'
import type { ScholarshipImportRecord } from './types'

function row(overrides: Partial<ScholarshipImportRecord> = {}): NormalizedScholarshipRow {
  return normalizeImportRecord({
    source: 'fixture-dataset',
    externalId: 'ext-1',
    sourceUrl: 'https://example.org/s/1',
    title: 'Example Scholarship',
    organization: 'Example Foundation',
    applicationUrl: 'https://example.org/s/1/apply',
    active: true,
    lastVerifiedAt: '2026-07-21T00:00:00.000Z',
    ...overrides,
  })
}

describe('validateRow', () => {
  it('accepts a well-formed row', () => {
    expect(validateRow(row())).toEqual([])
  })

  it('rejects an empty title', () => {
    const issues = validateRow(row({ title: '   ' }))
    expect(issues.map((i) => i.field)).toContain('title')
  })

  it('rejects an invalid application URL', () => {
    const issues = validateRow(row({ applicationUrl: 'not-a-url' }))
    expect(issues.map((i) => i.field)).toContain('application_url')
  })

  it('rejects a missing organization', () => {
    const issues = validateRow(row({ organization: '' }))
    expect(issues.map((i) => i.field)).toContain('organization')
  })

  it('rejects amountMin greater than amountMax', () => {
    const issues = validateRow(row({ amountMin: 5000, amountMax: 1000 }))
    expect(issues.some((i) => i.message.includes('amountMin'))).toBe(true)
  })

  it('rejects impossible (pre-2000) deadlines', () => {
    const issues = validateRow(row({ deadline: '1998-01-01' }))
    expect(issues.map((i) => i.field)).toContain('deadline')
  })

  it('rejects an out-of-range GPA that bypassed normalization', () => {
    // normalizeImportRecord nulls out-of-range GPAs, so exercise validation
    // directly with a row that carries an impossible value.
    const issues = validateRow({ ...row(), minimum_gpa: 9 })
    expect(issues.map((i) => i.field)).toContain('minimum_gpa')
  })
})
