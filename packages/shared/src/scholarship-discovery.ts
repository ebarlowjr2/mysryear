/**
 * Scholarship Discovery — the ONE catalog + matching contract shared by web
 * and Expo mobile. Everything here is pure and deterministic for a given
 * `now`, so the same inputs produce the same scholarship IDs, ordering,
 * deadline labels, match explanations and saved state on every platform.
 *
 * It deliberately avoids `Intl` time-zone APIs (inconsistent across Hermes
 * builds): sponsor deadlines are rendered with an explicit US time-zone rule.
 */

import { CAREERS } from './career-catalog'
import {
  computeScholarshipApplicationProgress,
  computeScholarshipReadiness,
  type ScholarshipApplicationProgress,
  type ScholarshipApplicationTaskStatus,
  type ScholarshipReadinessResult,
  type ScholarshipStatus,
  type StudentScholarshipProfile,
} from './scholarships'

// ---------------------------------------------------------------------------
// Field taxonomy (sponsor criteria) and LifePath career mapping
// ---------------------------------------------------------------------------

export type ScholarshipFieldTag =
  | 'computer-science'
  | 'engineering'
  | 'stem'
  | 'health'
  | 'education'
  | 'skilled-trades'
  | 'business'
  | 'accounting'
  | 'arts'
  | 'design'
  | 'writing'
  | 'law'
  | 'public-service'
  | 'social-services'
  | 'entrepreneurship'
  | 'leadership'

export const SCHOLARSHIP_FIELDS: Record<ScholarshipFieldTag, { label: string; keywords: string[] }> = {
  'computer-science': { label: 'Computer science & IT', keywords: ['computer science', 'software', 'cyber', 'information systems', 'data science', 'coding', 'programming', 'information technology'] },
  engineering: { label: 'Engineering', keywords: ['engineering', 'engineer'] },
  stem: { label: 'STEM', keywords: ['stem', 'science', 'mathematics', 'math ', 'physics', 'chemistry', 'biology', 'technology'] },
  health: { label: 'Health care', keywords: ['nursing', 'nurse', 'medical', 'medicine', 'health', 'pharmacy', 'dental', 'therapy', 'pre-med'] },
  education: { label: 'Teaching & education', keywords: ['teacher', 'teaching', 'education major', 'future educators'] },
  'skilled-trades': { label: 'Skilled trades & career-technical', keywords: ['welding', 'trade', 'vocational', 'technical school', 'electrician', 'hvac', 'automotive', 'apprentice', 'career technical', 'cte', 'construction', 'skilled'] },
  business: { label: 'Business', keywords: ['business', 'marketing', 'management', 'finance', 'economics'] },
  accounting: { label: 'Accounting', keywords: ['accounting', 'accountant', 'cpa', 'actuarial'] },
  arts: { label: 'Arts', keywords: ['art ', 'arts', 'music', 'film', 'theatre', 'theater', 'dance', 'creative'] },
  design: { label: 'Design', keywords: ['design', 'graphic', 'architecture', 'ux'] },
  writing: { label: 'Writing & journalism', keywords: ['writing', 'essay contest', 'journalism', 'poetry', 'fiction', 'literary', 'author'] },
  law: { label: 'Law', keywords: ['law ', 'legal', 'pre-law', 'attorney'] },
  'public-service': { label: 'Public service & civics', keywords: ['public service', 'civic', 'government', 'military', 'veteran', 'democracy', 'citizenship'] },
  'social-services': { label: 'Social work & psychology', keywords: ['social work', 'psychology', 'counseling', 'human services'] },
  entrepreneurship: { label: 'Entrepreneurship', keywords: ['entrepreneur', 'startup', 'small business', 'innovation'] },
  leadership: { label: 'Leadership & service', keywords: ['leadership', 'community service', 'volunteer'] },
}

export const SCHOLARSHIP_FIELD_TAGS = Object.keys(SCHOLARSHIP_FIELDS) as ScholarshipFieldTag[]

/** Sponsor-criteria fields and related majors for each LifePath career id. */
export const CAREER_SCHOLARSHIP_PROFILE: Record<string, { fields: ScholarshipFieldTag[]; majors: string[] }> = {
  'cybersecurity-analyst': { fields: ['computer-science', 'stem'], majors: ['Cybersecurity', 'Computer Science', 'Information Systems'] },
  'software-engineer': { fields: ['computer-science', 'engineering', 'stem'], majors: ['Computer Science', 'Software Engineering', 'Computer Engineering'] },
  'cloud-engineer': { fields: ['computer-science', 'engineering', 'stem'], majors: ['Computer Science', 'Computer Engineering', 'Information Systems'] },
  'data-analyst': { fields: ['computer-science', 'stem', 'business'], majors: ['Data Science', 'Statistics', 'Information Systems'] },
  nurse: { fields: ['health', 'stem'], majors: ['Nursing'] },
  'medical-assistant': { fields: ['health'], majors: ['Medical Assisting', 'Health Sciences'] },
  teacher: { fields: ['education'], majors: ['Education'] },
  electrician: { fields: ['skilled-trades'], majors: ['Electrical Technology'] },
  'hvac-technician': { fields: ['skilled-trades'], majors: ['HVAC Technology'] },
  welder: { fields: ['skilled-trades'], majors: ['Welding Technology'] },
  mechanic: { fields: ['skilled-trades'], majors: ['Automotive Technology'] },
  'ux-designer': { fields: ['design', 'arts', 'computer-science'], majors: ['Graphic Design', 'Human-Computer Interaction'] },
  'graphic-designer': { fields: ['design', 'arts'], majors: ['Graphic Design', 'Visual Arts'] },
  accountant: { fields: ['accounting', 'business'], majors: ['Accounting'] },
  'digital-marketer': { fields: ['business', 'writing'], majors: ['Marketing', 'Communications'] },
  'project-manager': { fields: ['business', 'leadership'], majors: ['Business Administration', 'Management'] },
  'social-worker': { fields: ['social-services', 'public-service'], majors: ['Social Work', 'Psychology'] },
  'physical-therapist': { fields: ['health', 'stem'], majors: ['Kinesiology', 'Exercise Science'] },
  lawyer: { fields: ['law', 'public-service', 'writing'], majors: ['Political Science', 'Pre-Law'] },
  entrepreneur: { fields: ['entrepreneurship', 'business', 'leadership'], majors: ['Business', 'Entrepreneurship'] },
}

const CATEGORY_FIELDS: Record<string, ScholarshipFieldTag[]> = {
  Technology: ['computer-science', 'stem'],
  Healthcare: ['health'],
  Education: ['education'],
  'Skilled Trades': ['skilled-trades'],
  Design: ['design', 'arts'],
  'Business/Finance': ['accounting', 'business'],
  'Business/Analytics': ['business', 'stem'],
  'Business/Marketing': ['business'],
  'Business/Operations': ['business', 'leadership'],
  Community: ['social-services', 'public-service'],
  'Law/Public Service': ['law', 'public-service'],
  Entrepreneurship: ['entrepreneurship', 'business'],
}

function careerProfile(careerId: string): { title: string; fields: ScholarshipFieldTag[]; majors: string[] } | null {
  const career = CAREERS.find((c) => c.id === careerId)
  const mapped = CAREER_SCHOLARSHIP_PROFILE[careerId]
  if (!career && !mapped) return null
  return {
    title: career?.title ?? careerId,
    fields: mapped?.fields ?? CATEGORY_FIELDS[career?.category ?? ''] ?? [],
    majors: mapped?.majors ?? [],
  }
}

/** Infer field tags from free text (used for listings without structured fields). */
export function inferFieldTags(text: string): ScholarshipFieldTag[] {
  const haystack = ` ${text.toLowerCase()} `
  return SCHOLARSHIP_FIELD_TAGS.filter((tag) => SCHOLARSHIP_FIELDS[tag].keywords.some((k) => haystack.includes(k)))
}

// ---------------------------------------------------------------------------
// Catalog entry (tolerant mapping from DB rows)
// ---------------------------------------------------------------------------

export type ScholarshipCatalogEntry = {
  id: string
  title: string
  organization: string | null
  description: string | null
  eligibilitySummary: string | null
  amount: number | null
  amountMin: number | null
  amountMax: number | null
  amountDisplay: string | null
  deadline: string | null
  deadlineAt: string | null
  deadlineType: 'fixed' | 'rolling' | 'unknown'
  deadlineTimezone: string | null
  /** False when the sponsor published only a date (no closing time). */
  deadlineTimePublished: boolean
  opensAt: string | null
  earlyClosureNote: string | null
  closedAt: string | null
  closureReason: string | null
  applicationUrl: string | null
  sourceUrl: string | null
  lastVerifiedAt: string | null
  verificationStatus: string | null
  state: string | null
  minimumGpa: number | null
  minimumGradeLevel: number | null
  maximumGradeLevel: number | null
  audienceLevels: string[]
  fieldTags: string[]
  careerTags: string[]
  majorTags: string[]
  awardScope: string | null
  source: string | null
  attribution: string | null
  essayRequired: boolean
  recommendationRequired: boolean
  transcriptRequired: boolean
  financialNeedRequired: boolean
  volunteerRequired: boolean
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}
function num(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value)
  return null
}
function list(value: unknown): string[] {
  return Array.isArray(value) ? value.map((v) => String(v).trim()).filter(Boolean) : []
}

export function toCatalogEntry(row: Record<string, unknown>): ScholarshipCatalogEntry {
  const deadlineType = row.deadline_type === 'rolling' || row.deadline_type === 'unknown' ? row.deadline_type : row.deadline || row.deadline_at ? 'fixed' : 'unknown'
  const amountMin = num(row.amount_min)
  const amountMax = num(row.amount_max)
  return {
    id: String(row.id),
    title: str(row.title) ?? str(row.name) ?? 'Untitled scholarship',
    organization: str(row.organization) ?? str(row.opportunity_source),
    description: str(row.description),
    eligibilitySummary: str(row.eligibility_summary),
    amount: num(row.amount) ?? amountMax ?? amountMin,
    amountMin,
    amountMax,
    amountDisplay: str(row.amount_display),
    deadline: str(row.deadline),
    deadlineAt: str(row.deadline_at),
    deadlineType: deadlineType as ScholarshipCatalogEntry['deadlineType'],
    deadlineTimezone: str(row.deadline_timezone),
    deadlineTimePublished:
      row.availability_evidence && typeof row.availability_evidence === 'object'
        ? (row.availability_evidence as { deadlineTimePublished?: unknown }).deadlineTimePublished !== false
        : true,
    opensAt: str(row.opens_at),
    earlyClosureNote: str(row.early_closure_note),
    closedAt: str(row.closed_at),
    closureReason: str(row.closure_reason),
    applicationUrl: str(row.application_url) ?? str(row.link),
    sourceUrl: str(row.source_url),
    lastVerifiedAt: str(row.last_verified_at),
    verificationStatus: str(row.verification_status),
    state: str(row.state),
    minimumGpa: num(row.minimum_gpa),
    minimumGradeLevel: num(row.minimum_grade_level),
    maximumGradeLevel: num(row.maximum_grade_level),
    audienceLevels: list(row.audience_levels),
    fieldTags: list(row.field_tags).map((t) => t.toLowerCase()),
    careerTags: list(row.career_tags),
    majorTags: list(row.major_tags),
    awardScope: str(row.award_scope),
    source: str(row.source),
    attribution: str(row.attribution),
    essayRequired: Boolean(row.essay_required),
    recommendationRequired: Boolean(row.recommendation_required),
    transcriptRequired: Boolean(row.transcript_required),
    financialNeedRequired: Boolean(row.financial_need_required),
    volunteerRequired: Boolean(row.volunteer_required),
  }
}

// ---------------------------------------------------------------------------
// Deterministic date rendering (explicit US time-zone rules, no Intl)
// ---------------------------------------------------------------------------

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const US_ZONES: Record<string, { std: number; abbr: string; dst: boolean }> = {
  'America/New_York': { std: -5, abbr: 'ET', dst: true },
  'America/Detroit': { std: -5, abbr: 'ET', dst: true },
  'America/Chicago': { std: -6, abbr: 'CT', dst: true },
  'America/Denver': { std: -7, abbr: 'MT', dst: true },
  'America/Phoenix': { std: -7, abbr: 'MT', dst: false },
  'America/Los_Angeles': { std: -8, abbr: 'PT', dst: true },
  'America/Anchorage': { std: -9, abbr: 'AKT', dst: true },
  'Pacific/Honolulu': { std: -10, abbr: 'HT', dst: false },
}

function nthSundayUtc(year: number, month: number, n: number): number {
  const first = new Date(Date.UTC(year, month, 1)).getUTCDay()
  return 1 + ((7 - first) % 7) + (n - 1) * 7
}

/** UTC offset in hours for a supported US zone at an instant (US DST rules since 2007). */
export function usZoneOffsetHours(timeZone: string, instantMs: number): number | null {
  const zone = US_ZONES[timeZone]
  if (!zone) return null
  if (!zone.dst) return zone.std
  const year = new Date(instantMs).getUTCFullYear()
  // DST starts 2:00 local standard time on the 2nd Sunday of March, ends 2:00 local daylight time on the 1st Sunday of November.
  const start = Date.UTC(year, 2, nthSundayUtc(year, 2, 2), 2 - zone.std)
  const end = Date.UTC(year, 10, nthSundayUtc(year, 10, 1), 2 - (zone.std + 1))
  return instantMs >= start && instantMs < end ? zone.std + 1 : zone.std
}

function wallClock(instantMs: number, timeZone: string | null) {
  const offset = timeZone ? usZoneOffsetHours(timeZone, instantMs) : null
  const d = new Date(instantMs + (offset ?? 0) * 3600_000)
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth(),
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    abbr: offset != null && timeZone ? US_ZONES[timeZone].abbr : 'UTC',
  }
}

export function formatCatalogDate(iso: string | null | undefined, timeZone?: string | null): string {
  if (!iso) return ''
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(iso)
  if (dateOnly) {
    const [y, m, d] = iso.split('-').map(Number)
    return `${MONTHS[m - 1]} ${d}, ${y}`
  }
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) return ''
  const w = wallClock(ms, timeZone ?? null)
  return `${MONTHS[w.month]} ${w.day}, ${w.year}`
}

function formatClock(iso: string, timeZone: string | null): string {
  const ms = Date.parse(iso)
  const w = wallClock(ms, timeZone)
  if (w.hour === 23 && w.minute === 59) return `11:59 PM ${w.abbr}`
  const h12 = w.hour % 12 === 0 ? 12 : w.hour % 12
  return `${h12}:${String(w.minute).padStart(2, '0')} ${w.hour < 12 ? 'AM' : 'PM'} ${w.abbr}`
}

/** Sponsor closing instant in ms (inclusive of the deadline day when only a date is known). */
export function closingInstantMs(entry: Pick<ScholarshipCatalogEntry, 'deadlineAt' | 'deadline' | 'deadlineType'>): number | null {
  if (entry.deadlineType === 'rolling') return null
  if (entry.deadlineAt) {
    const ms = Date.parse(entry.deadlineAt)
    if (!Number.isNaN(ms)) return ms
  }
  if (entry.deadline && /^\d{4}-\d{2}-\d{2}$/.test(entry.deadline)) return Date.parse(`${entry.deadline}T00:00:00.000Z`) + 86_400_000
  return null
}

/** "$12,500" without Intl (identical on Hermes and V8). */
export function formatUsd(value: number): string {
  const whole = Math.round(value)
  return `$${String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

/** Award amount as published: sponsor wording, a range, a single amount, or "not published". */
export function formatAwardAmount(entry: Pick<ScholarshipCatalogEntry, 'amountDisplay' | 'amount' | 'amountMin' | 'amountMax'>): string {
  if (entry.amountDisplay) return entry.amountDisplay
  if (entry.amountMin != null && entry.amountMax != null && entry.amountMin !== entry.amountMax) return `${formatUsd(entry.amountMin)}–${formatUsd(entry.amountMax)}`
  const single = entry.amountMax ?? entry.amount ?? entry.amountMin
  if (single != null && single > 0) return entry.amountMin == null && entry.amountMax != null ? `Up to ${formatUsd(single)}` : formatUsd(single)
  return 'Amount not published'
}

// ---------------------------------------------------------------------------
// Availability
// ---------------------------------------------------------------------------

export type ScholarshipAvailabilityState = 'open' | 'upcoming' | 'rolling' | 'closed' | 'closed_early' | 'unconfirmed'

export type ScholarshipAvailability = {
  state: ScholarshipAvailabilityState
  /** Short label, e.g. "Closes Dec 15, 2026, 11:59 PM CT". */
  label: string
  closesAtMs: number | null
  opensAtMs: number | null
  closingSoon: boolean
  /** Students can act (apply) right now. */
  canApply: boolean
}

const SOON_MS = 14 * 86_400_000

export function scholarshipAvailability(entry: ScholarshipCatalogEntry, now: Date): ScholarshipAvailability {
  const nowMs = now.getTime()
  const closesAtMs = closingInstantMs(entry)
  const opensAtMs = entry.opensAt ? Date.parse(entry.opensAt) : null
  const tz = entry.deadlineTimezone
  const closeText = () => {
    if (!closesAtMs) return ''
    const date = entry.deadlineAt ? formatCatalogDate(entry.deadlineAt, tz) : formatCatalogDate(entry.deadline)
    const timed = entry.deadlineAt && entry.deadlineTimePublished && tz && US_ZONES[tz] ? `, ${formatClock(entry.deadlineAt, tz)}` : ''
    return `${date}${timed}`
  }

  if (entry.closedAt) {
    return { state: 'closed_early', label: `Closed early (${formatCatalogDate(entry.closedAt, tz)})`, closesAtMs, opensAtMs, closingSoon: false, canApply: false }
  }
  if (entry.deadlineType === 'rolling' && entry.verificationStatus === 'verified') {
    return { state: 'rolling', label: 'Rolling — sponsor accepts applications year-round', closesAtMs: null, opensAtMs, closingSoon: false, canApply: true }
  }
  if (closesAtMs != null && closesAtMs <= nowMs) {
    return { state: 'closed', label: `Closed ${closeText()}`, closesAtMs, opensAtMs, closingSoon: false, canApply: false }
  }
  if (entry.verificationStatus !== 'verified' || closesAtMs == null) {
    return {
      state: 'unconfirmed',
      label: closesAtMs == null ? 'Deadline not confirmed by sponsor' : 'Dates not yet confirmed by sponsor',
      closesAtMs,
      opensAtMs,
      closingSoon: false,
      canApply: false,
    }
  }
  if (opensAtMs != null && !Number.isNaN(opensAtMs) && opensAtMs > nowMs) {
    return {
      state: 'upcoming',
      label: `Opens ${formatCatalogDate(entry.opensAt, tz)} · closes ${closeText()}`,
      closesAtMs,
      opensAtMs,
      closingSoon: false,
      canApply: false,
    }
  }
  return { state: 'open', label: `Closes ${closeText()}`, closesAtMs, opensAtMs, closingSoon: closesAtMs - nowMs <= SOON_MS, canApply: true }
}

export function isListable(availability: ScholarshipAvailability): boolean {
  return availability.state === 'open' || availability.state === 'upcoming' || availability.state === 'rolling'
}

// ---------------------------------------------------------------------------
// Search, filters, ordering, pagination
// ---------------------------------------------------------------------------

export type ScholarshipCatalogFilters = {
  query?: string
  /** Two-letter state: show national awards plus awards for this state. */
  state?: string
  field?: ScholarshipFieldTag | ''
  /** Closing within N days (open awards only). */
  deadlineWithinDays?: number | null
  /** 'high-school' keeps awards open to high school students; 'college' keeps college-level awards. */
  level?: 'any' | 'high-school' | 'college'
  includeUpcoming?: boolean
}

export const DEFAULT_CATALOG_FILTERS: Required<ScholarshipCatalogFilters> = {
  query: '',
  state: '',
  field: '',
  deadlineWithinDays: null,
  level: 'any',
  includeUpcoming: true,
}

export const SCHOLARSHIP_PAGE_SIZE = 12

const STATE_RANK: Record<ScholarshipAvailabilityState, number> = { open: 0, rolling: 1, upcoming: 2, closed_early: 3, closed: 4, unconfirmed: 5 }

export function compareCatalog(
  a: { entry: ScholarshipCatalogEntry; availability: ScholarshipAvailability },
  b: { entry: ScholarshipCatalogEntry; availability: ScholarshipAvailability },
): number {
  const rank = STATE_RANK[a.availability.state] - STATE_RANK[b.availability.state]
  if (rank !== 0) return rank
  const ak = a.availability.state === 'upcoming' ? a.availability.opensAtMs : a.availability.closesAtMs
  const bk = b.availability.state === 'upcoming' ? b.availability.opensAtMs : b.availability.closesAtMs
  if (ak !== bk) return (ak ?? Number.MAX_SAFE_INTEGER) - (bk ?? Number.MAX_SAFE_INTEGER)
  const title = a.entry.title.localeCompare(b.entry.title, 'en')
  if (title !== 0) return title
  return a.entry.id < b.entry.id ? -1 : a.entry.id > b.entry.id ? 1 : 0
}

const HS_LEVELS = new Set(['high-school', 'high-school-senior', 'high-school-junior', 'high-school-sophomore', 'high-school-freshman'])

export function opensToHighSchool(entry: ScholarshipCatalogEntry): boolean {
  // Unknown audience: keep it visible rather than hide a possibly-eligible award.
  if (entry.audienceLevels.length === 0) return true
  return entry.audienceLevels.some((level) => HS_LEVELS.has(level))
}

function searchableText(entry: ScholarshipCatalogEntry): string {
  return [
    entry.title,
    entry.organization ?? '',
    entry.eligibilitySummary ?? '',
    entry.description ?? '',
    entry.state ?? '',
    ...entry.majorTags,
    ...entry.careerTags,
    ...entry.fieldTags.map((t) => SCHOLARSHIP_FIELDS[t as ScholarshipFieldTag]?.label ?? t),
  ]
    .join(' ')
    .toLowerCase()
}

export function matchesCatalogFilters(
  entry: ScholarshipCatalogEntry,
  availability: ScholarshipAvailability,
  filters: ScholarshipCatalogFilters,
  now: Date,
): boolean {
  const f = { ...DEFAULT_CATALOG_FILTERS, ...filters }
  if (!isListable(availability)) return false
  if (!f.includeUpcoming && availability.state === 'upcoming') return false
  const tokens = f.query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (tokens.length) {
    const text = searchableText(entry)
    if (!tokens.every((t) => text.includes(t))) return false
  }
  if (f.state) {
    if (f.state === 'national') {
      if (entry.state) return false
    } else if (entry.state && entry.state.toUpperCase() !== f.state.toUpperCase()) return false
  }
  if (f.field && !entry.fieldTags.includes(f.field)) return false
  if (f.deadlineWithinDays != null) {
    if (availability.state !== 'open' || availability.closesAtMs == null) return false
    if (availability.closesAtMs - now.getTime() > f.deadlineWithinDays * 86_400_000) return false
  }
  if (f.level === 'high-school' && !opensToHighSchool(entry)) return false
  if (f.level === 'college' && !entry.audienceLevels.some((l) => !HS_LEVELS.has(l))) return false
  return true
}

export type ScholarshipPage<T> = { items: T[]; page: number; pageCount: number; total: number; hasNext: boolean; hasPrevious: boolean }

export function paginate<T>(items: T[], page: number, pageSize = SCHOLARSHIP_PAGE_SIZE): ScholarshipPage<T> {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pageCount)
  const start = (current - 1) * pageSize
  return { items: items.slice(start, start + pageSize), page: current, pageCount, total: items.length, hasNext: current < pageCount, hasPrevious: current > 1 }
}

/**
 * Collapse the same award listed by more than one source (e.g. a sponsor-
 * verified entry and a directory listing). Keeps the entry verified most
 * recently, then the one with a firm deadline.
 */
export function dedupeCatalog(entries: ScholarshipCatalogEntry[]): ScholarshipCatalogEntry[] {
  const key = (e: ScholarshipCatalogEntry) =>
    `${e.title.toLowerCase().replace(/\b(the|scholarships?|program|award|awards)\b/g, '').replace(/[^a-z0-9]+/g, '')}`
  const best = new Map<string, ScholarshipCatalogEntry>()
  for (const entry of entries) {
    const k = key(entry)
    const prior = best.get(k)
    if (!prior) {
      best.set(k, entry)
      continue
    }
    const pv = prior.lastVerifiedAt ? Date.parse(prior.lastVerifiedAt) : 0
    const ev = entry.lastVerifiedAt ? Date.parse(entry.lastVerifiedAt) : 0
    if (ev > pv || (ev === pv && entry.id < prior.id)) best.set(k, entry)
  }
  const keep = new Set(Array.from(best.values()).map((e) => e.id))
  return entries.filter((e) => keep.has(e.id))
}

// ---------------------------------------------------------------------------
// Grade level (fixes the old 12 -> 9 coercion)
// ---------------------------------------------------------------------------

/**
 * Numeric high-school grade (9–12) from a stored grade level, falling back to
 * graduation year. Unlike the dashboard checklist helper (9/10/11 only), this
 * keeps 12th graders as 12.
 */
export function scholarshipGradeLevel(gradeLevel: unknown, graduationYear: unknown, now: Date): number | null {
  const direct = typeof gradeLevel === 'number' ? gradeLevel : typeof gradeLevel === 'string' ? Number(gradeLevel.replace(/[^0-9]/g, '')) : NaN
  if (Number.isInteger(direct) && direct >= 9 && direct <= 12) return direct
  const year = typeof graduationYear === 'number' ? graduationYear : Number(graduationYear)
  if (!Number.isInteger(year)) return null
  const schoolYearEnds = now.getUTCMonth() >= 6 ? now.getUTCFullYear() + 1 : now.getUTCFullYear()
  const grade = 12 - (year - schoolYearEnds)
  return grade >= 9 && grade <= 12 ? grade : null
}

// ---------------------------------------------------------------------------
// "For your A.U.R.A. career plans"
// ---------------------------------------------------------------------------

export type CareerPlan = {
  /** Saved LifePath career ids, best-ranked first. */
  careerIds: string[]
}

export type CareerPlanMatch = {
  scholarshipId: string
  entry: ScholarshipCatalogEntry
  availability: ScholarshipAvailability
  /** Why this appears, in plain words. */
  reasons: string[]
  /** Published conditions the student still needs to confirm. */
  toCheck: string[]
  /** 'likely' = no known conflict; 'check' = unknowns; 'not-yet' = future grade; 'conflict' = a known requirement not met. */
  fit: 'likely' | 'check' | 'not-yet' | 'conflict'
  matchedCareerIds: string[]
  score: number
}

const AUDIENCE_LABEL: Record<string, string> = {
  'high-school-senior': 'high school seniors',
  'high-school': 'high school students',
  undergraduate: 'college undergraduates',
  graduate: 'graduate students',
  vocational: 'vocational/technical students',
  'community-college': 'community college students',
}

export const CAREER_MATCH_DISCLAIMER = 'A career match is not eligibility. Confirm every requirement on the sponsor page before applying.'

function conditionsToCheck(entry: ScholarshipCatalogEntry, student: StudentScholarshipProfile | null): { toCheck: string[]; fit: CareerPlanMatch['fit'] } {
  const toCheck: string[] = []
  let fit: CareerPlanMatch['fit'] = 'likely'
  const grade = student?.gradeLevel ?? null
  const hsOnlySenior = entry.audienceLevels.length > 0 && entry.audienceLevels.every((l) => l === 'high-school-senior')
  const collegeOnly = entry.audienceLevels.length > 0 && !entry.audienceLevels.some((l) => HS_LEVELS.has(l))

  if (collegeOnly) {
    toCheck.push(`For ${entry.audienceLevels.map((l) => AUDIENCE_LABEL[l] ?? l).join(' or ')} — check whether you can apply before you enroll`)
    fit = 'check'
  } else if (hsOnlySenior) {
    if (grade != null && grade < 12) {
      toCheck.push(`Open to high school seniors — you can apply in 12th grade (you are in grade ${grade})`)
      fit = 'not-yet'
    } else if (grade == null) {
      toCheck.push('Open to high school seniors — add your grade level to confirm')
      fit = 'check'
    }
  }
  if (entry.minimumGpa != null) {
    if (student?.gpa == null) {
      toCheck.push(`Requires a ${entry.minimumGpa.toFixed(1)} GPA — add your GPA to compare`)
      if (fit === 'likely') fit = 'check'
    } else if (student.gpa < entry.minimumGpa) {
      toCheck.push(`Requires a ${entry.minimumGpa.toFixed(1)} GPA (yours is ${student.gpa.toFixed(2)})`)
      fit = 'conflict'
    }
  }
  if (entry.state) {
    if (!student?.state) {
      toCheck.push(`Limited to ${entry.state} — confirm where you live and go to school`)
      if (fit === 'likely') fit = 'check'
    } else if (student.state.toUpperCase() !== entry.state.toUpperCase()) {
      toCheck.push(`Limited to ${entry.state} (your school is in ${student.state.toUpperCase()})`)
      fit = 'conflict'
    }
  }
  const needs: string[] = []
  if (entry.essayRequired) needs.push('an essay')
  if (entry.recommendationRequired) needs.push('a recommendation')
  if (entry.transcriptRequired) needs.push('a transcript')
  if (needs.length) toCheck.push(`Application asks for ${needs.join(', ')}`)
  if (entry.financialNeedRequired) toCheck.push('Considers financial need — have family income information ready')
  if (entry.earlyClosureNote) toCheck.push(entry.earlyClosureNote)
  return { toCheck, fit }
}

function fieldLabels(tags: string[]): string {
  const labels = tags.map((t) => SCHOLARSHIP_FIELDS[t as ScholarshipFieldTag]?.label ?? t)
  return labels.length <= 2 ? labels.join(' and ') : `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`
}

const FIT_RANK: Record<CareerPlanMatch['fit'], number> = { likely: 0, check: 1, 'not-yet': 2, conflict: 3 }

export function matchCareerPlans(
  entries: Array<{ entry: ScholarshipCatalogEntry; availability: ScholarshipAvailability }>,
  plan: CareerPlan,
  student: StudentScholarshipProfile | null,
): CareerPlanMatch[] {
  const careers = plan.careerIds.map((id, index) => ({ id, rank: index + 1, profile: careerProfile(id) })).filter((c) => c.profile)
  if (careers.length === 0) return []
  const out: CareerPlanMatch[] = []
  for (const { entry, availability } of entries) {
    if (!isListable(availability)) continue
    const entryFields = new Set(entry.fieldTags)
    const entryMajors = new Set(entry.majorTags.map((m) => m.toLowerCase()))
    const reasons: string[] = []
    const matched: string[] = []
    let score = 0
    for (const career of careers) {
      const profile = career.profile!
      const fieldHits = profile.fields.filter((f) => entryFields.has(f))
      const majorHits = profile.majors.filter((m) => entryMajors.has(m.toLowerCase()))
      if (fieldHits.length === 0 && majorHits.length === 0) continue
      matched.push(career.id)
      const weight = Math.max(1, 6 - career.rank)
      score += weight * (fieldHits.length + 2 * majorHits.length)
      const detail = majorHits.length
        ? `the sponsor lists ${majorHits.slice(0, 3).join(', ')} as eligible majors`
        : `the sponsor's criteria cover ${fieldLabels(fieldHits)}`
      reasons.push(`${career.rank === 1 ? 'Your #1 career plan' : `Your #${career.rank} career plan`}, ${profile.title}: ${detail}`)
    }
    if (matched.length === 0) continue
    const { toCheck, fit } = conditionsToCheck(entry, student)
    out.push({ scholarshipId: entry.id, entry, availability, reasons: reasons.slice(0, 3), toCheck, fit, matchedCareerIds: matched, score })
  }
  return out.sort((a, b) => {
    const f = FIT_RANK[a.fit] - FIT_RANK[b.fit]
    if (f !== 0) return f
    if (b.score !== a.score) return b.score - a.score
    return compareCatalog(a, b)
  })
}

// ---------------------------------------------------------------------------
// Readiness, worded as actions
// ---------------------------------------------------------------------------

export type ReadinessActionKey = 'gpa' | 'transcript' | 'resume' | 'service' | 'activity' | 'achievement' | 'certification' | 'careers'

const READINESS_ACTIONS: Record<string, { key: ReadinessActionKey; label: string }> = {
  'GPA added': { key: 'gpa', label: 'Add your GPA' },
  'Transcript uploaded': { key: 'transcript', label: 'Upload a transcript or report card' },
  'Resume uploaded': { key: 'resume', label: 'Upload your resume' },
  'At least 10 volunteer hours': { key: 'service', label: 'Log 10 volunteer hours' },
  'Activity/leadership entered': { key: 'activity', label: 'Add an activity or leadership role' },
  'Award/achievement entered': { key: 'achievement', label: 'Add an award or achievement' },
  'Certification or credential entered': { key: 'certification', label: 'Add a certification' },
  'Career interests selected': { key: 'careers', label: 'Choose your LifePath career interests' },
}

export function readinessActions(readiness: ScholarshipReadinessResult): Array<{ key: ReadinessActionKey; label: string }> {
  return readiness.missingRequirements.map((m) => READINESS_ACTIONS[m]).filter((a): a is { key: ReadinessActionKey; label: string } => Boolean(a))
}

// ---------------------------------------------------------------------------
// Tracker
// ---------------------------------------------------------------------------

export type DiscoveryTask = {
  id: string
  scholarship_id: string
  title: string
  description: string | null
  category: string
  status: ScholarshipApplicationTaskStatus
  due_date: string | null
  upload_required: boolean
  uploaded_file_id: string | null
  completed_at: string | null
}

export type TrackedStatus = Exclude<ScholarshipStatus, 'suggested'>
export const TRACKED_STATUSES: TrackedStatus[] = ['saved', 'applying', 'submitted', 'awarded', 'rejected']
export const TRACKED_STATUS_LABELS: Record<TrackedStatus, string> = {
  saved: 'Saved',
  applying: 'Applying',
  submitted: 'Submitted',
  awarded: 'Awarded',
  rejected: 'Not awarded',
}

export type TrackedAward = {
  scholarshipId: string
  status: TrackedStatus
  entry: ScholarshipCatalogEntry | null
  availability: ScholarshipAvailability | null
  tasks: DiscoveryTask[]
  progress: ScholarshipApplicationProgress
}

export function normalizeDiscoveryTask(row: Record<string, unknown>): DiscoveryTask {
  return {
    id: String(row.id),
    scholarship_id: String(row.scholarship_id),
    title: String(row.title ?? ''),
    description: typeof row.description === 'string' ? row.description : null,
    category: String(row.category || 'general'),
    status: row.status === 'done' || row.status === 'in_progress' ? row.status : 'not_started',
    due_date: typeof row.due_date === 'string' ? row.due_date : null,
    upload_required: Boolean(row.upload_required),
    uploaded_file_id: typeof row.uploaded_file_id === 'string' ? row.uploaded_file_id : null,
    completed_at: typeof row.completed_at === 'string' ? row.completed_at : null,
  }
}

// ---------------------------------------------------------------------------
// The discovery view model
// ---------------------------------------------------------------------------

export type ScholarshipDiscoveryInput = {
  /** Rows from student_visible_scholarships (all pages). */
  catalogRows: Array<Record<string, unknown>>
  /** Null when the catalog read succeeded; a message when it failed. */
  catalogError: string | null
  /** Tracked statuses for the active student (status != 'suggested'). */
  tracked: Array<{ scholarship_id: string; status: string }>
  /** Scholarship rows for tracked awards (may include closed awards). */
  trackedRows: Array<Record<string, unknown>>
  tasks: Array<Record<string, unknown>>
  student: StudentScholarshipProfile | null
  plan: CareerPlan
}

export type CatalogCard = {
  scholarshipId: string
  entry: ScholarshipCatalogEntry
  availability: ScholarshipAvailability
  trackedStatus: TrackedStatus | null
}

export type ScholarshipDiscovery = {
  generatedAt: string
  catalog: {
    state: 'ok' | 'unavailable' | 'empty' | 'no-results'
    message: string
    openCount: number
    upcomingCount: number
    page: ScholarshipPage<CatalogCard>
  }
  forYou: {
    state: 'ok' | 'needs-interests' | 'no-matches' | 'unavailable'
    message: string
    careers: Array<{ id: string; title: string; rank: number }>
    items: CareerPlanMatch[]
    disclaimer: string
  }
  tracker: {
    counts: Record<TrackedStatus, number>
    items: TrackedAward[]
  }
  readiness: ScholarshipReadinessResult & { actions: Array<{ key: ReadinessActionKey; label: string }> }
  upcomingDeadlines: Array<{ scholarshipId: string; title: string; label: string; tracked: boolean }>
}

export function buildScholarshipDiscovery(
  input: ScholarshipDiscoveryInput,
  options: { now: Date; filters?: ScholarshipCatalogFilters; page?: number; pageSize?: number; forYouLimit?: number },
): ScholarshipDiscovery {
  const now = options.now
  const trackedStatus = new Map<string, TrackedStatus>()
  for (const t of input.tracked) {
    if ((TRACKED_STATUSES as string[]).includes(t.status)) trackedStatus.set(String(t.scholarship_id), t.status as TrackedStatus)
  }

  const entries = dedupeCatalog(input.catalogRows.map(toCatalogEntry))
  const scored = entries
    .map((entry) => ({ entry, availability: scholarshipAvailability(entry, now) }))
    .filter((x) => isListable(x.availability))
    .sort(compareCatalog)

  const filtered = scored.filter((x) => matchesCatalogFilters(x.entry, x.availability, options.filters ?? {}, now))
  const cards: CatalogCard[] = filtered.map((x) => ({ scholarshipId: x.entry.id, entry: x.entry, availability: x.availability, trackedStatus: trackedStatus.get(x.entry.id) ?? null }))
  const page = paginate(cards, options.page ?? 1, options.pageSize ?? SCHOLARSHIP_PAGE_SIZE)

  const openCount = scored.filter((x) => x.availability.state === 'open' || x.availability.state === 'rolling').length
  const upcomingCount = scored.filter((x) => x.availability.state === 'upcoming').length
  const catalogState: ScholarshipDiscovery['catalog']['state'] = input.catalogError
    ? 'unavailable'
    : scored.length === 0
      ? 'empty'
      : filtered.length === 0
        ? 'no-results'
        : 'ok'
  const catalogMessage = {
    unavailable: 'Scholarship listings are temporarily unavailable. Your saved awards and tasks are safe — try again shortly.',
    empty: 'No verified scholarships are open right now. New awards are checked daily; your tracker below is unaffected.',
    'no-results': 'No open scholarships match these filters. Clear a filter or try a broader search.',
    ok: '',
  }[catalogState]

  const careers = input.plan.careerIds
    .map((id, index) => ({ id, title: careerProfile(id)?.title ?? id, rank: index + 1 }))
    .filter((c) => careerProfile(c.id))
  const personal = input.catalogError ? [] : matchCareerPlans(scored, input.plan, input.student)
  const forYouState: ScholarshipDiscovery['forYou']['state'] = input.catalogError
    ? 'unavailable'
    : careers.length === 0
      ? 'needs-interests'
      : personal.length === 0
        ? 'no-matches'
        : 'ok'
  const forYouMessage = {
    unavailable: 'Personalized matches will return when listings are available again.',
    'needs-interests': 'Pick career interests in LifePath and A.U.R.A. will show scholarships whose sponsors fund those fields. You can keep browsing all open scholarships meanwhile.',
    'no-matches': `No open scholarships currently target ${careers.map((c) => c.title).join(', ')}. General awards below are still open to you.`,
    ok: '',
  }[forYouState]

  const catalogById = new Map(entries.map((e) => [e.id, e]))
  for (const row of input.trackedRows) {
    const entry = toCatalogEntry(row)
    if (!catalogById.has(entry.id)) catalogById.set(entry.id, entry)
  }
  const tasksBy = new Map<string, DiscoveryTask[]>()
  for (const raw of input.tasks) {
    const task = normalizeDiscoveryTask(raw)
    const listForId = tasksBy.get(task.scholarship_id) || []
    listForId.push(task)
    tasksBy.set(task.scholarship_id, listForId)
  }
  for (const listForId of tasksBy.values()) {
    listForId.sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999') || a.title.localeCompare(b.title) || a.id.localeCompare(b.id))
  }
  const trackerItems: TrackedAward[] = Array.from(trackedStatus.entries()).map(([scholarshipId, status]) => {
    const entry = catalogById.get(scholarshipId) ?? null
    const tasks = tasksBy.get(scholarshipId) || []
    return { scholarshipId, status, entry, availability: entry ? scholarshipAvailability(entry, now) : null, tasks, progress: computeScholarshipApplicationProgress(tasks) }
  })
  trackerItems.sort((a, b) => {
    const s = TRACKED_STATUSES.indexOf(a.status) - TRACKED_STATUSES.indexOf(b.status)
    if (s !== 0) return s
    const ak = a.availability?.closesAtMs ?? Number.MAX_SAFE_INTEGER
    const bk = b.availability?.closesAtMs ?? Number.MAX_SAFE_INTEGER
    if (ak !== bk) return ak - bk
    return a.scholarshipId.localeCompare(b.scholarshipId)
  })
  const counts = Object.fromEntries(TRACKED_STATUSES.map((s) => [s, trackerItems.filter((i) => i.status === s).length])) as Record<TrackedStatus, number>

  const readinessBase = input.student
    ? computeScholarshipReadiness({ student: input.student })
    : { percentage: 0, label: 'Needs Foundation' as const, strengths: [], missingRequirements: [], topMissingRequirement: null }

  const trackedUpcoming = trackerItems
    .filter((i) => i.entry && i.availability && (i.status === 'saved' || i.status === 'applying') && (i.availability.state === 'open' || i.availability.state === 'upcoming'))
    .map((i) => ({ scholarshipId: i.scholarshipId, title: i.entry!.title, label: i.availability!.label, tracked: true, at: i.availability!.closesAtMs ?? 0 }))
  const openUpcoming = scored
    .filter((x) => x.availability.state === 'open' && !trackedStatus.has(x.entry.id))
    .slice(0, 5)
    .map((x) => ({ scholarshipId: x.entry.id, title: x.entry.title, label: x.availability.label, tracked: false, at: x.availability.closesAtMs ?? 0 }))
  const upcomingDeadlines = [...trackedUpcoming, ...openUpcoming]
    .sort((a, b) => a.at - b.at || a.scholarshipId.localeCompare(b.scholarshipId))
    .slice(0, 6)
    .map(({ at: _at, ...rest }) => rest)

  return {
    generatedAt: now.toISOString(),
    catalog: { state: catalogState, message: catalogMessage, openCount, upcomingCount, page },
    forYou: { state: forYouState, message: forYouMessage, careers, items: personal.slice(0, options.forYouLimit ?? 8), disclaimer: CAREER_MATCH_DISCLAIMER },
    tracker: { counts, items: trackerItems },
    readiness: { ...readinessBase, actions: readinessActions(readinessBase) },
    upcomingDeadlines,
  }
}

// ---------------------------------------------------------------------------
// Detail (any open award or any award the student tracks, even after it closes)
// ---------------------------------------------------------------------------

export type ScholarshipDetail = {
  entry: ScholarshipCatalogEntry
  availability: ScholarshipAvailability
  trackedStatus: TrackedStatus | null
  tasks: DiscoveryTask[]
  progress: ScholarshipApplicationProgress
  careerMatch: CareerPlanMatch | null
}

export function buildScholarshipDetail(input: ScholarshipDiscoveryInput, scholarshipId: string, now: Date): ScholarshipDetail | null {
  const row = input.catalogRows.find((r) => String(r.id) === scholarshipId) ?? input.trackedRows.find((r) => String(r.id) === scholarshipId)
  if (!row) return null
  const entry = toCatalogEntry(row)
  const availability = scholarshipAvailability(entry, now)
  const tracked = buildScholarshipDiscovery(input, { now }).tracker.items.find((i) => i.scholarshipId === scholarshipId)
  return {
    entry,
    availability,
    trackedStatus: tracked?.status ?? null,
    tasks: tracked?.tasks ?? [],
    progress: tracked?.progress ?? computeScholarshipApplicationProgress([]),
    careerMatch: matchCareerPlans([{ entry, availability }], input.plan, input.student)[0] ?? null,
  }
}
