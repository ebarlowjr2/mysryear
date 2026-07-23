/**
 * Ingestion orchestrator. Source-agnostic: it fetches from an adapter,
 * normalizes/validates/deduplicates, then decides inserts / updates / unchanged
 * / expired via a `ScholarshipRepository` port. It never talks to Supabase
 * directly, so it is fully testable and dry-run is first-class (writes are
 * simply skipped while all counts are still computed accurately).
 *
 * Guarantees:
 *  - A single malformed record never aborts the run (collected in `errors`).
 *  - A source that throws while fetching yields a clean, reported result with
 *    no writes (handles "source temporarily unavailable").
 *  - Running the same import twice does not create duplicates (idempotent):
 *    the natural key is (source, external_id); sources without a stable id get
 *    a deterministic fingerprint id, so re-imports converge to "unchanged".
 */

import type {
  ExistingScholarshipRow,
  NormalizedScholarshipRow,
  ScholarshipIngestionResult,
  ScholarshipRepository,
  ScholarshipSourceAdapter,
  ValidationIssue,
} from './types'
import { normalizeImportRecord } from './normalize'
import { validateRow } from './validate'
import { deduplicateBatch } from './deduplicate'
import { normalizeAll } from './sources/source-adapter'

export type IngestOptions = {
  dryRun?: boolean
  limit?: number
  updatedSince?: string
  /**
   * When true, existing active rows for this source that are absent from the
   * current batch are deactivated (retired). Only enable for full imports, not
   * partial/limited fetches, or live records could be wrongly retired.
   */
  deactivateMissing?: boolean
  /** Injectable clock for deterministic tests. */
  now?: Date
}

function todayIso(now: Date): string {
  return now.toISOString().slice(0, 10)
}

/** A row is expired when it carries a known deadline strictly before today. */
export function isExpired(row: NormalizedScholarshipRow, now: Date): boolean {
  if (!row.deadline) return false
  return row.deadline < todayIso(now)
}

function applyLifecycle(row: NormalizedScholarshipRow, now: Date): NormalizedScholarshipRow {
  if (isExpired(row, now)) {
    return { ...row, active: false, lifecycle_status: 'expired' }
  }
  return row
}

function sameState(existing: ExistingScholarshipRow, next: NormalizedScholarshipRow): boolean {
  return (
    existing.import_fingerprint === next.import_fingerprint &&
    existing.active === next.active &&
    (existing.lifecycle_status ?? 'active') === next.lifecycle_status
  )
}

export async function ingestSource(
  adapter: ScholarshipSourceAdapter,
  repository: ScholarshipRepository,
  options: IngestOptions = {},
): Promise<ScholarshipIngestionResult> {
  const now = options.now ?? new Date()
  const dryRun = Boolean(options.dryRun)
  const startedAt = new Date().toISOString()
  const errors: Array<{ externalId?: string; message: string }> = []

  const result: ScholarshipIngestionResult = {
    source: adapter.sourceName,
    dryRun,
    fetched: 0,
    normalized: 0,
    inserted: 0,
    updated: 0,
    unchanged: 0,
    rejected: 0,
    expired: 0,
    errors,
    startedAt,
    finishedAt: startedAt,
  }

  // 1. Fetch. A source failure is reported, not thrown.
  let rawRecords: unknown[] = []
  try {
    rawRecords = await adapter.fetchRecords({
      limit: options.limit,
      updatedSince: options.updatedSince,
    })
  } catch (err) {
    errors.push({ message: `Source fetch failed: ${errorMessage(err)}` })
    result.finishedAt = new Date().toISOString()
    return result
  }
  result.fetched = rawRecords.length

  // 2. Normalize each raw record into the canonical contract, then to a row.
  const importRecords = normalizeAll(adapter, rawRecords)
  const normalizedRows: NormalizedScholarshipRow[] = []
  for (const record of importRecords) {
    try {
      normalizedRows.push(normalizeImportRecord(record))
    } catch (err) {
      errors.push({ message: `Normalize failed: ${errorMessage(err)}` })
    }
  }
  result.normalized = normalizedRows.length

  // 3. Validate. Rejected rows are quarantined with reasons.
  const validRows: NormalizedScholarshipRow[] = []
  for (const row of normalizedRows) {
    const issues = validateRow(row)
    if (issues.length === 0) {
      validRows.push(row)
    } else {
      result.rejected += 1
      errors.push({ externalId: row.external_id || undefined, message: describeIssues(issues) })
    }
  }

  // 4. Deduplicate within the batch. Within-source duplicates are rejected.
  const { unique, duplicates } = deduplicateBatch(validRows)
  if (duplicates.length > 0) {
    result.rejected += duplicates.length
    for (const dup of duplicates) {
      errors.push({
        externalId: dup.external_id || undefined,
        message: 'Duplicate identifier within source batch (collapsed)',
      })
    }
  }

  // 5. Apply deadline-based lifecycle before diffing against the store.
  const finalRows = unique.map((row) => applyLifecycle(row, now))

  // 6. Diff against existing rows for this source.
  const existing = await repository.loadExistingBySource(adapter.sourceName)
  const toInsert: NormalizedScholarshipRow[] = []
  const toUpdate: NormalizedScholarshipRow[] = []

  for (const row of finalRows) {
    if (row.lifecycle_status === 'expired') result.expired += 1
    const prior = existing.get(row.external_id)
    if (!prior) {
      toInsert.push(row)
    } else if (sameState(prior, row)) {
      result.unchanged += 1
    } else {
      toUpdate.push(row)
    }
  }

  // 7. Optionally retire rows that vanished from the source (full imports only).
  const seenExternalIds = finalRows.map((row) => row.external_id)
  let retired = 0

  // 8. Persist (skipped entirely in dry-run).
  if (!dryRun) {
    try {
      result.inserted = await repository.insert(toInsert)
    } catch (err) {
      errors.push({ message: `Insert failed: ${errorMessage(err)}` })
    }
    try {
      result.updated = await repository.update(toUpdate)
    } catch (err) {
      errors.push({ message: `Update failed: ${errorMessage(err)}` })
    }
    if (options.deactivateMissing) {
      try {
        retired = await repository.deactivateMissing(adapter.sourceName, seenExternalIds)
      } catch (err) {
        errors.push({ message: `Deactivate-missing failed: ${errorMessage(err)}` })
      }
    }
  } else {
    // Dry-run: report proposed counts without touching the database.
    result.inserted = toInsert.length
    result.updated = toUpdate.length
    if (options.deactivateMissing) {
      retired = countMissing(existing, seenExternalIds)
    }
  }

  result.expired += retired
  result.finishedAt = new Date().toISOString()
  return result
}

function countMissing(
  existing: Map<string, ExistingScholarshipRow>,
  seenExternalIds: string[],
): number {
  const seen = new Set(seenExternalIds)
  let count = 0
  for (const [externalId, row] of existing) {
    if (!seen.has(externalId) && row.active) count += 1
  }
  return count
}

function describeIssues(issues: ValidationIssue[]): string {
  return issues.map((issue) => issue.message).join('; ')
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}
