'use client'

import { useMemo, useState } from 'react'
import CareerSelectionCard from './CareerSelectionCard'
import TopFiveProgress from './TopFiveProgress'
import { CAREERS, CATEGORIES } from '../data/careers'
import { loadTopFive, saveTopFive, toggleTopFive } from '../lib/storage'
import Link from 'next/link'

export default function CareerSelectionGrid() {
  const [selected, setSelected] = useState<string[]>(() => loadTopFive())
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const max = 5

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return CAREERS.filter((c) => {
      const matchesQ =
        !needle ||
        [c.title, c.description, c.tags.join(' '), c.category].join(' ').toLowerCase().includes(needle)
      const matchesCat = !category || c.category === category
      return matchesQ && matchesCat
    })
  }, [q, category])

  function onToggle(id: string) {
    const next = toggleTopFive(selected, id, max)
    setSelected(next)
    saveTopFive(next)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-4 lg:items-end lg:justify-between">
        <div>
          <div className="badge">A.U.R.A LifePath</div>
          <h1 className="mt-3 text-2xl sm:text-3xl font-black">Select your top careers</h1>
          <p className="mt-2 text-slate-700 max-w-2xl">
            Choose up to 5. You can change these anytime.
          </p>
        </div>
        <TopFiveProgress selectedCount={selected.length} max={max} />
      </div>

      <div className="card p-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="text-sm font-semibold text-slate-700">Search</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Try: cloud, healthcare, trade…"
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 bg-white"
            >
              <option value="">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-3">
            <Link
              href="/aura/lifepath/compare"
              className={`btn-primary w-full justify-center ${selected.length < 1 ? 'pointer-events-none opacity-50' : ''}`}
            >
              Continue
            </Link>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setSelected([])
                saveTopFive([])
              }}
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((career) => {
          const isSelected = selected.includes(career.id)
          const isAtMax = selected.length >= max
          return (
            <CareerSelectionCard
              key={career.id}
              career={career}
              selected={isSelected}
              disabled={!isSelected && isAtMax}
              onToggle={() => onToggle(career.id)}
            />
          )
        })}
      </div>
    </div>
  )
}
