import Link from 'next/link'
import {
  getCareerIdsForStudentProfile,
  isFamilyRole,
  requireAuraLifePathContext,
} from '@/lib/aura-lifepath'

function ctaForRole(role: string | null, hasLifePath: boolean) {
  if (role === 'parent' || role === 'guardian') return 'Open LifePath Options'
  if (role === 'counselor') return 'Open Linked Student LifePath'
  return hasLifePath ? 'Open LifePath Dashboard' : 'Start LifePath'
}

function descriptionForRole(role: string | null) {
  if (role === 'parent' || role === 'guardian') {
    return 'Review your student’s official LifePath or try a separate Parent Simulation without changing student progress.'
  }
  if (role === 'counselor') {
    return 'Review approved linked student pathways in a read-only support view.'
  }
  return 'A career pathway simulation: compare routes, costs, debt risk, and improve your Career Health score.'
}

export default async function AuraPage() {
  const context = await requireAuraLifePathContext('/aura')
  const careerIds = await getCareerIdsForStudentProfile(context.officialStudentProfileId)
  const hasLifePath = careerIds.length > 0

  return (
    <section className="container-prose pt-10 pb-20">
      <div className="card p-8">
        <div className="badge">A.U.R.A</div>
        <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight">A.U.R.A</h1>
        <p className="mt-3 max-w-2xl text-slate-700">
          A.U.R.A is where we turn planning into progress—guided experiences that help you map
          decisions and take action.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="card p-6">
            <div className="text-sm font-semibold text-slate-600">
              {isFamilyRole(context.role) ? 'Family Planning' : 'Featured'}
            </div>
            <div className="mt-1 text-2xl font-black">A.U.R.A LifePath</div>
            <p className="mt-2 text-slate-700">{descriptionForRole(context.role)}</p>
            <div className="mt-4">
              <Link href="/aura/lifepath" className="btn-primary">
                {ctaForRole(context.role, hasLifePath)}
              </Link>
            </div>
          </div>

          <div className="card p-6">
            <div className="text-sm font-semibold text-slate-600">Coming Soon</div>
            <div className="mt-1 text-2xl font-black">A.U.R.A Guidance Counselor</div>
            <p className="mt-2 text-slate-700">
              A guided planning assistant that helps families choose next steps and stay on track.
            </p>
            <div className="mt-4">
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                Coming Soon
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <Link href={context.dashboardHref} className="btn-secondary">
            Back to Dashboard
          </Link>
        </div>
      </div>
    </section>
  )
}
