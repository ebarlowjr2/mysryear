const KEY = 'aura_lifepath_top5'

export function loadTopFive(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function saveTopFive(ids: string[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(KEY, JSON.stringify(ids))
}

export function toggleTopFive(ids: string[], id: string, max = 5) {
  if (ids.includes(id)) return ids.filter((x) => x !== id)
  if (ids.length >= max) return ids
  return [...ids, id]
}
