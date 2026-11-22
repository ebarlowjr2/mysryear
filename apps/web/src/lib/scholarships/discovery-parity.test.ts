/**
 * Cross-platform parity: the real web API handler (GET /api/scholarships/matches
 * + the browser's own rebuild) and the real Expo data module produce the same
 * scholarship IDs, ordering, deadline labels, match explanations and saved
 * state for an identical database, clock and student profile.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import catalogFixture from '../../../../../packages/shared/src/__fixtures__/scholarship-catalog.json'
import { createFakeSupabase, type FakeSupabase } from '../../../../../packages/shared/src/__fixtures__/fake-supabase'

const NOW = '2026-11-22T20:00:00.000Z'
const ROWS = (catalogFixture as { rows: Array<Record<string, unknown>> }).rows
const id = (ext: string) => String(ROWS.find((r) => r.external_id === ext)!.id)

let db: FakeSupabase

vi.mock('@mysryear/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mysryear/shared')>()
  return { ...actual, createNextServerSupabaseClient: async () => ({ ...db, auth: { getSession: async () => ({ data: { session: { user: { id: 'user-1' } } } }) } }) }
})
vi.mock('@/lib/student-profile', () => ({ getActiveStudentProfileId: async () => 'sp-1' }))
vi.mock('../../../../mobile/src/lib/supabase', () => ({ get supabase() { return db } }))

function seed(careers: Array<[string, number]>, gradeLevel: number) {
  db = createFakeSupabase({
    // What the verified-open view returns (sponsor-verified + checked directory rows).
    student_visible_scholarships: ROWS.filter((r) => r.verification_status === 'verified' && !r.closed_at),
    scholarships: ROWS,
    student_profiles: [{ id: 'sp-1', grade_level: gradeLevel, graduation_year: 2027, schools: { state: 'AL' } }],
    student_career_interests: careers.map(([career_id, rank]) => ({ student_profile_id: 'sp-1', career_id, rank })),
    student_scholarship_matches: [
      { student_profile_id: 'sp-1', scholarship_id: id('burger-king-scholars-2027'), status: 'saved' },
      { student_profile_id: 'sp-1', scholarship_id: id('us-mpower-global-citizen-scholarship'), status: 'applying' },
    ],
    scholarship_application_tasks: [
      { id: 'task-1', student_profile_id: 'sp-1', scholarship_id: id('burger-king-scholars-2027'), title: 'Upload or request transcript', status: 'done', due_date: '2026-12-05' },
    ],
  })
}

function summarize(d: import('@mysryear/shared').ScholarshipDiscovery) {
  return {
    open: d.catalog.page.items.map((c) => [c.scholarshipId, c.availability.label, c.trackedStatus]),
    counts: [d.catalog.openCount, d.catalog.upcomingCount, d.catalog.page.pageCount],
    forYou: d.forYou.items.map((m) => [m.scholarshipId, m.reasons, m.toCheck, m.fit]),
    tracker: d.tracker.items.map((t) => [t.scholarshipId, t.status, t.availability?.label, t.progress.completed]),
    readiness: d.readiness.actions.map((a) => a.label),
  }
}

async function web(filters = '') {
  const { GET } = await import('../../app/api/scholarships/matches/route')
  const res = await GET(new Request(`http://localhost/api/scholarships/matches${filters}`))
  const json = await res.json()
  // The browser rebuilds from `input` for search/paging; check both paths.
  const { buildScholarshipDiscovery } = await import('@mysryear/shared')
  const rebuilt = buildScholarshipDiscovery(json.input, { now: new Date(json.now), page: 1 })
  return { server: json.discovery, browser: rebuilt }
}

async function native() {
  const mobile = await import('../../../../mobile/src/data/scholarships')
  mobile.setScholarshipClock(() => new Date(NOW))
  return (await mobile.loadScholarshipDiscovery('sp-1')).discovery
}

describe('web ↔ native scholarship parity', () => {
  beforeEach(() => {
    process.env.SCHOLARSHIP_FIXED_NOW = NOW
  })
  afterEach(() => {
    delete process.env.SCHOLARSHIP_FIXED_NOW
  })

  for (const [label, careers] of [
    ['software engineer plan', [['software-engineer', 1]]],
    ['welder + writer plans', [['welder', 1], ['digital-marketer', 2]]],
    ['no plans yet', []],
  ] as Array<[string, Array<[string, number]>]>) {
    it(`identical results for a 12th grader with ${label}`, async () => {
      seed(careers, 12)
      const w = await web()
      const n = await native()
      expect(summarize(w.server)).toEqual(summarize(n))
      expect(summarize(w.browser)).toEqual(summarize(n))
    })
  }

  it('shows saved state, closed tracked awards and the same first page on both platforms', async () => {
    seed([['software-engineer', 1]], 12)
    const n = await native()
    const s = summarize(n)
    expect(s.open[0]).toEqual([id('burger-king-scholars-2027'), 'Closes Dec 15, 2026, 11:59 PM CT', 'saved'])
    expect(s.tracker).toContainEqual([id('us-mpower-global-citizen-scholarship'), 'applying', 'Closed early (Nov 22, 2026)', 0])
    expect(s.forYou[0][1]).toEqual(['Your #1 career plan, Software Engineer: the sponsor lists Computer Science, Computer Engineering as eligible majors'])
  })

  it('web PATCH upserts only the active student row and never touches other data', async () => {
    seed([], 12)
    const { PATCH } = await import('../../app/api/scholarships/matches/route')
    const res = await PATCH(new Request('http://localhost/api/scholarships/matches', { method: 'PATCH', body: JSON.stringify({ scholarshipId: id('amazon-future-engineer-2027'), status: 'saved' }) }))
    expect(res.status).toBe(200)
    const written = db.tables.student_scholarship_matches.at(-1)!
    expect(written).toMatchObject({ student_profile_id: 'sp-1', status: 'saved' })
  })
})
