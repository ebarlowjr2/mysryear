import { describe, it, expect } from 'vitest'
import { deduplicateBatch } from './deduplicate'
import { normalizeImportRecord } from './normalize'
import type { ScholarshipImportRecord } from './types'

function record(externalId: string, title = 'Example'): ScholarshipImportRecord {
  return {
    source: 'fixture-dataset',
    externalId,
    sourceUrl: 'https://example.org/s',
    title,
    organization: 'Example Foundation',
    applicationUrl: 'https://example.org/s/apply',
    active: true,
    lastVerifiedAt: '2026-07-21T00:00:00.000Z',
  }
}

describe('deduplicateBatch', () => {
  it('collapses duplicate (source, external_id) pairs, keeping the last', () => {
    const rows = [
      normalizeImportRecord(record('a', 'First')),
      normalizeImportRecord(record('b')),
      normalizeImportRecord(record('a', 'Second')),
    ]
    const { unique, duplicates } = deduplicateBatch(rows)
    expect(unique).toHaveLength(2)
    expect(duplicates).toHaveLength(1)
    const a = unique.find((r) => r.external_id === 'a')
    expect(a?.title).toBe('Second')
  })

  it('returns no duplicates for a unique batch', () => {
    const rows = [normalizeImportRecord(record('a')), normalizeImportRecord(record('b'))]
    const { unique, duplicates } = deduplicateBatch(rows)
    expect(unique).toHaveLength(2)
    expect(duplicates).toHaveLength(0)
  })
})
