'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { CAREERS } from '../data/careers'
import { loadTopFive } from '../lib/storage'
import CareerComparisonCard from './CareerComparisonCard'
import type { LifePathScenarioId } from '../lib/types'

export default function LifePathCompareDashboard() {
  const [scenario] = useState<LifePathScenarioId>('baseline')
  const selectedIds = loadTopFive()

  const selected = useMemo(() => {
    const map = new Map(CAREERS.map((c) => [c.id, c]))
    return selectedIds
      .map((id) => map.get(id))
      .filter((c): c is (typeof CAREERS)[number] => Boolean(c))
  }, [selectedIds])

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-4 lg:items-end lg:justify-between">
        <div>
          <div className="badge">A.U.R.A LifePath</div>
          <h1 className="mt-3 text-2xl sm:text-3xl font-black">Compare my top careers</h1>
          <p className="mt-2 text-slate-700 max-w-2xl">
            Side-by-side summary to help you spot the tradeoffs—cost, time, and debt pressure.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/aura/lifepath/select" className="btn-secondary">
            Edit top 5
          </Link>
        </div>
      </div>

      {selected.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="text-2xl font-black">No careers selected yet</div>
          <p className="mt-2 text-slate-700">Pick at least one career to generate your LifePath.</p>
          <div className="mt-4">
            <Link href="/aura/lifepath/select" className="btn-primary">
              Select careers
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {selected.map((career) => (
            <CareerComparisonCard key={career.id} career={career} scenario={scenario} />
          ))}
        </div>
      )}
    </div>
  )
}
