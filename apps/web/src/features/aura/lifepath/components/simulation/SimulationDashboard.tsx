'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { CAREERS } from '../../data/careers'
import LifePathCareerTile from '../LifePathCareerTile'
import { useSimulationInterests } from '../../lib/use-simulation-interests'

export default function SimulationDashboard() {
  const { selected, loading, error, clear } = useSimulationInterests(5)
  const careers = useMemo(() => {
    const map = new Map(CAREERS.map((career) => [career.id, career]))
    return selected.map((id) => map.get(id)).filter((career): career is (typeof CAREERS)[number] => Boolean(career))
  }, [selected])

  if (loading) return <div className="card p-8 text-center font-black">Loading Parent Simulation...</div>

  if (!careers.length) {
    return (
      <div className="card p-8 text-center">
        <div className="badge">Parent Simulation</div>
        <h1 className="mt-3 text-3xl font-black">Try A.U.R.A LifePath</h1>
        <p className="mt-2 text-slate-700">Your simulation is separate from your student’s official LifePath.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link href="/aura/lifepath/simulation/select" className="btn-primary">Start Parent Simulation</Link>
          <Link href="/aura/lifepath" className="btn-secondary">Back to LifePath Options</Link>
        </div>
        {error ? <div className="mt-3 text-sm text-rose-700">{error}</div> : null}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="badge">Parent Simulation</div>
          <h1 className="mt-3 text-3xl font-black">Parent Simulation Dashboard</h1>
          <p className="mt-2 max-w-2xl text-slate-700">These choices are yours only. They do not update your student’s official LifePath, tasks, scholarships, or dashboard progress.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/aura/lifepath/simulation/select" className="btn-secondary">Edit Simulation</Link>
          <button type="button" className="btn-secondary" onClick={() => void clear()}>Restart</button>
        </div>
      </div>
      {error ? <div className="text-sm text-rose-700">{error}</div> : null}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {careers.map((career) => <LifePathCareerTile key={career.id} career={career} detailHref={`/aura/lifepath/simulation/career/${career.id}`} />)}
      </div>
    </div>
  )
}
