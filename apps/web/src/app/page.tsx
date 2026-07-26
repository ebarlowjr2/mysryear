import Section from '@/components/Section'
import FeatureCard from '@/components/FeatureCard'
import Timeline from '@/components/Timeline'
import {
  Apple,
  CalendarClock,
  ClipboardList,
  FileText,
  GraduationCap,
  Layers,
  Search,
  Smartphone,
} from 'lucide-react'
import Link from 'next/link'

export default function Home() {
  const iosTestRequestHref =
    process.env.NEXT_PUBLIC_IOS_TEST_REQUEST_URL ||
    'mailto:quavonojoke@yahoo.com?subject=MySRYear%20iOS%20test%20version%20request&body=Hi%2C%20I%27d%20like%20to%20request%20access%20to%20the%20MySRYear%20iOS%20test%20version.%0A%0AName%3A%0AApple%20ID%20email%3A'

  const timeline = [
    {
      month: 'August–September',
      items: [
        'Finalize senior schedule',
        'List target schools or trade paths',
        'Create Common App / state app accounts',
      ],
    },
    {
      month: 'October',
      items: [
        'Complete FAFSA® (when open)',
        'Request recommendation letters',
        'Book ACT/SAT (if needed)',
      ],
    },
    {
      month: 'November–December',
      items: [
        'Early Action/Decision deadlines',
        'Scholarship application sprints',
        'Audit resume & activities list',
      ],
    },
    {
      month: 'January–March',
      items: ['Regular decision apps', 'Compare aid letters', 'Visit campuses or programs'],
    },
    {
      month: 'April–May',
      items: ['Make your choice', 'Submit housing & deposits', 'Celebrate next steps'],
    },
  ]

  return (
    <>
      {/* Hero */}
      <section className="container-prose pt-14 pb-10">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="badge mb-4">Built for Students & Parents</div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight">
              Your senior year,
              <br className="hidden sm:block" /> organized and stress‑less.
            </h1>
            <p className="mt-4 text-lg text-slate-700">
              My SR Year is a launchpad to manage applications, track scholarships, and plan life
              after high school—college, trades, military, or entrepreneurship.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/dashboard" className="btn-primary">
                Open Dashboard
              </Link>
              <Link href="/how-it-works" className="btn-secondary">
                How it Works
              </Link>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              No account required to explore. Sign in to save progress.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2" aria-label="Mobile app access">
              <a
                href={iosTestRequestHref}
                className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                    <Apple className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-slate-950">iOS Test Version</div>
                    <div className="mt-1 text-xs leading-5 text-slate-600">
                      Request access to test MySRYear on iPhone.
                    </div>
                    <div className="mt-2 text-xs font-bold text-brand-700 group-hover:text-brand-800">
                      Request iOS invite
                    </div>
                  </div>
                </div>
              </a>

              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-left opacity-90">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                    <Smartphone className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-slate-950">Android App</div>
                    <div className="mt-1 text-xs leading-5 text-slate-600">
                      Android testing is on the roadmap after the iOS test cycle.
                    </div>
                    <div className="mt-2 inline-flex rounded-full bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700">
                      Coming soon
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="card p-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="card p-4">
                  <div className="text-sm font-semibold text-slate-600">Next Deadline</div>
                  <div className="text-2xl font-black mt-1">FAFSA® opens</div>
                  <p className="mt-2 text-sm text-slate-600">Add a reminder and checklist.</p>
                </div>
                <div className="card p-4">
                  <div className="text-sm font-semibold text-slate-600">Scholarships</div>
                  <div className="text-2xl font-black mt-1">12 matches</div>
                  <p className="mt-2 text-sm text-slate-600">
                    Filtered by GPA, state, and interests.
                  </p>
                </div>
                <div className="card p-4">
                  <div className="text-sm font-semibold text-slate-600">Applications</div>
                  <div className="text-2xl font-black mt-1">3 in progress</div>
                  <p className="mt-2 text-sm text-slate-600">
                    Keep essays, docs, and due dates together.
                  </p>
                </div>
                <div className="card p-4">
                  <div className="text-sm font-semibold text-slate-600">Parent View</div>
                  <div className="text-2xl font-black mt-1">On track</div>
                  <p className="mt-2 text-sm text-slate-600">
                    Weekly summary emails and check-ins.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <Section
        title="Everything in one place"
        subtitle="Replace sticky notes and scattered tabs with a simple dashboard."
      >
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard
            icon={<GraduationCap />}
            title="Scholarship Finder"
            desc="Curated and scraped sources with filters for GPA, state, major, identity, and deadlines."
            href="/scholarships"
          />
          <FeatureCard
            icon={<CalendarClock />}
            title="Senior Year Timeline"
            desc="Auto‑generated milestones you can customize for your state and goals."
            href="/planner"
          />
          <FeatureCard
            icon={<ClipboardList />}
            title="Application Tracker"
            desc="Track each school or program with tasks, essays, and required documents."
            href="/open-dashboard/applications"
          />
          <FeatureCard
            icon={<FileText />}
            title="Essay & Resume Vault"
            desc="Keep drafts, feedback, and activity lists tidy. Export when ready."
            href="/resources"
          />
          <FeatureCard
            icon={<Search />}
            title="Post‑HS Paths"
            desc="Compare college, trades, military, gap year, and entrepreneurship with real steps."
            href="/resources"
          />
          <FeatureCard
            icon={<Layers />}
            title="Parent & Counselor View"
            desc="Optional shared view with weekly summaries (no student surveillance)."
            href="/dashboard"
          />
          <FeatureCard
            icon={<Layers />}
            title="A.U.R.A LifePath"
            desc="A guided career pathway simulation with cost, debt, and a Career Health score you can improve."
            href="/aura/lifepath"
          />
        </div>
      </Section>

      {/* Timeline */}
      <Section
        id="timeline"
        title="A clear path from August to May"
        subtitle="Use ours or make your own."
      >
        <div className="grid lg:grid-cols-2 gap-10 items-start">
          <Timeline data={timeline} />
          <div className="card p-6">
            <h3 className="text-xl font-bold">Why it works</h3>
            <ul className="mt-3 list-disc ml-5 space-y-2 text-slate-700">
              <li>Structured weekly checklists prevent last‑minute scrambles.</li>
              <li>Scholarship feeds reduce busywork and save money.</li>
              <li>Parent view keeps adults looped in without micromanaging.</li>
            </ul>
            <div className="mt-6 flex gap-3">
              <a href="/how-it-works" className="btn-primary">
                See the flow
              </a>
              <a href="/dashboard" className="btn-secondary">
                Try the demo
              </a>
            </div>
          </div>
        </div>
      </Section>

      {/* CTA */}
      <section className="container-prose pb-24">
        <div className="card p-8 text-center">
          <h3 className="text-2xl sm:text-3xl font-black">Ready to get organized?</h3>
          <p className="mt-2 text-slate-700">
            Start with the dashboard, then connect a parent/counselor if you want help.
          </p>
          <div className="mt-4">
            <a className="btn-primary" href="/dashboard">
              Open the Dashboard
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
