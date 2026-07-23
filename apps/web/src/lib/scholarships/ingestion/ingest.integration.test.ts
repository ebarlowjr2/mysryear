import { describe, it, expect } from 'vitest'
import { ingestSource } from './ingest'
import { InMemoryScholarshipRepository } from './repository'
import { LegacyScrapedSourceAdapter, type LegacyScrapedRow } from './sources/legacy-scraped-source'
import { computeFingerprint, normalizeDeadline } from './normalize'

const NOW = new Date('2026-07-21T00:00:00.000Z')

/**
 * Integration coverage for sources that provide NO stable external id. These
 * records rely on the deterministic fingerprint fallback so that re-imports are
 * idempotent (no duplicates) and map onto the (source, external_id) unique key.
 */
describe('ingestSource — records without external IDs (fingerprint fallback)', () => {
  const rows: LegacyScrapedRow[] = [
    {
      id: '1',
      name: 'Community Leaders Scholarship',
      amount: '$2,500',
      deadline: '2027-01-15',
      link: 'https://example.org/community-leaders',
      state: 'CA',
      tags: ['leadership'],
      source: 'example-aggregator',
    },
    {
      id: '2',
      name: 'Future Engineers Grant',
      amount: '$5,000',
      deadline: '2027-03-01',
      link: 'https://example.org/future-engineers',
      state: null,
      tags: ['STEM'],
      source: 'example-aggregator',
    },
  ]

  const adapter = new LegacyScrapedSourceAdapter(async () => rows)

  it('derives a stable identity fingerprint external id for each record', async () => {
    const repo = new InMemoryScholarshipRepository()
    await ingestSource(adapter, repo, { now: NOW })
    const stored = await repo.loadExistingBySource('legacy-scraped')

    // Each stored row is keyed by a non-empty identity fingerprint id.
    for (const [externalId] of stored) {
      expect(externalId).toHaveLength(40)
    }

    const expected = computeFingerprint({
      source: 'legacy-scraped',
      title: 'Community Leaders Scholarship',
      organization: 'example-aggregator',
      deadline: normalizeDeadline('2027-01-15'),
      applicationUrl: 'https://example.org/community-leaders',
    })
    expect(stored.has(expected)).toBe(true)
  })

  it('running the same import twice creates no duplicates (idempotent)', async () => {
    const repo = new InMemoryScholarshipRepository()

    const first = await ingestSource(adapter, repo, { now: NOW })
    expect(first.inserted).toBe(2)
    expect(first.unchanged).toBe(0)

    const second = await ingestSource(adapter, repo, { now: NOW })
    expect(second.inserted).toBe(0)
    expect(second.updated).toBe(0)
    expect(second.unchanged).toBe(2)

    // The store still holds exactly two rows after two full runs.
    const stored = await repo.loadExistingBySource('legacy-scraped')
    expect(stored.size).toBe(2)
  })

  it('a genuine content change on a fingerprint-keyed record is an update, not a duplicate', async () => {
    const repo = new InMemoryScholarshipRepository()
    await ingestSource(adapter, repo, { now: NOW })

    // Same natural identity (title + org + deadline + url) => same fingerprint id,
    // but a changed tag set changes the content fingerprint => update in place.
    const changedRows: LegacyScrapedRow[] = [
      { ...rows[0], tags: ['leadership', 'community service'] },
      rows[1],
    ]
    const changedAdapter = new LegacyScrapedSourceAdapter(async () => changedRows)
    const result = await ingestSource(changedAdapter, repo, { now: NOW })

    expect(result.inserted).toBe(0)
    expect(result.updated).toBe(1)
    expect(result.unchanged).toBe(1)

    const stored = await repo.loadExistingBySource('legacy-scraped')
    expect(stored.size).toBe(2)
  })
})
