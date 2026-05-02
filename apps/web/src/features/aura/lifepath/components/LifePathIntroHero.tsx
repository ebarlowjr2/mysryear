import Link from 'next/link'

export default function LifePathIntroHero() {
  return (
    <section className="card p-8 overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-50 via-white to-white" />
      <div className="relative">
        <div className="badge">A.U.R.A</div>
        <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight">A.U.R.A LifePath</h1>
        <p className="mt-3 text-slate-700 max-w-2xl">
          Pick your top careers and see a real pathway—timeline, cost, debt pressure, and a Career
          Health score you can improve.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/aura/lifepath/select" className="btn-primary">
            Start My LifePath
          </Link>
          <Link href="/aura" className="btn-secondary">
            Back to A.U.R.A
          </Link>
        </div>

        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="card p-4">
            <div className="text-sm font-semibold text-slate-600">Step 1</div>
            <div className="mt-1 font-black">Choose top 5 careers</div>
            <p className="mt-2 text-sm text-slate-600">Search, filter, and lock in what you care about.</p>
          </div>
          <div className="card p-4">
            <div className="text-sm font-semibold text-slate-600">Step 2</div>
            <div className="mt-1 font-black">Compare pathways</div>
            <p className="mt-2 text-sm text-slate-600">Timeline, route type, cost, starting pay, and risk.</p>
          </div>
          <div className="card p-4">
            <div className="text-sm font-semibold text-slate-600">Step 3</div>
            <div className="mt-1 font-black">Improve your plan</div>
            <p className="mt-2 text-sm text-slate-600">
              Use recommendations and scenarios to raise your Career Health.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
