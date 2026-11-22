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
  /** Recheck visible records even if their next_verification_at is not due yet (first refresh / audits). */
  reverifyAll?: boolean
  now?: Date
  /** Injection points for tests / offline runs. */
  fetchJson?: (url: string) => Promise<unknown>
  fetchPage?: PageFetcher
  /** Where the Open Scholarships feed comes from: 'live' (default) or 'snapshot'. */
  openScholarshipsFeed?: 'live' | 'snapshot'
}

/**
 * `visible` is null when the student-visible count could not be read — never
 * reported as 0, which would mean "students see nothing".
 */
export type SourceRunSummary = ScholarshipRefreshResult & { visible: number | null }

export type RefreshOperation = 'ingest' | 'archive_sweep' | 'reverify_candidates' | 'reverify_write' | 'visible_count' | 'run_log'

/** A database/provider operation that did not complete. `source` null = affects every source. */
export type RefreshOperationError = {
  source: string | null
  operation: RefreshOperation
  message: string
  scholarshipId?: string
}

export type MultiSourceRefreshResult = {
  trigger: RunRefreshOptions['trigger']
  dryRun: boolean
  /** success = every source and every follow-up operation succeeded; failed = every source failed. */
  status: 'success' | 'partial' | 'failed'
  startedAt: string
  finishedAt: string
  sources: SourceRunSummary[]
  /** Rows archived by the cross-source sweep; null if the sweep failed. */
  archivedSweep: number | null
  /** Counts include only decisions whose database write succeeded. */
  reverify: {
    checked: number
    confirmed: number
    flagged: number
    broken: number
    unchanged: number
    writeFailed: number
    decisions: ReverifyDecision[]
  }
  /** null when the student-visible catalog could not be counted. */
  visibleTotal: number | null
  visibleBySource: Record<string, number> | null
  /** Run-log rows: how many were saved, and which sources could not be logged. */
  auditLog: { written: number; failed: Array<{ source: string; message: string }> }
  operationErrors: RefreshOperationError[]
}

function dbMessage(error: { message?: string; code?: string } | null | undefined): string {
  if (!error) return 'Unknown database error'
  return error.code ? `${error.message ?? 'Database error'} (${error.code})` : error.message ?? 'Database error'
}

/** Server diagnostics for operations that could not complete (Vercel function logs). */
function logOperationError(err: RefreshOperationError) {
  console.error(
    `[scholarship-refresh] ${err.operation} failed` +
      `${err.source ? ` for source=${err.source}` : ''}${err.scholarshipId ? ` scholarship=${err.scholarshipId}` : ''}: ${err.message}`,
  )
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

async function countVisibleBySource(
  supabase: SupabaseClient,
): Promise<{ counts: Record<string, number> } | { error: string }> {
  const counts: Record<string, number> = {}
  for (let from = 0; from < 50_000; from += 1000) {
    const { data, error } = await supabase.from('student_visible_scholarships').select('id,source').order('id').range(from, from + 999)
    if (error) return { error: dbMessage(error) }
    for (const row of data || []) {
      const key = String((row as { source?: string | null }).source ?? 'unsourced')
      counts[key] = (counts[key] ?? 0) + 1
    }
    if (!data || data.length < 1000) break
  }
  return { counts }
}

async function loadReverifyCandidates(supabase: SupabaseClient, sources: string[], limit: number, nowIso: string, all = false): Promise<ReverifyCandidate[]> {
  let query = supabase
    .from('student_visible_scholarships')
    .select('id,source,title,source_url,application_url,deadline,deadline_type,last_verified_at,next_verification_at')
    .in('source', sources)
  if (!all) query = query.or(`next_verification_at.is.null,next_verification_at.lte.${nowIso}`)
  const { data, error } = await query
    .order('last_verified_at', { ascending: true })
    .order('id', { ascending: true })
    .limit(limit)
  if (error) throw new Error(dbMessage(error))
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

  const operationErrors: RefreshOperationError[] = []
  const fail = (err: RefreshOperationError) => {
    operationErrors.push(err)
    logOperationError(err)
  }
  for (const r of results) {
    if (r.status === 'failed') fail({ source: r.source, operation: 'ingest', message: r.errors.map((e) => e.message).join('; ') || 'Source failed' })
  }

  // Archive everything past its sponsor deadline, including unsourced legacy seeds.
  let archivedSweep: number | null = 0
  if (!dryRun) {
    try {
      archivedSweep = await repository.archiveExpired(now.toISOString())
    } catch (err) {
      archivedSweep = null
      fail({ source: null, operation: 'archive_sweep', message: err instanceof Error ? err.message : String(err) })
    }
  }

  const reverify: MultiSourceRefreshResult['reverify'] = { checked: 0, confirmed: 0, flagged: 0, broken: 0, unchanged: 0, writeFailed: 0, decisions: [] }
  const reverifyLimit = options.reverifyLimit ?? 0
  if (!dryRun && reverifyLimit > 0) {
    let candidates: ReverifyCandidate[] | null = null
    try {
      candidates = await loadReverifyCandidates(supabase, sources, reverifyLimit, now.toISOString(), options.reverifyAll)
    } catch (err) {
      fail({ source: null, operation: 'reverify_candidates', message: err instanceof Error ? err.message : String(err) })
    }
    if (candidates) {
      const decisions = await reverifyCandidates(candidates, options.fetchPage ?? createPageFetcher(), { now })
      for (const decision of decisions) {
        if (!decision.patch) continue
        // A closure/verification counts only once the database confirms the
        // write touched the row; a rejected or no-op write is reported.
        const { data, error } = await supabase.from('scholarships').update(decision.patch).eq('id', decision.id).select('id')
        if (error || !data || data.length === 0) {
          decision.applied = false
          decision.writeError = error ? dbMessage(error) : 'Update matched no row'
          fail({ source: decision.source, operation: 'reverify_write', scholarshipId: decision.id, message: `${decision.outcome}: ${decision.writeError}` })
        } else {
          decision.applied = true
        }
      }
      reverify.decisions = decisions
      reverify.checked = decisions.length
      reverify.confirmed = decisions.filter((d) => d.outcome === 'confirmed' && d.applied).length
      reverify.flagged = decisions.filter((d) => d.outcome === 'closure_reported' && d.applied).length
      reverify.broken = decisions.filter((d) => d.outcome === 'broken' && d.applied).length
      reverify.unchanged = decisions.filter((d) => !d.patch).length
      reverify.writeFailed = decisions.filter((d) => d.applied === false).length
    }
  }

  const visible = await countVisibleBySource(supabase)
  const visibleBySource = 'counts' in visible ? visible.counts : null
  if ('error' in visible) fail({ source: null, operation: 'visible_count', message: visible.error })
  const visibleTotal = visibleBySource ? Object.values(visibleBySource).reduce((s, n) => s + n, 0) : null

  const summaries: SourceRunSummary[] = results.map((r) => {
    const ownErrors = operationErrors.filter((e) => e.operation !== 'ingest' && (e.source === r.source || e.source === null))
    const status: SourceRunSummary['status'] = r.status === 'failed' ? 'failed' : ownErrors.length > 0 ? 'partial' : r.status
    return {
      ...r,
      status,
      errors: [...r.errors, ...ownErrors.map((e) => ({ externalId: e.scholarshipId, message: `${e.operation}: ${e.message}` }))],
      failed: r.failed + ownErrors.length,
      flagged: r.flagged + reverify.decisions.filter((d) => d.source === r.source && d.applied && d.outcome !== 'confirmed').length,
      visible: visibleBySource ? (visibleBySource[r.source] ?? 0) : null,
    }
  })

  const auditLog: MultiSourceRefreshResult['auditLog'] = { written: 0, failed: [] }
  if (!dryRun) {
    for (const summary of summaries) {
      const log = toRunLog(summary, options.createdBy ?? null)
      let message: string | null = null
      try {
        const { error } = await supabase.from('scholarship_ingestion_runs').insert({
          ...log,
          revalidated_count: summary.revalidated,
          visible_count: summary.visible,
          details: {
            archivedSweep,
            reverify: reverify.decisions
              .filter((d) => d.source === summary.source)
              .map(({ id, outcome, detail, applied, writeError }) => ({ id, outcome, detail, applied, writeError })),
            visibleBySource,
            operationErrors: operationErrors.filter((e) => e.source === summary.source || e.source === null),
          },
        })
        if (error) message = dbMessage(error)
      } catch (err) {
        message = err instanceof Error ? err.message : String(err)
      }
      if (message) {
        // The audit table itself is unavailable, so the failure goes to the
        // returned result and the server log instead.
        auditLog.failed.push({ source: summary.source, message })
        fail({ source: summary.source, operation: 'run_log', message })
        if (summary.status === 'success') summary.status = 'partial'
        summary.failed += 1
        summary.errors = [...summary.errors, { message: `run_log: ${message}` }]
      } else {
        auditLog.written += 1
      }
    }
  }

  const failedCount = summaries.filter((s) => s.status === 'failed').length
  const status: MultiSourceRefreshResult['status'] =
    summaries.length > 0 && failedCount === summaries.length
      ? 'failed'
      : failedCount > 0 || operationErrors.length > 0 || summaries.some((s) => s.status === 'partial')
        ? 'partial'
        : 'success'

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
    auditLog,
    operationErrors,
  }
}
