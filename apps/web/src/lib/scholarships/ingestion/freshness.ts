/**
 * Freshness & verification logic (pure, no I/O).
 *
 * Two responsibilities:
 *  1. `isVisibleToStudents` — the INDEPENDENT display-layer guard. It mirrors the
 *     `student_visible_scholarships` SQL view so the same rule can be applied and
 *     unit-tested in TypeScript, and used as a defensive filter in application
 *     code. It refuses to surface expired, archived, broken, or stale-without-a-
 *     firm-future-deadline records — even if an ingestion/refresh job never ran.
 *  2. `deriveVerification` — decides how a stored record's lifecycle/verification
 *     fields should change during a maintenance sweep (archive expired, flag
 *     broken sources, mark stale, re-verify), independent of new source data.
 */

import type { ScholarshipLifecycleStatus, VerificationStatus } from './types'

/** How long a rolling/unknown-deadline record stays visible after verification. */
export const DEFAULT_FRESHNESS_WINDOW_DAYS = 30
/** After this long without re-verification, a record is considered stale. */
export const DEFAULT_STALE_AFTER_DAYS = 45

export type VisibilityInput = {
  active?: boolean | null
  lifecycle_status?: string | null
  archived_at?: string | null
  verification_status?: string | null
  deadline_at?: string | null
  deadline?: string | null
  deadline_type?: string | null
  last_verified_at?: string | null
}

export type FreshnessOptions = {
  now?: Date
  freshnessWindowDays?: number
}

function ms(dateLike: string | null | undefined): number | null {
  if (!dateLike) return null
  const t = new Date(dateLike).getTime()
  return Number.isNaN(t) ? null : t
}

/**
 * The concrete deadline instant, inclusive of the whole deadline day, or null
 * for rolling/unknown/missing deadlines. Mirrors the SQL
 * `coalesce(deadline_at, (deadline + 1)::timestamptz)`.
 */
export function effectiveDeadlineMs(row: VisibilityInput): number | null {
  const at = ms(row.deadline_at)
  if (at != null) return at
  if (row.deadline) {
    const dayStart = ms(`${row.deadline}T00:00:00.000Z`)
    if (dayStart != null) return dayStart + 24 * 60 * 60 * 1000 // include the final day
  }
  return null
}

/**
 * Independent student-visibility rule. Returns true only when a scholarship is
 * safe to show: active, non-archived, non-broken/stale, and either has a firm
 * future deadline or (for rolling/unknown/no-deadline records) was verified
 * within the freshness window.
 */
export function isVisibleToStudents(row: VisibilityInput, options: FreshnessOptions = {}): boolean {
  const now = (options.now ?? new Date()).getTime()
  const windowDays = options.freshnessWindowDays ?? DEFAULT_FRESHNESS_WINDOW_DAYS

  if (row.active === false) return false
  if ((row.lifecycle_status ?? 'active') !== 'active') return false
  if (row.archived_at) return false
  const status = row.verification_status ?? 'unverified'
  if (status === 'broken' || status === 'stale') return false

  const deadlineMs = effectiveDeadlineMs(row)
  if (deadlineMs != null) {
    // Concrete deadline: visible iff it is still in the future.
    return deadlineMs > now
  }

  // No concrete deadline (rolling / unknown / missing): require recent verification.
  const verifiedMs = ms(row.last_verified_at)
  if (verifiedMs == null) return false
  return verifiedMs > now - windowDays * 24 * 60 * 60 * 1000
}

export type RefreshRowInput = {
  deadline_at?: string | null
  deadline?: string | null
  deadline_type?: string | null
  last_verified_at?: string | null
  verification_status?: string | null
  active?: boolean | null
  lifecycle_status?: string | null
  archived_at?: string | null
}

export type VerificationOptions = {
  now?: Date
  staleAfterDays?: number
  verificationIntervalDays?: number
  /**
   * Result of an (optional) source-availability check for this record:
   *   true  -> confirmed reachable/valid now (re-verifies, refreshes timestamp)
   *   false -> confirmed broken/unreachable (flagged 'broken')
   *   null/undefined -> not checked; staleness is judged by age only
   */
  sourceOk?: boolean | null
}

export type VerificationDecision = {
  active: boolean
  lifecycle_status: ScholarshipLifecycleStatus
  verification_status: VerificationStatus
  archived_at: string | null
  last_verified_at: string | null
  next_verification_at: string
  /** Expired this pass and moved to archived. */
  archived: boolean
  /** Needs human attention (broken source or materially flagged). */
  flagged: boolean
  /** Any field changed vs. the input row. */
  changed: boolean
}

function addDays(now: Date, days: number): string {
  const d = new Date(now)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString()
}

/**
 * Decide the maintenance outcome for a single stored record during a refresh
 * sweep. Pure: callers apply the returned fields via the repository.
 *
 * Precedence: expiry (fixed deadline in the past) → archive; broken source →
 * flag broken; otherwise re-verify (if confirmed) or mark stale by age.
 */
export function deriveVerification(
  row: RefreshRowInput,
  options: VerificationOptions = {},
): VerificationDecision {
  const now = options.now ?? new Date()
  const staleAfterDays = options.staleAfterDays ?? DEFAULT_STALE_AFTER_DAYS
  const intervalDays = options.verificationIntervalDays ?? 7
  const nowMs = now.getTime()

  const deadlineType = (row.deadline_type ?? (row.deadline ? 'fixed' : 'unknown')) as string
  const deadlineMs = effectiveDeadlineMs(row)
  const hasFixedDeadline = deadlineType !== 'rolling' && deadlineMs != null

  const prev = {
    active: row.active !== false,
    lifecycle_status: (row.lifecycle_status ?? 'active') as ScholarshipLifecycleStatus,
    verification_status: (row.verification_status ?? 'unverified') as VerificationStatus,
    archived_at: row.archived_at ?? null,
    last_verified_at: row.last_verified_at ?? null,
  }

  const next_verification_at = addDays(now, intervalDays)

  // 1) Expired fixed deadline -> archive (never delete).
  if (hasFixedDeadline && deadlineMs != null && deadlineMs <= nowMs) {
    const decision: VerificationDecision = {
      active: false,
      lifecycle_status: 'expired',
      verification_status: prev.verification_status === 'broken' ? 'broken' : 'verified',
      archived_at: prev.archived_at ?? now.toISOString(),
      last_verified_at: prev.last_verified_at,
      next_verification_at,
      archived: true,
      flagged: false,
      changed:
        prev.active !== false ||
        prev.lifecycle_status !== 'expired' ||
        prev.archived_at == null,
    }
    return decision
  }

  // 2) Confirmed broken source -> flag for review, hide via display guard.
  if (options.sourceOk === false) {
    return {
      active: prev.active,
      lifecycle_status: prev.lifecycle_status,
      verification_status: 'broken',
      archived_at: prev.archived_at,
      last_verified_at: prev.last_verified_at,
      next_verification_at,
      archived: false,
      flagged: true,
      changed: prev.verification_status !== 'broken',
    }
  }

  // 3) Confirmed reachable -> re-verify and refresh the timestamp.
  if (options.sourceOk === true) {
    return {
      active: true,
      lifecycle_status: 'active',
      verification_status: 'verified',
      archived_at: null,
      last_verified_at: now.toISOString(),
      next_verification_at,
      archived: false,
      flagged: false,
      changed:
        prev.verification_status !== 'verified' ||
        prev.lifecycle_status !== 'active' ||
        prev.active !== true ||
        prev.archived_at != null,
    }
  }

  // 4) Not checked: judge staleness by age of the last verification.
  const verifiedMs = ms(prev.last_verified_at)
  const isStale =
    verifiedMs == null || verifiedMs < nowMs - staleAfterDays * 24 * 60 * 60 * 1000
  const verification_status: VerificationStatus = isStale ? 'stale' : prev.verification_status
  return {
    active: prev.active,
    lifecycle_status: prev.lifecycle_status,
    verification_status,
    archived_at: prev.archived_at,
    last_verified_at: prev.last_verified_at,
    next_verification_at,
    archived: false,
    flagged: verification_status === 'needs_review',
    changed: verification_status !== prev.verification_status,
  }
}
