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

  it('revoked shares lose student simulation visibility while dismissed items remain readable', () => {
    expect(migration).toContain("share.status in ('active', 'acknowledged', 'dismissed')")
    expect(migration).toContain("status in ('active', 'acknowledged', 'dismissed', 'revoked')")
    expect(migration).toContain('revoked_at timestamptz')
  })

  it('uses an RPC for student acknowledgement/dismissal instead of broad row updates', () => {
    expect(migration).toContain(
      'drop policy if exists lifepath_simulation_shares_update_owner_or_student',
    )
    expect(migration).toContain('create policy lifepath_simulation_shares_update_owner')
    expect(migration).toContain('respond_to_lifepath_simulation_share')
    expect(migration).toContain("p_response not in ('acknowledged', 'dismissed')")
    expect(migration).toContain(
      'public.is_student_owner_for_student_profile(share.student_profile_id, auth.uid())',
    )
  })

  it('prevents students from changing share message, recipient, ownership, or simulation fields through the RPC', () => {
    const rpcUpdate = migration.slice(
      migration.indexOf('update public.lifepath_simulation_shares'),
      migration.indexOf('return v_share;'),
    )
    expect(rpcUpdate).toContain('update public.lifepath_simulation_shares')
    expect(rpcUpdate).toContain('status = v_next_status')
    expect(rpcUpdate).toContain('acknowledged_at = case')
    expect(rpcUpdate).toContain('dismissed_at = case')
    expect(rpcUpdate).not.toContain('message =')
    expect(rpcUpdate).not.toContain('student_profile_id =')
    expect(rpcUpdate).not.toContain('shared_by_user_id =')
    expect(rpcUpdate).not.toContain('update public.lifepath_simulations')
  })
})
