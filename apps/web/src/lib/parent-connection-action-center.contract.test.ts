import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { postSignupDestination, requiresGraduationYear, requiresSchoolFlow } from '../app/signup/signup-flow'

const root = join(__dirname, '../../../..')
function read(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

describe('parent connection and action center contract', () => {
  it('lets parent and guardian accounts reach the family dashboard without student signup fields', () => {
    expect(postSignupDestination('parent')).toBe('/dashboard/family')
    expect(postSignupDestination('guardian')).toBe('/dashboard/family')
    expect(requiresSchoolFlow('parent')).toBe(false)
    expect(requiresSchoolFlow('guardian')).toBe(false)
    expect(requiresGraduationYear('parent')).toBe(false)
    expect(requiresGraduationYear('guardian')).toBe(false)
  })

  it('documents the original Continue bug root cause and removes parent/guardian from mandatory student profile onboarding', () => {
    const form = read('apps/web/src/app/onboarding/ui/OnboardingForm.tsx')
    expect(form).toContain("const needsStudentProfile = role === 'student'")
    expect(form).toContain('Parent and guardian setup no longer requires adding a student here')
    expect(form).not.toContain("role === 'student' || role === 'parent' || role === 'guardian'")
  })

  it('adds additive RLS-backed parent connection tables and RPCs without granting pending invite access', () => {
    const migration = read('supabase/migrations/20260809120000_parent_connection_action_center.sql')
    expect(migration).toContain('add column if not exists managed_by_user_id')
    expect(migration).toContain('parent_action_completions')
    expect(migration).toContain('create_managed_student_profile')
    expect(migration).toContain('create_student_claim_invite')
    expect(migration).toContain("status in ('pending','accepted','declined','expired','revoked')")
    expect(migration).toContain('family_relationships fr')
    expect(migration).not.toMatch(/student_success_tasks[\s\S]{0,80}(update|insert)/i)
  })

  it('hardens managed-profile claim ownership behind a narrow RPC path', () => {
    const migration = read('supabase/migrations/20260809120000_parent_connection_action_center.sql')
    expect(migration).toContain('student_profiles_protect_ownership_fields')
    expect(migration).toContain("current_setting('app.allow_student_profile_claim', true)")
    expect(migration).toContain("perform set_config('app.allow_student_profile_claim', 'true', true)")
    expect(migration).toContain('student profile ownership fields are protected')
    expect(migration).toContain("where student_user_id = auth.uid()")
    expect(migration).toContain('Student already has a profile; conflict resolution is required')
  })

  it('prevents duplicate pending invitations and requires accepted relationships for access', () => {
    const migration = read('supabase/migrations/20260809120000_parent_connection_action_center.sql')
    expect(migration).toContain('spri_unique_pending_email_invite_idx')
    expect(migration).toContain("where status = 'pending' and invited_email is not null")
    expect(migration).toContain('family_relationships_delete_self_supporter')
    expect(migration).toContain("role in ('parent','guardian','counselor')")
    expect(migration).toMatch(/family_relationships[\s\S]+user_id = auth\.uid\(\)/)
  })

  it('enforces invitation lifecycle checks in the web route before creating relationships', () => {
    const route = read('apps/web/src/app/api/profile/invites/route.ts')
    expect(route).toContain(".eq('status', 'pending')")
    expect(route).toContain('duplicate: true')
    expect(route).toContain('Invite is not pending or has been revoked')
    expect(route).toContain('Invite has expired')
    expect(route).toContain("status: nextStatus")
    expect(route).toContain("accepted_at: action === 'accept'")
    expect(route).toContain("declined_at: action === 'decline'")
    expect(route).toContain("supabase.from('family_relationships').insert")
  })

  it('supports immediate linked-adult relationship removal without touching student records', () => {
    const route = read('apps/web/src/app/api/profile/relationships/route.ts')
    const card = read('apps/web/src/app/dashboard/family/ActiveStudentConnectionCard.tsx')
    expect(route).toContain(".from('family_relationships')")
    expect(route).toContain('.delete()')
    expect(route).toContain(".eq('user_id', session.user.id)")
    expect(route).toContain(".in('role', ['parent', 'guardian', 'counselor'])")
    expect(route).not.toContain('student_success_tasks')
    expect(card).toContain('Remove my connection')
    expect(card).toContain('/api/profile/relationships')
  })

  it('keeps parent action completion separate from student checklist completion', () => {
    const webDashboard = read('apps/web/src/app/dashboard/family/FamilyDashboardClient.tsx')
    const mobileDashboard = read('apps/mobile/app/(app)/index.tsx')
    expect(webDashboard).toContain('/api/parent-actions')
    expect(webDashboard).toContain('parentActions')
    expect(mobileDashboard).toContain('toggleParentAction')
    expect(mobileDashboard).not.toContain("successSummary?.tasks || []).slice(0, 3)")
  })

  it('implements mobile parent parity for account-first onboarding and managed profile creation', () => {
    const mobileOnboarding = read('apps/mobile/app/onboarding/index.tsx')
    const mobileIdentity = read('apps/mobile/src/data/identity.ts')
    const mobileStudents = read('apps/mobile/app/(app)/students.tsx')
    expect(mobileOnboarding).toContain('Family Setup')
    expect(mobileOnboarding).toContain("role === 'student' &&")
    expect(mobileIdentity).toContain("input.role === 'parent' || input.role === 'guardian'")
    expect(mobileIdentity).toContain('createManagedStudentProfile')
    expect(mobileStudents).toContain('Create managed student profile')
    expect(mobileStudents).toContain('handleSelectStudent')
  })
})
