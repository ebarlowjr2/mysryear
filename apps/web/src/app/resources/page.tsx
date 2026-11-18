import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, BookOpenCheck, ExternalLink, ShieldCheck } from 'lucide-react'
import { GUIDE_CATEGORIES, GUIDE_STAGE_LABELS, GUIDE_STAGE_ORDER, getGuidesByCategory } from '@mysryear/shared'
import GuideExplorer from './_components/GuideExplorer'
import { buildHubJsonLd, resourcesUrl } from '@/lib/seo/guide-structured-data'

export const metadata: Metadata = {
  title: 'College Readiness Hub',
  description:
    'Free, plain-language college planning for students and families — 100 guides on courses, applications, FAFSA, scholarships, cost, and the first year. No account required.',
  keywords: [
    'college planning',
    'college readiness',
    'FAFSA help',
    'scholarships',
    'financial aid',
    'college applications',
    'high school planning',
  ],
  alternates: { canonical: '/resources' },
  openGraph: {
    type: 'website',
    url: resourcesUrl(),
    title: 'College Readiness Hub | MySRYear',
    description:
      'Free, plain-language college planning for students and families. 100 guides, no account required.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'College Readiness Hub | MySRYear',
    description: 'Free college planning guides for students and families. No account required.',
  },
}

type ExternalResource = { label: string; href: string; note?: string }
type ResourceGroup = { title: string; items: ExternalResource[] }

// Preserved, verified authoritative links (low-authority and duplicate links removed).
const OFFICIAL_TOOLS: ResourceGroup[] = [
  {
    title: 'FAFSA & financial aid',
    items: [
      { label: 'Apply for the FAFSA® form', href: 'https://studentaid.gov/h/apply-for-aid/fafsa', note: 'Federal Student Aid' },
      { label: 'Create or manage your FSA ID', href: 'https://studentaid.gov/fsa-id/' },
      { label: 'Federal Student Aid Estimator', href: 'https://studentaid.gov/aid-estimator/' },
      { label: 'FAFSA® deadlines', href: 'https://studentaid.gov/apply-for-aid/fafsa/fafsa-deadlines' },
    ],
  },
  {
    title: 'Compare colleges & cost',
    items: [
      { label: 'College Scorecard', href: 'https://collegescorecard.ed.gov/' },
      { label: 'NCES College Navigator', href: 'https://nces.ed.gov/collegenavigator/' },
      { label: 'Net Price Calculator Center', href: 'https://collegecost.ed.gov/net-price' },
      { label: 'Loan Simulator', href: 'https://studentaid.gov/loan-simulator/' },
    ],
  },
  {
    title: 'Applications & testing',
    items: [
      { label: 'Common App', href: 'https://www.commonapp.org/' },
      { label: 'College Board BigFuture', href: 'https://bigfuture.collegeboard.org/' },
      { label: 'SAT (College Board)', href: 'https://satsuite.collegeboard.org/sat' },
      { label: 'ACT', href: 'https://www.act.org/' },
    ],
  },
  {
    title: 'Careers & pathways',
    items: [
      { label: 'Apprenticeship.gov', href: 'https://www.apprenticeship.gov/' },
      { label: 'CareerOneStop', href: 'https://www.careeronestop.org/' },
      { label: 'Occupational Outlook Handbook (BLS)', href: 'https://www.bls.gov/ooh/' },
    ],
  },
  {
    title: 'Protect your money',
    items: [
      { label: 'CFPB — Paying for College', href: 'https://www.consumerfinance.gov/paying-for-college/' },
      {
        label: 'FTC — Avoiding scholarship & aid scams',
        href: 'https://consumer.ftc.gov/articles/how-avoid-scholarship-financial-aid-scams',
      },
    ],
  },
]

// Former FAQ entries folded into the relevant guide topics. Anchor ids are
// preserved so older deep links still resolve.
const FAQ_LINKS: { id: string; question: string; slug: string }[] = [
  { id: 'faq-what-is-fafsa', question: 'What is the FAFSA® and why does it matter?', slug: 'grants-work-study-loans' },
  { id: 'faq-fafsa-deadlines', question: 'When does the FAFSA® open and what deadlines matter?', slug: 'fafsa-deadlines' },
  { id: 'faq-fsa-id', question: 'Do the student and a parent each need an FSA ID?', slug: 'fafsa-accounts' },
  { id: 'faq-local-scholarships', question: 'How do we find local scholarships?', slug: 'local-scholarships' },
  { id: 'faq-test-optional', question: 'Test-optional — should the student still test?', slug: 'decide-testing' },
  { id: 'faq-apprenticeships', question: 'What about trades, apprenticeships, or direct-to-work?', slug: 'compare-pathways' },
]

export default function ResourcesPage() {
  const jsonLd = buildHubJsonLd()

  return (
    <div className="bg-white">
      <script
        type="application/ld+json"
        // Structured data for breadcrumbs and the collection page.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero / opening viewport */}
      <section className="border-b border-slate-200 bg-gradient-to-b from-brand-50/70 to-white">
        <div className="container-prose py-12 sm:py-16">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-700 shadow-sm ring-1 ring-brand-100">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Free · No account required
          </span>
          <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
            College planning, explained clearly.
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-700">
            The College Readiness Hub is a free guide for students and families — 100 plain-language
            answers covering high school, applications, FAFSA, scholarships, cost, and the first year
            of college. Search, browse by grade, and work at your own pace. You never need to sign up
            to use it.
          </p>
        </div>
      </section>

      <div className="container-prose pb-16">
        {/* Interactive search + filters + Start Here + index */}
        <GuideExplorer />

        {/* What should we focus on now? */}
        <section aria-labelledby="focus-heading" className="mt-16">
          <h2 id="focus-heading" className="text-2xl font-black tracking-tight text-slate-950">
            What should we focus on now?
          </h2>
          <p className="mt-2 max-w-2xl text-slate-600">
            Jump to the guides that matter most for a specific grade or stage.
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            {GUIDE_STAGE_ORDER.map((stage) => (
              <Link
                key={stage}
                href={`/resources?stage=${stage}#explorer-heading`}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-700"
              >
                {GUIDE_STAGE_LABELS[stage]}
              </Link>
            ))}
          </div>
        </section>

        {/* Ten major guide collections */}
        <section aria-labelledby="collections-heading" className="mt-16">
          <h2 id="collections-heading" className="text-2xl font-black tracking-tight text-slate-950">
            100 things students and families should know before college
          </h2>
          <p className="mt-2 max-w-2xl text-slate-600">
            Ten collections, ten guides each — a complete path from building a foundation to thriving
            in the first year.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {GUIDE_CATEGORIES.map((category) => {
              const count = getGuidesByCategory(category.slug).length
              return (
                <Link
                  key={category.slug}
                  href={`/resources?category=${category.slug}#explorer-heading`}
                  className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-soft transition hover:border-brand-300 hover:shadow-md"
                >
                  <span className="text-xs font-black uppercase tracking-wide text-brand-700">
                    Collection {category.number}
                  </span>
                  <span className="mt-1 text-lg font-bold text-slate-950 group-hover:text-brand-700">
                    {category.title}
                  </span>
                  <span className="mt-2 text-sm leading-6 text-slate-600">{category.summary}</span>
                  <span className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {count} guides
                  </span>
                </Link>
              )
            })}
          </div>
        </section>

        {/* Official tools and trusted external resources */}
        <section aria-labelledby="tools-heading" className="mt-16">
          <h2 id="tools-heading" className="text-2xl font-black tracking-tight text-slate-950">
            Official tools and trusted resources
          </h2>
          <p className="mt-2 max-w-2xl text-slate-600">
            Go straight to the authoritative sources. Links open in a new tab on official government
            and nonprofit sites.
          </p>
          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {OFFICIAL_TOOLS.map((group) => (
              <div key={group.title} className="card p-5">
                <h3 className="text-base font-bold text-slate-950">{group.title}</h3>
                <ul className="mt-3 space-y-2">
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-start gap-1.5 text-sm font-medium text-brand-700 underline underline-offset-2 hover:text-brand-800"
                      >
                        <span>{item.label}</span>
                        <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span className="sr-only">(opens in a new tab)</span>
                      </a>
                      {item.note && <span className="ml-1 text-xs text-slate-500">· {item.note}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Questions families ask (FAQs folded into guides) */}
        <section aria-labelledby="faq-heading" className="mt-16">
          <h2 id="faq-heading" className="text-2xl font-black tracking-tight text-slate-950">
            Questions families ask
          </h2>
          <p className="mt-2 max-w-2xl text-slate-600">
            Each question links to the full guide where it is answered in plain language.
          </p>
          <ul className="mt-5 divide-y divide-slate-200 border-y border-slate-200">
            {FAQ_LINKS.map((faq) => (
              <li key={faq.id} id={faq.id}>
                <Link
                  href={`/resources/${faq.slug}`}
                  className="flex items-center justify-between gap-4 py-4 transition hover:text-brand-700"
                >
                  <span className="font-semibold text-slate-800">{faq.question}</span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* 10 Things to Check at Your School feature */}
        <section className="mt-16 border-y border-slate-200 py-8 sm:py-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                <BookOpenCheck className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight text-slate-950">
                  Already enrolled? 10 Things to Check at Your School
                </h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-700">
                  Part of the Starting College collection: use the resources your school may already
                  include before you spend money elsewhere.
                </p>
              </div>
            </div>
            <Link href="/resources/ten-things-school" className="btn-primary shrink-0">
              Open full guide
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>

        {/* Restrained optional CTA */}
        <section className="mt-16 rounded-3xl border border-slate-200 bg-slate-50 p-7 sm:p-10">
          <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-950">
                Want to track all of this in one place?
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700">
                Everything here is free to use without an account. If it helps, a free MySRYear
                account can save your plan, grades, scholarships, and tasks together — entirely
                optional.
              </p>
            </div>
            <Link href="/signup" className="btn-secondary shrink-0 justify-self-start md:justify-self-end">
              Create a free account
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
