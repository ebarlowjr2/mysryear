'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toggleTopFive } from './storage'
import type { ParentSimulationAssumptions, ParentSimulationSummary } from '@mysryear/shared'

type SimulationRow = {
  id: string
  title: string | null
  status: 'draft' | 'completed' | 'active' | 'archived'
  assumptions?: Partial<ParentSimulationAssumptions> | null
  results?: ParentSimulationSummary | null
  completed_at?: string | null
  created_at?: string | null
  updated_at?: string | null
}

type ApiResponse =
  | {
      ok: true
      simulation?: SimulationRow
      simulations?: SimulationRow[]
      simulationId?: string
      careerIds: string[]
      summary?: ParentSimulationSummary
    }
  | { ok: false; error: string }

export function useSimulationInterests(max = 5) {
  const [selected, setSelected] = useState<string[]>([])
  const [simulation, setSimulation] = useState<SimulationRow | null>(null)
  const [simulations, setSimulations] = useState<SimulationRow[]>([])
  const [summary, setSummary] = useState<ParentSimulationSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const apply = useCallback((data: Extract<ApiResponse, { ok: true }>) => {
    setSelected(data.careerIds || [])
    setSimulation(data.simulation || null)
    setSimulations(data.simulations || [])
    setSummary(data.summary || data.simulation?.results || null)
  }, [])

  const persist = useCallback(
    async (
      ids: string[],
      options?: {
        assumptions?: Partial<ParentSimulationAssumptions>
        title?: string
        status?: 'draft' | 'completed'
        simulationId?: string | null
      },
    ) => {
      setError(null)
      const res = await fetch('/api/aura/lifepath/simulation', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ careerIds: ids, ...options }),
      })
      const data = (await res.json()) as ApiResponse
      if (!data.ok) {
        setError(data.error || 'Failed to save simulation')
        return false
      }
      apply(data)
      return true
    },
    [apply],
  )

  const refresh = useCallback(
    async (simulationId?: string | null) => {
      setLoading(true)
      setError(null)
      try {
        const suffix = simulationId ? `?simulationId=${encodeURIComponent(simulationId)}` : ''
        const res = await fetch(`/api/aura/lifepath/simulation${suffix}`)
        const data = (await res.json()) as ApiResponse
        if (data.ok) apply(data)
        else setError(data.error || 'Failed to load simulation')
      } catch {
        setError('Failed to load simulation')
      } finally {
        setLoading(false)
      }
    },
    [apply],
  )

  useEffect(() => {
    refresh()
  }, [refresh])

  const toggle = useCallback(
    async (id: string) => {
      const next = toggleTopFive(selected, id, max)
      setSelected(next)
      await persist(next, {
        status: simulation?.status === 'completed' ? 'draft' : undefined,
        simulationId: simulation?.id,
      })
    },
    [max, persist, selected, simulation?.id, simulation?.status],
  )

  const clear = useCallback(async () => {
    setSelected([])
    setError(null)
    try {
      await fetch(
        `/api/aura/lifepath/simulation${simulation?.id ? `?simulationId=${encodeURIComponent(simulation.id)}` : ''}`,
        { method: 'DELETE' },
      )
      await refresh()
    } catch {
      // ignore
    }
  }, [refresh, simulation?.id])

  const createNew = useCallback(async () => {
    const res = await fetch('/api/aura/lifepath/simulation', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    })
    const data = (await res.json()) as ApiResponse
    if (data.ok && data.simulation) await refresh(data.simulation.id)
    else if (!data.ok) setError(data.error)
  }, [refresh])

  const duplicate = useCallback(
    async (simulationId: string) => {
      const res = await fetch('/api/aura/lifepath/simulation', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'duplicate', simulationId }),
      })
      const data = (await res.json()) as ApiResponse
      if (data.ok && data.simulation) await refresh(data.simulation.id)
      else if (!data.ok) setError(data.error)
    },
    [refresh],
  )

  return useMemo(
    () => ({
      selected,
      selectedCount: selected.length,
      canContinue: selected.length > 0,
      loading,
      error,
      simulation,
      simulations,
      summary,
      toggle,
      clear,
      refresh,
      persist,
      createNew,
      duplicate,
    }),
    [
      clear,
      createNew,
      duplicate,
      error,
      loading,
      persist,
      refresh,
      selected,
      simulation,
      simulations,
      summary,
      toggle,
    ],
  )
}
