import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const migration = readFileSync(
  join(
    process.cwd(),
    '../../supabase/migrations/20260801120000_aura_parent_simulation_experience.sql',
  ),
  'utf8',
)

describe('A.U.R.A parent simulation contract', () => {
  it('keeps simulations parent-owned and independent from official student LifePath tables', () => {
    expect(migration).toContain('created_by_user_id')
    expect(migration).toContain('lifepath_simulation_shares')
    expect(migration).not.toContain('alter table public.student_career_interests')
    expect(migration).not.toContain('alter table public.lifepath_tasks')
  })

  it('supports named draft/completed scenarios without breaking legacy active rows', () => {
    expect(migration).toContain("status in ('draft', 'completed', 'active', 'archived')")
    expect(migration).toContain('assumptions jsonb')
    expect(migration).toContain('results jsonb')
    expect(migration).toContain('completed_at timestamptz')
  })

  it('requires a parent or guardian family relationship to share a recommendation', () => {
    expect(migration).toContain('is_parent_guardian_for_student_profile')
    expect(migration).toContain("fr.role in ('parent', 'guardian')")
    expect(migration).toContain("sim.status = 'completed'")
  })

  it('allows shared students read-only access and avoids counselor/business access expansion', () => {
    expect(migration).toContain('lifepath_simulations_select_shared_student')
    expect(migration).toContain('lifepath_simulation_interests_select_shared_student')
    expect(migration).toContain('is_student_owner_for_student_profile')
    expect(migration).not.toContain("role in ('counselor'")
    expect(migration).not.toContain("role in ('business'")
  })

  it('revoked shares lose student simulation visibility', () => {
    expect(migration).toContain("share.status in ('active', 'acknowledged')")
    expect(migration).toContain("status in ('active', 'acknowledged', 'dismissed', 'revoked')")
    expect(migration).toContain('revoked_at timestamptz')
  })
})
