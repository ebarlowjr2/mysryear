'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import type { ParentSimulationSummary } from '@mysryear/shared'

type Recommendation = {
  id: string
  status: 'active' | 'acknowledged' | 'dismissed'
  message: string | null
  sharedAt: string | null
  acknowledgedAt: string | null
  dismissedAt: string | null
  parentName: string
  simulation: {
    id: string
    title: string | null
    status: string
    results: ParentSimulationSummary | null
    completed_at: string | null
  } | null
}

type ApiResponse =
  | { ok: true; state: 'ready' | 'empty' | 'no-student-profile'; recommendations: Recommendation[] }
  | { ok: false; error: string }

function money(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function date(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : 'recently'
}

export default function StudentRecommendationInbox() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/aura/lifepath/recommendations')
      const data = (await res.json()) as ApiResponse
      if (!data.ok) setError(data.error || 'Could not load recommendations')
      else setRecommendations(data.recommendations || [])
    } catch {
      setError('Could not load recommendations')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function respond(shareId: string, response: 'acknowledged' | 'dismissed') {
    setError(null)
    const res = await fetch('/api/aura/lifepath/recommendations', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ shareId, response }),
    })
    const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null
    if (!data?.ok) {
      setError(data?.error || 'Could not update recommendation')
      return
    }
    await load()
  }

  if (loading) {
    return <div className="card p-8 text-center font-black">Loading parent recommendations...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="badge">Student Inbox</div>
          <h1 className="mt-3 text-3xl font-black">Parent LifePath Recommendations</h1>
          <p className="mt-2 max-w-2xl text-slate-700">
            These are read-only simulations your parent or guardian shared. Acknowledging or
            dismissing one will not import careers, change tasks, or alter your official LifePath.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/aura/lifepath" className="btn-secondary">
            Back to LifePath
          </Link>
          <Link href="/aura" className="btn-secondary">
            Exit to A.U.R.A
          </Link>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          {error}
        </div>
      ) : null}

      {!recommendations.length ? (
        <div className="card p-8 text-center">
          <div className="text-2xl font-black">No shared recommendations yet</div>
          <p className="mt-2 text-slate-700">
            When a parent shares a completed simulation with you, it will appear here. Revoked
            recommendations are removed automatically.
          </p>
        </div>
      ) : null}

      {recommendations.map((item) => {
        const results = item.simulation?.results
        return (
          <article key={item.id} className="card p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="badge">Parent-created recommendation</div>
                <h2 className="mt-3 text-2xl font-black">
                  {item.simulation?.title || 'Parent Simulation'}
                </h2>
                <p className="mt-2 text-sm text-slate-700">
                  Shared by <span className="font-bold">{item.parentName}</span> on{' '}
                  {date(item.sharedAt)}.
                </p>
                {item.message ? (
                  <p className="mt-3 rounded-2xl bg-blue-50 p-4 text-sm text-slate-800">
                    “{item.message}”
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="badge capitalize">{item.status}</span>
                {item.status !== 'acknowledged' ? (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => void respond(item.id, 'acknowledged')}
                  >
                    Acknowledge
                  </button>
                ) : null}
                {item.status !== 'dismissed' ? (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => void respond(item.id, 'dismissed')}
                  >
                    Dismiss
                  </button>
                ) : null}
              </div>
            </div>

            {results ? (
              <div className="mt-5 space-y-5">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-xs font-semibold text-slate-600">Average Health</div>
                    <div className="mt-1 text-2xl font-black">
                      {results.averageCareerHealthScore}/100
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-xs font-semibold text-slate-600">Estimated Cost</div>
                    <div className="mt-1 text-2xl font-black">
                      {money(results.totalEstimatedCost)}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-xs font-semibold text-slate-600">Estimated Debt</div>
                    <div className="mt-1 text-2xl font-black">
                      {money(results.totalEstimatedDebt)}
                    </div>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {results.results.map((career) => (
                    <div key={career.careerId} className="rounded-2xl border border-slate-200 p-4">
                      <div className="text-xs font-semibold text-slate-600">{career.category}</div>
                      <div className="mt-1 text-lg font-black">{career.careerTitle}</div>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="font-semibold text-slate-600">Health:</span>{' '}
                          {career.careerHealthScore}/100
                        </div>
                        <div>
                          <span className="font-semibold text-slate-600">Debt:</span>{' '}
                          {money(career.estimatedDebt)}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-600">Cost:</span>{' '}
                          {money(career.estimatedCost)}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-600">Salary:</span>{' '}
                          {money(career.entrySalaryMin)}-{money(career.entrySalaryMax)}
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-slate-700">{career.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                This recommendation no longer has readable simulation details. It may have been
                revoked or archived by the parent.
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}
