/**
 * Multi-source scholarship refresh. Used by the scheduled cron route, the admin
 * manual-refresh route and the CLI so all three behave identically.
 *
 * Each provider runs in isolation: a provider that fails (network, bad feed,
 * DB error) is reported as failed for that source only. It never deactivates
 * or rewrites other providers' listings, and nothing here touches
 * student_scholarship_matches or scholarship_application_tasks.
 *
 * Order per run:
 *   1. ingest each provider (normalize → validate → dedupe → upsert)
 *   2. archive every record whose sponsor deadline has passed (all sources)
 *   3. reverify a bounded batch of visible records against sponsor pages
 *      (timestamps move only on fresh evidence)
 *   4. count what students can actually see, per source
 *   5. write one run-log row per provider with those counts
 *
 * Server-side only (service-role client).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  LegacyScrapedSourceAdapter,
  SupabaseScholarshipRepository,
  refreshScholarships,
  toRunLog,
  type LegacyScrapedRow,
  type ScholarshipRefreshResult,
  type ScholarshipSourceAdapter,
} from './ingestion'
import { SponsorVerifiedSourceAdapter, SPONSOR_VERIFIED_SOURCE, type SponsorVerifiedDataset } from './ingestion/sources/sponsor-verified-source'
import {
  OpenScholarshipsSourceAdapter,
  OPEN_SCHOLARSHIPS_FEED_URL,
  OPEN_SCHOLARSHIPS_SOURCE,
  type SponsorChecks,
} from './ingestion/sources/open-scholarships-source'
import { createPageFetcher, reverifyCandidates, type PageFetcher, type ReverifyCandidate, type ReverifyDecision } from './ingestion/reverify'
import sponsorVerifiedData from './ingestion/data/sponsor-verified.json'
import sponsorChecksData from './ingestion/data/open-scholarships-sponsor-checks.json'
import openScholarshipsSnapshot from './ingestion/data/open-scholarships-snapshot.json'

export const DEFAULT_SOURCES = [SPONSOR_VERIFIED_SOURCE, OPEN_SCHOLARSHIPS_SOURCE] as const

export type RunRefreshOptions = {
  trigger: 'scheduled' | 'manual' | 'dry_run'
  /** Providers to run. Defaults to the two independent catalog sources. */
  sources?: string[]
  /** @deprecated single-source form kept for older callers. */
  source?: string
  dryRun?: boolean
  limit?: number
  deactivateMissing?: boolean
  createdBy?: string | null
  /** Reverify up to N visible records against sponsor pages (0 disables). */
  reverifyLimit?: number
  now?: Date
  /** Injection points for tests / offline runs. */
  fetchJson?: (url: string) => Promise<unknown>
  fetchPage?: PageFetcher
  /** Where the Open Scholarships feed comes from: 'live' (default) or 'snapshot'. */
  openScholarshipsFeed?: 'live' | 'snapshot'
}

export type SourceRunSummary = ScholarshipRefreshResult & { visible: number | null }

export type MultiSourceRefreshResult = {
  trigger: RunRefreshOptions['trigger']
  dryRun: boolean
  status: 'success' | 'partial' | 'failed'
  startedAt: string
  finishedAt: string
  sources: SourceRunSummary[]
  archivedSweep: number
  reverify: { checked: number; confirmed: number; flagged: number; broken: number; unchanged: number; decisions: ReverifyDecision[] }
  visibleTotal: number | null
  visibleBySource: Record<string, number>
}

async function defaultFetchJson(url: string): Promise<unknown> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15_000)
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { accept: 'application/json' } })
    if (!res.ok) throw new Error(`Feed HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

export function buildAdapter(supabase: SupabaseClient, source: string, options: RunRefreshOptions = { trigger: 'manual' }): ScholarshipSourceAdapter {
  if (source === SPONSOR_VERIFIED_SOURCE || source === 'sponsor-verified') {
    return new SponsorVerifiedSourceAdapter(() => sponsorVerifiedData as unknown as SponsorVerifiedDataset)
  }
  if (source === OPEN_SCHOLARSHIPS_SOURCE) {
    const checks = (sponsorChecksData as { checks: SponsorChecks }).checks
    const feed = options.openScholarshipsFeed ?? (process.env.OPEN_SCHOLARSHIPS_FEED === 'snapshot' ? 'snapshot' : 'live')
    const url = process.env.OPEN_SCHOLARSHIPS_FEED_URL || OPEN_SCHOLARSHIPS_FEED_URL
    const fetchJson = options.fetchJson ?? defaultFetchJson
    return new OpenScholarshipsSourceAdapter(async () => (feed === 'snapshot' ? openScholarshipsSnapshot : fetchJson(url)), checks)
  }
  if (source === 'legacy') {
    // Aggregator leads already stored in scraped_scholarships. Imported
    // unverified (hidden); kept only for audit/backfill. Not run by default.
    return new LegacyScrapedSourceAdapter(async (opts) => {
      let query = supabase
        .from('scraped_scholarships')
        .select('id,name,amount,deadline,link,state,tags,source,scraped_at')
        .eq('is_active', true)
      if (opts?.limit) query = query.limit(opts.limit)
      const { data, error } = await query
      if (error) throw new Error(error.message)
      return (data || []) as LegacyScrapedRow[]
    })
  }
  throw new Error(`Unsupported refresh source "${source}". Supported: ${DEFAULT_SOURCES.join(', ')}, legacy.`)
}

async function countVisibleBySource(supabase: SupabaseClient): Promise<Record<string, number> | null> {
  const counts: Record<string, number> = {}
  for (let from = 0; from < 50_000; from += 1000) {
    const { data, error } = await supabase.from('student_visible_scholarships').select('id,source').order('id').range(from, from + 999)
    if (error) return null
    for (const row of data || []) {
      const key = String((row as { source?: string | null }).source ?? 'unsourced')
      counts[key] = (counts[key] ?? 0) + 1
    }
    if (!data || data.length < 1000) break
  }
  return counts
}

async function loadReverifyCandidates(supabase: SupabaseClient, sources: string[], limit: number, nowIso: string): Promise<ReverifyCandidate[]> {
  const { data, error } = await supabase
    .from('student_visible_scholarships')
    .select('id,source,title,source_url,application_url,deadline,deadline_type,last_verified_at,next_verification_at')
    .in('source', sources)
    .or(`next_verification_at.is.null,next_verification_at.lte.${nowIso}`)
    .order('last_verified_at', { ascending: true })
    .limit(limit)
  if (error) throw new Error(error.message)
  return (data || []) as ReverifyCandidate[]
}

export async function runScholarshipRefresh(supabase: SupabaseClient, options: RunRefreshOptions): Promise<MultiSourceRefreshResult> {
  const now = options.now ?? new Date()
  const dryRun = Boolean(options.dryRun)
  const startedAt = new Date().toISOString()
  const sources = options.sources?.length ? options.sources : options.source && options.source !== 'all' ? [options.source] : [...DEFAULT_SOURCES]
  const repository = new SupabaseScholarshipRepository(supabase)

  const results: ScholarshipRefreshResult[] = []
  for (const source of sources) {
    try {
      const adapter = buildAdapter(supabase, source, options)
      results.push(
        await refreshScholarships(adapter, repository, {
          trigger: options.trigger,
          dryRun,
          limit: options.limit,
          deactivateMissing: options.deactivateMissing,
          createdBy: options.createdBy ?? null,
          now,
          recordRun: false,
        }),
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const ts = new Date().toISOString()
      results.push({
        source, trigger: options.trigger, dryRun, fetched: 0, created: 0, updated: 0, reactivated: 0, unchanged: 0, revalidated: 0,
        archived: 0, duplicates: 0, flagged: 0, rejected: 0, failed: 1, errors: [{ message }], startedAt: ts, finishedAt: ts, status: 'failed',
      })
    }
  }

  // Archive everything past its sponsor deadline, including unsourced legacy seeds.
  let archivedSweep = 0
  if (!dryRun) {
    try {
      archivedSweep = await repository.archiveExpired(now.toISOString())
    } catch {
      archivedSweep = 0
    }
  }

  const reverify: MultiSourceRefreshResult['reverify'] = { checked: 0, confirmed: 0, flagged: 0, broken: 0, unchanged: 0, decisions: [] }
  const reverifyLimit = options.reverifyLimit ?? 0
  if (!dryRun && reverifyLimit > 0) {
    try {
      const candidates = await loadReverifyCandidates(supabase, sources, reverifyLimit, now.toISOString())
      const decisions = await reverifyCandidates(candidates, options.fetchPage ?? createPageFetcher(), { now })
      for (const decision of decisions) {
        if (decision.patch) await supabase.from('scholarships').update(decision.patch).eq('id', decision.id)
      }
      reverify.decisions = decisions
      reverify.checked = decisions.length
      reverify.confirmed = decisions.filter((d) => d.outcome === 'confirmed').length
      reverify.flagged = decisions.filter((d) => d.outcome === 'closure_reported').length
      reverify.broken = decisions.filter((d) => d.outcome === 'broken').length
      reverify.unchanged = decisions.filter((d) => !d.patch).length
    } catch {
      // Reverification is best-effort; stored evidence stays as it was.
    }
  }

  const visibleBySource = (await countVisibleBySource(supabase)) ?? {}
  const visibleTotal = Object.values(visibleBySource).reduce((s, n) => s + n, 0)

  const summaries: SourceRunSummary[] = results.map((r) => ({
    ...r,
    flagged: r.flagged + reverify.decisions.filter((d) => d.source === r.source && d.patch && d.outcome !== 'confirmed').length,
    visible: visibleBySource[r.source] ?? 0,
  }))

  if (!dryRun) {
    for (const summary of summaries) {
      const log = toRunLog(summary, options.createdBy ?? null)
      try {
        await supabase.from('scholarship_ingestion_runs').insert({
          ...log,
          revalidated_count: summary.revalidated,
          visible_count: summary.visible,
          details: {
            archivedSweep,
            reverify: reverify.decisions.filter((d) => d.source === summary.source).map(({ id, outcome, detail }) => ({ id, outcome, detail })),
            visibleBySource,
          },
        })
      } catch {
        // Logging is best-effort.
      }
    }
  }

  const failedCount = summaries.filter((s) => s.status === 'failed').length
  const status: MultiSourceRefreshResult['status'] =
    failedCount === summaries.length ? 'failed' : failedCount > 0 || summaries.some((s) => s.status === 'partial') ? 'partial' : 'success'

  return {
    trigger: options.trigger,
    dryRun,
    status,
    startedAt,
    finishedAt: new Date().toISOString(),
    sources: summaries,
    archivedSweep,
    reverify,
    visibleTotal,
    visibleBySource,
  }
}
