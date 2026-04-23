'use client'

import type { LifePathScenarioId } from '../lib/types'
import { SCENARIOS } from '../lib/scenarios'

type Props = {
  value: LifePathScenarioId
  onChange(next: LifePathScenarioId): void
}

export default function LifePathScenarioToggle({ value, onChange }: Props) {
  return (
    <div className="card p-5">
      <div className="text-sm font-semibold text-slate-600">Scenario</div>
      <p className="mt-1 text-sm text-slate-700">
        Try a few paths. The timeline, cost, debt risk, and Career Health will update.
      </p>

      <div className="mt-4 grid sm:grid-cols-2 gap-3">
        {SCENARIOS.map((s) => {
          const selected = s.id === value
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onChange(s.id)}
              className={`card p-4 text-left transition hover:shadow-soft ${
                selected ? 'border-brand-300 bg-brand-50' : ''
              }`}
            >
              <div className="font-black">{s.label}</div>
              <div className="mt-1 text-sm text-slate-700">{s.description}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
