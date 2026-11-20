import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (relative: string) => readFileSync(join(process.cwd(), relative), 'utf8')

const hubPage = read('src/app/resources/page.tsx')
const guidePage = read('src/app/resources/[slug]/page.tsx')
const guideNotFound = read('src/app/resources/[slug]/not-found.tsx')
const explorer = read('src/app/resources/_components/GuideExplorer.tsx')
const reviewedHook = read('src/app/resources/_components/useReviewedGuides.ts')
const mobileScreen = read('../mobile/app/resources/index.tsx')

describe('public resources hub', () => {
  it('serves the hub as a server component (no forced client rendering)', () => {
    expect(hubPage.startsWith("'use client'")).toBe(false)
    expect(guidePage.startsWith("'use client'")).toBe(false)
  })

  it('does not gate the public routes behind auth or a signup redirect', () => {
    for (const source of [hubPage, guidePage]) {
      expect(source).not.toContain('requireSessionProfile')
      expect(source).not.toMatch(/redirect\(/)
      expect(source).not.toContain('/login')
    }
  })

  it('renders indexable guide content on the server without client JavaScript', () => {
    // Core guide content is rendered directly in the server component.
    expect(guidePage).toContain('guide.actionSteps.map')
    expect(guidePage).toContain('guide.whyItMatters')
    expect(guidePage).toContain('guide.officialSources.map')
    // Only the small progress control is a client island.
    expect(guidePage).toContain("import ReviewedButton")
  })

  it('exposes unique metadata and structured data for the hub and guides', () => {
    expect(hubPage).toContain('export const metadata')
    expect(hubPage).toContain("canonical: '/resources'")
    expect(hubPage).toContain('application/ld+json')
    expect(guidePage).toContain('export async function generateMetadata')
    expect(guidePage).toContain('export function generateStaticParams')
    expect(guidePage).toContain('alternates: { canonical:')
    expect(guidePage).toContain('application/ld+json')
  })

  it('handles invalid guide slugs with a not-found state', () => {
    expect(guidePage).toContain('notFound()')
    expect(guideNotFound).toContain('Guide not found')
  })

  it('preserves useful official links and the ten-things-school guide', () => {
    expect(hubPage).toContain('Open full guide')
    expect(hubPage).toContain('href="/resources/ten-things-school"')
    expect(hubPage).toContain('studentaid.gov')
    expect(hubPage).toContain('collegescorecard.ed.gov')
    expect(hubPage).toContain('nces.ed.gov')
  })

  it('opens every external link safely', () => {
    for (const source of [hubPage, guidePage]) {
      const blankCount = (source.match(/target="_blank"/g) ?? []).length
      const safeRelCount = (source.match(/rel="noopener noreferrer"/g) ?? []).length
      expect(blankCount).toBeGreaterThan(0)
      expect(safeRelCount).toBe(blankCount)
    }
  })

  it('uses inclusive language (no gendered son/he phrasing)', () => {
    for (const source of [hubPage, guidePage]) {
      expect(source).not.toMatch(/\byour son\b/i)
      expect(source).not.toMatch(/\byour daughter\b/i)
      expect(source).not.toMatch(/\bshould he\b/i)
      expect(source).not.toMatch(/\bshould she\b/i)
    }
  })
})

describe('local review progress', () => {
  it('works without authentication and stores no personal data', () => {
    expect(reviewedHook).toContain('localStorage')
    expect(reviewedHook).toContain("'mysryear:reviewed-guides'")
    // Only guide slugs are stored — no PII, no auth, no network.
    expect(reviewedHook).not.toMatch(/email|profile|supabase|fetch\(|firstName|lastName/i)
    expect(explorer.toLowerCase()).toContain('saved on this device')
    expect(explorer).toContain('Clear progress')
  })

  it('announces result counts to screen readers', () => {
    expect(explorer).toContain('aria-live="polite"')
  })
})

describe('web and mobile share canonical guide data', () => {
  it('both import COLLEGE_GUIDES from the shared package', () => {
    expect(explorer).toContain("from '@mysryear/shared'")
    expect(explorer).toContain('COLLEGE_GUIDES')
    expect(mobileScreen).toContain("from '@mysryear/shared'")
    expect(mobileScreen).toContain('COLLEGE_GUIDES')
  })
})
