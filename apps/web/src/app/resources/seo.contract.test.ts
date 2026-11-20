import { describe, expect, it } from 'vitest'
import { COLLEGE_GUIDES } from '@mysryear/shared'
import sitemap from '@/app/sitemap'
import robots from '@/app/robots'
import {
  SITE_URL,
  buildGuideJsonLd,
  buildHubJsonLd,
  guideUrl,
} from '@/lib/seo/guide-structured-data'

describe('resources sitemap', () => {
  const entries = sitemap()
  const urls = entries.map((entry) => entry.url)

  it('includes the hub and every guide route', () => {
    expect(urls).toContain(`${SITE_URL}/resources`)
    for (const guide of COLLEGE_GUIDES) {
      expect(urls).toContain(`${SITE_URL}/resources/${guide.slug}`)
    }
  })

  it('preserves the ten-things-school guide route', () => {
    expect(urls).toContain(`${SITE_URL}/resources/ten-things-school`)
  })

  it('uses absolute https URLs only', () => {
    for (const url of urls) {
      expect(url.startsWith('https://')).toBe(true)
    }
  })
})

describe('robots policy', () => {
  it('allows crawling and points at the sitemap', () => {
    const policy = robots()
    expect(policy.sitemap).toBe(`${SITE_URL}/sitemap.xml`)
    const rules = Array.isArray(policy.rules) ? policy.rules : [policy.rules]
    expect(rules.some((rule) => rule && rule.allow === '/')).toBe(true)
  })
})

describe('structured data', () => {
  it('builds valid guide JSON-LD with breadcrumb and article', () => {
    const guide = COLLEGE_GUIDES[0]
    const jsonLd = buildGuideJsonLd(guide) as { '@context': string; '@graph': Array<{ '@type': string }> }
    expect(jsonLd['@context']).toBe('https://schema.org')
    const types = jsonLd['@graph'].map((node) => node['@type'])
    expect(types).toContain('BreadcrumbList')
    expect(types).toContain('Article')
    // Serializes cleanly (valid JSON output for the <script> tag).
    expect(() => JSON.parse(JSON.stringify(jsonLd))).not.toThrow()
    expect(JSON.stringify(jsonLd)).toContain(guideUrl(guide.slug))
  })

  it('builds valid hub JSON-LD with a collection and category list', () => {
    const jsonLd = buildHubJsonLd() as { '@context': string; '@graph': Array<{ '@type': string }> }
    expect(jsonLd['@context']).toBe('https://schema.org')
    const types = jsonLd['@graph'].map((node) => node['@type'])
    expect(types).toContain('BreadcrumbList')
    expect(types).toContain('CollectionPage')
  })
})
