import type { CareerPath } from '../lib/types'

type Props = {
  career: CareerPath
  selected: boolean
  disabled?: boolean
  onToggle(): void
}

export default function CareerSelectionCard({ career, selected, disabled, onToggle }: Props) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      className={`card p-4 text-left transition hover:shadow-soft focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60 disabled:cursor-not-allowed ${
        selected ? 'border-brand-300 bg-brand-50' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-600">{career.category}</div>
          <div className="mt-1 text-lg font-black">{career.title}</div>
        </div>
        {selected ? (
          <span className="badge">Selected</span>
        ) : (
          <span className="text-xs font-semibold text-slate-500">Pick</span>
        )}
      </div>
      <p className="mt-2 text-sm text-slate-700 line-clamp-3">{career.description}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="badge">{career.pathwayType}</span>
        <span className="badge">~{career.timelineYears} yrs</span>
        <span className="badge">${career.estimatedCostMin.toLocaleString()}–${career.estimatedCostMax.toLocaleString()}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {career.tags.slice(0, 4).map((t) => (
          <span key={t} className="text-xs text-slate-500">
            #{t}
          </span>
        ))}
      </div>
    </button>
  )
}
