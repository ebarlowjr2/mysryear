import { describe, it, expect } from 'vitest'
import { ingestSource } from './ingest'
import { refreshScholarships } from './refresh'
import { InMemoryScholarshipRepository, toDbPayload } from './repository'
import { normalizeImportRecord } from './normalize'
import { FixtureSourceAdapter, type FixtureScholarship } from './sources/fixture-source'
import type { NormalizedScholarshipRow, ScholarshipSourceAdapter } from './types'

const NOW = new Date('2026-08-03T00:00:00.000Z')
const NOW_ISO = NOW.toISOString()

function fx(overrides: Partial<FixtureScholarship>): FixtureScholarship {
  const externalId = overrides.externalId ?? 'ext'
  return {
    externalId,
    title: 'Test Scholarship',
    organization: 'Test Org',
    sourceUrl: `https://scholarships.example/${externalId}`,
    applicationUrl: `https://scholarships.example/${externalId}/apply`,
    deadline: '2027-12-31',
    active: true,
    lastVerifiedAt: NOW_ISO,
    ...overrides,
  }
}

// ---- Null-deadline ingestion (rolling / unknown) --------------------------

describe('null-deadline ingestion', () => {
  it('imports a rolling scholarship with deadline = NULL', async () => {
    const repo = new InMemoryScholarshipRepository()
    const result = await ingestSource(
      new FixtureSourceAdapter([fx({ externalId: 'roll', deadline: undefined, deadlineType: 'rolling' })]),
      repo,
      { now: NOW },
    )
    expect(result.inserted).toBe(1)
    expect(result.errors).toHaveLength(0)

    const row = normalizeImportRecord({
      source: 'fixture-dataset',
      externalId: 'roll',
      sourceUrl: 'https://scholarships.example/roll',
      title: 'Rolling Scholarship',
      organization: 'Org',
      applicationUrl: 'https://scholarships.example/roll/apply',
      deadlineType: 'rolling',
      active: true,
      lastVerifiedAt: NOW_ISO,
    })
    expect(row.deadline).toBeNull()
    expect(row.deadline_type).toBe('rolling')
    expect(row.deadline_at).toBeNull()
  })

  it('imports an unknown-deadline scholarship with deadline = NULL', async () => {
    const repo = new InMemoryScholarshipRepository()
    const result = await ingestSource(
      new FixtureSourceAdapter([fx({ externalId: 'unk', deadline: undefined })]),
      repo,
      { now: NOW },
    )
    expect(result.inserted).toBe(1)
    expect(result.errors).toHaveLength(0)
    const stored = await repo.loadExistingBySource('fixture-dataset')
    expect(stored.get('unk')?.active).toBe(true)
  })
})

// ---- Legacy link population ------------------------------------------------

function rowWith(overrides: Partial<NormalizedScholarshipRow>): NormalizedScholarshipRow {
  const base = normalizeImportRecord({
    source: 'fixture-dataset',
    externalId: 'a',
    sourceUrl: 'https://scholarships.example/a',
    title: 'A',
    organization: 'Org',
    applicationUrl: 'https://scholarships.example/a/apply',
    active: true,
    lastVerifiedAt: NOW_ISO,
  })
  return { ...base, ...overrides }
}

describe('legacy link population', () => {
  it('copies the provider (application) URL into the legacy link column', () => {
    const payload = toDbPayload(rowWith({}), NOW_ISO, true)
    expect(payload.link).toBe('https://scholarships.example/a/apply')
    // Canonical fields remain authoritative and present.
    expect(payload.application_url).toBe('https://scholarships.example/a/apply')
    expect(payload.canonical_url).toBeTruthy()
  })

  it('falls back to source_url when no application URL is present', () => {
    const payload = toDbPayload(rowWith({ application_url: '', source_url: 'https://scholarships.example/s' }), NOW_ISO, true)
    expect(payload.link).toBe('https://scholarships.example/s')
  })

  it('omits link when no usable URL exists, so an upsert never erases an existing link', () => {
    const payload = toDbPayload(rowWith({ application_url: '', source_url: '' }), NOW_ISO, false)
    expect('link' in payload).toBe(false)
  })

  it('populates link on updates/reactivations too (same payload builder, isInsert=false)', () => {
    const payload = toDbPayload(rowWith({}), NOW_ISO, false)
    expect(payload.link).toBe('https://scholarships.example/a/apply')
  })
})

// ---- Duplicate classification ---------------------------------------------

describe('duplicate classification (not a failure)', () => {
  it('counts duplicates as skipped, not failed, and reports success', async () => {
    const repo = new InMemoryScholarshipRepository()
    const dupUrl = 'https://scholarships.example/dupe/apply'
    const result = await refreshScholarships(
      new FixtureSourceAdapter([
        fx({ externalId: 'a', applicationUrl: dupUrl }),
        fx({ externalId: 'b', applicationUrl: `${dupUrl}?utm_source=x` }),
      ]),
      repo,
      { trigger: 'manual', now: NOW },
    )
    expect(result.created).toBe(1)
    expect(result.duplicates).toBe(1)
    expect(result.failed).toBe(0)
    expect(result.status).toBe('success')
  })

  it('a duplicates-only run reports success', async () => {
    const repo = new InMemoryScholarshipRepository()
    // Seed one, then re-import the same twice (one unchanged + one duplicate).
    await refreshScholarships(new FixtureSourceAdapter([fx({ externalId: 'a' })]), repo, {
      trigger: 'scheduled',
      now: NOW,
    })
    const result = await refreshScholarships(
      new FixtureSourceAdapter([fx({ externalId: 'a' }), fx({ externalId: 'a' })]),
      repo,
      { trigger: 'scheduled', now: NOW },
    )
    expect(result.duplicates).toBe(1)
    expect(result.failed).toBe(0)
    expect(result.status).toBe('success')
  })

  it('imports-plus-duplicates run does not report partial failure', async () => {
    const repo = new InMemoryScholarshipRepository()
    const result = await refreshScholarships(
      new FixtureSourceAdapter([
        fx({ externalId: 'a' }),
        fx({ externalId: 'b' }),
        fx({ externalId: 'a' }), // duplicate of a
      ]),
      repo,
      { trigger: 'scheduled', now: NOW },
    )
    expect(result.created).toBe(2)
    expect(result.duplicates).toBe(1)
    expect(result.status).toBe('success')
  })

  it('genuine source failure still reports failed', async () => {
    const failing: ScholarshipSourceAdapter = {
      sourceName: 'flaky',
      async fetchRecords() {
        throw new Error('provider unavailable')
      },
      normalizeRecord: () => null,
    }
    const repo = new InMemoryScholarshipRepository()
    const result = await refreshScholarships(failing, repo, { trigger: 'scheduled', now: NOW })
    expect(result.failed).toBeGreaterThan(0)
    expect(result.status).toBe('failed')
  })

  it('genuine database insert error reports a failure', async () => {
    const repo = new InMemoryScholarshipRepository()
    repo.insert = async () => {
      throw new Error('db down')
    }
    const result = await refreshScholarships(new FixtureSourceAdapter([fx({ externalId: 'a' })]), repo, {
      trigger: 'scheduled',
      now: NOW,
    })
    expect(result.failed).toBeGreaterThan(0)
    // No successful writes -> failed status.
    expect(result.status).toBe('failed')
  })
})

// ---- Reactivation tracking -------------------------------------------------

describe('reactivation tracking', () => {
  it('classifies a re-activated record separately from a normal update', async () => {
    const repo = new InMemoryScholarshipRepository()
    // Import as expired (past deadline) -> archived/inactive on import.
    await refreshScholarships(new FixtureSourceAdapter([fx({ externalId: 'a', deadline: '2024-01-01' })]), repo, {
      trigger: 'scheduled',
      now: NOW,
    })
    // Reappears with a future deadline -> reactivated (not a plain update).
    const result = await refreshScholarships(
      new FixtureSourceAdapter([fx({ externalId: 'a', deadline: '2027-06-01' })]),
      repo,
      { trigger: 'scheduled', now: NOW },
    )
    expect(result.reactivated).toBe(1)
    expect(result.status).toBe('success')
    const stored = await repo.loadExistingBySource('fixture-dataset')
    expect(stored.get('a')?.active).toBe(true)
  })
})
