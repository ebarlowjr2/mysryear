import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const repoRoot = resolve(__dirname, '../../../..')
const migration = readFileSync(
  resolve(repoRoot, 'supabase/migrations/20260726130000_aura_lifepath_feedback_simulations.sql'),
  'utf8',
)
const mobileLifePath = readFileSync(
  resolve(repoRoot, 'apps/mobile/app/aura/lifepath/index.tsx'),
  'utf8',
)
const mobileCareer = readFileSync(
  resolve(repoRoot, 'apps/mobile/app/aura/lifepath/career/[id].tsx'),
  'utf8',
)
const mobileSelect = readFileSync(
  resolve(repoRoot, 'apps/mobile/app/aura/lifepath/select.tsx'),
  'utf8',
)
const webAuraContext = readFileSync(resolve(repoRoot, 'apps/web/src/lib/aura-lifepath.ts'), 'utf8')
const docs = readFileSync(resolve(repoRoot, 'docs/aura-role-routing.md'), 'utf8')

describe('A.U.R.A LifePath role routing contract', () => {
  it('keeps parent simulation tables isolated from official student profile ownership', () => {
    const simulationTable =
      migration.match(
        /create table if not exists public\.lifepath_simulations \([\s\S]*?\);/,
      )?.[0] || ''
    const simulationInterestsTable =
      migration.match(
        /create table if not exists public\.lifepath_simulation_interests \([\s\S]*?\);/,
      )?.[0] || ''

    expect(simulationTable).toContain('created_by_user_id uuid not null references auth.users(id)')
    expect(simulationTable).not.toContain('student_profile_id')
    expect(simulationInterestsTable).toContain(
      'simulation_id uuid not null references public.lifepath_simulations(id)',
    )
    expect(simulationInterestsTable).not.toContain('student_profile_id')
  })

  it('restricts parent simulations to the owning parent or guardian account', () => {
    expect(migration).toContain('lifepath_simulations_insert_own_parent')
    expect(migration).toContain('created_by_user_id = auth.uid()')
    expect(migration).toContain("p.role in ('parent', 'guardian')")
    expect(migration).toContain('lifepath_simulation_interests_owner_all')
    expect(migration).toContain('s.created_by_user_id = auth.uid()')
  })

  it('requires a valid family relationship for parent notes on official student LifePath data', () => {
    expect(migration).toContain('lifepath_feedback_insert_linked_family')
    expect(migration).toContain('author_user_id = auth.uid()')
    expect(migration).toContain('from public.family_relationships fr')
    expect(migration).toContain('fr.student_profile_id = lifepath_feedback.student_profile_id')
    expect(migration).toContain('fr.user_id = auth.uid()')
    expect(migration).toContain('fr.role = lifepath_feedback.author_role')
    expect(migration).toContain('lifepath_feedback_update_own')
    expect(migration).toContain('lifepath_feedback_delete_own')
  })

  it('preserves role-specific routing and business redirect behavior on web', () => {
    expect(webAuraContext).toContain("if (sp.role === 'business') redirect('/business/dashboard')")
    expect(webAuraContext).toContain(
      "export type LifePathMode = 'student' | 'linked-student' | 'parent-simulation'",
    )
    expect(webAuraContext).toContain("role === 'parent' || role === 'guardian'")
    expect(webAuraContext).toContain("canEditOfficialLifePath = sp.role === 'student'")
  })

  it('supports mobile linked-student switching inside LifePath without using Profile as the only selector', () => {
    expect(mobileLifePath).toContain('getLinkedStudentProfiles')
    expect(mobileLifePath).toContain('setActiveStudentProfile')
    expect(mobileLifePath).toContain('switchStudent')
    expect(mobileLifePath).toContain('linkedStudents.map')
    expect(mobileLifePath).toContain('No linked student yet')
  })

  it('keeps mobile parent simulation writes out of official LifePath tables', () => {
    expect(mobileSelect).toContain('saveParentSimulationCareerIds')
    expect(mobileSelect).toContain('saveLifePathCareerIds')
    expect(mobileSelect).toContain('mode=parent-simulation')
    expect(mobileSelect).toContain('Only the student can change official LifePath career choices')
    expect(mobileLifePath).toContain(
      'Simulation choices stay separate from student tasks, scholarships, and dashboard progress',
    )
  })

  it('prevents mobile parent/counselor official task edits and adds note UI for linked official views', () => {
    expect(mobileCareer).toContain('Task completion is read-only for this role')
    expect(mobileCareer).toContain('if (readOnly) return')
    expect(mobileCareer).toContain('LifePathFeedbackPanel')
    expect(mobileLifePath).toContain('LifePathFeedbackPanel')
  })

  it('documents final behavior and known nonblocking limitations', () => {
    expect(docs).toContain('Parent Simulation data is never stored in')
    expect(docs).toContain('Mobile parent feedback UI supports')
    expect(docs).toContain('Baseline Career Health')
    expect(docs).toContain('Counselor commenting remains future work')
  })
})
