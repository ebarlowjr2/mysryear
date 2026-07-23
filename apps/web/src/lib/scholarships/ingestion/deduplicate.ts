/**
 * Deduplicate normalized rows within a single import batch. Records sharing the
 * same (source, external_id) are collapsed to one, keeping the last occurrence
 * (sources typically list the freshest record last). Duplicates are reported so
 * the import report can surface how many were collapsed. Pure, no I/O.
 */

import type { NormalizedScholarshipRow } from './types'

export type DeduplicateResult = {
  unique: NormalizedScholarshipRow[]
  duplicates: NormalizedScholarshipRow[]
}

export function deduplicateBatch(rows: NormalizedScholarshipRow[]): DeduplicateResult {
  const byKey = new Map<string, NormalizedScholarshipRow>()
  const duplicates: NormalizedScholarshipRow[] = []

  for (const row of rows) {
    const key = `${row.source}::${row.external_id}`
    const existing = byKey.get(key)
    if (existing) {
      // Keep the later record; the earlier one is a duplicate within the batch.
      duplicates.push(existing)
    }
    byKey.set(key, row)
  }

  return { unique: Array.from(byKey.values()), duplicates }
}
