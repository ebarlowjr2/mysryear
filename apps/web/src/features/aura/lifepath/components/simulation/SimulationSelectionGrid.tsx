'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { CAREERS, CATEGORIES } from '../../data/careers'
import CareerSelectionCard from '../CareerSelectionCard'
import TopFiveProgress from '../TopFiveProgress'
import { useSimulationInterests } from '../../lib/use-simulation-interests'

export default function SimulationSelectionGrid() {
  const { selected, selectedCount, canContinue, toggle, clear, error } = useSimulationInterests(5)
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const max = 5

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return CAREERS.filter((career) => {
      const matchesQ = !needle || [career.title, career.description, career.tags.join(' '), career.category].join(' ').toLowerCase().includes(needle)
      const matchesCat = !category || career.category === category
      return matchesQ && matchesCat
    })
  }, [category, q])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="badge">Parent Simulation</div>
          <h1 className="mt-3 text-2xl sm:text-3xl font-black">Choose simulation careers</h1>
          <p className="mt-2 max-w-2xl text-slate-700">Choose up to 5. These choices are isolated from every student profile.</p>
        </div>
        <TopFiveProgress selectedCount={selectedCount} max={max} />
      </div>

      <div className="card p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="text-sm font-semibold text-slate-700">Search</label>
            <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Try: cloud, healthcare, trade..." className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Category</label>
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2">
              <option value="">All categories</option>
              {CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div className="flex items-end gap-3">
            <Link href="/aura/lifepath/simulation" className={`btn-primary w-full justify-center ${!canContinue ? 'pointer-events-none opacity-50' : ''}`}>Continue</Link>
            <button type="button" className="btn-secondary" onClick={() => void clear()}>Clear</button>
          </div>
        </div>
      </div>

      {error ? <div className="text-sm text-rose-700">{error}</div> : null}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((career) => {
          const isSelected = selected.includes(career.id)
          const isAtMax = selectedCount >= max
          return <CareerSelectionCard key={career.id} career={career} selected={isSelected} disabled={!isSelected && isAtMax} onToggle={() => void toggle(career.id)} />
        })}
      </div>
    </div>
  )
}
