'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import type { CareerPath, LifePathScenarioId } from '../lib/types'
import { scoreLifePath } from '../lib/scoring'
import LifePathScenarioToggle from './LifePathScenarioToggle'
import CareerHealthMeter from './CareerHealthMeter'
import CareerPathTimeline from './CareerPathTimeline'
import CostBreakdownCard from './CostBreakdownCard'
import DebtRiskCard from './DebtRiskCard'
import RecommendationList from './RecommendationList'
import CohortOpportunityCard from './CohortOpportunityCard'

type RelatedScholarship = { id: string; title: string; organization: string | null; amount: number | null; deadline: string | null }
type RelatedOpportunity = { id: string; title: string; opportunity_type: string; career_category: string | null; deadline: string | null }

type LifePathTask = {
  id: string
  title: string
  description?: string | null
  status: 'todo' | 'doing' | 'done'
  career_id?: string | null
  uploaded_file_id?: string | null
  uploaded_files?: { id: string; file_name: string } | null
}

export default function LifePathCareerDetail({ career }: { career: CareerPath }) {
  const [scenario, setScenario] = useState<LifePathScenarioId>('baseline')
  const [tasks, setTasks] = useState<LifePathTask[]>([])
  const [taskError, setTaskError] = useState<string | null>(null)
  const [relatedScholarships, setRelatedScholarships] = useState<RelatedScholarship[]>([])
  const [relatedOpportunities, setRelatedOpportunities] = useState<RelatedOpportunity[]>([])

  const health = useMemo(() => scoreLifePath(career, scenario), [career, scenario])


  async function loadRelatedResources() {
    const scholarshipParams = `careerId=${encodeURIComponent(career.id)}&careerCategory=${encodeURIComponent(career.category)}&limit=3`
    const opportunityParams = `careerCategory=${encodeURIComponent(career.category)}&limit=3`
    const [scholarshipRes, opportunityRes] = await Promise.all([
      fetch(`/api/scholarships/related?${scholarshipParams}`),
      fetch(`/api/opportunities?${opportunityParams}`),
    ])
    const scholarshipJson = (await scholarshipRes.json().catch(() => null)) as { ok?: boolean; scholarships?: RelatedScholarship[] } | null
    const opportunityJson = (await opportunityRes.json().catch(() => null)) as { ok?: boolean; opportunities?: RelatedOpportunity[] } | null
    if (scholarshipJson?.ok) setRelatedScholarships(scholarshipJson.scholarships || [])
    if (opportunityJson?.ok) setRelatedOpportunities(opportunityJson.opportunities || [])
  }

  async function loadTasks() {
    setTaskError(null)
    const res = await fetch(`/api/aura/lifepath/tasks?careerId=${encodeURIComponent(career.id)}`)
    const json = (await res.json().catch(() => null)) as { ok?: boolean; tasks?: LifePathTask[]; error?: string } | null
    if (!res.ok || !json?.ok) {
      setTaskError(json?.error || 'Could not load LifePath tasks')
      return
    }
    setTasks(json.tasks || [])
  }

  useEffect(() => {
    void loadTasks()
    void loadRelatedResources()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [career.id])

  async function toggleTask(task: LifePathTask) {
    const next = task.status === 'done' ? 'todo' : 'done'
    const res = await fetch('/api/aura/lifepath/tasks', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: task.id, status: next }),
    })
    const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null
    if (!res.ok || !json?.ok) {
      setTaskError(json?.error || 'Could not update task')
      return
    }
    await loadTasks()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-4 lg:items-end lg:justify-between">
        <div>
          <div className="badge">A.U.R.A LifePath</div>
          <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight">{career.title}</h1>
          <p className="mt-2 text-slate-700 max-w-2xl">{career.description}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="badge">{career.category}</span>
            <span className="badge">{career.pathwayType}</span>
            <span className="badge">~{health.adjustedTimelineYears} yrs</span>
            <span className="badge">
              ${career.startingSalaryMin.toLocaleString()}–${career.startingSalaryMax.toLocaleString()} start
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <Link href="/aura/lifepath/compare" className="btn-secondary">
            Back to Compare
          </Link>
        </div>
      </div>

      <LifePathScenarioToggle value={scenario} onChange={setScenario} />

      <div className="grid lg:grid-cols-2 gap-6">
        <CareerHealthMeter score={health.score} label={health.label} />
        <DebtRiskCard debtRisk={health.debtRisk} costMax={health.adjustedCostMax} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <CareerPathTimeline milestones={career.milestones} />
        <div className="space-y-6">
          <CostBreakdownCard
            pathwayType={career.pathwayType}
            costMin={health.adjustedCostMin}
            costMax={health.adjustedCostMax}
          />
          <RecommendationList items={career.recommendations} />
        </div>
      </div>


      <div className="card p-6">
        <div className="text-sm font-semibold text-slate-600">LifePath Tasks</div>
        <p className="mt-2 text-sm text-slate-700">Career-specific tasks plus any general LifePath tasks for this student profile.</p>
        {taskError ? <div className="mt-3 text-sm text-rose-700">{taskError}</div> : null}
        <div className="mt-4 space-y-3">
          {tasks.length === 0 ? <div className="text-sm text-slate-600">No saved LifePath tasks yet. Re-save career choices to generate starter tasks.</div> : tasks.map((task) => (
            <button
              key={task.id}
              type="button"
              onClick={() => { void toggleTask(task) }}
              className="w-full rounded-2xl border border-slate-200 p-4 text-left hover:border-blue-300 transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-bold text-slate-950">{task.title}</div>
                  {task.description ? <div className="mt-1 text-sm text-slate-600">{task.description}</div> : null}
                  {task.uploaded_files?.file_name ? <div className="mt-2 text-xs font-semibold text-blue-700">Proof: {task.uploaded_files.file_name}</div> : null}
                </div>
                <span className={task.status === 'done' ? 'badge bg-emerald-50 text-emerald-700' : 'badge'}>{task.status === 'done' ? 'Done' : 'Todo'}</span>
              </div>
            </button>
          ))}
        </div>
      </div>


      <div className="card p-6">
        <div className="text-sm font-semibold text-slate-600">Related Scholarships + Opportunities</div>
        <p className="mt-2 text-sm text-slate-700">Matched by career category and related career tags. This will become part of the A.U.R.A recommendation engine.</p>
        <div className="mt-4 grid md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="font-bold text-slate-950">Related Scholarships</div>
            <div className="mt-3 space-y-3">
              {relatedScholarships.length === 0 ? <div className="text-sm text-slate-600">No related scholarships tagged yet.</div> : relatedScholarships.map((item) => (
                <Link key={item.id} href="/scholarships" className="block rounded-xl border border-slate-100 p-3 hover:bg-slate-50">
                  <div className="font-semibold text-sm">{item.title}</div>
                  <div className="mt-1 text-xs text-slate-600">{item.organization || 'Scholarship Provider'}{item.amount ? ` • $${Number(item.amount).toLocaleString()}` : ''}</div>
                </Link>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="font-bold text-slate-950">Related Internships / Volunteer Opportunities</div>
            <div className="mt-3 space-y-3">
              {relatedOpportunities.length === 0 ? <div className="text-sm text-slate-600">No related business opportunities posted yet.</div> : relatedOpportunities.map((item) => (
                <Link key={item.id} href={`/opportunities/${item.id}`} className="block rounded-xl border border-slate-100 p-3 hover:bg-slate-50">
                  <div className="font-semibold text-sm">{item.title}</div>
                  <div className="mt-1 text-xs text-slate-600">{item.opportunity_type.replaceAll('_', ' ')}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="text-sm font-semibold text-slate-600">Cohorts / Groups / Opportunities</div>
        <p className="mt-2 text-sm text-slate-700">
          Starter suggestions to increase support and momentum. (Mock integrations for now.)
        </p>
        <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {career.cohorts.map((c) => (
            <CohortOpportunityCard key={c.name} item={c} />
          ))}
        </div>
      </div>
    </div>
  )
}
