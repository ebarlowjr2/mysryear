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
  // Primary key: source + external_id. Secondary key: source + canonical_url,
  // so cosmetically-different links to the same application page also collapse.
  const byId = new Map<string, NormalizedScholarshipRow>()
  const canonicalToId = new Map<string, string>()
  const duplicates: NormalizedScholarshipRow[] = []

  for (const row of rows) {
    const idKey = `${row.source}::${row.external_id}`
    const canonicalKey = row.canonical_url ? `${row.source}::${row.canonical_url}` : null

    // Resolve to an existing entry by id, or failing that by canonical URL.
    let targetKey = byId.has(idKey) ? idKey : null
    if (!targetKey && canonicalKey && canonicalToId.has(canonicalKey)) {
      targetKey = canonicalToId.get(canonicalKey) ?? null
    }

    if (targetKey) {
      // Keep the later record; the earlier one is a duplicate within the batch.
      const existing = byId.get(targetKey)
      if (existing) duplicates.push(existing)
      byId.set(targetKey, row)
      if (canonicalKey) canonicalToId.set(canonicalKey, targetKey)
    } else {
      byId.set(idKey, row)
      if (canonicalKey) canonicalToId.set(canonicalKey, idKey)
    }
  }

  return { unique: Array.from(byId.values()), duplicates }
}
