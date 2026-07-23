import { describe, it, expect } from 'vitest'
import { ingestSource } from './ingest'
import { InMemoryScholarshipRepository } from './repository'
import { FixtureSourceAdapter, type FixtureScholarship } from './sources/fixture-source'
import type { ScholarshipSourceAdapter } from './types'

const NOW = new Date('2026-07-21T00:00:00.000Z')

function fixture(overrides: Partial<FixtureScholarship> = {}): FixtureScholarship {
  return {
    externalId: overrides.externalId ?? 'ext-1',
    title: 'Example Scholarship',
    organization: 'Example Foundation',
    sourceUrl: 'https://example.org/s/1',
    applicationUrl: 'https://example.org/s/1/apply',
    amountMin: 1000,
    amountMax: 5000,
    deadline: '2026-12-31',
    active: true,
    lastVerifiedAt: '2026-07-21T00:00:00.000Z',
    ...overrides,
  }
}

describe('ingestSource — inserts and idempotency', () => {
  it('inserts new records then reports them unchanged on a second run', async () => {
    const dataset = [fixture({ externalId: 'a' }), fixture({ externalId: 'b' })]
    const adapter = new FixtureSourceAdapter(dataset)
    const repo = new InMemoryScholarshipRepository()

    const first = await ingestSource(adapter, repo, { now: NOW })
    expect(first.inserted).toBe(2)
    expect(first.updated).toBe(0)
    expect(first.unchanged).toBe(0)

    const second = await ingestSource(adapter, repo, { now: NOW })
    expect(second.inserted).toBe(0)
    expect(second.updated).toBe(0)
    expect(second.unchanged).toBe(2)
  })

  it('detects a changed record as an update, not an insert', async () => {
    const repo = new InMemoryScholarshipRepository()
    await ingestSource(new FixtureSourceAdapter([fixture({ externalId: 'a' })]), repo, { now: NOW })

    const changed = new FixtureSourceAdapter([
      fixture({ externalId: 'a', title: 'Example Scholarship (Updated)' }),
    ])
    const result = await ingestSource(changed, repo, { now: NOW })
    expect(result.inserted).toBe(0)
    expect(result.updated).toBe(1)
    expect(result.unchanged).toBe(0)
  })
})

describe('ingestSource — validation and dedup', () => {
  it('rejects invalid records without aborting the run', async () => {
    const dataset = [
      fixture({ externalId: 'good' }),
      fixture({ externalId: 'bad', applicationUrl: 'not-a-url' }),
    ]
    const repo = new InMemoryScholarshipRepository()
    const result = await ingestSource(new FixtureSourceAdapter(dataset), repo, { now: NOW })
    expect(result.inserted).toBe(1)
    expect(result.rejected).toBe(1)
    expect(result.errors.length).toBeGreaterThanOrEqual(1)
  })

  it('collapses in-batch duplicates and counts them rejected', async () => {
    const dataset = [fixture({ externalId: 'dup' }), fixture({ externalId: 'dup' })]
    const repo = new InMemoryScholarshipRepository()
    const result = await ingestSource(new FixtureSourceAdapter(dataset), repo, { now: NOW })
    expect(result.inserted).toBe(1)
    expect(result.rejected).toBe(1)
  })
})

describe('ingestSource — lifecycle', () => {
  it('marks records with a past deadline as expired', async () => {
    const dataset = [
      fixture({ externalId: 'past', deadline: '2024-01-01' }),
      fixture({ externalId: 'future', deadline: '2027-01-01' }),
    ]
    const repo = new InMemoryScholarshipRepository()
    const result = await ingestSource(new FixtureSourceAdapter(dataset), repo, { now: NOW })
    expect(result.expired).toBe(1)
    const stored = await repo.loadExistingBySource('fixture-dataset')
    expect(stored.get('past')?.active).toBe(false)
    expect(stored.get('past')?.lifecycle_status).toBe('expired')
    expect(stored.get('future')?.active).toBe(true)
  })

  it('deactivates rows missing from a full import when enabled', async () => {
    const repo = new InMemoryScholarshipRepository()
    await ingestSource(
      new FixtureSourceAdapter([fixture({ externalId: 'a' }), fixture({ externalId: 'b' })]),
      repo,
      { now: NOW },
    )

    // Second import no longer includes "b".
    const result = await ingestSource(
      new FixtureSourceAdapter([fixture({ externalId: 'a' })]),
      repo,
      { now: NOW, deactivateMissing: true },
    )
    expect(result.expired).toBe(1)
    const stored = await repo.loadExistingBySource('fixture-dataset')
    expect(stored.get('b')?.active).toBe(false)
  })

  it('does not retire missing rows when deactivateMissing is off', async () => {
    const repo = new InMemoryScholarshipRepository()
    await ingestSource(
      new FixtureSourceAdapter([fixture({ externalId: 'a' }), fixture({ externalId: 'b' })]),
      repo,
      { now: NOW },
    )
    const result = await ingestSource(
      new FixtureSourceAdapter([fixture({ externalId: 'a' })]),
      repo,
      { now: NOW },
    )
    expect(result.expired).toBe(0)
    const stored = await repo.loadExistingBySource('fixture-dataset')
    expect(stored.get('b')?.active).toBe(true)
  })
})

describe('ingestSource — dry-run and failures', () => {
  it('dry-run makes no writes but reports proposed counts', async () => {
    const dataset = [fixture({ externalId: 'a' }), fixture({ externalId: 'b' })]
    const repo = new InMemoryScholarshipRepository()
    const result = await ingestSource(new FixtureSourceAdapter(dataset), repo, {
      now: NOW,
      dryRun: true,
    })
    expect(result.dryRun).toBe(true)
    expect(result.inserted).toBe(2)
    const stored = await repo.loadExistingBySource('fixture-dataset')
    expect(stored.size).toBe(0)
  })

  it('reports a source fetch failure without throwing', async () => {
    const failing: ScholarshipSourceAdapter = {
      sourceName: 'flaky-source',
      async fetchRecords() {
        throw new Error('temporarily unavailable')
      },
      normalizeRecord() {
        return null
      },
    }
    const repo = new InMemoryScholarshipRepository()
    const result = await ingestSource(failing, repo, { now: NOW })
    expect(result.fetched).toBe(0)
    expect(result.inserted).toBe(0)
    expect(result.errors[0]?.message).toContain('Source fetch failed')
  })

  it('skips a single record that throws during normalization', async () => {
    const adapter: ScholarshipSourceAdapter = {
      sourceName: 'partial-source',
      async fetchRecords() {
        return [{ ok: true }, { ok: false }]
      },
      normalizeRecord(record) {
        if ((record as { ok: boolean }).ok) {
          return {
            source: 'partial-source',
            externalId: 'ok-1',
            sourceUrl: 'https://example.org/s',
            title: 'Fine',
            organization: 'Org',
            applicationUrl: 'https://example.org/s/apply',
            active: true,
            lastVerifiedAt: '2026-07-21T00:00:00.000Z',
          }
        }
        throw new Error('boom')
      },
    }
    const repo = new InMemoryScholarshipRepository()
    const result = await ingestSource(adapter, repo, { now: NOW })
    expect(result.fetched).toBe(2)
    expect(result.normalized).toBe(1)
    expect(result.inserted).toBe(1)
  })
})
