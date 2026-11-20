import type { MetadataRoute } from 'next'
import { COLLEGE_GUIDES } from '@mysryear/shared'
import { SITE_URL } from '@/lib/seo/guide-structured-data'

export const dynamic = 'force-static'

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/resources`, lastModified, changeFrequency: 'weekly', priority: 0.9 },
    {
      url: `${SITE_URL}/resources/ten-things-school`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    { url: `${SITE_URL}/how-it-works`, lastModified, changeFrequency: 'monthly', priority: 0.5 },
  ]

  const guideRoutes: MetadataRoute.Sitemap = COLLEGE_GUIDES.map((guide) => ({
    url: `${SITE_URL}/resources/${guide.slug}`,
    lastModified: new Date(guide.lastReviewedAt),
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  return [...staticRoutes, ...guideRoutes]
}
