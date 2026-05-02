import Link from 'next/link'
import type { CareerPath, LifePathScenarioId } from '../lib/types'
import { scoreLifePath } from '../lib/scoring'

function debtBadge(risk: string) {
  if (risk === 'low') return { label: 'Lower Cost Path', className: 'bg-emerald-50 text-emerald-700' }
  if (risk === 'medium') return { label: 'Certification Friendly', className: 'bg-amber-50 text-amber-700' }
  return { label: 'High Debt Risk', className: 'bg-rose-50 text-rose-700' }
}

type Props = {
  career: CareerPath
  scenario: LifePathScenarioId
}

export default function CareerComparisonCard({ career, scenario }: Props) {
  const health = scoreLifePath(career, scenario)
  const badge = debtBadge(health.debtRisk)

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-600">{career.category}</div>
          <div className="mt-1 text-xl font-black">{career.title}</div>
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${badge.className}`}>{badge.label}</span>
      </div>

      <p className="mt-3 text-sm text-slate-700 line-clamp-3">{career.description}</p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="card p-3">
          <div className="text-xs font-semibold text-slate-600">Timeline</div>
          <div className="mt-1 font-black">~{health.adjustedTimelineYears} yrs</div>
        </div>
        <div className="card p-3">
          <div className="text-xs font-semibold text-slate-600">Route</div>
          <div className="mt-1 font-black">{career.pathwayType}</div>
        </div>
        <div className="card p-3">
          <div className="text-xs font-semibold text-slate-600">Est. Cost</div>
          <div className="mt-1 font-black">
            ${health.adjustedCostMin.toLocaleString()}–${health.adjustedCostMax.toLocaleString()}
          </div>
        </div>
        <div className="card p-3">
          <div className="text-xs font-semibold text-slate-600">Starting Pay</div>
          <div className="mt-1 font-black">
            ${career.startingSalaryMin.toLocaleString()}–${career.startingSalaryMax.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-slate-600">Career Health</div>
          <div className="mt-1 text-lg font-black">
            {health.score}/100 <span className="text-slate-600 font-semibold">({health.label})</span>
          </div>
        </div>
        <Link href={`/aura/lifepath/career/${career.id}`} className="btn-primary">
          View Path
        </Link>
      </div>
    </div>
  )
}
