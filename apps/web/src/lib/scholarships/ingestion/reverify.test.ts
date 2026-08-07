import { describe, it, expect } from 'vitest'
import { ingestSource } from './ingest'
import { refreshScholarships } from './refresh'
import { InMemoryScholarshipRepository } from './repository'
import { FixtureSourceAdapter, type FixtureScholarship } from './sources/fixture-source'
import { isVisibleToStudents } from './freshness'

const DAY0 = new Date('2026-08-03T00:00:00.000Z')
const DAY20 = new Date('2026-08-23T00:00:00.000Z')
const DAY40 = new Date('2026-09-12T00:00:00.000Z')

function rolling(overrides: Partial<FixtureScholarship> = {}): FixtureScholarship {
  return {
    externalId: 'roll',
    title: 'Rolling Scholarship',
    organization: 'Org',
    sourceUrl: 'https://scholarships.example/roll',
    applicationUrl: 'https://scholarships.example/roll/apply',
    deadline: undefined, // unknown/rolling -> deadline NULL
    active: true,
    lastVerifiedAt: DAY0.toISOString(),
    ...overrides,
  }
}

describe('re-observed records are re-verified (freshness touch)', () => {
  it('refreshes last_verified_at for an unchanged record and counts it revalidated', async () => {
    const repo = new InMemoryScholarshipRepository()
    const adapter = new FixtureSourceAdapter([rolling()])

    // Day 0 import.
    const first = await ingestSource(adapter, repo, { now: DAY0 })
    expect(first.inserted).toBe(1)
    const afterImport = repo.peek('fixture-dataset', 'roll')
    expect(afterImport?.last_verified_at).toBe(DAY0.toISOString())

    // Day 20 refresh: same content -> unchanged, but re-verified (timestamp moves).
    const second = await ingestSource(adapter, repo, { now: DAY20 })
    expect(second.unchanged).toBe(1)
    expect(second.updated).toBe(0)
    expect(second.revalidated).toBe(1)
    const afterTouch = repo.peek('fixture-dataset', 'roll')
    expect(afterTouch?.last_verified_at).toBe(DAY20.toISOString())
    expect(afterTouch?.verification_status).toBe('verified')
  })

  it('keeps a rolling scholarship visible past 30 days when refreshed on schedule', async () => {
    const repo = new InMemoryScholarshipRepository()
    const adapter = new FixtureSourceAdapter([rolling()])
    await ingestSource(adapter, repo, { now: DAY0 })

    // Without any refresh, by day 40 the day-0 verification is stale (>30d) -> hidden.
    const stale = repo.peek('fixture-dataset', 'roll')!
    expect(isVisibleToStudents(stale, { now: DAY40 })).toBe(false)

    // A refresh on day 20 re-verifies it, so on day 40 it is still within 30 days.
    await ingestSource(adapter, repo, { now: DAY20 })
    const fresh = repo.peek('fixture-dataset', 'roll')!
    expect(isVisibleToStudents(fresh, { now: DAY40 })).toBe(true)
  })

  it('dry-run reports proposed revalidations without writing', async () => {
    const repo = new InMemoryScholarshipRepository()
    const adapter = new FixtureSourceAdapter([rolling()])
    await ingestSource(adapter, repo, { now: DAY0 })

    const result = await refreshScholarships(adapter, repo, { trigger: 'dry_run', dryRun: true, now: DAY20 })
    expect(result.revalidated).toBe(1)
    // Timestamp unchanged because dry-run makes no writes.
    expect(repo.peek('fixture-dataset', 'roll')?.last_verified_at).toBe(DAY0.toISOString())
  })
})
