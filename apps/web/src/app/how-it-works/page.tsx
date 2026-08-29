import Link from 'next/link'

export const metadata = {
  title: 'How It Works',
  description:
    'How students and families use MySRYear to plan high school, careers, and next steps.',
}

const steps = [
  ['Create your account', 'Choose your role so MySRYear can route you to the right dashboard.'],
  [
    'Set up a student profile',
    'Students select school and graduation year. Parents can create a managed profile and invite the student to claim it later.',
  ],
  [
    'Build the plan',
    'Use the Student Success Dashboard, LifePath, uploads, portfolio, and scholarship tools to organize next steps.',
  ],
  [
    'Invite support',
    'Parents, guardians, and counselors can help through approved relationships without taking over the student account.',
  ],
]

export default function HowItWorksPage() {
  return (
    <section className="container-prose py-16">
      <div className="badge">How It Works</div>
      <h1 className="mt-4 text-4xl font-black tracking-tight">
        One student plan, connected support.
      </h1>
      <p className="mt-4 max-w-3xl text-lg text-slate-700">
        MySRYear gives students a planning container that can grow from ninth grade through senior
        year while parents, guardians, counselors, and opportunity partners support the journey.
      </p>

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {steps.map(([title, description], index) => (
          <div key={title} className="card p-6">
            <div className="text-sm font-black text-brand-700">Step {index + 1}</div>
            <h2 className="mt-2 text-xl font-black text-slate-950">{title}</h2>
            <p className="mt-2 text-slate-700">{description}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link className="btn-primary" href="/signup">
          Create Account
        </Link>
        <Link className="btn-secondary" href="/resources">
          View Resources
        </Link>
      </div>
    </section>
  )
}
