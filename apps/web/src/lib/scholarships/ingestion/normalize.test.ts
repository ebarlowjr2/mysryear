import { describe, it, expect } from 'vitest'
import {
  cleanTags,
  computeFingerprint,
  deterministicExternalId,
  gradeLevelRange,
  normalizeDeadline,
  normalizeImportRecord,
  normalizeUrl,
  parseAmount,
} from './normalize'
import type { ScholarshipImportRecord } from './types'

function baseRecord(overrides: Partial<ScholarshipImportRecord> = {}): ScholarshipImportRecord {
  return {
    source: 'fixture-dataset',
    externalId: 'ext-1',
    sourceUrl: 'https://example.org/s/1',
    title: 'Example Scholarship',
    organization: 'Example Foundation',
    applicationUrl: 'https://example.org/s/1/apply',
    active: true,
    lastVerifiedAt: '2026-07-21T00:00:00.000Z',
    ...overrides,
  }
}

describe('parseAmount', () => {
  it('parses numbers and currency strings, rejects junk', () => {
    expect(parseAmount(5000)).toBe(5000)
    expect(parseAmount('$2,500')).toBe(2500)
    expect(parseAmount('$1,000.50')).toBe(1000.5)
    expect(parseAmount('TBD')).toBeNull()
    expect(parseAmount(-5)).toBeNull()
    expect(parseAmount(undefined)).toBeNull()
  })
})

describe('normalizeDeadline', () => {
  it('accepts ISO and common date strings', () => {
    expect(normalizeDeadline('2026-10-31')).toBe('2026-10-31')
    expect(normalizeDeadline('2026-10-31T12:00:00Z')).toBe('2026-10-31')
    expect(normalizeDeadline('October 31, 2026')).toBe('2026-10-31')
  })
  it('returns null for unknown/invalid deadlines', () => {
    expect(normalizeDeadline('TBD')).toBeNull()
    expect(normalizeDeadline('')).toBeNull()
    expect(normalizeDeadline(undefined)).toBeNull()
    expect(normalizeDeadline('2026-13-40')).toBeNull()
  })
})

describe('normalizeUrl', () => {
  it('validates http(s) URLs', () => {
    expect(normalizeUrl('https://example.org/x')).toBe('https://example.org/x')
    expect(normalizeUrl('not a url')).toBeNull()
    expect(normalizeUrl('ftp://example.org')).toBeNull()
    expect(normalizeUrl(undefined)).toBeNull()
  })
})

describe('cleanTags', () => {
  it('trims, dedupes case-insensitively, drops empties', () => {
    expect(cleanTags(['STEM', 'stem', ' Arts ', '', null])).toEqual(['STEM', 'Arts'])
    expect(cleanTags('nope')).toEqual([])
  })
})

describe('gradeLevelRange', () => {
  it('maps numeric and word grade levels to a min/max range', () => {
    expect(gradeLevelRange(['11', '12'])).toEqual({ min: 11, max: 12 })
    expect(gradeLevelRange(['senior'])).toEqual({ min: 12, max: 12 })
    expect(gradeLevelRange(['undergraduate'])).toEqual({ min: null, max: null })
    expect(gradeLevelRange(undefined)).toEqual({ min: null, max: null })
  })
})

describe('computeFingerprint / deterministicExternalId', () => {
  it('is deterministic and stable across identical inputs', () => {
    const input = {
      source: 'fixture-dataset',
      title: 'Example Scholarship',
      organization: 'Example Foundation',
      deadline: '2026-10-31',
      applicationUrl: 'https://example.org/apply',
    }
    const a = computeFingerprint(input)
    const b = computeFingerprint({ ...input })
    expect(a).toBe(b)
    expect(a).toHaveLength(40)
    expect(deterministicExternalId(input)).toBe(a)
  })

  it('is insensitive to casing/whitespace but sensitive to real changes', () => {
    const base = {
      source: 'fixture-dataset',
      title: 'Example Scholarship',
      organization: 'Example Foundation',
      deadline: '2026-10-31',
      applicationUrl: 'https://example.org/apply',
    }
    expect(computeFingerprint(base)).toBe(
      computeFingerprint({ ...base, title: '  example SCHOLARSHIP ' }),
    )
    expect(computeFingerprint(base)).not.toBe(
      computeFingerprint({ ...base, deadline: '2026-11-01' }),
    )
  })
})

describe('normalizeImportRecord', () => {
  it('maps a full record to the canonical row shape', () => {
    const row = normalizeImportRecord(
      baseRecord({
        amountMin: 1000,
        amountMax: 5000,
        amountDisplay: '$1,000 – $5,000',
        deadline: '2026-10-31',
        minimumGpa: 3.0,
        gradeLevels: ['11', '12'],
        careerTags: ['engineering'],
        stateEligibility: ['CA'],
        essayRequired: true,
      }),
    )
    expect(row.external_id).toBe('ext-1')
    expect(row.amount).toBe(5000)
    expect(row.amount_min).toBe(1000)
    expect(row.minimum_grade_level).toBe(11)
    expect(row.maximum_grade_level).toBe(12)
    expect(row.state).toBe('CA')
    expect(row.country).toBe('US')
    expect(row.essay_required).toBe(true)
    expect(row.lifecycle_status).toBe('active')
    expect(row.import_fingerprint).toHaveLength(40)
  })

  it('generates a deterministic external id when the source has none', () => {
    const row = normalizeImportRecord(baseRecord({ externalId: '' }))
    expect(row.external_id).toBe(row.import_fingerprint)
    // Re-normalizing the same record yields the same generated id (idempotent).
    const again = normalizeImportRecord(baseRecord({ externalId: '' }))
    expect(again.external_id).toBe(row.external_id)
  })

  it('handles missing optional fields without crashing', () => {
    const row = normalizeImportRecord(baseRecord())
    expect(row.description).toBeNull()
    expect(row.amount).toBeNull()
    expect(row.deadline).toBeNull()
    expect(row.career_tags).toEqual([])
    expect(row.minimum_grade_level).toBeNull()
  })

  it('marks inactive records with inactive lifecycle status', () => {
    const row = normalizeImportRecord(baseRecord({ active: false }))
    expect(row.active).toBe(false)
    expect(row.lifecycle_status).toBe('inactive')
  })
})
