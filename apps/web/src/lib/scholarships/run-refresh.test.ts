/**
 * Regression tests: database failures during a refresh must never be reported
 * as success. Uses a synthetic Supabase client that returns ordinary
 * `{ data: null, error }` responses (Supabase does not throw), with otherwise
 * successful imports from the bundled sponsor-verified source.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { runScholarshipRefresh } from './run-refresh'

type Call = { table: string; op: 'select' | 'insert' | 'upsert' | 'update' | 'delete'; payload: unknown; selected: string | null; filters: unknown[][] }
type Reply = { data?: unknown; error?: { message: string; code?: string } | null; count?: number | null }
type Handler = (call: Call) => Reply | undefined

const NOW = new Date('2026-11-22T20:00:00.000Z')
const SOURCE = 'mysryear-sponsor-verified'
const CANDIDATE = {
  id: 'award-1',
  source: SOURCE,
  title: 'GE-Reagan Foundation Scholarship Program',
  source_url: 'https://sponsor.test/ge-reagan',
  application_url: 'https://sponsor.test/ge-reagan/apply',
  deadline: '2027-01-07',
  deadline_type: 'fixed',
  last_verified_at: '2026-11-22T18:00:00.000Z',
  next_verification_at: null,
}
const VISIBLE_ROWS = Array.from({ length: 5 }, (_, i) => ({ id: `award-${i + 1}`, source: SOURCE }))
const DB_ERROR = { message: 'permission denied for table scholarships', code: '42501' }

function fakeSupabase(override: Handler = () => undefined) {
  const calls: Call[] = []
  const defaults: Handler = (call) => {
    if (call.table === 'scholarships' && call.op === 'select') return { data: [], error: null }
    if (call.table === 'scholarships' && (call.op === 'insert' || call.op === 'upsert')) return { error: null, count: (call.payload as unknown[]).length }
    if (call.table === 'scholarships' && call.op === 'update') {
      const patch = call.payload as Record<string, unknown>
      if (patch.lifecycle_status === 'expired') return { data: [], error: null } // archive sweep
      return { data: [{ id: 'award-1' }], error: null } // reverify write
    }
    if (call.table === 'student_visible_scholarships') {
      return call.selected?.includes('source_url') ? { data: [CANDIDATE], error: null } : { data: VISIBLE_ROWS, error: null }
    }
    if (call.table === 'scholarship_ingestion_runs') return { data: null, error: null }
    return { data: null, error: null }
  }
  const client = {
    from(table: string) {
      const call: Call = { table, op: 'select', payload: null, selected: null, filters: [] }
      const builder: Record<string, unknown> = {}
      const chain = (name: string) => (...args: unknown[]) => {
        call.filters.push([name, ...args])
        return builder
      }
      for (const name of ['eq', 'neq', 'not', 'in', 'or', 'order', 'range', 'limit', 'lt', 'lte']) builder[name] = chain(name)
      builder.select = (columns?: string) => {
        call.selected = columns ?? '*'
        return builder
      }
      for (const op of ['insert', 'upsert', 'update', 'delete'] as const) {
        builder[op] = (payload?: unknown) => {
          call.op = op
          call.payload = payload
          return builder
        }
      }
      builder.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => {
        calls.push(call)
        const reply = override(call) ?? defaults(call) ?? { data: null, error: null }
        return Promise.resolve({ data: reply.data ?? null, error: reply.error ?? null, count: reply.count ?? null }).then(resolve, reject)
      }
      return builder
    },
  }
  return { client: client as unknown as SupabaseClient, calls }
}

const closedPage = async () => ({ status: 200, text: '<p>Deadline January 7, 2027. Applications are now closed.</p>' })
const openPage = async () => ({ status: 200, text: '<p>Application Deadline is January 7, 2027 at 3:00 p.m. EST.</p>' })

function run(client: SupabaseClient, fetchPage = openPage) {
  return runScholarshipRefresh(client, { trigger: 'manual', sources: [SOURCE], reverifyLimit: 5, reverifyAll: true, fetchPage, now: NOW })
}

describe('runScholarshipRefresh reports database failures', () => {
  let consoleError: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })
  afterEach(() => consoleError.mockRestore())

  it('control: a fully successful run reports success with exact counts', async () => {
    const { client } = fakeSupabase()
    const result = await run(client)
    expect(result.status).toBe('success')
    expect(result.sources[0]).toMatchObject({ source: SOURCE, status: 'success', created: 5, visible: 5 })
    expect(result.reverify).toMatchObject({ checked: 1, confirmed: 1, writeFailed: 0 })
    expect(result.auditLog).toEqual({ written: 1, failed: [] })
    expect(result.operationErrors).toEqual([])
    expect(consoleError).not.toHaveBeenCalled()
  })

  it('1. a rejected closure write is not counted, and the run is partial for that source', async () => {
    const { client, calls } = fakeSupabase((call) =>
      call.table === 'scholarships' && call.op === 'update' && (call.payload as Record<string, unknown>).verification_status === 'needs_review'
        ? { data: null, error: DB_ERROR }
        : undefined,
    )
    const result = await run(client, closedPage)

    expect(calls.some((c) => c.op === 'update' && (c.payload as Record<string, unknown>).verification_status === 'needs_review')).toBe(true)
    expect(result.status).toBe('partial')
    expect(result.reverify).toMatchObject({ checked: 1, flagged: 0, writeFailed: 1 })
    expect(result.reverify.decisions[0]).toMatchObject({ id: 'award-1', outcome: 'closure_reported', applied: false })
    expect(result.reverify.decisions[0].writeError).toMatch(/permission denied/)
    expect(result.sources[0].status).toBe('partial')
    expect(result.sources[0].flagged).toBe(0)
    expect(result.operationErrors).toEqual([
      expect.objectContaining({ source: SOURCE, operation: 'reverify_write', scholarshipId: 'award-1' }),
    ])
    // The successful import is kept and still counted.
    expect(result.sources[0]).toMatchObject({ created: 5, visible: 5 })
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('reverify_write failed for source=mysryear-sponsor-verified scholarship=award-1'))
  })

  it('1b. a write that matches no row is also not counted', async () => {
    const { client } = fakeSupabase((call) =>
      call.table === 'scholarships' && call.op === 'update' && (call.payload as Record<string, unknown>).verification_status === 'needs_review'
        ? { data: [], error: null }
        : undefined,
    )
    const result = await run(client, closedPage)
    expect(result.status).toBe('partial')
    expect(result.reverify).toMatchObject({ flagged: 0, writeFailed: 1 })
    expect(result.reverify.decisions[0].writeError).toBe('Update matched no row')
  })

  it('2. an unreadable visible catalog is "unavailable" (null), not zero, and the run is partial', async () => {
    const { client } = fakeSupabase((call) =>
      call.table === 'student_visible_scholarships' && !call.selected?.includes('source_url') ? { data: null, error: DB_ERROR } : undefined,
    )
    const result = await run(client)
    expect(result.status).toBe('partial')
    expect(result.visibleTotal).toBeNull()
    expect(result.visibleBySource).toBeNull()
    expect(result.sources[0].visible).toBeNull()
    expect(result.sources[0].status).toBe('partial')
    expect(result.operationErrors).toEqual([expect.objectContaining({ source: null, operation: 'visible_count' })])
    // The import and the sponsor check still succeeded and are reported as such.
    expect(result.sources[0].created).toBe(5)
    expect(result.reverify.confirmed).toBe(1)
  })

  it('3. a failed audit-log insert is surfaced in the result and server logs', async () => {
    const { client } = fakeSupabase((call) => (call.table === 'scholarship_ingestion_runs' ? { data: null, error: DB_ERROR } : undefined))
    const result = await run(client)
    expect(result.status).toBe('partial')
    expect(result.auditLog.written).toBe(0)
    expect(result.auditLog.failed).toEqual([{ source: SOURCE, message: 'permission denied for table scholarships (42501)' }])
    expect(result.operationErrors).toEqual([expect.objectContaining({ source: SOURCE, operation: 'run_log' })])
    expect(result.sources[0].status).toBe('partial')
    expect(result.sources[0].errors).toContainEqual({ message: 'run_log: permission denied for table scholarships (42501)' })
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('run_log failed for source=mysryear-sponsor-verified'))
    // Imported listings stay available.
    expect(result.sources[0]).toMatchObject({ created: 5, visible: 5 })
  })

  it('a failed archive sweep is reported (null), not as zero archived', async () => {
    const { client } = fakeSupabase((call) =>
      call.table === 'scholarships' && call.op === 'update' && (call.payload as Record<string, unknown>).lifecycle_status === 'expired'
        ? { data: null, error: DB_ERROR }
        : undefined,
    )
    const result = await run(client)
    expect(result.status).toBe('partial')
    expect(result.archivedSweep).toBeNull()
    expect(result.operationErrors).toContainEqual(expect.objectContaining({ source: null, operation: 'archive_sweep' }))
  })

  it('a failed candidate query is reported and checks nothing', async () => {
    const { client } = fakeSupabase((call) =>
      call.table === 'student_visible_scholarships' && call.selected?.includes('source_url') ? { data: null, error: DB_ERROR } : undefined,
    )
    const result = await run(client)
    expect(result.status).toBe('partial')
    expect(result.reverify.checked).toBe(0)
    expect(result.operationErrors).toContainEqual(expect.objectContaining({ operation: 'reverify_candidates' }))
  })
})
