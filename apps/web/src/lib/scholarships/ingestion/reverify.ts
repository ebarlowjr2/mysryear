/**
 * Sponsor-page reverification.
 *
 * Refreshes a record's verification timestamp ONLY on fresh evidence that
 * applications are still open: the sponsor's page, fetched now, still
 * publishes the stored closing date and does not say applications are
 * closed. Anything else leaves the stored evidence untouched:
 *
 *   page still shows the closing date      -> confirmed (last_verified_at = now)
 *   page says applications are closed      -> needs_review (hidden; human confirms early closure)
 *   HTTP 404 / 410                         -> broken (hidden)
 *   other status / network error / no date -> no change
 *
 * Requests are plain GETs of public sponsor pages with a generic user agent;
 * they never include student data.
 */

export type PageFetcher = (url: string) => Promise<{ status: number; text: string }>

export type ReverifyCandidate = {
  id: string
  source: string | null
  title?: string | null
  source_url: string | null
  application_url?: string | null
  deadline: string | null
  deadline_type?: string | null
  last_verified_at: string | null
}

export type ReverifyOutcome = 'confirmed' | 'closure_reported' | 'broken' | 'no_evidence' | 'fetch_error'

export type ReverifyDecision = {
  id: string
  source: string | null
  url: string | null
  outcome: ReverifyOutcome
  detail: string
  patch: Record<string, unknown> | null
  /**
   * Set by the caller that persists `patch`: true only after the database
   * confirmed the write; false when the write was rejected or matched no row.
   * Undefined when there was nothing to write (or not yet persisted).
   */
  applied?: boolean
  /** Database error when `applied` is false. */
  writeError?: string
}

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']

const CLOSURE_PATTERNS = [
  /applications?\s+(?:are|is)\s+(?:now\s+)?closed/i,
  /no longer accepting (?:new )?applications/i,
  /not accepting new applications/i,
  /application (?:period|window) (?:has )?(?:ended|closed)/i,
  /reached (?:our|its|the) [a-z ]{0,40}capacity/i,
  /applications? closed early/i,
]

export function pageText(html: string): string {
  return html
    .replace(/<(script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

/** All the ways a sponsor might print a YYYY-MM-DD date. */
export function dateVariants(isoDate: string): string[] {
  const m = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return []
  const [, y, mm, dd] = m
  const month = MONTHS[Number(mm) - 1]
  const short = month.slice(0, 3)
  const day = String(Number(dd))
  const suffix = ['11', '12', '13'].includes(day) ? 'th' : ({ '1': 'st', '2': 'nd', '3': 'rd' } as Record<string, string>)[day.slice(-1)] ?? 'th'
  return [
    `${month} ${day}, ${y}`,
    `${month} ${day} ${y}`,
    `${month} ${day}${suffix}, ${y}`,
    `${short} ${day}, ${y}`,
    `${short}. ${day}, ${y}`,
    `${Number(mm)}/${day}/${y}`,
    `${mm}/${dd}/${y}`,
    `${y}-${mm}-${dd}`,
  ]
}

export function decideFromPage(
  candidate: ReverifyCandidate,
  page: { status: number; text: string },
  now: Date,
): ReverifyDecision {
  const url = candidate.source_url ?? candidate.application_url ?? null
  const base = { id: candidate.id, source: candidate.source, url }
  if (page.status === 404 || page.status === 410) {
    return { ...base, outcome: 'broken', detail: `Sponsor page returned HTTP ${page.status}`, patch: { verification_status: 'broken' } }
  }
  if (page.status < 200 || page.status >= 300) {
    return { ...base, outcome: 'fetch_error', detail: `HTTP ${page.status}; stored evidence kept`, patch: null }
  }
  const text = pageText(page.text).toLowerCase()
  const closure = CLOSURE_PATTERNS.map((re) => text.match(re)).find(Boolean)
  if (closure) {
    return {
      ...base,
      outcome: 'closure_reported',
      detail: `Sponsor page says: "${closure[0]}"`,
      patch: { verification_status: 'needs_review' },
    }
  }
  const variants = candidate.deadline ? dateVariants(candidate.deadline) : []
  const found = variants.find((v) => text.includes(v.toLowerCase()))
  if (!found) {
    return { ...base, outcome: 'no_evidence', detail: 'Closing date not found on sponsor page; stored evidence kept', patch: null }
  }
  const nowIso = now.toISOString()
  const next = new Date(now.getTime() + 7 * 86_400_000).toISOString()
  return {
    ...base,
    outcome: 'confirmed',
    detail: `Sponsor page still publishes "${found}"`,
    patch: { last_verified_at: nowIso, verification_status: 'verified', next_verification_at: next },
  }
}

export async function reverifyCandidates(
  candidates: ReverifyCandidate[],
  fetchPage: PageFetcher,
  options: { now?: Date; concurrency?: number } = {},
): Promise<ReverifyDecision[]> {
  const now = options.now ?? new Date()
  const queue = [...candidates]
  const out: ReverifyDecision[] = []
  const workers = Array.from({ length: Math.max(1, options.concurrency ?? 3) }, async () => {
    while (queue.length) {
      const candidate = queue.shift()!
      const url = candidate.source_url ?? candidate.application_url ?? null
      if (!url) {
        out.push({ id: candidate.id, source: candidate.source, url, outcome: 'no_evidence', detail: 'No sponsor URL', patch: null })
        continue
      }
      try {
        out.push(decideFromPage(candidate, await fetchPage(url), now))
      } catch (err) {
        out.push({ id: candidate.id, source: candidate.source, url, outcome: 'fetch_error', detail: err instanceof Error ? err.message : String(err), patch: null })
      }
    }
  })
  await Promise.all(workers)
  return out.sort((a, b) => a.id.localeCompare(b.id))
}

/** Default fetcher: public GET, generic UA, timeout, size cap. */
export function createPageFetcher(timeoutMs = 10_000, maxBytes = 2_000_000): PageFetcher {
  return async (url: string) => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(url, {
        redirect: 'follow',
        signal: controller.signal,
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; ScholarshipCatalogCheck/1.0)', accept: 'text/html' },
      })
      const text = (await res.text()).slice(0, maxBytes)
      return { status: res.status, text }
    } finally {
      clearTimeout(timer)
    }
  }
}
