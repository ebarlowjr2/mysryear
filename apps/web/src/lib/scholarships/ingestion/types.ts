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
  /** How the deadline should be interpreted. Defaults to 'fixed' when a
   *  deadline is present, 'unknown' when it is absent. 'rolling' means the
   *  scholarship accepts applications continuously (no hard deadline). */
  deadlineType?: DeadlineType
  /** When the source last changed this record, if the source reports it. */
  sourceUpdatedAt?: string
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

/** How a scholarship's deadline should be interpreted. */
export type DeadlineType = 'fixed' | 'rolling' | 'unknown'

/**
 * Verification/freshness status. The display layer independently hides
 * 'broken' and 'stale' records; the refresh job maintains these values.
 */
export type VerificationStatus = 'verified' | 'unverified' | 'stale' | 'broken' | 'needs_review'

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
  deadline_at: string | null
  deadline_type: DeadlineType
  application_url: string
  canonical_url: string

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
  source_updated_at: string | null
  verification_status: VerificationStatus
  next_verification_at: string | null
  archived_at: string | null

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
  /** Existing records that were inactive/expired/archived and became active again. */
  reactivated: number
  unchanged: number
  /** Records rejected by validation (genuine data-quality issues). */
  rejected: number
  /** Records skipped as duplicates within the batch (by id or canonical URL).
   *  Deduplication is expected behavior, NOT a failure. */
  duplicates: number
  /** Records transitioned to expired/archived or retired as missing this run. */
  expired: number
  /** Genuine processing/provider/database errors only (never duplicates). */
  errors: Array<{ externalId?: string; message: string }>
  startedAt: string
  finishedAt: string
}

/**
 * Combined result of a full freshness refresh run: an import pass plus the
 * lifecycle/verification maintenance that runs regardless of new source data.
 * Mirrors the columns of the `scholarship_ingestion_runs` log.
 */
export type ScholarshipRefreshResult = {
  source: string
  trigger: 'scheduled' | 'manual' | 'dry_run'
  dryRun: boolean
  fetched: number
  created: number
  updated: number
  reactivated: number
  unchanged: number
  archived: number
  /** Skipped/deduplicated — expected, never counted as a failure. */
  duplicates: number
  flagged: number
  rejected: number
  /** Genuine processing/validation/provider/database errors only. */
  failed: number
  errors: Array<{ externalId?: string; message: string }>
  startedAt: string
  finishedAt: string
  status: 'success' | 'partial' | 'failed'
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
  /**
   * Archive rows whose fixed deadline has passed (active -> inactive, lifecycle
   * -> expired, archived_at set). Runs independently of new source data so
   * expired scholarships are retired even when an import brings nothing new.
   * Returns the number archived. `source` scopes the sweep when provided.
   */
  archiveExpired?(nowIso: string, source?: string): Promise<number>
  /** Record an ingestion/refresh run in the audit log. Best-effort. */
  recordRun?(run: ScholarshipRunLogRecord): Promise<void>
}

/** Subset of the canonical row the pipeline needs to compare against. */
export type ExistingScholarshipRow = {
  id: string
  external_id: string
  import_fingerprint: string | null
  active: boolean
  lifecycle_status: string | null
  canonical_url?: string | null
}

/** A row written to public.scholarship_ingestion_runs. */
export type ScholarshipRunLogRecord = {
  source: string | null
  trigger: 'scheduled' | 'manual' | 'dry_run'
  dry_run: boolean
  status: 'running' | 'success' | 'partial' | 'failed'
  started_at: string
  finished_at: string | null
  fetched_count: number
  created_count: number
  updated_count: number
  reactivated_count: number
  unchanged_count: number
  archived_count: number
  duplicate_count: number
  flagged_count: number
  rejected_count: number
  failed_count: number
  errors: unknown
  created_by: string | null
}
