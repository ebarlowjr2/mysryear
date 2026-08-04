import { describe, it, expect } from 'vitest'
import { refreshScholarships } from './refresh'
import { InMemoryScholarshipRepository } from './repository'
import { FixtureSourceAdapter, type FixtureScholarship } from './sources/fixture-source'

function fx(overrides: Partial<FixtureScholarship>): FixtureScholarship {
  return {
    externalId: 'ext',
    title: 'Test Scholarship',
    organization: 'Test Org',
    sourceUrl: 'https://scholarships.example/s',
    applicationUrl: 'https://scholarships.example/s/apply',
    deadline: '2026-12-31',
    active: true,
    lastVerifiedAt: '2026-07-21T00:00:00.000Z',
    ...overrides,
  }
}

describe('refreshScholarships', () => {
  it('imports new records and records a run in the log', async () => {
    const repo = new InMemoryScholarshipRepository()
    const adapter = new FixtureSourceAdapter([
      fx({ externalId: 'a' }),
      fx({ externalId: 'b', applicationUrl: 'https://scholarships.example/b/apply' }),
    ])
    const result = await refreshScholarships(adapter, repo, {
      trigger: 'scheduled',
      now: new Date('2026-07-21T00:00:00.000Z'),
    })
    expect(result.created).toBe(2)
    expect(result.status).toBe('success')
    expect(repo.runLog).toHaveLength(1)
    expect(repo.runLog[0]?.created_count).toBe(2)
    expect(repo.runLog[0]?.trigger).toBe('scheduled')
  })

  it('archives existing records whose deadline has passed (independent sweep)', async () => {
    const repo = new InMemoryScholarshipRepository()
    // First import a record with a (then) future deadline.
    await refreshScholarships(new FixtureSourceAdapter([fx({ externalId: 'a', deadline: '2026-08-01' })]), repo, {
      trigger: 'scheduled',
      now: new Date('2026-07-21T00:00:00.000Z'),
    })
    // Later, with no new source data, the sweep archives it once expired.
    const result = await refreshScholarships(new FixtureSourceAdapter([]), repo, {
      trigger: 'scheduled',
      now: new Date('2026-09-01T00:00:00.000Z'),
    })
    expect(result.archived).toBeGreaterThanOrEqual(1)
    const stored = await repo.loadExistingBySource('fixture-dataset')
    expect(stored.get('a')?.active).toBe(false)
    expect(stored.get('a')?.lifecycle_status).toBe('expired')
  })

  it('collapses duplicate application URLs and reports them', async () => {
    const repo = new InMemoryScholarshipRepository()
    const dupUrl = 'https://scholarships.example/dupe/apply'
    const result = await refreshScholarships(
      new FixtureSourceAdapter([
        fx({ externalId: 'a', applicationUrl: dupUrl }),
        fx({ externalId: 'b', applicationUrl: `${dupUrl}?utm_source=x` }),
      ]),
      repo,
      { trigger: 'manual', now: new Date('2026-07-21T00:00:00.000Z') },
    )
    expect(result.created).toBe(1)
    expect(result.duplicates).toBe(1)
  })

  it('dry-run makes no writes and records no run', async () => {
    const repo = new InMemoryScholarshipRepository()
    const result = await refreshScholarships(new FixtureSourceAdapter([fx({ externalId: 'a' })]), repo, {
      trigger: 'dry_run',
      dryRun: true,
      now: new Date('2026-07-21T00:00:00.000Z'),
    })
    expect(result.dryRun).toBe(true)
    expect(result.created).toBe(1) // proposed
    const stored = await repo.loadExistingBySource('fixture-dataset')
    expect(stored.size).toBe(0)
    expect(repo.runLog).toHaveLength(0)
  })

  it('reactivates an archived scholarship when it reappears with a future deadline', async () => {
    const repo = new InMemoryScholarshipRepository()
    // Import as already-expired (past deadline) -> archived on import.
    await refreshScholarships(new FixtureSourceAdapter([fx({ externalId: 'a', deadline: '2024-01-01' })]), repo, {
      trigger: 'scheduled',
      now: new Date('2026-07-21T00:00:00.000Z'),
    })
    let stored = await repo.loadExistingBySource('fixture-dataset')
    expect(stored.get('a')?.active).toBe(false)

    // Reappears with a new future deadline -> updated & reactivated.
    const result = await refreshScholarships(
      new FixtureSourceAdapter([fx({ externalId: 'a', deadline: '2027-05-01' })]),
      repo,
      { trigger: 'scheduled', now: new Date('2026-07-21T00:00:00.000Z') },
    )
    // Reactivation is tracked separately from a plain update.
    expect(result.reactivated).toBe(1)
    expect(result.updated).toBe(0)
    stored = await repo.loadExistingBySource('fixture-dataset')
    expect(stored.get('a')?.active).toBe(true)
    expect(stored.get('a')?.lifecycle_status).toBe('active')
  })
})
