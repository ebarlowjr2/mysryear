/**
 * Public surface of the scholarship ingestion pipeline.
 *
 * The pipeline feeds clean, normalized, deduplicated records into the EXISTING
 * canonical `public.scholarships` table that the Scholarship Matching engine
 * already reads. It does not modify or replace matching logic.
 */

export * from './types'
export {
  normalizeImportRecord,
  computeFingerprint,
  computeContentFingerprint,
  deterministicExternalId,
  normalizeDeadline,
  normalizeUrl,
  canonicalizeUrl,
  resolveDeadlineType,
  resolveDeadlineAt,
  parseAmount,
  gradeLevelRange,
  cleanTags,
} from './normalize'
export { validateRow } from './validate'
export { deduplicateBatch } from './deduplicate'
export type { DeduplicateResult } from './deduplicate'
export { ingestSource, isExpired } from './ingest'
export type { IngestOptions } from './ingest'
export {
  isVisibleToStudents,
  effectiveDeadlineMs,
  deriveVerification,
  DEFAULT_FRESHNESS_WINDOW_DAYS,
  DEFAULT_STALE_AFTER_DAYS,
} from './freshness'
export type {
  VisibilityInput,
  FreshnessOptions,
  RefreshRowInput,
  VerificationOptions,
  VerificationDecision,
} from './freshness'
export { refreshScholarships, toRunLog } from './refresh'
export type { RefreshOptions } from './refresh'
export {
  InMemoryScholarshipRepository,
  SupabaseScholarshipRepository,
  toDbPayload,
} from './repository'
export { normalizeAll } from './sources/source-adapter'
export { FixtureSourceAdapter } from './sources/fixture-source'
export type { FixtureScholarship } from './sources/fixture-source'
export { LegacyScrapedSourceAdapter } from './sources/legacy-scraped-source'
export type { LegacyScrapedRow, LegacyScrapedLoader } from './sources/legacy-scraped-source'
export { SponsorVerifiedSourceAdapter, SPONSOR_VERIFIED_SOURCE } from './sources/sponsor-verified-source'
export type { SponsorVerifiedRecord, SponsorVerifiedDataset } from './sources/sponsor-verified-source'
export {
  OpenScholarshipsSourceAdapter,
  OPEN_SCHOLARSHIPS_SOURCE,
  OPEN_SCHOLARSHIPS_ATTRIBUTION,
  OPEN_SCHOLARSHIPS_FEED_URL,
} from './sources/open-scholarships-source'
export type { OpenScholarshipsRecord, SponsorCheck, SponsorChecks } from './sources/open-scholarships-source'
export { decideFromPage, reverifyCandidates, dateVariants, pageText, createPageFetcher } from './reverify'
export type { PageFetcher, ReverifyCandidate, ReverifyDecision, ReverifyOutcome } from './reverify'
export { isDemoUrl, zonedLocalToUtcIso, resolveOpensAt, normalizeClockTime } from './normalize'
