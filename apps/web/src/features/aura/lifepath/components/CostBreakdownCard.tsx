import type { PathwayType } from '../lib/types'

type Props = {
  pathwayType: PathwayType
  costMin: number
  costMax: number
}

function estimateParts(pathwayType: PathwayType, totalMin: number, totalMax: number) {
  // Rough breakdown that feels plausible.
  const tuitionPct = pathwayType === 'degree' ? 0.7 : pathwayType === 'mixed' ? 0.55 : 0.35
  const feesPct = 0.08
  const toolsPct = pathwayType === 'apprenticeship' ? 0.18 : 0.12
  const booksPct = 0.1

  function part(pct: number) {
    return {
      min: Math.round(totalMin * pct),
      max: Math.round(totalMax * pct),
    }
  }

  return {
    tuition: part(tuitionPct),
    fees: part(feesPct),
    books: part(booksPct),
    tools: part(toolsPct),
  }
}

export default function CostBreakdownCard({ pathwayType, costMin, costMax }: Props) {
  const parts = estimateParts(pathwayType, costMin, costMax)

  return (
    <div className="card p-5">
      <div className="text-sm font-semibold text-slate-600">Cost Breakdown (Estimate)</div>
      <div className="mt-2 text-2xl font-black">
        ${costMin.toLocaleString()}–${costMax.toLocaleString()}
      </div>
      <p className="mt-2 text-sm text-slate-600">
        This is a starter estimate you can refine later with real school, aid, and location info.
      </p>

      <div className="mt-4 grid sm:grid-cols-2 gap-3">
        <div className="card p-3">
          <div className="text-xs font-semibold text-slate-600">Tuition / Program</div>
          <div className="mt-1 font-black">
            ${parts.tuition.min.toLocaleString()}–${parts.tuition.max.toLocaleString()}
          </div>
        </div>
        <div className="card p-3">
          <div className="text-xs font-semibold text-slate-600">Cert / Testing Fees</div>
          <div className="mt-1 font-black">
            ${parts.fees.min.toLocaleString()}–${parts.fees.max.toLocaleString()}
          </div>
        </div>
        <div className="card p-3">
          <div className="text-xs font-semibold text-slate-600">Books</div>
          <div className="mt-1 font-black">
            ${parts.books.min.toLocaleString()}–${parts.books.max.toLocaleString()}
          </div>
        </div>
        <div className="card p-3">
          <div className="text-xs font-semibold text-slate-600">Tools / Equipment</div>
          <div className="mt-1 font-black">
            ${parts.tools.min.toLocaleString()}–${parts.tools.max.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  )
}
