/**
 * Pure normalization helpers. No I/O, no database, no source-specific logic.
 * These turn a canonical `ScholarshipImportRecord` into the exact row shape the
 * `public.scholarships` table expects, and produce deterministic fingerprints
 * used for deduplication.
 */

import { createHash } from 'node:crypto'
import type { NormalizedScholarshipRow, ScholarshipImportRecord } from './types'

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
    raw_source_metadata: row.raw_source_metadata,
  }
  return createHash('sha256').update(JSON.stringify(content)).digest('hex').slice(0, 40)
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
    application_url: applicationUrl,

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

    active: record.active !== false,
    lifecycle_status: record.active === false ? 'inactive' : 'active',
    last_verified_at: cleanString(record.lastVerifiedAt) ?? new Date().toISOString(),

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
