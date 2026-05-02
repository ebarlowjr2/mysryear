'use client'

import { useMemo, useState } from 'react'
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

export default function LifePathCareerDetail({ career }: { career: CareerPath }) {
  const [scenario, setScenario] = useState<LifePathScenarioId>('baseline')

  const health = useMemo(() => scoreLifePath(career, scenario), [career, scenario])

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
