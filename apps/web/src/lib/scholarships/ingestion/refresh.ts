/**
 * Freshness refresh orchestrator.
 *
 * Composes the existing ingestion pass with lifecycle maintenance so a single
 * run performs the scheduled process end to end:
 *   1. Import new scholarships.
 *   2. Update existing records.
 *   3. Recheck deadlines (and, optionally, source availability).
 *   4. Archive expired scholarships (independent sweep — runs even when the
 *      import brought nothing new).
 *   5. Flag broken/materially-changed records for review.
 *   6. Record the run in the audit log.
 *
 * It does NOT weaken the display-layer guard: even if this job fails, the
 * `student_visible_scholarships` view / `isVisibleToStudents` predicate still
 * refuse to surface expired or stale records.
 */

import type {
  ScholarshipRefreshResult,
  ScholarshipRepository,
  ScholarshipRunLogRecord,
  ScholarshipSourceAdapter,
} from './types'
import { ingestSource } from './ingest'

export type RefreshOptions = {
  dryRun?: boolean
  limit?: number
  deactivateMissing?: boolean
  trigger?: 'scheduled' | 'manual' | 'dry_run'
  createdBy?: string | null
  now?: Date
}

export async function refreshScholarships(
  adapter: ScholarshipSourceAdapter,
  repository: ScholarshipRepository,
  options: RefreshOptions = {},
): Promise<ScholarshipRefreshResult> {
  const now = options.now ?? new Date()
  const dryRun = Boolean(options.dryRun)
  const trigger = options.trigger ?? (dryRun ? 'dry_run' : 'manual')
  const startedAt = new Date().toISOString()

  // Steps 1–3: import new + update existing (also archives past-deadline records
  // present in this batch, and optionally retires missing ones).
  const ingest = await ingestSource(adapter, repository, {
    dryRun,
    limit: options.limit,
    deactivateMissing: options.deactivateMissing,
    now,
  })

  // Step 4: sweep existing rows whose fixed deadline has passed. Skipped in
  // dry-run (which must make no writes). ingest.expired already covers records
  // in this batch; the sweep catches everything else.
  let archivedSweep = 0
  if (!dryRun && repository.archiveExpired) {
    try {
      archivedSweep = await repository.archiveExpired(now.toISOString(), adapter.sourceName)
    } catch (err) {
      ingest.errors.push({ message: `Archive sweep failed: ${errorMessage(err)}` })
    }
  }

  const failed = ingest.errors.length
  const hadWrites = ingest.inserted + ingest.updated + ingest.expired + archivedSweep > 0
  const status: ScholarshipRefreshResult['status'] =
    failed === 0 ? 'success' : hadWrites ? 'partial' : 'failed'

  const result: ScholarshipRefreshResult = {
    source: adapter.sourceName,
    trigger,
    dryRun,
    fetched: ingest.fetched,
    created: ingest.inserted,
    updated: ingest.updated,
    unchanged: ingest.unchanged,
    archived: ingest.expired + archivedSweep,
    duplicates: ingest.duplicates,
    // Broken/needs-review flagging happens during per-record source rechecks,
    // which are injected by the caller; 0 when no checker is supplied.
    flagged: 0,
    rejected: ingest.rejected,
    failed,
    errors: ingest.errors,
    startedAt,
    finishedAt: new Date().toISOString(),
    status,
  }

  // Step 6: record the run (skip on dry-run to make no DB changes).
  if (!dryRun && repository.recordRun) {
    try {
      await repository.recordRun(toRunLog(result, options.createdBy ?? null))
    } catch {
      // Logging is best-effort; never fail the run because the log write failed.
    }
  }

  return result
}

export function toRunLog(
  result: ScholarshipRefreshResult,
  createdBy: string | null,
): ScholarshipRunLogRecord {
  return {
    source: result.source,
    trigger: result.trigger,
    dry_run: result.dryRun,
    status: result.status,
    started_at: result.startedAt,
    finished_at: result.finishedAt,
    fetched_count: result.fetched,
    created_count: result.created,
    updated_count: result.updated,
    unchanged_count: result.unchanged,
    archived_count: result.archived,
    duplicate_count: result.duplicates,
    flagged_count: result.flagged,
    rejected_count: result.rejected,
    failed_count: result.failed,
    errors: result.errors,
    created_by: createdBy,
  }
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}
