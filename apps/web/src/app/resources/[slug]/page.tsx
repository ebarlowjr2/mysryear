import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  ExternalLink,
  GraduationCap,
  Lightbulb,
  Users,
} from 'lucide-react'
import {
  COLLEGE_GUIDES,
  GUIDE_AUDIENCE_LABELS,
  GUIDE_STAGE_LABELS,
  GUIDE_TIMING_LABELS,
  getGuideBySlug,
  getGuideCategory,
  getRelatedGuides,
} from '@mysryear/shared'
import ReviewedButton from '../_components/ReviewedButton'
import { buildGuideJsonLd, guideUrl } from '@/lib/seo/guide-structured-data'

type Props = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return COLLEGE_GUIDES.map((guide) => ({ slug: guide.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const guide = getGuideBySlug(slug)
  if (!guide) {
    return { title: 'Guide not found', robots: { index: false } }
  }
  const category = getGuideCategory(guide.category)
  return {
    title: guide.title,
    description: guide.shortSummary,
    keywords: guide.keywords,
    alternates: { canonical: `/resources/${guide.slug}` },
    openGraph: {
      type: 'article',
      url: guideUrl(guide.slug),
      title: `${guide.title} | MySRYear`,
      description: guide.shortSummary,
      section: category?.title,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${guide.title} | MySRYear`,
      description: guide.shortSummary,
    },
  }
}

function formatReviewed(iso: string): string {
  const date = new Date(`${iso}T00:00:00.000Z`)
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params
  const guide = getGuideBySlug(slug)
  if (!guide) notFound()

  const category = getGuideCategory(guide.category)
  const related = getRelatedGuides(guide.slug)
  const jsonLd = buildGuideJsonLd(guide)

  return (
    <div className="bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="container-prose py-10 sm:py-14">
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="no-print text-sm">
          <ol className="flex flex-wrap items-center gap-1.5 text-slate-500">
            <li>
              <Link href="/" className="hover:text-brand-700">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/resources" className="hover:text-brand-700">
                College Readiness Hub
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            {category && (
              <>
                <li>
                  <Link
                    href={`/resources?category=${category.slug}#explorer-heading`}
                    className="hover:text-brand-700"
                  >
                    {category.title}
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
              </>
            )}
            <li className="font-semibold text-slate-700" aria-current="page">
              {guide.title}
            </li>
          </ol>
        </nav>

        <Link
          href="/resources"
          className="no-print mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-800"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          All guides
        </Link>

        {/* Header */}
        <header className="mt-6">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wide">
            <span className="rounded-full bg-brand-50 px-2.5 py-1 text-brand-700">
              Guide {guide.number} of 100
            </span>
            {category && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                {category.title}
              </span>
            )}
          </div>
          <h1 className="mt-4 max-w-3xl text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            {guide.title}
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-700">{guide.shortSummary}</p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {guide.audiences.map((audience) => (
              <span
                key={audience}
                className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200"
              >
                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                {GUIDE_AUDIENCE_LABELS[audience]}
              </span>
            ))}
            {guide.gradesOrStages.map((stage) => (
              <span
                key={stage}
                className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200"
              >
                <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
                {GUIDE_STAGE_LABELS[stage]}
              </span>
            ))}
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
              <CalendarCheck className="h-3.5 w-3.5" aria-hidden="true" />
              {GUIDE_TIMING_LABELS[guide.timing]}
            </span>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <ReviewedButton slug={guide.slug} />
            <span className="text-sm text-slate-500">
              Last reviewed {formatReviewed(guide.lastReviewedAt)}
              {guide.volatileInformation && ' · confirm current figures at the official source'}
            </span>
          </div>
        </header>

        {/* Why it matters */}
        <section className="mt-10 max-w-3xl">
          <h2 className="text-xl font-black tracking-tight text-slate-950">Why it matters</h2>
          <p className="mt-3 text-base leading-7 text-slate-700">{guide.whyItMatters}</p>
        </section>

        {/* Action steps (printable checklist) */}
        <section className="mt-10 max-w-3xl">
          <h2 className="text-xl font-black tracking-tight text-slate-950">Do this</h2>
          <ul className="mt-4 space-y-3">
            {guide.actionSteps.map((step, index) => (
              <li key={index} className="flex items-start gap-3">
                <span
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-300 text-xs font-bold text-slate-400"
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                <span className="text-base leading-7 text-slate-700">{step}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Tips */}
        {(guide.studentTip || guide.familyTip) && (
          <section className="mt-10 grid max-w-3xl gap-4 sm:grid-cols-2">
            {guide.studentTip && (
              <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-5">
                <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-brand-800">
                  <Lightbulb className="h-4 w-4" aria-hidden="true" />
                  For students
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-700">{guide.studentTip}</p>
              </div>
            )}
            {guide.familyTip && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-700">
                  <Users className="h-4 w-4" aria-hidden="true" />
                  For parents & guardians
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-700">{guide.familyTip}</p>
              </div>
            )}
          </section>
        )}

        {/* Official sources */}
        <section className="mt-10 max-w-3xl">
          <h2 className="text-xl font-black tracking-tight text-slate-950">Official sources</h2>
          <p className="mt-2 text-sm text-slate-600">
            Verify current details on these authoritative sites. External links open in a new tab.
          </p>
          <ul className="mt-4 space-y-2">
            {guide.officialSources.map((source) => (
              <li key={source.url}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-start gap-1.5 text-sm font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800"
                >
                  <span>{source.label}</span>
                  <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        {/* Related guides */}
        {related.length > 0 && (
          <section className="no-print mt-12 border-t border-slate-200 pt-8">
            <h2 className="text-xl font-black tracking-tight text-slate-950">Related guides</h2>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2">
              {related.map((item) => (
                <li key={item.slug}>
                  <Link
                    href={`/resources/${item.slug}`}
                    className="group flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-brand-300 hover:shadow-sm"
                  >
                    <span>
                      <span className="text-xs font-bold uppercase tracking-wide text-brand-700">
                        Guide {item.number}
                      </span>
                      <span className="mt-1 block font-semibold text-slate-900 group-hover:text-brand-700">
                        {item.title}
                      </span>
                    </span>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </div>
  )
}
