import { describe, expect, it } from 'vitest'
import {
  COLLEGE_GUIDES,
  GUIDE_CATEGORIES,
  filterGuides,
  getGuideBySlug,
  getRelatedGuides,
  searchGuides,
  startHereForStage,
  type CollegeGuide,
} from './college-guides'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

describe('college guide content model', () => {
  it('contains exactly 100 primary guides', () => {
    expect(COLLEGE_GUIDES).toHaveLength(100)
  })

  it('numbers 1–100 are unique and contiguous', () => {
    const numbers = COLLEGE_GUIDES.map((guide) => guide.number).sort((a, b) => a - b)
    expect(new Set(numbers).size).toBe(100)
    expect(numbers[0]).toBe(1)
    expect(numbers[99]).toBe(100)
    for (let i = 0; i < numbers.length; i += 1) {
      expect(numbers[i]).toBe(i + 1)
    }
  })

  it('every guide has a unique slug', () => {
    const slugs = COLLEGE_GUIDES.map((guide) => guide.slug)
    expect(new Set(slugs).size).toBe(100)
    for (const slug of slugs) {
      expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    }
  })

  it('every guide has a category, audience, stage, actions, review date, and source', () => {
    const categorySlugs = new Set(GUIDE_CATEGORIES.map((category) => category.slug))
    for (const guide of COLLEGE_GUIDES) {
      expect(categorySlugs.has(guide.category)).toBe(true)
      expect(guide.audiences.length).toBeGreaterThanOrEqual(1)
      expect(guide.gradesOrStages.length).toBeGreaterThanOrEqual(1)
      expect(guide.actionSteps.length).toBeGreaterThanOrEqual(2)
      expect(guide.actionSteps.length).toBeLessThanOrEqual(5)
      expect(guide.whyItMatters.trim().length).toBeGreaterThan(0)
      expect(guide.shortSummary.trim().length).toBeGreaterThan(0)
      expect(guide.keywords.length).toBeGreaterThanOrEqual(1)
      expect(guide.lastReviewedAt).toMatch(ISO_DATE)
      expect(guide.officialSources.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('provides a student or family tip and resolvable official source URLs', () => {
    for (const guide of COLLEGE_GUIDES) {
      expect(Boolean(guide.studentTip) || Boolean(guide.familyTip)).toBe(true)
      for (const source of guide.officialSources) {
        expect(source.label.trim().length).toBeGreaterThan(0)
        expect(source.url).toMatch(/^https:\/\//)
      }
    }
  })

  it('each guide that touches volatile facts carries a source and a review date', () => {
    const volatile = COLLEGE_GUIDES.filter((guide) => guide.volatileInformation)
    expect(volatile.length).toBeGreaterThan(0)
    for (const guide of volatile) {
      expect(guide.officialSources.length).toBeGreaterThanOrEqual(1)
      expect(guide.lastReviewedAt).toMatch(ISO_DATE)
    }
  })

  it('does not hardcode volatile numbers (rates, dollar amounts, specific years) in guide prose', () => {
    const prose = (guide: CollegeGuide) =>
      [guide.shortSummary, guide.whyItMatters, guide.studentTip ?? '', guide.familyTip ?? '', ...guide.actionSteps].join(
        ' ',
      )
    for (const guide of COLLEGE_GUIDES) {
      const text = prose(guide)
      expect(text).not.toMatch(/\d+(\.\d+)?\s?%/) // no interest-rate percentages
      expect(text).not.toMatch(/\$\s?\d/) // no dollar amounts
      expect(text).not.toMatch(/\b(19|20)\d{2}\b/) // no specific calendar years
    }
  })

  it('uses inclusive, non-gendered language in public content', () => {
    const gendered = /\b(son|daughter|he|she|his|her|him|hers)\b/i
    for (const guide of COLLEGE_GUIDES) {
      const text = [
        guide.title,
        guide.shortSummary,
        guide.whyItMatters,
        guide.studentTip ?? '',
        guide.familyTip ?? '',
        ...guide.actionSteps,
      ].join(' ')
      expect(text, `gendered phrasing in guide "${guide.slug}"`).not.toMatch(gendered)
    }
  })

  it('every related-guide slug resolves to a real guide', () => {
    for (const guide of COLLEGE_GUIDES) {
      for (const relatedSlug of guide.relatedGuideSlugs) {
        expect(getGuideBySlug(relatedSlug), `${guide.slug} -> ${relatedSlug}`).toBeDefined()
      }
      // related guides should not reference themselves
      expect(guide.relatedGuideSlugs).not.toContain(guide.slug)
    }
  })

  it('getRelatedGuides returns resolved guide objects', () => {
    const guide = COLLEGE_GUIDES[0]
    const related = getRelatedGuides(guide.slug)
    expect(related.length).toBe(guide.relatedGuideSlugs.length)
    expect(related.every((item) => item && typeof item.title === 'string')).toBe(true)
  })

  it('spreads guides across all 10 categories', () => {
    expect(GUIDE_CATEGORIES).toHaveLength(10)
    for (const category of GUIDE_CATEGORIES) {
      const inCategory = COLLEGE_GUIDES.filter((guide) => guide.category === category.slug)
      expect(inCategory.length, category.slug).toBe(10)
    }
  })
})

describe('guide search', () => {
  it('finds matches in the title', () => {
    const results = searchGuides('FAFSA')
    expect(results.length).toBeGreaterThan(0)
    expect(results.some((guide) => guide.title.toLowerCase().includes('fafsa'))).toBe(true)
  })

  it('finds matches in the summary', () => {
    const results = searchGuides('net price')
    expect(results.some((guide) => guide.slug === 'net-price')).toBe(true)
  })

  it('finds matches in keywords', () => {
    const results = searchGuides('apprenticeship')
    expect(results.some((guide) => guide.keywords.includes('apprenticeship'))).toBe(true)
  })

  it('finds matches in action steps', () => {
    const results = searchGuides('loan simulator')
    expect(results.some((guide) => guide.slug === 'estimate-repayment')).toBe(true)
  })

  it('returns all guides for an empty query and an empty array for no match', () => {
    expect(searchGuides('')).toHaveLength(100)
    expect(searchGuides('zzzzznotapresentterm')).toHaveLength(0)
  })
})

describe('guide filters', () => {
  it('filters by audience', () => {
    const studentOnly = filterGuides({ audience: 'student' })
    const family = filterGuides({ audience: 'family' })
    expect(studentOnly.length).toBeGreaterThan(0)
    expect(family.length).toBeGreaterThan(0)
    expect(studentOnly.every((guide) => guide.audiences.includes('student'))).toBe(true)
    expect(family.every((guide) => guide.audiences.includes('family'))).toBe(true)
  })

  it('filters by stage', () => {
    const eleventh = filterGuides({ stage: '11th' })
    expect(eleventh.length).toBeGreaterThan(0)
    expect(eleventh.every((guide) => guide.gradesOrStages.includes('11th'))).toBe(true)
  })

  it('filters by category', () => {
    const financialAid = filterGuides({ category: 'financial-aid' })
    expect(financialAid).toHaveLength(10)
    expect(financialAid.every((guide) => guide.category === 'financial-aid')).toBe(true)
  })

  it('filters by timing', () => {
    const senior = filterGuides({ timing: 'senior' })
    expect(senior.length).toBeGreaterThan(0)
    expect(senior.every((guide) => guide.timing === 'senior')).toBe(true)
  })

  it('applies audience, stage, category, and query together', () => {
    const combined = filterGuides({ audience: 'family', stage: '12th', category: 'financial-aid' })
    expect(combined.length).toBeGreaterThan(0)
    expect(
      combined.every(
        (guide) =>
          guide.audiences.includes('family') &&
          guide.gradesOrStages.includes('12th') &&
          guide.category === 'financial-aid',
      ),
    ).toBe(true)

    // Student + 11th Grade (screenshot state) returns results.
    expect(filterGuides({ audience: 'student', stage: '11th' }).length).toBeGreaterThan(0)
    // Parent + 12th Grade (screenshot state) returns results.
    expect(filterGuides({ audience: 'family', stage: '12th' }).length).toBeGreaterThan(0)
  })

  it('startHereForStage returns a small, stage-relevant set', () => {
    const start = startHereForStage('9th')
    expect(start.length).toBeGreaterThan(0)
    expect(start.length).toBeLessThanOrEqual(4)
    expect(start.every((guide) => guide.gradesOrStages.includes('9th'))).toBe(true)
  })
})
