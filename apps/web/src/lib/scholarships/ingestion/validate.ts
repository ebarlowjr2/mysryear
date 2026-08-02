/**
 * Validation for normalized scholarship rows. Records that fail required-field
 * or sanity checks are quarantined (rejected) with a clear reason rather than
 * silently dropped or written. Pure and never throws.
 */

import type { NormalizedScholarshipRow, ValidationIssue } from './types'
import { normalizeUrl } from './normalize'

/** Returns the list of issues for a row. An empty array means the row is valid. */
export function validateRow(row: NormalizedScholarshipRow): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const externalId = row.external_id || undefined

  if (!row.source) issues.push({ externalId, field: 'source', message: 'Missing source' })
  if (!row.external_id)
    issues.push({ externalId, field: 'external_id', message: 'Missing external id / fingerprint' })
  if (!row.title) issues.push({ externalId, field: 'title', message: 'Empty title' })
  if (!row.organization)
    issues.push({ externalId, field: 'organization', message: 'Missing organization' })

  if (!row.application_url) {
    issues.push({ externalId, field: 'application_url', message: 'Missing or invalid application URL' })
  } else if (!normalizeUrl(row.application_url)) {
    issues.push({ externalId, field: 'application_url', message: 'Invalid application URL' })
  }

  if (!row.source_url) {
    issues.push({ externalId, field: 'source_url', message: 'Missing or invalid source URL' })
  } else if (!normalizeUrl(row.source_url)) {
    issues.push({ externalId, field: 'source_url', message: 'Invalid source URL' })
  }

  if (typeof row.active !== 'boolean')
    issues.push({ externalId, field: 'active', message: 'Missing active status' })

  if (!row.last_verified_at || Number.isNaN(new Date(row.last_verified_at).getTime()))
    issues.push({ externalId, field: 'last_verified_at', message: 'Missing/invalid lastVerifiedAt' })

  // Monetary sanity.
  for (const [field, value] of [
    ['amount_min', row.amount_min],
    ['amount_max', row.amount_max],
  ] as const) {
    if (value != null && (!Number.isFinite(value) || value < 0)) {
      issues.push({ externalId, field, message: `Invalid monetary value for ${field}` })
    }
  }
  if (row.amount_min != null && row.amount_max != null && row.amount_min > row.amount_max) {
    issues.push({ externalId, field: 'amount', message: 'amountMin greater than amountMax' })
  }

  // Deadline sanity. normalizeDeadline already rejects unparseable dates to
  // null; here we reject impossible dates that slipped through as far past.
  if (row.deadline) {
    const time = new Date(`${row.deadline}T00:00:00Z`).getTime()
    if (Number.isNaN(time)) {
      issues.push({ externalId, field: 'deadline', message: 'Invalid deadline' })
    } else if (Number(row.deadline.slice(0, 4)) < 2000) {
      issues.push({ externalId, field: 'deadline', message: 'Impossible deadline (before 2000)' })
    }
  }

  // GPA sanity.
  if (row.minimum_gpa != null && (row.minimum_gpa < 0 || row.minimum_gpa > 5)) {
    issues.push({ externalId, field: 'minimum_gpa', message: 'GPA out of range' })
  }

  return issues
}
