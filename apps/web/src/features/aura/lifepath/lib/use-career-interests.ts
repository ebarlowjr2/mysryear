'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { loadTopFive, saveTopFive, toggleTopFive } from './storage'

type ApiResponse =
  | { ok: true; studentProfileId: string; careerIds: string[] }
  | { ok: false; error: string }

export function useCareerInterests(max = 5) {
  const [selected, setSelected] = useState<string[]>(() => loadTopFive())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const persist = useCallback(
    async (ids: string[]) => {
      setError(null)
      saveTopFive(ids) // fallback for offline/dev convenience
      const res = await fetch('/api/aura/lifepath/interests', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ careerIds: ids }),
      })
      const data = (await res.json()) as ApiResponse
      if (!data.ok) {
        setError(data.error || 'Failed to save')
        return false
      }
      return true
    },
    [setError],
  )

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/aura/lifepath/interests', { method: 'GET' })
      const data = (await res.json()) as ApiResponse
      if (data.ok) {
        setSelected(data.careerIds)
        saveTopFive(data.careerIds)
      } else {
        setError(data.error || 'Failed to load')
      }
    } catch {
      setError('Failed to load')
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
    saveTopFive([])
    setError(null)
    try {
      await fetch('/api/aura/lifepath/interests', { method: 'DELETE' })
    } catch {
      // ignore
    }
  }, [])

  const selectedCount = selected.length
  const canContinue = selectedCount > 0

  return useMemo(
    () => ({ selected, selectedCount, canContinue, loading, error, toggle, clear, refresh, persist }),
    [canContinue, clear, error, loading, refresh, selected, selectedCount, toggle, persist],
  )
}

