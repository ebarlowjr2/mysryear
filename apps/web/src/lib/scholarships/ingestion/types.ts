/**
 * Canonical import contract for the scholarship ingestion pipeline.
 *
 * Source adapters produce `ScholarshipImportRecord`s. The pipeline normalizes,
 * validates, deduplicates, and upserts them into the EXISTING canonical
 * `public.scholarships` table that the Scholarship Matching engine already
 * reads. This module intentionally does not replace matching logic; it only
 * describes the shape of data flowing into it.
 */

export type ScholarshipImportRecord = {
  // Provenance ---------------------------------------------------------------
  source: string
  externalId: string
  sourceUrl: string

  // Core -------------------------------------------------------------------
  title: string
  organization: string
  description?: string

  // Award value ------------------------------------------------------------
  amountMin?: number
  amountMax?: number
  amountDisplay?: string

  // Deadlines & application ------------------------------------------------
  deadline?: string
  applicationUrl: string

  // Eligibility ------------------------------------------------------------
  minimumGpa?: number
  gradeLevels?: string[]
  graduationYears?: number[]

  careerTags?: string[]
  majorTags?: string[]
  certificationTags?: string[]
  skillTags?: string[]

  stateEligibility?: string[]
  countryEligibility?: string[]

  financialNeedRequired?: boolean
  essayRequired?: boolean
  recommendationRequired?: boolean
  transcriptRequired?: boolean
  volunteerRequired?: boolean

  // Lifecycle --------------------------------------------------------------
  active: boolean
  lastVerifiedAt: string

  rawSourceMetadata?: Record<string, unknown>
}

/**
 * A source adapter fetches raw records from an approved source and maps them
 * into the canonical import contract. Adapters are the only source-specific
 * code in the pipeline; the rest of the pipeline is source agnostic.
 */
export interface ScholarshipSourceAdapter {
  sourceName: string

  fetchRecords(options?: { limit?: number; updatedSince?: string }): Promise<unknown[]>

  normalizeRecord(record: unknown): ScholarshipImportRecord | null
}

/** Lifecycle status stored alongside the boolean `active` column. */
export type ScholarshipLifecycleStatus = 'active' | 'inactive' | 'expired' | 'archived'

/**
 * A normalized record ready to be persisted. This is the shape the pipeline
 * hands to the repository. Column names mirror the canonical `scholarships`
 * table so the writer is a thin mapping.
 */
export type NormalizedScholarshipRow = {
  source: string
  external_id: string
  source_url: string
  import_fingerprint: string

  title: string
  organization: string
  description: string | null

  amount: number | null
  amount_min: number | null
  amount_max: number | null
  amount_display: string | null

  deadline: string | null
  application_url: string

  minimum_gpa: number | null
  minimum_grade_level: number | null
  maximum_grade_level: number | null
  graduation_years: number[] | null

  career_tags: string[]
  major_tags: string[]
  certification_tags: string[]
  skill_tags: string[]

  state: string | null
  country: string

  financial_need_required: boolean
  essay_required: boolean
  recommendation_required: boolean
  transcript_required: boolean
  volunteer_required: boolean

  active: boolean
  lifecycle_status: ScholarshipLifecycleStatus
  last_verified_at: string

  raw_source_metadata: Record<string, unknown> | null
}

export type ValidationIssue = {
  externalId?: string
  field?: string
  message: string
}

export type ValidatedBatch = {
  valid: NormalizedScholarshipRow[]
  rejected: Array<{ record: Partial<NormalizedScholarshipRow>; issues: ValidationIssue[] }>
}

/**
 * Structured result of a single ingestion run. A single malformed record must
 * never abort the whole run; failures are collected here instead.
 */
export type ScholarshipIngestionResult = {
  source: string
  dryRun: boolean
  fetched: number
  normalized: number
  inserted: number
  updated: number
  unchanged: number
  rejected: number
  expired: number
  errors: Array<{ externalId?: string; message: string }>
  startedAt: string
  finishedAt: string
}

/**
 * Persistence port. The pipeline depends on this interface, not on Supabase
 * directly, so the core logic is testable without a database and so dry-run is
 * a first-class mode (the in-memory implementation makes no writes).
 */
export interface ScholarshipRepository {
  /** Existing rows for this source keyed by external_id. */
  loadExistingBySource(source: string): Promise<Map<string, ExistingScholarshipRow>>
  /** Insert new rows. Returns number inserted. */
  insert(rows: NormalizedScholarshipRow[]): Promise<number>
  /** Update existing rows (matched by source + external_id). Returns number updated. */
  update(rows: NormalizedScholarshipRow[]): Promise<number>
  /**
   * Deactivate rows for this source whose external_id is not in `seenExternalIds`.
   * Used to retire scholarships that disappeared from the source. Returns count.
   */
  deactivateMissing(source: string, seenExternalIds: string[]): Promise<number>
}

/** Subset of the canonical row the pipeline needs to compare against. */
export type ExistingScholarshipRow = {
  id: string
  external_id: string
  import_fingerprint: string | null
  active: boolean
  lifecycle_status: string | null
}
