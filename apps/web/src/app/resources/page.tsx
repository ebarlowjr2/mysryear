'use client'

import React, { useMemo, useState } from 'react'

type LinkItem = { label: string; href: string; note?: string }

export default function ResourcesPage() {
  const quickLinks: { title: string; items: LinkItem[] }[] = [
    {
      title: 'FAFSA & Financial Aid',
      items: [
        {
          label: 'Apply for FAFSA®',
          href: 'https://studentaid.gov/h/apply-for-aid/fafsa',
          note: 'Official site',
        },
        { label: 'Create/Manage FSA ID', href: 'https://studentaid.gov/fsa-id/' },
        { label: 'Aid Estimator (FSA)', href: 'https://studentaid.gov/aid-estimator/' },
        {
          label: 'FAFSA® Deadlines',
          href: 'https://studentaid.gov/apply-for-aid/fafsa/fafsa-deadlines',
        },
        { label: 'College Scorecard', href: 'https://collegescorecard.ed.gov/' },
        { label: 'College Navigator (NCES)', href: 'https://nces.ed.gov/collegenavigator/' },
      ],
    },
    {
      title: 'Loans & Paying for College',
      items: [
        {
          label: 'Federal Loans Overview',
          href: 'https://studentaid.gov/understand-aid/types/loans',
        },
        {
          label: 'Direct Subsidized/Unsubsidized',
          href: 'https://studentaid.gov/understand-aid/types/loans/subsidized-unsubsidized',
        },
        {
          label: 'Parent PLUS Loans',
          href: 'https://studentaid.gov/understand-aid/types/loans/plus/parent',
        },
        { label: 'Repayment Plans', href: 'https://studentaid.gov/loan-simulator/' },
      ],
    },
    {
      title: 'Scholarships & Money',
      items: [
        {
          label: 'CareerOneStop Scholarship Finder',
          href: 'https://www.careeronestop.org/toolkit/training/find-scholarships.aspx',
        },
        {
          label: 'BigFuture Scholarships (College Board)',
          href: 'https://bigfuture.collegeboard.org/scholarship-search',
        },
        {
          label: 'Local Scholarships (Ask Counselor)',
          href: '#faq-local-scholarships',
          note: 'See FAQ below',
        },
      ],
    },
    {
      title: 'Applications & Testing',
      items: [
        { label: 'Common App', href: 'https://www.commonapp.org/' },
        { label: 'Coalition/Score App', href: 'https://www.coalitionforcollegeaccess.org/' },
        { label: 'SAT (College Board)', href: 'https://satsuite.collegeboard.org/sat' },
        { label: 'ACT', href: 'https://www.act.org/' },
        { label: 'Net Price Calculators', href: 'https://collegecost.ed.gov/net-price' },
      ],
    },
    {
      title: 'Career, Jobs & Paths',
      items: [
        { label: 'Apprenticeship.gov', href: 'https://www.apprenticeship.gov/' },
        { label: 'USAJobs (Federal)', href: 'https://www.usajobs.gov/' },
        { label: 'Handshake (college job network)', href: 'https://joinhandshake.com/' },
        { label: 'LinkedIn Jobs', href: 'https://www.linkedin.com/jobs/' },
        { label: 'Indeed', href: 'https://www.indeed.com/' },
      ],
    },
    {
      title: 'Docs & Templates',
      items: [
        {
          label: 'Academic Résumé (Google Docs template)',
          href: 'https://docs.google.com/document/u/0/?ftv=1',
          note: 'Pick a template',
        },
        { label: 'Resume/CV Templates (Canva)', href: 'https://www.canva.com/resumes/templates/' },
        { label: 'Activity List Tips (Common App)', href: 'https://www.commonapp.org/blog' },
      ],
    },
  ]

  const faqs = useMemo(
    () => [
      {
        id: 'fa-what-is-fafsa',
        category: 'FAFSA',
        q: 'What is the FAFSA® and why does it matter?',
        a: (
          <>
            <p className="text-slate-700">
              The FAFSA® (Free Application for Federal Student Aid) is how students become eligible
              for federal grants, work-study, and loans. Many states and colleges also use it to
              award their own aid.
            </p>
            <div className="mt-3 flex gap-2 flex-wrap">
              <a
                className="btn-primary"
                href="https://studentaid.gov/h/apply-for-aid/fafsa"
                target="_blank"
                rel="noreferrer"
              >
                Apply for FAFSA®
              </a>
              <a
                className="btn"
                href="https://studentaid.gov/fsa-id/"
                target="_blank"
                rel="noreferrer"
              >
                Create FSA ID
              </a>
              <a
                className="btn"
                href="https://studentaid.gov/aid-estimator/"
                target="_blank"
                rel="noreferrer"
              >
                Aid Estimator
              </a>
            </div>
          </>
        ),
        tags: ['fafsa', 'financial-aid', 'grants', 'loans'],
      },
      {
        id: 'fa-when-open-deadlines',
        category: 'FAFSA',
        q: 'When does the FAFSA® open and what deadlines should we track?',
        a: (
          <>
            <p className="text-slate-700">
              The FAFSA typically opens in the fall. There are three important deadlines: federal,
              state, and school-specific. Submit as early as possible—some aid is first-come,
              first-served.
            </p>
            <ul className="list-disc ml-5 mt-2 text-slate-700">
              <li>
                <a
                  className="text-brand-700 underline"
                  href="https://studentaid.gov/apply-for-aid/fafsa/fafsa-deadlines"
                  target="_blank"
                  rel="noreferrer"
                >
                  Check FAFSA® deadlines
                </a>
              </li>
              <li>Also check each college&apos;s financial aid page for priority dates.</li>
            </ul>
          </>
        ),
        tags: ['fafsa', 'deadlines'],
      },
      {
        id: 'fa-fsa-id',
        category: 'FAFSA',
        q: 'Do we need an FSA ID? (Parent and student)',
        a: (
          <>
            <p className="text-slate-700">
              Yes. The student needs an FSA ID; a contributing parent usually does too. Create them
              before starting the FAFSA to avoid delays.
            </p>
            <a
              className="text-brand-700 underline"
              href="https://studentaid.gov/fsa-id/"
              target="_blank"
              rel="noreferrer"
            >
              Create/Manage FSA ID
            </a>
          </>
        ),
        tags: ['fafsa', 'fsa-id'],
      },
      {
        id: 'fa-what-info-needed',
        category: 'FAFSA',
        q: 'What information and documents should we have ready?',
        a: (
          <ul className="list-disc ml-5 text-slate-700">
            <li>Student and parent Social Security numbers (or Alien Registration numbers)</li>
            <li>Tax info (student and parent), W-2s, untaxed income details</li>
            <li>Household size and number in college</li>
            <li>List of colleges/programs to receive the FAFSA (up to the current limit)</li>
          </ul>
        ),
        tags: ['fafsa', 'documents'],
      },
      {
        id: 'fa-submit-next',
        category: 'FAFSA',
        q: 'We submitted the FAFSA—what are the next steps?',
        a: (
          <ul className="list-disc ml-5 text-slate-700">
            <li>Watch for your FAFSA Submission Summary and fix any errors.</li>
            <li>Colleges may ask for verification—respond quickly.</li>
            <li>Compare financial aid offers from each school and note deadlines.</li>
            <li>If needed, update schools listed on the FAFSA.</li>
          </ul>
        ),
        tags: ['fafsa', 'after-submission'],
      },

      {
        id: 'loans-overview',
        category: 'Student Loans',
        q: 'Where can we learn the basics of federal student loans?',
        a: (
          <p className="text-slate-700">
            Start with the official overview of federal loans (types, interest, limits) and use the
            Loan Simulator to estimate future payments and compare plans.{' '}
            <a
              className="text-brand-700 underline"
              href="https://studentaid.gov/understand-aid/types/loans"
              target="_blank"
              rel="noreferrer"
            >
              Federal Loans Overview
            </a>{' '}
            ·{' '}
            <a
              className="text-brand-700 underline"
              href="https://studentaid.gov/loan-simulator/"
              target="_blank"
              rel="noreferrer"
            >
              Loan Simulator
            </a>
          </p>
        ),
        tags: ['loans', 'repayment'],
      },

      {
        id: 'faq-local-scholarships',
        category: 'Scholarships',
        q: 'How do we find local scholarships?',
        a: (
          <>
            <p className="text-slate-700">
              Check your high school counseling office site, local community foundations, employers,
              and civic groups (Rotary, Elks, PTA, etc.). Many districts publish a PDF or page with
              local awards and deadlines.
            </p>
            <p className="mt-2 text-slate-700">
              For broader searches, try:{' '}
              <a
                className="text-brand-700 underline"
                href="https://www.careeronestop.org/toolkit/training/find-scholarships.aspx"
                target="_blank"
                rel="noreferrer"
              >
                CareerOneStop
              </a>{' '}
              and{' '}
              <a
                className="text-brand-700 underline"
                href="https://bigfuture.collegeboard.org/scholarship-search"
                target="_blank"
                rel="noreferrer"
              >
                BigFuture
              </a>
              .
            </p>
          </>
        ),
        tags: ['scholarships', 'local'],
      },

      {
        id: 'apps-which-platform',
        category: 'Applications & Testing',
        q: 'Common App vs Coalition—do we need both?',
        a: (
          <p className="text-slate-700">
            Most colleges use one or both; some use state or institutional apps. Start with each
            college&apos;s admissions page. If both are accepted, choose the platform your son finds
            simpler or that aligns with your school list.
          </p>
        ),
        tags: ['applications', 'common-app', 'coalition'],
      },
      {
        id: 'testing-optional',
        category: 'Applications & Testing',
        q: 'Test-optional—should he still take the SAT/ACT?',
        a: (
          <p className="text-slate-700">
            It depends on target schools, merit scholarships, and his practice scores. Many merit
            awards still consider test scores. Check each college&apos;s policy and scholarship
            criteria.
          </p>
        ),
        tags: ['testing', 'sat', 'act'],
      },

      {
        id: 'career-first-steps',
        category: 'Career & Jobs',
        q: "What if he's exploring trades, apprenticeships, or direct-to-work?",
        a: (
          <p className="text-slate-700">
            Look up registered apprenticeships on{' '}
            <a
              className="text-brand-700 underline"
              href="https://www.apprenticeship.gov/"
              target="_blank"
              rel="noreferrer"
            >
              Apprenticeship.gov
            </a>
            , and check community colleges for certificate programs. Build a starter résumé and seek
            part-time roles or internships via Handshake, LinkedIn, and Indeed.
          </p>
        ),
        tags: ['careers', 'apprenticeships', 'jobs'],
      },

      {
        id: 'resume-templates',
        category: 'Docs & Templates',
        q: 'Where can we grab a quick academic résumé template?',
        a: (
          <p className="text-slate-700">
            In Google Docs, click <b>Template gallery</b> and choose a résumé to customize; add an
            &quot;Activities &amp; Honors&quot; section. For polished layouts, see{' '}
            <a
              className="text-brand-700 underline"
              href="https://www.canva.com/resumes/templates/"
              target="_blank"
              rel="noreferrer"
            >
              Canva templates
            </a>
            .
          </p>
        ),
        tags: ['resume', 'templates'],
      },
    ],
    [],
  )

  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<
    | 'All'
    | 'FAFSA'
    | 'Student Loans'
    | 'Scholarships'
    | 'Applications & Testing'
    | 'Career & Jobs'
    | 'Docs & Templates'
  >('All')

  const filteredFaqs = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return faqs.filter((f) => {
      const matchesCat = category === 'All' || f.category === category
      const hay = (f.q + ' ' + (f.tags?.join(' ') ?? '')).toLowerCase()
      const matchesQ = !needle || hay.includes(needle)
      return matchesCat && matchesQ
    })
  }, [faqs, query, category])

  return (
    <div className="container-prose py-10">
      <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Resources & FAQ</h1>
      <p className="mt-2 text-slate-700">
        Start with FAFSA®, then explore loans, scholarships, testing, jobs, and templates.
      </p>

      {/* QUICK LINKS GRID */}
      <div className="mt-6 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {quickLinks.map((group) => (
          <div key={group.title} className="card p-5">
            <h3 className="text-lg font-bold">{group.title}</h3>
            <ul className="mt-3 space-y-2">
              {group.items.map((i) => (
                <li key={i.href} className="flex items-start gap-2">
                  <a
                    className="text-brand-700 underline"
                    href={i.href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {i.label}
                  </a>
                  {i.note && <span className="text-xs text-slate-500">• {i.note}</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* FAQ CONTROLS */}
      <div className="card p-4 mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <input
          className="border rounded-2xl px-3 py-2"
          placeholder="Search FAQ (e.g., FAFSA ID, deadlines, scholarships)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="border rounded-2xl px-3 py-2"
          value={category}
          onChange={(e) => setCategory(e.target.value as typeof category)}
        >
          <option>All</option>
          <option>FAFSA</option>
          <option>Student Loans</option>
          <option>Scholarships</option>
          <option>Applications & Testing</option>
          <option>Career & Jobs</option>
          <option>Docs & Templates</option>
        </select>
        <div className="col-span-2 flex flex-wrap gap-2">
          <a
            className="btn-primary"
            href="https://studentaid.gov/h/apply-for-aid/fafsa"
            target="_blank"
            rel="noreferrer"
          >
            Start FAFSA®
          </a>
          <a className="btn" href="https://studentaid.gov/fsa-id/" target="_blank" rel="noreferrer">
            Get FSA ID
          </a>
          <a
            className="btn"
            href="https://studentaid.gov/aid-estimator/"
            target="_blank"
            rel="noreferrer"
          >
            Estimate Aid
          </a>
        </div>
      </div>

      {/* FAQ LIST (details/summary) */}
      <div className="mt-6 space-y-3">
        {filteredFaqs.map((f) => (
          <details key={f.id} id={f.id} className="card p-5 group">
            <summary className="cursor-pointer list-none">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">{f.category}</div>
                  <h3 className="text-lg font-bold">{f.q}</h3>
                </div>
                <div className="text-slate-400 group-open:rotate-180 transition">⌄</div>
              </div>
            </summary>
            <div className="mt-3">{f.a}</div>
          </details>
        ))}
        {filteredFaqs.length === 0 && (
          <div className="text-slate-500 text-sm">
            No results. Try a different keyword or category.
          </div>
        )}
      </div>

      {/* Gentle disclaimer */}
      <p className="mt-8 text-xs text-slate-500">
        Links provided for convenience. Always verify deadlines, policies, and requirements on
        official sites.
      </p>
    </div>
  )
}
