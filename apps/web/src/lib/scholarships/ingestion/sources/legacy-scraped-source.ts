/**
 * Legacy bridge adapter.
 *
 * The application already stores scraped rows in the `scraped_scholarships`
 * table (populated by the pre-existing scraper). Those rows never reached the
 * matching engine, which reads the canonical `scholarships` table. This adapter
 * treats that already-in-app data as an approved source and maps it into the
 * canonical import contract so it can flow into matching through the same
 * normalize/validate/dedupe/upsert pipeline as any other source.
 *
 * It performs no external network calls: rows are provided by an injected
 * loader (in production, a service-role read of `scraped_scholarships`), which
 * keeps this adapter testable and side-effect free.
 */

import type { ScholarshipImportRecord } from '../types'
import type { ScholarshipSourceAdapter } from './source-adapter'
import { cleanTags } from '../normalize'

/** Row shape from the legacy `scraped_scholarships` table. */
export type LegacyScrapedRow = {
  id?: string
  name: string
  amount?: string | null
  deadline?: string | null
  link?: string | null
  state?: string | null
  tags?: string[] | null
  source?: string | null
}

export type LegacyScrapedLoader = (options?: {
  limit?: number
}) => Promise<LegacyScrapedRow[]>

export class LegacyScrapedSourceAdapter implements ScholarshipSourceAdapter {
  readonly sourceName = 'legacy-scraped'
  private readonly loader: LegacyScrapedLoader

  constructor(loader: LegacyScrapedLoader) {
    this.loader = loader
  }

  async fetchRecords(options?: { limit?: number; updatedSince?: string }): Promise<unknown[]> {
    return this.loader({ limit: options?.limit })
  }

  normalizeRecord(record: unknown): ScholarshipImportRecord | null {
    if (!record || typeof record !== 'object') return null
    const r = record as LegacyScrapedRow
    if (!r.name || !r.link) return null

    // Preserve the original site as the underlying source label while keeping a
    // single canonical adapter source so re-imports remain idempotent.
    const originSite = r.source ? String(r.source) : 'unknown'

    return {
      // No stable external id in the legacy table; the pipeline will generate a
      // deterministic fingerprint id from the fields below.
      source: this.sourceName,
      externalId: '',
      sourceUrl: r.link,
      title: r.name,
      organization: originSite,
      applicationUrl: r.link,
      amountDisplay: r.amount ?? undefined,
      deadline: r.deadline ?? undefined,
      stateEligibility: r.state ? [r.state] : [],
      skillTags: cleanTags(r.tags),
      active: true,
      lastVerifiedAt: new Date().toISOString(),
      rawSourceMetadata: { originSite, legacyId: r.id ?? null, legacyDeadline: r.deadline ?? null },
    }
  }
}
