import type { CollegeGuide } from '@mysryear/shared'
import { GUIDE_CATEGORIES, getGuideCategory } from '@mysryear/shared'

export const SITE_URL = 'https://www.mysryear.net'

export function resourcesUrl(path = ''): string {
  return `${SITE_URL}/resources${path}`
}

export function guideUrl(slug: string): string {
  return resourcesUrl(`/${slug}`)
}

type JsonLd = Record<string, unknown>

/** Breadcrumb + Article structured data for a single guide page. */
export function buildGuideJsonLd(guide: CollegeGuide): JsonLd {
  const category = getGuideCategory(guide.category)
  const breadcrumb: JsonLd = {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'College Readiness Hub', item: resourcesUrl() },
      {
        '@type': 'ListItem',
        position: 3,
        name: category?.title ?? 'Guides',
        item: resourcesUrl(`?category=${guide.category}`),
      },
      { '@type': 'ListItem', position: 4, name: guide.title, item: guideUrl(guide.slug) },
    ],
  }

  const article: JsonLd = {
    '@type': 'Article',
    headline: guide.title,
    description: guide.shortSummary,
    datePublished: guide.lastReviewedAt,
    dateModified: guide.lastReviewedAt,
    inLanguage: 'en',
    isAccessibleForFree: true,
    keywords: guide.keywords.join(', '),
    author: { '@type': 'Organization', name: 'MySRYear', url: SITE_URL },
    publisher: { '@type': 'Organization', name: 'MySRYear', url: SITE_URL },
    mainEntityOfPage: { '@type': 'WebPage', '@id': guideUrl(guide.slug) },
    citation: guide.officialSources.map((source) => ({
      '@type': 'CreativeWork',
      name: source.label,
      url: source.url,
    })),
  }

  return { '@context': 'https://schema.org', '@graph': [breadcrumb, article] }
}

/** Breadcrumb + CollectionPage + category ItemList for the hub landing page. */
export function buildHubJsonLd(): JsonLd {
  const breadcrumb: JsonLd = {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'College Readiness Hub', item: resourcesUrl() },
    ],
  }

  const collection: JsonLd = {
    '@type': 'CollectionPage',
    name: 'College Readiness Hub',
    description:
      'Free, plain-language college planning guides for students and families — no account required.',
    url: resourcesUrl(),
    isAccessibleForFree: true,
    inLanguage: 'en',
    hasPart: {
      '@type': 'ItemList',
      itemListElement: GUIDE_CATEGORIES.map((category, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: category.title,
        url: resourcesUrl(`?category=${category.slug}`),
      })),
    },
  }

  return { '@context': 'https://schema.org', '@graph': [breadcrumb, collection] }
}
