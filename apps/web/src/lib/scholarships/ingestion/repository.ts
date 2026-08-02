/**
 * ScholarshipRepository implementations.
 *
 *  - InMemoryScholarshipRepository: no I/O; used by tests and by any caller that
 *    wants to exercise the pipeline without a database.
 *  - SupabaseScholarshipRepository: writes to the canonical `public.scholarships`
 *    table using an injected Supabase client. In production this client MUST be
 *    a server-side service-role client (never shipped to browser/mobile). This
 *    module does not create the client or read any secret itself.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  ExistingScholarshipRow,
  NormalizedScholarshipRow,
  ScholarshipRepository,
  ScholarshipRunLogRecord,
} from './types'

/** Build the DB payload for a normalized row. `includeFirstImported` stamps the
 *  first_imported_at column, which should only be set on insert. */
function toDbPayload(row: NormalizedScholarshipRow, nowIso: string, includeFirstImported: boolean) {
  const payload: Record<string, unknown> = {
    source: row.source,
    external_id: row.external_id,
    source_url: row.source_url,
    import_fingerprint: row.import_fingerprint,
    title: row.title,
    organization: row.organization,
    description: row.description,
    amount: row.amount,
    amount_min: row.amount_min,
    amount_max: row.amount_max,
    amount_display: row.amount_display,
    deadline: row.deadline,
    deadline_at: row.deadline_at,
    deadline_type: row.deadline_type,
    application_url: row.application_url,
    canonical_url: row.canonical_url,
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
    active: row.active,
    lifecycle_status: row.lifecycle_status,
    last_verified_at: row.last_verified_at,
    source_updated_at: row.source_updated_at,
    verification_status: row.verification_status,
    next_verification_at: row.next_verification_at,
    archived_at: row.archived_at,
    last_imported_at: nowIso,
    // Preserve provider label as the human-facing opportunity_source used by
    // existing UI, without overwriting a manually-curated value.
    opportunity_source: row.organization,
    raw_source_metadata: row.raw_source_metadata,
  }
  if (includeFirstImported) payload.first_imported_at = nowIso
  return payload
}

export class InMemoryScholarshipRepository implements ScholarshipRepository {
  // keyed by `${source}::${external_id}`
  private store = new Map<string, ExistingScholarshipRow & { row?: NormalizedScholarshipRow }>()

  seed(source: string, rows: ExistingScholarshipRow[]) {
    for (const row of rows) this.store.set(`${source}::${row.external_id}`, { ...row })
  }

  runLog: ScholarshipRunLogRecord[] = []

  private toExisting(
    value: ExistingScholarshipRow & { row?: NormalizedScholarshipRow },
  ): ExistingScholarshipRow {
    return {
      id: value.id,
      external_id: value.external_id,
      import_fingerprint: value.import_fingerprint,
      active: value.active,
      lifecycle_status: value.lifecycle_status,
      canonical_url: value.canonical_url ?? value.row?.canonical_url ?? null,
    }
  }

  snapshot(): Array<ExistingScholarshipRow> {
    return Array.from(this.store.values()).map((value) => this.toExisting(value))
  }

  async loadExistingBySource(source: string): Promise<Map<string, ExistingScholarshipRow>> {
    const out = new Map<string, ExistingScholarshipRow>()
    for (const [key, value] of this.store) {
      if (key.startsWith(`${source}::`)) {
        out.set(value.external_id, this.toExisting(value))
      }
    }
    return out
  }

  async insert(rows: NormalizedScholarshipRow[]): Promise<number> {
    for (const row of rows) {
      this.store.set(`${row.source}::${row.external_id}`, {
        id: `mem-${this.store.size + 1}`,
        external_id: row.external_id,
        import_fingerprint: row.import_fingerprint,
        active: row.active,
        lifecycle_status: row.lifecycle_status,
        row,
      })
    }
    return rows.length
  }

  async update(rows: NormalizedScholarshipRow[]): Promise<number> {
    for (const row of rows) {
      const key = `${row.source}::${row.external_id}`
      const prior = this.store.get(key)
      this.store.set(key, {
        id: prior?.id ?? `mem-${this.store.size + 1}`,
        external_id: row.external_id,
        import_fingerprint: row.import_fingerprint,
        active: row.active,
        lifecycle_status: row.lifecycle_status,
        row,
      })
    }
    return rows.length
  }

  async deactivateMissing(source: string, seenExternalIds: string[]): Promise<number> {
    const seen = new Set(seenExternalIds)
    let count = 0
    for (const [key, value] of this.store) {
      if (!key.startsWith(`${source}::`)) continue
      if (seen.has(value.external_id)) continue
      if (!value.active) continue
      this.store.set(key, { ...value, active: false, lifecycle_status: 'inactive' })
      count += 1
    }
    return count
  }

  async archiveExpired(nowIso: string, source?: string): Promise<number> {
    const now = new Date(nowIso).getTime()
    let count = 0
    for (const [key, value] of this.store) {
      if (source && !key.startsWith(`${source}::`)) continue
      const row = value.row
      if (!row || !value.active) continue
      if (row.deadline_type === 'rolling') continue
      const deadlineMs = row.deadline_at
        ? new Date(row.deadline_at).getTime()
        : row.deadline
          ? new Date(`${row.deadline}T00:00:00.000Z`).getTime() + 24 * 60 * 60 * 1000
          : null
      if (deadlineMs == null || deadlineMs > now) continue
      const archivedRow: NormalizedScholarshipRow = {
        ...row,
        active: false,
        lifecycle_status: 'expired',
        archived_at: nowIso,
      }
      this.store.set(key, {
        ...value,
        active: false,
        lifecycle_status: 'expired',
        row: archivedRow,
      })
      count += 1
    }
    return count
  }

  async recordRun(run: ScholarshipRunLogRecord): Promise<void> {
    this.runLog.push(run)
  }
}

export class SupabaseScholarshipRepository implements ScholarshipRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async loadExistingBySource(source: string): Promise<Map<string, ExistingScholarshipRow>> {
    const { data, error } = await this.supabase
      .from('scholarships')
      .select('id,external_id,import_fingerprint,active,lifecycle_status,canonical_url')
      .eq('source', source)
      .not('external_id', 'is', null)

    if (error) throw new Error(error.message)

    const out = new Map<string, ExistingScholarshipRow>()
    for (const row of data || []) {
      if (!row.external_id) continue
      out.set(String(row.external_id), {
        id: String(row.id),
        external_id: String(row.external_id),
        import_fingerprint: row.import_fingerprint ? String(row.import_fingerprint) : null,
        active: Boolean(row.active),
        lifecycle_status: row.lifecycle_status ? String(row.lifecycle_status) : null,
        canonical_url: row.canonical_url ? String(row.canonical_url) : null,
      })
    }
    return out
  }

  async insert(rows: NormalizedScholarshipRow[]): Promise<number> {
    if (rows.length === 0) return 0
    const nowIso = new Date().toISOString()
    const payload = rows.map((row) => toDbPayload(row, nowIso, true))
    const { error, count } = await this.supabase
      .from('scholarships')
      .insert(payload, { count: 'exact' })
    if (error) throw new Error(error.message)
    return count ?? rows.length
  }

  async update(rows: NormalizedScholarshipRow[]): Promise<number> {
    if (rows.length === 0) return 0
    const nowIso = new Date().toISOString()
    const payload = rows.map((row) => toDbPayload(row, nowIso, false))
    const { error, count } = await this.supabase
      .from('scholarships')
      .upsert(payload, { onConflict: 'source,external_id', count: 'exact' })
    if (error) throw new Error(error.message)
    return count ?? rows.length
  }

  async deactivateMissing(source: string, seenExternalIds: string[]): Promise<number> {
    const { data, error } = await this.supabase
      .from('scholarships')
      .update({ active: false, lifecycle_status: 'inactive' })
      .eq('source', source)
      .eq('active', true)
      .not('external_id', 'in', `(${seenExternalIds.map((id) => `"${id}"`).join(',') || '""'})`)
      .select('id')

    if (error) throw new Error(error.message)
    return (data || []).length
  }

  /**
   * Archive active rows whose fixed deadline has passed. Rolling deadlines are
   * left alone (they have no expiry instant). Records are archived, not deleted.
   */
  async archiveExpired(nowIso: string, source?: string): Promise<number> {
    let query = this.supabase
      .from('scholarships')
      .update({ active: false, lifecycle_status: 'expired', archived_at: nowIso })
      .eq('active', true)
      .neq('deadline_type', 'rolling')
      .not('deadline', 'is', null)
      .lt('deadline', nowIso.slice(0, 10))
    if (source) query = query.eq('source', source)
    const { data, error } = await query.select('id')
    if (error) throw new Error(error.message)
    return (data || []).length
  }

  async recordRun(run: ScholarshipRunLogRecord): Promise<void> {
    const { error } = await this.supabase.from('scholarship_ingestion_runs').insert(run)
    if (error) throw new Error(error.message)
  }
}
