import { describe, it, expect } from 'vitest'
import { ingestSource } from './ingest'
import { refreshScholarships } from './refresh'
import { InMemoryScholarshipRepository } from './repository'
import { FixtureSourceAdapter, type FixtureScholarship } from './sources/fixture-source'
import { isVisibleToStudents } from './freshness'
import { decideFromPage, dateVariants, reverifyCandidates } from './reverify'

const DAY0 = new Date('2026-08-03T00:00:00.000Z')
const DAY20 = new Date('2026-08-23T00:00:00.000Z')
const DAY40 = new Date('2026-09-12T00:00:00.000Z')

function rolling(overrides: Partial<FixtureScholarship> = {}): FixtureScholarship {
  return {
    externalId: 'roll',
    title: 'Rolling Scholarship',
    organization: 'Org',
    sourceUrl: 'https://scholarships.sponsor.test/roll',
    applicationUrl: 'https://scholarships.sponsor.test/roll/apply',
    deadlineType: 'rolling',
    active: true,
    lastVerifiedAt: DAY0.toISOString(),
    ...overrides,
  }
}

describe('verification moves only on fresh source evidence', () => {
  it('re-reading an unchanged cached record does NOT refresh last_verified_at', async () => {
    const repo = new InMemoryScholarshipRepository()
    const adapter = new FixtureSourceAdapter([rolling()])
    expect((await ingestSource(adapter, repo, { now: DAY0 })).inserted).toBe(1)

    // Day 20: same record, same evidence date -> unchanged, not revalidated.
    const second = await ingestSource(adapter, repo, { now: DAY20 })
    expect(second.unchanged).toBe(1)
    expect(second.revalidated).toBe(0)
    expect(repo.peek('fixture-dataset', 'roll')?.last_verified_at).toBe(DAY0.toISOString())
  })

  it('a re-read rolling award ages out after 30 days without new evidence', async () => {
    const repo = new InMemoryScholarshipRepository()
    const adapter = new FixtureSourceAdapter([rolling()])
    await ingestSource(adapter, repo, { now: DAY0 })
    await ingestSource(adapter, repo, { now: DAY20 })
    expect(isVisibleToStudents(repo.peek('fixture-dataset', 'roll')!, { now: DAY40 })).toBe(false)
  })

  it('newer source evidence advances verification to the EVIDENCE time, not the run time', async () => {
    const repo = new InMemoryScholarshipRepository()
    await ingestSource(new FixtureSourceAdapter([rolling()]), repo, { now: DAY0 })
    const evidence = '2026-08-20T15:00:00.000Z'
    const second = await ingestSource(new FixtureSourceAdapter([rolling({ lastVerifiedAt: evidence })]), repo, { now: DAY20 })
    expect(second.revalidated).toBe(1)
    const stored = repo.peek('fixture-dataset', 'roll')!
    expect(stored.last_verified_at).toBe(evidence)
    expect(isVisibleToStudents(stored, { now: DAY40 })).toBe(true)
  })

  it('dry-run reports proposed revalidations without writing', async () => {
    const repo = new InMemoryScholarshipRepository()
    await ingestSource(new FixtureSourceAdapter([rolling()]), repo, { now: DAY0 })
    const adapter = new FixtureSourceAdapter([rolling({ lastVerifiedAt: DAY20.toISOString() })])
    const result = await refreshScholarships(adapter, repo, { trigger: 'dry_run', dryRun: true, now: DAY20 })
    expect(result.revalidated).toBe(1)
    expect(repo.peek('fixture-dataset', 'roll')?.last_verified_at).toBe(DAY0.toISOString())
  })

  it('a record with no evidence date is stored unconfirmed and hidden', async () => {
    const repo = new InMemoryScholarshipRepository()
    await ingestSource(new FixtureSourceAdapter([rolling({ lastVerifiedAt: undefined })]), repo, { now: DAY0 })
    const stored = repo.peek('fixture-dataset', 'roll')!
    expect(stored.last_verified_at).toBeNull()
    expect(stored.verification_status).toBe('unverified')
    expect(isVisibleToStudents(stored, { now: DAY0 })).toBe(false)
  })
})

describe('sponsor-page reverification', () => {
  const NOW = new Date('2026-12-01T12:00:00.000Z')
  const candidate = {
    id: 's1',
    source: 'mysryear-sponsor-verified',
    source_url: 'https://sponsor.test/award',
    deadline: '2027-01-05',
    last_verified_at: '2026-11-22T18:00:00.000Z',
  }

  it('prints every common sponsor date format', () => {
    expect(dateVariants('2027-01-05')).toEqual(
      expect.arrayContaining(['january 5, 2027', 'jan 5, 2027', 'january 5th, 2027', '1/5/2027', '01/05/2027', '2027-01-05']),
    )
  })

  it('confirms (and stamps now) only when the page still publishes the closing date', () => {
    const d = decideFromPage(candidate, { status: 200, text: '<p>Applications Open - Deadline January 5, 2027 3:00 PM CT</p>' }, NOW)
    expect(d.outcome).toBe('confirmed')
    expect(d.patch).toMatchObject({ last_verified_at: NOW.toISOString(), verification_status: 'verified' })
  })

  it('keeps stored evidence when the date is missing from the page', () => {
    const d = decideFromPage(candidate, { status: 200, text: '<p>Check back soon for next year.</p>' }, NOW)
    expect(d.outcome).toBe('no_evidence')
    expect(d.patch).toBeNull()
  })

  it('flags early closure for review instead of refreshing', () => {
    const d = decideFromPage(
      candidate,
      { status: 200, text: 'Deadline January 5, 2027. We have reached our scholarship funding capacity for 2026 and are temporarily not accepting new applications.' },
      NOW,
    )
    expect(d.outcome).toBe('closure_reported')
    expect(d.patch).toEqual({ verification_status: 'needs_review' })
  })

  it('marks 404/410 as broken and leaves other HTTP errors untouched', async () => {
    const decisions = await reverifyCandidates(
      [candidate, { ...candidate, id: 's2' }, { ...candidate, id: 's3' }],
      async () => {
        throw new Error('network down')
      },
      { now: NOW },
    )
    expect(decisions.every((d) => d.outcome === 'fetch_error' && d.patch === null)).toBe(true)
    expect(decideFromPage(candidate, { status: 404, text: '' }, NOW).outcome).toBe('broken')
    expect(decideFromPage(candidate, { status: 503, text: '' }, NOW).patch).toBeNull()
  })
})
