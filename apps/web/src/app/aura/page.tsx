import Link from 'next/link'
import { requireSessionProfile } from '@/lib/auth'

export default async function AuraPage() {
  await requireSessionProfile('/aura')
  return (
    <section className="container-prose pt-10 pb-20">
      <div className="card p-8">
        <div className="badge">A.U.R.A</div>
        <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight">A.U.R.A</h1>
        <p className="mt-3 text-slate-700 max-w-2xl">
          A.U.R.A is where we turn planning into progress—guided experiences that help you map
          decisions and take action.
        </p>

        <div className="mt-8 grid md:grid-cols-2 gap-6">
          <div className="card p-6">
            <div className="text-sm font-semibold text-slate-600">Featured</div>
            <div className="mt-1 text-2xl font-black">A.U.R.A LifePath</div>
            <p className="mt-2 text-slate-700">
              A career pathway simulation: compare routes, costs, debt risk, and improve your Career
              Health score.
            </p>
            <div className="mt-4">
              <Link href="/aura/lifepath" className="btn-primary">
                Open LifePath
              </Link>
            </div>
          </div>

          <div className="card p-6">
            <div className="text-sm font-semibold text-slate-600">Coming Soon</div>
            <div className="mt-1 text-2xl font-black">More A.U.R.A Modules</div>
            <p className="mt-2 text-slate-700">
              We&apos;ll add more guided experiences here as the redesign evolves.
            </p>
            <div className="mt-4">
              <Link href="/dashboard" className="btn-secondary">
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
