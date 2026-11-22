/**
 * Pure normalization helpers. No I/O, no database, no source-specific logic.
 * These turn a canonical `ScholarshipImportRecord` into the exact row shape the
 * `public.scholarships` table expects, and produce deterministic fingerprints
 * used for deduplication.
 */

import { createHash } from 'node:crypto'
import type {
  DeadlineType,
  NormalizedScholarshipRow,
  ScholarshipImportRecord,
} from './types'

/** Default number of days until a freshly imported record should be re-verified. */
export const DEFAULT_VERIFICATION_INTERVAL_DAYS = 7

export function cleanString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function cleanTags(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of value) {
    const tag = cleanString(item)
    if (!tag) continue
    const key = tag.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(tag)
  }
  return out
}

/**
 * Parse a monetary value from a string or number. Returns null for values that
 * are missing or cannot be interpreted. Never throws.
 */
export function parseAmount(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value : null
  if (typeof value !== 'string') return null
  const match = value.replace(/,/g, '').match(/\d+(?:\.\d+)?/)
  if (!match) return null
  const parsed = Number(match[0])
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

/**
 * Normalize a deadline into an ISO `YYYY-MM-DD` date string, or null when it is
 * missing/unknown. Accepts ISO strings and common `Month DD, YYYY` forms.
 * Returns null (not a throw) for anything unparseable so imports never crash.
 */
export function normalizeDeadline(value: unknown): string | null {
  const raw = cleanString(value)
  if (!raw) return null
  // Already ISO (YYYY-MM-DD or full ISO timestamp).
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) {
    const [, y, m, d] = isoMatch
    if (isValidYmd(Number(y), Number(m), Number(d))) return `${y}-${m}-${d}`
    return null
  }
  // A non-ISO deadline MUST carry an explicit 4-digit year. Without one,
  // `new Date('September 30')` silently resolves to 2001 in V8 — the root cause
  // of the 2001 legacy rows. A yearless date is "unknown", never guessed.
  if (!/\b(19|20)\d{2}\b/.test(raw)) return null
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return null
  const y = parsed.getUTCFullYear()
  const m = parsed.getUTCMonth() + 1
  const d = parsed.getUTCDate()
  if (!isValidYmd(y, m, d)) return null
  return `${y}-${pad(m)}-${pad(d)}`
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function isValidYmd(y: number, m: number, d: number): boolean {
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return false
  if (y < 1900 || y > 2100) return false
  if (m < 1 || m > 12) return false
  if (d < 1 || d > 31) return false
  return true
}

/** Add whole days to an ISO timestamp, returning an ISO string. */
export function addDaysIso(iso: string, days: number): string {
  const base = new Date(iso)
  if (Number.isNaN(base.getTime())) return new Date().toISOString()
  base.setUTCDate(base.getUTCDate() + days)
  return base.toISOString()
}

/** Validate and normalize an http(s) URL. Returns null when invalid. */
export function normalizeUrl(value: unknown): string | null {
  const raw = cleanString(value)
  if (!raw) return null
  try {
    const url = new URL(raw)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.toString()
  } catch {
    return null
  }
}

const GRADE_WORDS: Record<string, number> = {
  freshman: 9,
  sophomore: 10,
  junior: 11,
  senior: 12,
  '9th': 9,
  '10th': 10,
  '11th': 11,
  '12th': 12,
}

/**
 * Map a list of textual grade levels to numeric min/max high-school grades used
 * by the matching engine. Non high-school levels (e.g. "undergraduate") are
 * ignored for the numeric range and simply leave the constraint open.
 */
export function gradeLevelRange(levels: string[] | undefined): {
  min: number | null
  max: number | null
} {
  if (!levels || levels.length === 0) return { min: null, max: null }
  const grades: number[] = []
  for (const level of levels) {
    const normalized = level.trim().toLowerCase()
    if (GRADE_WORDS[normalized] != null) {
      grades.push(GRADE_WORDS[normalized])
      continue
    }
    const numeric = Number(normalized.replace(/[^0-9]/g, ''))
    if (Number.isInteger(numeric) && numeric >= 9 && numeric <= 12) grades.push(numeric)
  }
  if (grades.length === 0) return { min: null, max: null }
  return { min: Math.min(...grades), max: Math.max(...grades) }
}

export function parseGpa(value: unknown): number | null {
  if (typeof value !== 'number') return null
  if (!Number.isFinite(value)) return null
  if (value < 0 || value > 5) return null
  return value
}

/**
 * Deterministic IDENTITY fingerprint. Covers only the stable identity fields
 * (`source + title + organization + deadline + application_url`). It is used to
 * generate a fallback `external_id` for sources without a stable id, so that a
 * later content edit maps to the SAME row (idempotent, no duplicates). Because
 * it is identity-only, it must NOT be used for change detection — see
 * `computeContentFingerprint`.
 */
export function computeFingerprint(input: {
  source: string
  title: string
  organization: string
  deadline: string | null
  applicationUrl: string
}): string {
  const parts = [
    input.source,
    input.title,
    input.organization,
    input.deadline ?? '',
    input.applicationUrl,
  ].map((part) => part.trim().toLowerCase())
  return createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 40)
}

/**
 * Generate a deterministic external id for sources that do not provide a stable
 * one. Uses the identity fingerprint so re-imports converge to the same row.
 */
export function deterministicExternalId(input: {
  source: string
  title: string
  organization: string
  deadline: string | null
  applicationUrl: string
}): string {
  return computeFingerprint(input)
}

/**
 * CONTENT fingerprint used for change detection. Hashes the descriptive/
 * eligibility fields that ingestion owns, so any real content change (amount,
 * tags, requirements, description, deadline, urls, gpa, grades, etc.) produces a
 * new hash and is applied as an update. Deliberately EXCLUDES:
 *  - volatile fields (`last_verified_at`) that change every run, and
 *  - `active` / `lifecycle_status`, which are compared explicitly by the
 *    orchestrator (and are mutated post-normalization by expiry handling).
 */
export function computeContentFingerprint(
  row: Omit<NormalizedScholarshipRow, 'import_fingerprint'>,
): string {
  const content = {
    source: row.source,
    external_id: row.external_id,
    source_url: row.source_url,
    title: row.title,
    organization: row.organization,
    description: row.description,
    amount: row.amount,
    amount_min: row.amount_min,
    amount_max: row.amount_max,
    amount_display: row.amount_display,
    deadline: row.deadline,
    application_url: row.application_url,
    minimum_gpa: row.minimum_gpa,
    minimum_grade_level: row.minimum_grade_level,
    maximum_grade_level: row.maximum_grade_level,
    graduation_years: row.graduation_years,
    career_tags: row.career_tags,
    major_tags: row.major_tags,
    certification_tags: row.certification_tags,
    skill_tags: row.skill_tags,
    state: row.state,
    country: row.country,
    financial_need_required: row.financial_need_required,
    essay_required: row.essay_required,
    recommendation_required: row.recommendation_required,
    transcript_required: row.transcript_required,
    volunteer_required: row.volunteer_required,
    deadline_at: row.deadline_at,
    deadline_type: row.deadline_type,
    canonical_url: row.canonical_url,
    opens_at: row.opens_at,
    deadline_timezone: row.deadline_timezone,
    early_closure_note: row.early_closure_note,
    closed_at: row.closed_at,
    closure_reason: row.closure_reason,
    eligibility_summary: row.eligibility_summary,
    audience_levels: row.audience_levels,
    field_tags: row.field_tags,
    award_scope: row.award_scope,
    attribution: row.attribution,
    verification_status: row.verification_status,
    availability_evidence: row.availability_evidence,
    raw_source_metadata: row.raw_source_metadata,
  }
  return createHash('sha256').update(JSON.stringify(content)).digest('hex').slice(0, 40)
}

/**
 * Canonicalize an application URL for secondary deduplication. Lower-cases the
 * host, drops the fragment and common tracking params, and trims a trailing
 * slash so cosmetically-different links to the same page collapse together.
 * Returns '' when the URL is missing/invalid.
 */
export function canonicalizeUrl(value: unknown): string {
  const normalized = normalizeUrl(value)
  if (!normalized) return ''
  try {
    const url = new URL(normalized)
    url.hash = ''
    url.host = url.host.toLowerCase()
    const params = url.searchParams
    for (const key of [...params.keys()]) {
      if (key.toLowerCase().startsWith('utm_') || key.toLowerCase() === 'fbclid' || key.toLowerCase() === 'gclid') {
        params.delete(key)
      }
    }
    url.search = params.toString()
    let out = url.toString()
    if (out.endsWith('/')) out = out.slice(0, -1)
    return out.toLowerCase()
  } catch {
    return ''
  }
}

/** Derive how a deadline should be interpreted from the record. */
export function resolveDeadlineType(
  requested: DeadlineType | undefined,
  deadline: string | null,
): DeadlineType {
  if (requested === 'fixed' || requested === 'rolling' || requested === 'unknown') return requested
  return deadline ? 'fixed' : 'unknown'
}

/**
 * Compute the persisted `deadline_at` timestamp. A fixed deadline maps to the
 * end of the deadline day (inclusive). Rolling/unknown deadlines have no
 * concrete instant, so they are null (and the display layer gates them on
 * verification freshness instead).
 */
export function resolveDeadlineAt(
  deadlineType: DeadlineType,
  deadline: string | null,
  time?: string | null,
  timeZone?: string | null,
): string | null {
  if (deadlineType !== 'fixed' || !deadline) return null
  const localTime = normalizeClockTime(time) ?? '23:59:59'
  if (timeZone && isValidTimeZone(timeZone)) return zonedLocalToUtcIso(deadline, localTime, timeZone)
  return `${deadline}T${localTime}.000Z`
}

/** `HH:MM` or `HH:MM:SS` (24h) -> `HH:MM:SS`, else null. */
export function normalizeClockTime(value: unknown): string | null {
  const raw = cleanString(value)
  if (!raw) return null
  const m = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  const sec = m[3] ? Number(m[3]) : h === 23 && min === 59 ? 59 : 0
  if (h > 23 || min > 59 || sec > 59) return null
  return `${pad(h)}:${pad(min)}:${pad(sec)}`
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone })
    return true
  } catch {
    return false
  }
}

/** Offset (ms) of `timeZone` from UTC at the given instant. */
function timeZoneOffsetMs(instantMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(instantMs))
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return asUtc - Math.floor(instantMs / 1000) * 1000
}

/**
 * Convert a sponsor's local wall-clock time (e.g. "2026-12-15", "23:59:59",
 * "America/Chicago") into a UTC ISO instant, honoring daylight saving time.
 */
export function zonedLocalToUtcIso(date: string, time: string, timeZone: string): string {
  const [y, mo, d] = date.split('-').map(Number)
  const [h, mi, se] = time.split(':').map(Number)
  const wallAsUtc = Date.UTC(y, mo - 1, d, h, mi, se || 0)
  let guess = wallAsUtc - timeZoneOffsetMs(wallAsUtc, timeZone)
  // Second pass settles DST transitions.
  guess = wallAsUtc - timeZoneOffsetMs(guess, timeZone)
  return new Date(guess).toISOString()
}

/** Normalize an opening date/timestamp to an ISO instant (start of day in tz when date-only). */
export function resolveOpensAt(value: unknown, timeZone?: string | null): string | null {
  const raw = cleanString(value)
  if (!raw) return null
  const dateOnly = raw.match(/^(\d{4}-\d{2}-\d{2})$/)
  if (dateOnly) {
    if (timeZone && isValidTimeZone(timeZone)) return zonedLocalToUtcIso(dateOnly[1], '00:00:00', timeZone)
    return `${dateOnly[1]}T00:00:00.000Z`
  }
  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

const DEMO_HOST = /(^|\.)example\.(com|org|net)$|^localhost$/i

/** True for placeholder/demo URLs (example.com etc.) that must never reach students. */
export function isDemoUrl(value: unknown): boolean {
  const normalized = normalizeUrl(value)
  if (!normalized) return false
  try {
    return DEMO_HOST.test(new URL(normalized).hostname)
  } catch {
    return false
  }
}

/**
 * Convert a canonical import record into a persistable row. Missing optional
 * fields are handled gracefully (nulls / empty arrays). This function is pure
 * and never throws; validation is a separate concern (see validate.ts).
 */
export function normalizeImportRecord(record: ScholarshipImportRecord): NormalizedScholarshipRow {
  const title = cleanString(record.title) ?? ''
  const organization = cleanString(record.organization) ?? ''
  const applicationUrl = normalizeUrl(record.applicationUrl) ?? ''
  const deadline = normalizeDeadline(record.deadline)
  const source = cleanString(record.source) ?? ''

  const externalId = cleanString(record.externalId)
    ? (cleanString(record.externalId) as string)
    : deterministicExternalId({ source, title, organization, deadline, applicationUrl })

  const amountMin = parseAmount(record.amountMin)
  const amountMax = parseAmount(record.amountMax)
  const amount = amountMax ?? amountMin
  const { min: minGrade, max: maxGrade } = gradeLevelRange(record.gradeLevels)

  const deadlineType = resolveDeadlineType(record.deadlineType, deadline)
  const deadlineTimezone = cleanString(record.deadlineTimezone)
  const deadlineAt = resolveDeadlineAt(deadlineType, deadline, record.deadlineTime, deadlineTimezone)
  // Evidence timestamp only. A missing value stays null (unconfirmed) instead
  // of being stamped "verified now".
  const lastVerifiedAt = cleanString(record.lastVerifiedAt ?? undefined)
  const nextVerificationAt = addDaysIso(
    lastVerifiedAt ?? new Date().toISOString(),
    DEFAULT_VERIFICATION_INTERVAL_DAYS,
  )
  const verificationStatus: NormalizedScholarshipRow['verification_status'] =
    record.verificationStatus ??
    (record.active === false || !lastVerifiedAt ? 'unverified' : 'verified')
  const isDemo = isDemoUrl(record.applicationUrl) || isDemoUrl(record.sourceUrl)

  const stateEligibility = cleanTags(record.stateEligibility)
  const countryEligibility = cleanTags(record.countryEligibility)
  const graduationYears = Array.isArray(record.graduationYears)
    ? record.graduationYears.filter((y) => Number.isInteger(y))
    : []

  const rowWithoutFingerprint: Omit<NormalizedScholarshipRow, 'import_fingerprint'> = {
    source,
    external_id: externalId,
    source_url: normalizeUrl(record.sourceUrl) ?? '',

    title,
    organization,
    description: cleanString(record.description),

    amount,
    amount_min: amountMin,
    amount_max: amountMax,
    amount_display: cleanString(record.amountDisplay),

    deadline,
    deadline_at: deadlineAt,
    deadline_type: deadlineType,
    application_url: applicationUrl,
    canonical_url: canonicalizeUrl(applicationUrl),

    minimum_gpa: parseGpa(record.minimumGpa),
    minimum_grade_level: minGrade,
    maximum_grade_level: maxGrade,
    graduation_years: graduationYears.length > 0 ? graduationYears : null,

    career_tags: cleanTags(record.careerTags),
    major_tags: cleanTags(record.majorTags),
    certification_tags: cleanTags(record.certificationTags),
    skill_tags: cleanTags(record.skillTags),

    state: stateEligibility[0] ?? null,
    country: countryEligibility[0] ?? 'US',

    financial_need_required: Boolean(record.financialNeedRequired),
    essay_required: Boolean(record.essayRequired),
    recommendation_required: Boolean(record.recommendationRequired),
    transcript_required: Boolean(record.transcriptRequired),
    volunteer_required: Boolean(record.volunteerRequired),

    opens_at: resolveOpensAt(record.opensAt, deadlineTimezone),
    deadline_timezone: deadlineTimezone,
    early_closure_note: cleanString(record.earlyClosureNote),
    closed_at: cleanString(record.closedAt),
    closure_reason: cleanString(record.closureReason),
    eligibility_summary: cleanString(record.eligibilitySummary),
    audience_levels: cleanTags(record.audienceLevels),
    field_tags: cleanTags(record.fieldTags).map((tag) => tag.toLowerCase()),
    award_scope: record.awardScope ?? null,
    attribution: cleanString(record.attribution),
    availability_evidence:
      record.availabilityEvidence && typeof record.availabilityEvidence === 'object'
        ? { ...record.availabilityEvidence, deadlineTimePublished: Boolean(normalizeClockTime(record.deadlineTime)) }
        : deadline
          ? { deadlineTimePublished: Boolean(normalizeClockTime(record.deadlineTime)) }
          : null,
    is_demo: isDemo,

    active: record.active !== false,
    lifecycle_status: record.active === false ? 'inactive' : 'active',
    last_verified_at: lastVerifiedAt,
    source_updated_at: cleanString(record.sourceUpdatedAt),
    // Verified only with an evidence timestamp from the source. Expiry/staleness
    // are applied downstream (see ingest.applyLifecycle / freshness.deriveVerification).
    verification_status: verificationStatus,
    next_verification_at: nextVerificationAt,
    archived_at: null,

    raw_source_metadata:
      record.rawSourceMetadata && typeof record.rawSourceMetadata === 'object'
        ? record.rawSourceMetadata
        : null,
  }

  return {
    ...rowWithoutFingerprint,
    import_fingerprint: computeContentFingerprint(rowWithoutFingerprint),
  }
}
