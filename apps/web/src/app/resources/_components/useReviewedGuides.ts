'use client'

import { useEffect, useState } from 'react'

// Browser-local "Mark as reviewed" progress. We store ONLY guide slugs — never
// any personal information — under a single localStorage key. All access is
// wrapped in try/catch so private-browsing or blocked storage never breaks the
// page. A tiny in-memory pub/sub keeps every component on the page in sync.
const STORAGE_KEY = 'mysryear:reviewed-guides'

type Listener = (slugs: string[]) => void

let memorySlugs: string[] | null = null
const listeners = new Set<Listener>()

function read(): string[] {
  if (memorySlugs) return memorySlugs
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null
    const parsed = raw ? (JSON.parse(raw) as unknown) : []
    memorySlugs = Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    memorySlugs = []
  }
  return memorySlugs
}

function write(slugs: string[]) {
  memorySlugs = slugs
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs))
    }
  } catch {
    // Ignore storage failures — progress is a convenience, not critical state.
  }
  listeners.forEach((listener) => listener(slugs))
}

export type ReviewedGuidesApi = {
  hydrated: boolean
  reviewedSlugs: string[]
  reviewedCount: number
  isReviewed: (slug: string) => boolean
  toggle: (slug: string) => void
  markReviewed: (slug: string) => void
  clearAll: () => void
}

export function useReviewedGuides(): ReviewedGuidesApi {
  const [hydrated, setHydrated] = useState(false)
  const [slugs, setSlugs] = useState<string[]>([])

  useEffect(() => {
    setSlugs(read())
    setHydrated(true)
    const listener: Listener = (next) => setSlugs([...next])
    listeners.add(listener)

    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        memorySlugs = null
        setSlugs(read())
      }
    }
    window.addEventListener('storage', onStorage)
    return () => {
      listeners.delete(listener)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const isReviewed = (slug: string) => slugs.includes(slug)

  const toggle = (slug: string) => {
    const current = read()
    const next = current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug]
    write(next)
  }

  const markReviewed = (slug: string) => {
    const current = read()
    if (!current.includes(slug)) write([...current, slug])
  }

  const clearAll = () => write([])

  return {
    hydrated,
    reviewedSlugs: slugs,
    reviewedCount: slugs.length,
    isReviewed,
    toggle,
    markReviewed,
    clearAll,
  }
}
