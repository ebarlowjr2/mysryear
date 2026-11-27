import { describe, expect, it } from 'vitest'
import catalogFixture from './__fixtures__/scholarship-catalog.json'
import { createFakeSupabase } from './__fixtures__/fake-supabase'
import {
  buildScholarshipDetail,
  buildScholarshipDiscovery,
  formatAwardAmount,
  scholarshipAvailability,
  scholarshipGradeLevel,
  toCatalogEntry,
  usZoneOffsetHours,
  type ScholarshipDiscoveryInput,
} from './scholarship-discovery'
import { loadScholarshipDiscoveryInput } from './scholarship-discovery-data'
import type { StudentScholarshipProfile } from './scholarships'

const NOW = new Date('2026-11-22T20:00:00.000Z')
const ROWS = (catalogFixture as { rows: Array<Record<string, unknown>> }).rows
const byExternal = (externalId: string) => ROWS.find((r) => r.external_id === externalId)!
const idOf = (externalId: string) => String(byExternal(externalId).id)

function student(overrides: Partial<StudentScholarshipProfile> = {}): StudentScholarshipProfile {
  return {
    academicHealthScore: 0,
    portfolioReadinessScore: 0,
    gpa: null,
    gradeLevel: 12,
    state: null,
    volunteerHours: 0,
    activitiesCount: 0,
    achievementsCount: 0,
    certifications: [],
    careerInterests: [],
    careerCategories: [],
    uploadedDocumentContexts: [],
    hasResume: false,
    hasTranscript: false,
    hasRecommendation: false,
    hasFafsa: false,
    ...overrides,
  }
}

function input(overrides: Partial<ScholarshipDiscoveryInput> = {}): ScholarshipDiscoveryInput {
  return { catalogRows: ROWS, catalogError: null, tracked: [], trackedRows: [], tasks: [], student: student(), plan: { careerIds: [] }, ...overrides }
}

describe('verified-open catalog', () => {
  it('a sparse profile (no GPA, no careers, 0% readiness) still browses every verified open award', () => {
    const d = buildScholarshipDiscovery(input(), { now: NOW, pageSize: 50 })
    const titles = d.catalog.page.items.map((c) => c.entry.title)
    expect(d.readiness.percentage).toBe(0)
    expect(d.catalog.state).toBe('ok')
    // Open now: BK, GE-Reagan, AFE, PRH, APIA, Nevada Women's Fund. Opening soon: Central AlabamaWorks, NSA.
    expect(d.catalog.openCount).toBe(6)
    expect(d.catalog.upcomingCount).toBe(2)
    expect(titles.slice(0, 6)).toEqual([
      'BURGER KING Scholars Program',
      "Nevada Women's Fund Scholarships",
      'Amazon Future Engineer Scholarship',
      'GE-Reagan Foundation Scholarship Program',
      'Penguin Random House Creative Writing Awards', // Jan 15, 3:00 PM CT
      'APIA Scholars Scholarship', // Jan 15, 11:59 PM ET (later instant)
    ])
    expect(titles.slice(6)).toEqual(['Central AlabamaWorks Scholarship', 'NSA Scholarship Foundation Scholarship'])
    // Never shown: annual listings without a sponsor check, conflicting pages, duplicates, early-closed awards.
    for (const hidden of ['MPOWER', 'American Welding', '100 Black Men', 'Bryan Cameron']) {
      expect(titles.some((t) => t.includes(hidden))).toBe(false)
    }
    expect(titles.filter((t) => t.includes('Amazon Future Engineer'))).toHaveLength(1)
  })

  it('renders sponsor deadlines in the sponsor time zone with the year', () => {
    const bk = toCatalogEntry(byExternal('burger-king-scholars-2027'))
    expect(bk.deadlineAt).toBe('2026-12-16T05:59:59.000Z') // 11:59 PM CST
    expect(scholarshipAvailability(bk, NOW).label).toBe('Closes Dec 15, 2026, 11:59 PM CT')
    const reagan = toCatalogEntry(byExternal('ge-reagan-foundation-2027'))
    expect(scholarshipAvailability(reagan, NOW).label).toBe('Closes Jan 7, 2027, 3:00 PM ET')
    expect(formatAwardAmount(reagan)).toBe('$10,000 per year, renewable up to $40,000')
    expect(usZoneOffsetHours('America/Chicago', Date.parse('2026-07-01T12:00:00Z'))).toBe(-5)
    expect(usZoneOffsetHours('America/Chicago', Date.parse('2026-12-01T12:00:00Z'))).toBe(-6)
  })

  it('closes exactly at the sponsor instant and keeps early-closure conditions visible', () => {
    const bk = toCatalogEntry(byExternal('burger-king-scholars-2027'))
    expect(scholarshipAvailability(bk, new Date('2026-12-16T05:59:00Z')).state).toBe('open')
    expect(scholarshipAvailability(bk, new Date('2026-12-16T05:59:59Z')).state).toBe('closed')
    const after = buildScholarshipDiscovery(input(), { now: new Date('2026-12-16T06:00:00Z'), pageSize: 50 })
    expect(after.catalog.page.items.map((c) => c.entry.title)).not.toContain('BURGER KING Scholars Program')

    const prh = buildScholarshipDiscovery(input(), { now: NOW, pageSize: 50 }).catalog.page.items.find((c) => c.entry.title.startsWith('Penguin'))!
    expect(prh.entry.earlyClosureNote).toMatch(/1,000 applications/)
    const mpower = toCatalogEntry(byExternal('us-mpower-global-citizen-scholarship'))
    expect(scholarshipAvailability(mpower, NOW).state).toBe('closed_early')
  })

  it('upcoming windows are labeled and become open on the opening date', () => {
    const cacf = toCatalogEntry(byExternal('central-alabamaworks-2027'))
    expect(scholarshipAvailability(cacf, NOW)).toMatchObject({ state: 'upcoming', canApply: false, label: 'Opens Dec 1, 2026 · closes Mar 1, 2027' })
    expect(scholarshipAvailability(cacf, new Date('2026-12-01T06:00:00Z'))).toMatchObject({ state: 'open', canApply: true })
  })

  it('searches and filters by text, location, field, deadline and level', () => {
    const f = (filters: Parameters<typeof buildScholarshipDiscovery>[1]['filters']) =>
      buildScholarshipDiscovery(input(), { now: NOW, filters, pageSize: 50 }).catalog.page.items.map((c) => c.entry.title)
    expect(f({ query: 'poetry' })).toEqual(['Penguin Random House Creative Writing Awards'])
    expect(f({ state: 'AL' })).toContain('Central AlabamaWorks Scholarship')
    expect(f({ state: 'GA' })).not.toContain('Central AlabamaWorks Scholarship')
    expect(f({ field: 'computer-science' })).toEqual(['Amazon Future Engineer Scholarship'])
    expect(f({ deadlineWithinDays: 30 })).toEqual(['BURGER KING Scholars Program'])
    expect(f({ level: 'high-school' })).not.toContain('NSA Scholarship Foundation Scholarship')
    const none = buildScholarshipDiscovery(input(), { now: NOW, filters: { query: 'zzzz-no-such-award' } })
    expect(none.catalog.state).toBe('no-results')
  })

  it('pages past the old 100-row cutoff', () => {
    const many = Array.from({ length: 130 }, (_, i) => ({
      ...byExternal('burger-king-scholars-2027'),
      id: `00000000-0000-4000-a000-${String(i).padStart(12, '0')}`,
      title: `Synthetic Award ${String(i).padStart(3, '0')}`,
      deadline_at: new Date(Date.parse('2027-02-01T00:00:00Z') + i * 3600_000).toISOString(),
    }))
    const d = (page: number) => buildScholarshipDiscovery(input({ catalogRows: many }), { now: NOW, page })
    expect(d(1).catalog.page.total).toBe(130)
    expect(d(1).catalog.page.pageCount).toBe(11)
    expect(d(11).catalog.page.items.map((c) => c.entry.title)).toEqual(Array.from({ length: 10 }, (_, i) => `Synthetic Award ${120 + i}`))
  })

  it('distinguishes unavailable, empty and no-results states', () => {
    expect(buildScholarshipDiscovery(input({ catalogRows: [], catalogError: 'timeout' }), { now: NOW }).catalog.state).toBe('unavailable')
    expect(buildScholarshipDiscovery(input({ catalogRows: [] }), { now: NOW }).catalog.state).toBe('empty')
  })
})

describe('For your A.U.R.A. career plans', () => {
  it('needs interests: offers the picker and leaves browsing intact', () => {
    const d = buildScholarshipDiscovery(input(), { now: NOW })
    expect(d.forYou.state).toBe('needs-interests')
    expect(d.catalog.page.items.length).toBeGreaterThan(0)
  })

  it('two different career plans produce different, explained results', () => {
    const swe = buildScholarshipDiscovery(input({ plan: { careerIds: ['software-engineer'] } }), { now: NOW }).forYou
    const welder = buildScholarshipDiscovery(input({ plan: { careerIds: ['welder'] } }), { now: NOW }).forYou
    expect(swe.items.map((m) => m.entry.title)).toEqual(['Amazon Future Engineer Scholarship'])
    expect(swe.items[0].reasons[0]).toBe(
      'Your #1 career plan, Software Engineer: the sponsor lists Computer Science, Computer Engineering as eligible majors',
    )
    expect(swe.items[0].toCheck).toContain('Application asks for a recommendation, a transcript')
    expect(swe.disclaimer).toMatch(/not eligibility/)
    expect(welder.items.map((m) => m.entry.title)).toEqual(['Central AlabamaWorks Scholarship'])
    expect(welder.items[0].toCheck).toContain('Limited to AL — confirm where you live and go to school')
  })

  it('a 12th grader is treated as grade 12 (not coerced to 9) and a 10th grader is told to wait', () => {
    expect(scholarshipGradeLevel('12', null, NOW)).toBe(12)
    expect(scholarshipGradeLevel(null, 2027, NOW)).toBe(12)
    expect(scholarshipGradeLevel(null, 2029, NOW)).toBe(10)
    const senior = buildScholarshipDiscovery(input({ plan: { careerIds: ['software-engineer'] } }), { now: NOW }).forYou.items[0]
    expect(senior.fit).toBe('likely')
    expect(senior.toCheck.join(' ')).not.toMatch(/12th grade/)
    const sophomore = buildScholarshipDiscovery(input({ student: student({ gradeLevel: 10 }), plan: { careerIds: ['software-engineer'] } }), { now: NOW }).forYou.items[0]
    expect(sophomore.fit).toBe('not-yet')
    expect(sophomore.toCheck[0]).toBe('Open to high school seniors — you can apply in 12th grade (you are in grade 10)')
  })

  it('ranks by the order of saved plans and recomputes when plans change', () => {
    const a = buildScholarshipDiscovery(input({ plan: { careerIds: ['digital-marketer', 'software-engineer'] } }), { now: NOW }).forYou.items
    expect(a.map((m) => m.entry.title)[0]).toBe('Amazon Future Engineer Scholarship')
    expect(a.map((m) => m.entry.title)).toContain('Penguin Random House Creative Writing Awards')
    const b = buildScholarshipDiscovery(input({ plan: { careerIds: ['teacher'] } }), { now: NOW }).forYou
    expect(b.state).toBe('no-matches')
  })
})

describe('tracker', () => {
  it('keeps tracked awards (including closed ones) with status, tasks and dates', () => {
    const closedRow = { ...byExternal('burger-king-scholars-2027'), id: 'closed-award', title: 'Last Year Award', deadline: '2026-03-01', deadline_at: '2026-03-02T05:59:59.000Z' }
    const d = buildScholarshipDiscovery(
      input({
        tracked: [
          { scholarship_id: idOf('amazon-future-engineer-2027'), status: 'applying' },
          { scholarship_id: 'closed-award', status: 'submitted' },
        ],
        trackedRows: [closedRow],
        tasks: [{ id: 't1', scholarship_id: idOf('amazon-future-engineer-2027'), title: 'Request recommendation letter', status: 'done', due_date: '2026-12-15' }],
      }),
      { now: NOW },
    )
    expect(d.tracker.counts).toMatchObject({ applying: 1, submitted: 1 })
    const closed = d.tracker.items.find((i) => i.scholarshipId === 'closed-award')!
    expect(closed.availability?.state).toBe('closed')
    expect(closed.status).toBe('submitted')
    expect(d.tracker.items[0].progress).toMatchObject({ total: 1, completed: 1 })
    const card = d.catalog.page.items.find((c) => c.scholarshipId === idOf('amazon-future-engineer-2027'))!
    expect(card.trackedStatus).toBe('applying')
    expect(buildScholarshipDetail(input({ tracked: [{ scholarship_id: 'closed-award', status: 'submitted' }], trackedRows: [closedRow] }), 'closed-award', NOW)?.trackedStatus).toBe('submitted')
  })

  it('readiness is worded as actions', () => {
    const d = buildScholarshipDiscovery(input(), { now: NOW })
    expect(d.readiness.actions.map((a) => a.label)).toEqual(expect.arrayContaining(['Add your GPA', 'Upload your resume', 'Choose your LifePath career interests']))
  })
})

describe('shared loader', () => {
  it('reads the whole catalog in chunks (no 100-row cap) and scopes private reads to the active student', async () => {
    const rows = Array.from({ length: 2500 }, (_, i) => ({ ...byExternal('burger-king-scholars-2027'), id: `id-${String(i).padStart(5, '0')}` }))
    const fake = createFakeSupabase({
      student_visible_scholarships: rows,
      student_profiles: [{ id: 'sp-1', grade_level: 12, graduation_year: 2027, schools: { state: 'AL' } }],
      student_career_interests: [
        { student_profile_id: 'sp-1', career_id: 'welder', rank: 2 },
        { student_profile_id: 'sp-1', career_id: 'software-engineer', rank: 1 },
        { student_profile_id: 'sp-other', career_id: 'nurse', rank: 1 },
      ],
      student_scholarship_matches: [
        { student_profile_id: 'sp-1', scholarship_id: 'id-00001', status: 'saved' },
        { student_profile_id: 'sp-1', scholarship_id: 'id-00002', status: 'suggested' },
        { student_profile_id: 'sp-other', scholarship_id: 'id-00003', status: 'saved' },
      ],
    })
    const loaded = await loadScholarshipDiscoveryInput(fake as never, 'sp-1', NOW)
    expect(loaded.catalogRows).toHaveLength(2500)
    expect(loaded.plan.careerIds).toEqual(['software-engineer', 'welder'])
    expect(loaded.student?.gradeLevel).toBe(12)
    expect(loaded.student?.state).toBe('AL')
    expect(loaded.tracked).toEqual([{ scholarship_id: 'id-00001', status: 'saved' }])
    const privateTables = ['student_scholarship_matches', 'scholarship_application_tasks', 'student_career_interests', 'academic_records']
    for (const q of fake.queries.filter((x) => privateTables.includes(x.table))) {
      expect(q.filters).toContainEqual(['eq', 'student_profile_id', 'sp-1'])
    }
  })

  it('reports a catalog outage without losing tracked data', async () => {
    const fake = createFakeSupabase(
      { student_scholarship_matches: [{ student_profile_id: 'sp-1', scholarship_id: 'x', status: 'saved' }], scholarships: [{ id: 'x', title: 'Saved Award' }] },
      { failTables: ['student_visible_scholarships'] },
    )
    const loaded = await loadScholarshipDiscoveryInput(fake as never, 'sp-1', NOW)
    const d = buildScholarshipDiscovery(loaded, { now: NOW })
    expect(d.catalog.state).toBe('unavailable')
    expect(d.tracker.counts.saved).toBe(1)
    expect(d.tracker.items[0].entry?.title).toBe('Saved Award')
  })
})
