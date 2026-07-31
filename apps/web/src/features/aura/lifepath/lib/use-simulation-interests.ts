'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toggleTopFive } from './storage'

type ApiResponse =
  | { ok: true; simulation?: { id: string }; simulationId?: string; careerIds: string[] }
  | { ok: false; error: string }

export function useSimulationInterests(max = 5) {
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const persist = useCallback(async (ids: string[]) => {
    setError(null)
    const res = await fetch('/api/aura/lifepath/simulation', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ careerIds: ids }),
    })
    const data = (await res.json()) as ApiResponse
    if (!data.ok) {
      setError(data.error || 'Failed to save simulation')
      return false
    }
    return true
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/aura/lifepath/simulation')
      const data = (await res.json()) as ApiResponse
      if (data.ok) setSelected(data.careerIds)
      else setError(data.error || 'Failed to load simulation')
    } catch {
      setError('Failed to load simulation')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const toggle = useCallback(
    async (id: string) => {
      const next = toggleTopFive(selected, id, max)
      setSelected(next)
      await persist(next)
    },
    [max, persist, selected],
  )

  const clear = useCallback(async () => {
    setSelected([])
    setError(null)
    try {
      await fetch('/api/aura/lifepath/simulation', { method: 'DELETE' })
    } catch {
      // ignore
    }
  }, [])

  return useMemo(
    () => ({ selected, selectedCount: selected.length, canContinue: selected.length > 0, loading, error, toggle, clear, refresh, persist }),
    [clear, error, loading, persist, refresh, selected, toggle],
  )
}
