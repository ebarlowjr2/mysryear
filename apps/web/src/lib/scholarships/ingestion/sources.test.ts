import { describe, expect, it } from 'vitest'
import { ingestSource } from './ingest'
import { refreshScholarships } from './refresh'
import { InMemoryScholarshipRepository } from './repository'
import { normalizeDeadline, normalizeImportRecord } from './normalize'
import { isVisibleToStudents } from './freshness'
import { LegacyScrapedSourceAdapter } from './sources/legacy-scraped-source'
import { SponsorVerifiedSourceAdapter, type SponsorVerifiedDataset } from './sources/sponsor-verified-source'
import { OpenScholarshipsSourceAdapter, type SponsorChecks } from './sources/open-scholarships-source'
import sponsorVerified from './data/sponsor-verified.json'
import checksFile from './data/open-scholarships-sponsor-checks.json'
import snapshot from './data/open-scholarships-snapshot.json'

const NOW = new Date('2026-11-22T20:00:00.000Z')
const sponsor = () => new SponsorVerifiedSourceAdapter(() => sponsorVerified as unknown as SponsorVerifiedDataset)
const checks = (checksFile as { checks: SponsorChecks }).checks
const openScholarships = (load: () => Promise<unknown> = async () => snapshot) => new OpenScholarshipsSourceAdapter(load, checks)

describe('legacy bridge regressions (production root cause)', () => {
  it('never turns a yearless deadline into 2001', () => {
    expect(normalizeDeadline('September 30')).toBeNull()
    expect(normalizeDeadline('October 15, 2026')).toBe('2026-10-15')
    expect(normalizeDeadline('2027-01-05')).toBe('2027-01-05')
  })

  it('stores cached legacy rows as unverified leads with the scrape time, not "verified now"', async () => {
    const rows = [{ id: 'l1', name: 'Coca-Cola Scholars Program Scholarship', amount: '$20,000', deadline: 'September 30', link: 'https://www.scholarships.com/x', source: 'scholarships.com', scraped_at: '2025-09-20T06:15:51.000Z' }]
    const repo = new InMemoryScholarshipRepository()
    const adapter = new LegacyScrapedSourceAdapter(async () => rows)
    await ingestSource(adapter, repo, { now: NOW })
    const stored = Array.from((await repo.loadExistingBySource('legacy-scraped')).keys()).map((k) => repo.peek('legacy-scraped', k)!)[0]
    expect(stored.deadline).toBeNull()
    expect(stored.deadline_type).toBe('unknown')
    expect(stored.verification_status).toBe('unverified')
    expect(stored.last_verified_at).toBe('2025-09-20T06:15:51.000Z')
    expect(isVisibleToStudents(stored, { now: NOW })).toBe(false)
    const again = await ingestSource(adapter, repo, { now: new Date('2026-11-23T00:00:00Z') })
    expect(again.revalidated).toBe(0)
  })
})

describe('source 1: sponsor-verified feed', () => {
  it('imports every entry as verified with its sponsor-page check date and sponsor time zone', async () => {
    const repo = new InMemoryScholarshipRepository()
    const result = await ingestSource(sponsor(), repo, { now: NOW })
    expect(result).toMatchObject({ fetched: 5, inserted: 5, rejected: 0 })
    const bk = repo.peek('mysryear-sponsor-verified', 'burger-king-scholars-2027')!
    expect(bk.last_verified_at).toBe('2026-11-22T18:00:00.000Z')
    expect(bk.deadline_at).toBe('2026-12-16T05:59:59.000Z')
    expect(bk.early_closure_note).toMatch(/30,000/)
    const afe = repo.peek('mysryear-sponsor-verified', 'amazon-future-engineer-2027')!
    expect(afe.deadline_at).toBe('2027-01-05T21:00:00.000Z') // 3:00 PM CST
    expect(afe.opens_at).toBe('2026-11-03T06:00:00.000Z')
  })

  it('reimporting creates no duplicates and does not refresh verification without new evidence', async () => {
    const repo = new InMemoryScholarshipRepository()
    await ingestSource(sponsor(), repo, { now: NOW })
    const before = repo.snapshot().map((r) => r.id)
    const again = await ingestSource(sponsor(), repo, { now: new Date('2026-12-01T00:00:00Z') })
    expect(again).toMatchObject({ inserted: 0, updated: 0, unchanged: 5, revalidated: 0 })
    expect(repo.snapshot().map((r) => r.id)).toEqual(before)
  })
})

describe('source 2: Open Scholarships (CC BY 4.0) with sponsor checks', () => {
  it('shows only current-cycle sponsor-checked listings; annual listings stay unconfirmed', async () => {
    const repo = new InMemoryScholarshipRepository()
    const result = await ingestSource(openScholarships(), repo, { now: NOW })
    expect(result.fetched).toBe(112)
    expect(result.rejected).toBe(0)
    const rows = Array.from((await repo.loadExistingBySource('open-scholarships')).keys()).map((k) => repo.peek('open-scholarships', k)!)
    const visible = rows.filter((r) => isVisibleToStudents(r, { now: NOW }) && r.verification_status === 'verified' && !r.closed_at)
    expect(visible.map((r) => r.external_id).sort()).toEqual([
      'nv-nevada-womens-fund-scholarships',
      'us-apia-scholars-scholarship',
      'us-nsa-scholarship-foundation-scholarship',
    ])
    const nwf = repo.peek('open-scholarships', 'nv-nevada-womens-fund-scholarships')!
    expect(nwf.deadline).toBe('2027-01-03') // sponsor date wins over the directory's 2027-01-05
    expect(nwf.attribution).toMatch(/CC BY 4\.0/)
    expect(repo.peek('open-scholarships', 'us-mpower-global-citizen-scholarship')!.closed_at).toBeTruthy()
    expect(repo.peek('open-scholarships', 'us-american-welding-society-scholarships')!.verification_status).toBe('needs_review')
    expect(repo.peek('open-scholarships', 'us-amazon-future-engineer-scholarship')!.verification_status).toBe('needs_review')
    expect(rows.filter((r) => r.verification_status === 'unverified').length).toBeGreaterThan(90)
  })
})

describe('provider isolation', () => {
  it('a failed provider leaves the other provider’s listings intact, even with deactivateMissing', async () => {
    const repo = new InMemoryScholarshipRepository()
    await refreshScholarships(sponsor(), repo, { now: NOW })
    await refreshScholarships(openScholarships(), repo, { now: NOW })

    const failing = openScholarships(async () => {
      throw new Error('feed HTTP 503')
    })
    const failed = await refreshScholarships(failing, repo, { now: NOW, deactivateMissing: true })
    expect(failed.status).toBe('failed')
    expect(failed.errors[0].message).toMatch(/503/)

    const sponsorRows = repo.snapshot().filter((r) => r.external_id.endsWith('-2027'))
    expect(sponsorRows).toHaveLength(5)
    expect(sponsorRows.every((r) => r.active)).toBe(true)
    // The failed provider's own previously-imported rows are not retired either.
    expect(repo.peek('open-scholarships', 'us-apia-scholars-scholarship')).toBeTruthy()
    expect((await repo.loadExistingBySource('open-scholarships')).get('us-apia-scholars-scholarship')?.active).toBe(true)
  })

  it('rejects placeholder example.com awards outright', () => {
    const row = normalizeImportRecord({
      source: 'x', externalId: 'demo', sourceUrl: 'https://example.com/s/1', applicationUrl: 'https://example.com/s/1',
      title: 'First-Gen Scholars Award', organization: 'Demo', active: true, lastVerifiedAt: NOW.toISOString(),
    })
    expect(row.is_demo).toBe(true)
  })
})
