import { requireSessionProfile } from '@/lib/auth'
import ScholarshipWorkspace from './ui/ScholarshipWorkspace'

export const dynamic = 'force-dynamic'

export default async function ScholarshipsPage() {
  await requireSessionProfile('/scholarships')

  return (
    <div className="container-prose py-10 md:py-12">
      <div className="mb-6">
        <div className="badge">A.U.R.A Scholarship Advisor</div>
        <h1 className="mt-3 text-3xl md:text-4xl font-black tracking-tight">Scholarships</h1>
        <p className="mt-2 text-slate-700 max-w-3xl">
          Browse every open award we have confirmed on the sponsor&apos;s own page, then save the ones worth your time. Apply on the official site; MySRYear keeps your checklist and deadlines.
        </p>
      </div>
      <ScholarshipWorkspace />
    </div>
  )
}
