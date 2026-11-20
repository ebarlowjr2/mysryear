import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo/guide-structured-data'

export const dynamic = 'force-static'

// Minimal robots policy: allow crawling and point crawlers at the sitemap so the
// public College Readiness Hub and its guides are discoverable. Indexing rules
// for authenticated application routes are intentionally left unchanged.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
