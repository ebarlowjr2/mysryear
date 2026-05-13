'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { CAREERS } from '../data/careers'
import LifePathCareerTile from './LifePathCareerTile'
import { useCareerInterests } from '../lib/use-career-interests'

export default function LifePathDashboard() {
  const { selected, loading, error, clear } = useCareerInterests(5)

  const careers = useMemo(() => {
    const map = new Map(CAREERS.map((c) => [c.id, c]))
    return selected
      .map((id) => map.get(id))
      .filter((c): c is (typeof CAREERS)[number] => Boolean(c))
  }, [selected])

  if (loading) {
    return (
      <div className="card p-8 text-center">
        <div className="text-lg font-black">Loading your LifePath…</div>
      </div>
    )
  }

  if (careers.length === 0) {
    return (
      <div className="card p-8 text-center">
        <div className="text-2xl font-black">Start your LifePath</div>
        <p className="mt-2 text-slate-700">
          Pick your top careers and we’ll build a pathway with cost, debt risk, and a Career Health
          score.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 justify-center">
          <Link href="/aura/lifepath/select" className="btn-primary">
            Start My LifePath
          </Link>
          <Link href="/aura" className="btn-secondary">
            Back to A.U.R.A
          </Link>
        </div>
        {error && <div className="mt-3 text-sm text-rose-700">{error}</div>}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="badge">A.U.R.A LifePath</div>
          <h1 className="mt-3 text-2xl sm:text-3xl font-black">My LifePath Dashboard</h1>
          <p className="mt-2 text-slate-700 max-w-2xl">
            Your top career pathways—compact view, fast decisions. Open a path to see the full plan.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/aura/lifepath/select" className="btn-secondary">
            Edit Career Choices
          </Link>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              // UI confirmation later; keep simple for now.
              void clear()
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {error && <div className="text-sm text-rose-700">{error}</div>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {careers.map((career) => (
          <LifePathCareerTile key={career.id} career={career} />
        ))}
      </div>
    </div>
  )
}

