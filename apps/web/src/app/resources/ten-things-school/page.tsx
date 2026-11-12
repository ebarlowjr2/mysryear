import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  BriefcaseBusiness,
  Cloud,
  Cpu,
  FlaskConical,
  GraduationCap,
  LibraryBig,
  MonitorCog,
  Newspaper,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { SCHOOL_RESOURCE_CHECKS } from '@mysryear/shared'

export const metadata: Metadata = {
  title: '10 Things to Check at Your School',
  description:
    'A practical guide to college resources, software, training, equipment, and support that may already be included with tuition.',
}

const icons: LucideIcon[] = [
  LibraryBig,
  Newspaper,
  MonitorCog,
  Cloud,
  Cpu,
  BrainCircuit,
  GraduationCap,
  BriefcaseBusiness,
  FlaskConical,
  Wrench,
]

const questions = [
  'Which databases, journals, and publications can I use with my student login?',
  'Which newspaper or professional publication subscriptions are included?',
  'Which software licenses can I activate with my school email?',
  'Does my school offer cloud credits or managed computing environments?',
  'Can students use research computing, virtual labs, GPUs, or shared hardware?',
  'Which AI tools and verified-student plans are available to me?',
  'Which training platforms or certificate programs does my school already fund?',
  'What can the career center help me do besides review a resume?',
  'Where do I go for research, startup, grant, or prototype support?',
  'What equipment, studios, labs, or makerspaces can students reserve?',
]

export default function TenThingsSchoolPage() {
  return (
    <div className="bg-slate-50">
      <section className="overflow-hidden bg-[#082e61] text-white">
        <div className="container-prose relative py-12 sm:py-16 lg:py-20">
          <div className="pointer-events-none absolute -right-36 top-8 h-96 w-96 rounded-full bg-cyan-400/15 blur-3xl" />
          <Link
            href="/resources"
            className="relative inline-flex items-center gap-2 text-sm font-semibold text-cyan-100 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            All resources
          </Link>

          <div className="relative mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-cyan-200">
                A student resource field guide
              </p>
              <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
                10 things to check at your school before you pay for them elsewhere.
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-200">
                Tuition and student fees may already cover tools, training, technology, and support
                that would otherwise cost hundreds or thousands of dollars. Use this guide to ask
                the right questions before you spend more.
              </p>
            </div>

            <aside className="border-l border-cyan-200/40 pl-5">
              <div className="text-5xl font-black tracking-tight text-cyan-300">10</div>
              <p className="mt-2 text-sm leading-6 text-slate-200">
                practical places to look, ask, and activate with your student account.
              </p>
            </aside>
          </div>
        </div>
      </section>

      <main className="container-prose py-12 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-16">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-700">
              How to use this
            </p>
            <p className="mt-3 text-base leading-7 text-slate-700">
              Start with the item that matters most right now. Save the question below it, then ask
              the campus office, department, or service that owns the resource.
            </p>
            <div className="mt-6 border-l-2 border-accent-500 pl-4 text-sm leading-6 text-slate-700">
              Your school portal, library, IT desk, career center, and student services office are
              all good first stops.
            </div>
          </aside>

          <ol className="divide-y divide-slate-200 border-y border-slate-200">
            {SCHOOL_RESOURCE_CHECKS.map((item, index) => {
              const Icon = icons[index]
              return (
                <li
                  key={item.title}
                  className="group grid gap-5 py-8 sm:grid-cols-[4.5rem_minmax(0,1fr)] sm:gap-7 sm:py-10"
                >
                  <div className="flex items-start gap-3 sm:block">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-base font-black text-brand-700">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <Icon
                      className="mt-2 h-6 w-6 text-cyan-700 sm:mt-5"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                      {item.title}
                    </h2>
                    <p className="mt-3 max-w-3xl text-base leading-7 text-slate-700">
                      {item.description}
                    </p>
                    <div className="mt-5 flex items-start gap-3 border-l-2 border-cyan-500 pl-4">
                      <span className="shrink-0 text-xs font-bold uppercase tracking-[0.12em] text-cyan-800">
                        Ask
                      </span>
                      <p className="text-sm leading-6 text-slate-700">{questions[index]}</p>
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>

        <section className="mt-16 border-t-4 border-accent-500 bg-white p-7 shadow-soft sm:p-10">
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                Check what you already have before buying something new.
              </h2>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-700">
                Before purchasing another subscription, certification, piece of software, or
                expensive equipment, see what your tuition and student fees already include. Also
                verify whether companies offer free student plans with your school email.
              </p>
            </div>
            <Link href="/resources" className="btn-secondary shrink-0">
              Explore more resources
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}
