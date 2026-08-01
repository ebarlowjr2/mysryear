'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  CAREERS,
  DEFAULT_PARENT_SIMULATION_ASSUMPTIONS,
  SIMULATION_INSTITUTION_LABELS,
  SIMULATION_PATHWAY_LABELS,
  type ParentSimulationAssumptions,
} from '@mysryear/shared'
import LifePathCareerTile from '../LifePathCareerTile'
import { useSimulationInterests } from '../../lib/use-simulation-interests'

function money(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function numberValue(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0
}

export default function SimulationDashboard() {
  const {
    selected,
    loading,
    error,
    clear,
    persist,
    simulation,
    simulations,
    summary,
    refresh,
    createNew,
    duplicate,
  } = useSimulationInterests(5)
  const [saving, setSaving] = useState(false)
  const [shareStudentId, setShareStudentId] = useState('')
  const [shareMessage, setShareMessage] = useState('')
  const [shareStatus, setShareStatus] = useState<string | null>(null)
  const assumptions = {
    ...DEFAULT_PARENT_SIMULATION_ASSUMPTIONS,
    ...(simulation?.assumptions || {}),
  }
  const [draftAssumptions, setDraftAssumptions] = useState<ParentSimulationAssumptions>(assumptions)
  const [title, setTitle] = useState(simulation?.title || 'Parent Simulation')

  useEffect(() => {
    setDraftAssumptions({
      ...DEFAULT_PARENT_SIMULATION_ASSUMPTIONS,
      ...(simulation?.assumptions || {}),
    })
    setTitle(simulation?.title || 'Parent Simulation')
  }, [simulation?.id, simulation?.title, simulation?.assumptions])

  const careers = useMemo(() => {
    const map = new Map(CAREERS.map((career) => [career.id, career]))
    return selected
      .map((id) => map.get(id))
      .filter((career): career is (typeof CAREERS)[number] => Boolean(career))
  }, [selected])

  async function save(status: 'draft' | 'completed') {
    setSaving(true)
    try {
      await persist(selected, {
        assumptions: draftAssumptions,
        title,
        status,
        simulationId: simulation?.id,
      })
    } finally {
      setSaving(false)
    }
  }

  async function share() {
    if (!simulation?.id || !shareStudentId.trim()) return
    setShareStatus(null)
    const res = await fetch('/api/aura/lifepath/simulation', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'share',
        simulationId: simulation.id,
        studentProfileId: shareStudentId.trim(),
        message: shareMessage,
      }),
    })
    const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null
    setShareStatus(
      data?.ok
        ? 'Recommendation shared. It remains read-only for the student.'
        : data?.error || 'Could not share simulation',
    )
  }

  if (loading)
    return <div className="card p-8 text-center font-black">Loading Parent Simulation...</div>

  if (!careers.length) {
    return (
      <div className="card p-8 text-center">
        <div className="badge">Parent Simulation</div>
        <h1 className="mt-3 text-3xl font-black">Try A.U.R.A LifePath safely</h1>
        <p className="mx-auto mt-2 max-w-2xl text-slate-700">
          Explore careers, costs, debt, and milestones without changing your student’s official
          LifePath. Save a draft, come back later, and share a completed recommendation only when
          you are ready.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link href="/aura/lifepath/simulation/select" className="btn-primary">
            Start Parent Simulation
          </Link>
          <button type="button" className="btn-secondary" onClick={() => void createNew()}>
            Create Blank Scenario
          </button>
          <Link href="/aura/lifepath" className="btn-secondary">
            Back to LifePath Options
          </Link>
        </div>
        {simulations.length ? (
          <div className="mt-6 grid gap-3 text-left md:grid-cols-2">
            {simulations.map((item) => (
              <button
                key={item.id}
                type="button"
                className="rounded-2xl border border-slate-200 p-4 text-left hover:border-blue-300"
                onClick={() => void refresh(item.id)}
              >
                <div className="font-black">{item.title || 'Parent Simulation'}</div>
                <div className="mt-1 text-sm text-slate-600">
                  {item.status} • updated{' '}
                  {item.updated_at ? new Date(item.updated_at).toLocaleDateString() : 'recently'}
                </div>
              </button>
            ))}
          </div>
        ) : null}
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
          <p className="mt-2 max-w-2xl text-slate-700">
            These scenarios are parent-owned and private unless you explicitly share one as a
            read-only recommendation. They never update official student selections or tasks.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/aura/lifepath/simulation/select" className="btn-secondary">
            Edit Careers
          </Link>
          <button type="button" className="btn-secondary" onClick={() => void createNew()}>
            New Scenario
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => simulation?.id && void duplicate(simulation.id)}
          >
            Duplicate
          </button>
          <button type="button" className="btn-secondary" onClick={() => void clear()}>
            Delete Draft
          </button>
        </div>
      </div>

      {error ? <div className="text-sm text-rose-700">{error}</div> : null}

      <div className="card p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-600">Saved Scenarios</div>
            <p className="text-sm text-slate-600">Resume drafts or compare completed options.</p>
          </div>
          <select
            value={simulation?.id || ''}
            onChange={(event) => void refresh(event.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2"
          >
            {simulations.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title || 'Parent Simulation'} ({item.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="card p-5">
          <div className="text-sm font-semibold text-slate-600">Scenario Assumptions</div>
          <div className="mt-4 space-y-4">
            <label className="block text-sm font-semibold text-slate-700">
              Scenario name
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2"
              />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Pathway
              <select
                value={draftAssumptions.pathway}
                onChange={(event) =>
                  setDraftAssumptions({
                    ...draftAssumptions,
                    pathway: event.target.value as ParentSimulationAssumptions['pathway'],
                  })
                }
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2"
              >
                {Object.entries(SIMULATION_PATHWAY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              School / training route
              <select
                value={draftAssumptions.institution}
                onChange={(event) =>
                  setDraftAssumptions({
                    ...draftAssumptions,
                    institution: event.target.value as ParentSimulationAssumptions['institution'],
                  })
                }
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2"
              >
                {Object.entries(SIMULATION_INSTITUTION_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700">
                Attendance
                <select
                  value={draftAssumptions.attendance}
                  onChange={(event) =>
                    setDraftAssumptions({
                      ...draftAssumptions,
                      attendance: event.target.value as ParentSimulationAssumptions['attendance'],
                    })
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2"
                >
                  <option value="in_state">In-state</option>
                  <option value="out_of_state">Out-of-state</option>
                </select>
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Housing
                <select
                  value={draftAssumptions.housing}
                  onChange={(event) =>
                    setDraftAssumptions({
                      ...draftAssumptions,
                      housing: event.target.value as ParentSimulationAssumptions['housing'],
                    })
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2"
                >
                  <option value="living_at_home">Living at home</option>
                  <option value="independent">Independent housing</option>
                </select>
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Scholarships/grants
                <input
                  type="number"
                  value={draftAssumptions.scholarshipsAndGrants}
                  onChange={(event) =>
                    setDraftAssumptions({
                      ...draftAssumptions,
                      scholarshipsAndGrants: numberValue(event.target.value),
                    })
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Family contribution
                <input
                  type="number"
                  value={draftAssumptions.familyContribution}
                  onChange={(event) =>
                    setDraftAssumptions({
                      ...draftAssumptions,
                      familyContribution: numberValue(event.target.value),
                    })
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Student earnings
                <input
                  type="number"
                  value={draftAssumptions.studentEarnings}
                  onChange={(event) =>
                    setDraftAssumptions({
                      ...draftAssumptions,
                      studentEarnings: numberValue(event.target.value),
                    })
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Expected borrowing
                <input
                  type="number"
                  value={draftAssumptions.expectedBorrowing ?? ''}
                  onChange={(event) =>
                    setDraftAssumptions({
                      ...draftAssumptions,
                      expectedBorrowing: event.target.value
                        ? numberValue(event.target.value)
                        : null,
                    })
                  }
                  placeholder="Auto-calculate"
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2"
                />
              </label>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              className="btn-secondary"
              disabled={saving}
              onClick={() => void save('draft')}
            >
              {saving ? 'Saving...' : 'Save and Exit'}
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={saving}
              onClick={() => void save('completed')}
            >
              {saving ? 'Saving...' : 'Complete Simulation'}
            </button>
            <Link href="/aura/lifepath" className="btn-secondary">
              Cancel
            </Link>
          </div>
        </div>

        <div className="card p-5">
          <div className="text-sm font-semibold text-slate-600">Scenario Results</div>
          {summary?.results?.length ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <div className="text-xs font-semibold text-slate-600">Average Health</div>
                <div className="mt-1 text-2xl font-black">
                  {summary.averageCareerHealthScore}/100
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-600">Modeled Cost</div>
                <div className="mt-1 text-2xl font-black">{money(summary.totalEstimatedCost)}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-600">Modeled Debt</div>
                <div className="mt-1 text-2xl font-black">{money(summary.totalEstimatedDebt)}</div>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-600">Save the scenario to calculate results.</p>
          )}
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2 pr-4">Career</th>
                  <th className="py-2 pr-4">Health</th>
                  <th className="py-2 pr-4">Cost</th>
                  <th className="py-2 pr-4">Debt</th>
                  <th className="py-2 pr-4">Ready</th>
                </tr>
              </thead>
              <tbody>
                {(summary?.results || []).map((result) => (
                  <tr key={result.careerId} className="border-t border-slate-100">
                    <td className="py-3 pr-4 font-bold">{result.careerTitle}</td>
                    <td className="py-3 pr-4">{result.careerHealthScore}/100</td>
                    <td className="py-3 pr-4">{money(result.estimatedCost)}</td>
                    <td className="py-3 pr-4">{money(result.estimatedDebt)}</td>
                    <td className="py-3 pr-4">~{result.timeToCareerReadinessYears} yrs</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {careers.map((career) => (
          <LifePathCareerTile
            key={career.id}
            career={career}
            detailHref={`/aura/lifepath/simulation/career/${career.id}`}
          />
        ))}
      </div>

      {simulation?.status === 'completed' ? (
        <div className="card p-5">
          <div className="text-sm font-semibold text-slate-600">Share a Recommendation</div>
          <p className="mt-2 text-sm text-slate-700">
            Paste a linked student profile ID to share this completed simulation as read-only. This
            does not change their official LifePath.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <input
              value={shareStudentId}
              onChange={(event) => setShareStudentId(event.target.value)}
              placeholder="student_profile_id"
              className="rounded-2xl border border-slate-200 px-4 py-2"
            />
            <input
              value={shareMessage}
              onChange={(event) => setShareMessage(event.target.value)}
              placeholder="Optional message"
              className="rounded-2xl border border-slate-200 px-4 py-2"
            />
            <button type="button" className="btn-primary" onClick={() => void share()}>
              Share
            </button>
          </div>
          {shareStatus ? <div className="mt-3 text-sm text-slate-700">{shareStatus}</div> : null}
        </div>
      ) : null}
    </div>
  )
}
