import { requireSessionProfile } from '@/lib/auth'

export default async function TestPrepPage() {
  await requireSessionProfile('/test-prep')

  return (
    <section className="container-prose pt-10 pb-20 space-y-6">
      <div className="card p-8">
        <div className="badge">Test Prep</div>
        <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight">Test Prep</h1>
        <p className="mt-3 text-slate-700 max-w-2xl">
          A simple hub to plan PSAT/SAT/ACT/ASVAB timelines and track what you’ve completed. We’ll
          connect this to your grade level and LifePath goals next.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="text-sm font-semibold text-slate-600">This Week</div>
          <ul className="mt-3 list-disc ml-5 text-slate-700 space-y-2">
            <li>Pick your target test(s) and date window.</li>
            <li>Take one diagnostic practice set.</li>
            <li>Set a weekly study rhythm (2–3 sessions).</li>
          </ul>
          <div className="mt-4 text-xs text-slate-500">
            (MVP: static checklist. Next sprint: saved progress + reminders.)
          </div>
        </div>

        <div className="card p-6">
          <div className="text-sm font-semibold text-slate-600">Recommended Path</div>
          <div className="mt-2 text-slate-700 text-sm space-y-2">
            <div>
              <span className="font-semibold">9th–10th:</span> light prep + build vocabulary/math
              foundations.
            </div>
            <div>
              <span className="font-semibold">11th:</span> choose test dates and run weekly practice.
            </div>
            <div>
              <span className="font-semibold">12th:</span> finalize scores and focus scholarships/applications.
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

