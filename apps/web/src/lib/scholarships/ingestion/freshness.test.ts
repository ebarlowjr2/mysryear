import { describe, it, expect } from 'vitest'
import { isVisibleToStudents, deriveVerification } from './freshness'

const NOW = new Date('2026-07-21T12:00:00.000Z')
const opts = { now: NOW }

const FUTURE = '2026-12-31'
const PAST = '2024-01-01'
const iso = (d: string) => new Date(d).toISOString()

describe('isVisibleToStudents', () => {
  it('shows an upcoming fixed-deadline scholarship', () => {
    expect(
      isVisibleToStudents(
        { active: true, lifecycle_status: 'active', deadline: FUTURE, deadline_type: 'fixed', verification_status: 'verified' },
        opts,
      ),
    ).toBe(true)
  })

  it('hides an expired fixed-deadline scholarship', () => {
    expect(
      isVisibleToStudents(
        { active: true, lifecycle_status: 'active', deadline: PAST, deadline_type: 'fixed', verification_status: 'verified' },
        opts,
      ),
    ).toBe(false)
  })

  it('hides an archived scholarship even with a future deadline', () => {
    expect(
      isVisibleToStudents(
        { active: true, lifecycle_status: 'active', deadline: FUTURE, archived_at: iso('2026-07-01'), verification_status: 'verified' },
        opts,
      ),
    ).toBe(false)
  })

  it('hides broken and stale records regardless of deadline', () => {
    expect(
      isVisibleToStudents({ active: true, deadline: FUTURE, verification_status: 'broken' }, opts),
    ).toBe(false)
    expect(
      isVisibleToStudents({ active: true, deadline: FUTURE, verification_status: 'stale' }, opts),
    ).toBe(false)
  })

  it('hides inactive / non-active-lifecycle records', () => {
    expect(isVisibleToStudents({ active: false, deadline: FUTURE }, opts)).toBe(false)
    expect(
      isVisibleToStudents({ active: true, lifecycle_status: 'expired', deadline: FUTURE }, opts),
    ).toBe(false)
  })

  it('shows a recently-verified rolling scholarship (no fixed deadline)', () => {
    expect(
      isVisibleToStudents(
        {
          active: true,
          lifecycle_status: 'active',
          deadline: null,
          deadline_at: null,
          deadline_type: 'rolling',
          verification_status: 'verified',
          last_verified_at: iso('2026-07-10'), // 11 days ago, within 30d window
        },
        opts,
      ),
    ).toBe(true)
  })

  it('hides a rolling scholarship that has not been verified recently', () => {
    expect(
      isVisibleToStudents(
        {
          active: true,
          deadline: null,
          deadline_type: 'rolling',
          verification_status: 'verified',
          last_verified_at: iso('2026-05-01'), // > 30 days ago
        },
        opts,
      ),
    ).toBe(false)
  })

  it('hides a missing-deadline record that was never verified', () => {
    expect(
      isVisibleToStudents(
        { active: true, deadline: null, deadline_at: null, deadline_type: 'unknown', last_verified_at: null },
        opts,
      ),
    ).toBe(false)
  })
})

describe('deriveVerification', () => {
  it('archives an expired fixed-deadline record (never deletes)', () => {
    const d = deriveVerification(
      { deadline: PAST, deadline_type: 'fixed', active: true, lifecycle_status: 'active' },
      opts,
    )
    expect(d.active).toBe(false)
    expect(d.lifecycle_status).toBe('expired')
    expect(d.archived).toBe(true)
    expect(d.archived_at).toBeTruthy()
    expect(d.changed).toBe(true)
  })

  it('flags a broken source for review and hides it via the guard', () => {
    const d = deriveVerification(
      { deadline: FUTURE, deadline_type: 'fixed', active: true, lifecycle_status: 'active', verification_status: 'verified' },
      { ...opts, sourceOk: false },
    )
    expect(d.verification_status).toBe('broken')
    expect(d.flagged).toBe(true)
    expect(d.archived).toBe(false)
    expect(isVisibleToStudents({ ...d, deadline: FUTURE }, opts)).toBe(false)
  })

  it('reactivates a previously-archived record confirmed available again', () => {
    const d = deriveVerification(
      {
        deadline: FUTURE,
        deadline_type: 'fixed',
        active: false,
        lifecycle_status: 'archived',
        archived_at: iso('2026-06-01'),
        verification_status: 'stale',
      },
      { ...opts, sourceOk: true },
    )
    expect(d.active).toBe(true)
    expect(d.lifecycle_status).toBe('active')
    expect(d.archived_at).toBeNull()
    expect(d.verification_status).toBe('verified')
    expect(isVisibleToStudents({ ...d, deadline: FUTURE }, opts)).toBe(true)
  })

  it('marks a record stale by age when not re-verified', () => {
    const d = deriveVerification(
      {
        deadline: FUTURE,
        deadline_type: 'fixed',
        active: true,
        lifecycle_status: 'active',
        verification_status: 'verified',
        last_verified_at: iso('2026-01-01'), // > 45 days ago
      },
      opts,
    )
    expect(d.verification_status).toBe('stale')
  })

  it('leaves a recently-verified record unchanged', () => {
    const d = deriveVerification(
      {
        deadline: FUTURE,
        deadline_type: 'fixed',
        active: true,
        lifecycle_status: 'active',
        verification_status: 'verified',
        last_verified_at: iso('2026-07-15'),
      },
      opts,
    )
    expect(d.verification_status).toBe('verified')
    expect(d.changed).toBe(false)
  })
})
