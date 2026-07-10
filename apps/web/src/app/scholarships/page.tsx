import { requireSessionProfile } from '@/lib/auth'
import ScholarshipWorkspace from './ui/ScholarshipWorkspace'

export const dynamic = 'force-dynamic'

export default async function ScholarshipsPage() {
  await requireSessionProfile('/scholarships')

  return (
    <div className="container-prose py-14 md:py-16">
      <div className="mb-8">
        <div className="badge">A.U.R.A Scholarship Advisor</div>
        <h1 className="mt-3 text-4xl font-black tracking-tight">Scholarship Readiness</h1>
        <p className="mt-3 text-slate-700 max-w-3xl">
          MySRYear now matches scholarships against the active student profile: academics, portfolio, LifePath interests, uploads, location, and readiness signals.
        </p>
      </div>
      <ScholarshipWorkspace />
    </div>
  )
}
