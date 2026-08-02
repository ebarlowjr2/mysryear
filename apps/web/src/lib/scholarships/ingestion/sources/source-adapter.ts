/**
 * Source adapter contract + small shared helpers. Each adapter is the only
 * source-specific code in the pipeline. Add a new source by implementing this
 * interface; the rest of the pipeline (normalize/validate/dedupe/upsert) is
 * source agnostic.
 *
 * Source rules (enforced by convention — see docs/scholarship-ingestion.md):
 *  - Only ingest documented APIs, public/structured feeds, pages that permit
 *    automated access, manually supplied datasets, or sources already used by
 *    the application.
 *  - Never bypass auth, CAPTCHAs, or anti-bot protection; never scrape private,
 *    paywalled, or copyrighted content unnecessarily.
 *  - Use reasonable rate limits and always record source attribution.
 */

import type { ScholarshipImportRecord, ScholarshipSourceAdapter } from '../types'

export type { ScholarshipSourceAdapter }

/** Map every raw record an adapter fetched into import records, dropping nulls. */
export function normalizeAll(
  adapter: ScholarshipSourceAdapter,
  rawRecords: unknown[],
): ScholarshipImportRecord[] {
  const out: ScholarshipImportRecord[] = []
  for (const raw of rawRecords) {
    let record: ScholarshipImportRecord | null = null
    try {
      record = adapter.normalizeRecord(raw)
    } catch {
      // A single malformed record must never abort the run.
      record = null
    }
    if (record) out.push(record)
  }
  return out
}
