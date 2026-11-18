import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(__dirname, '../../../..')
const read = (path: string) => readFileSync(join(root, path), 'utf8')

describe('family link code contract', () => {
  const migration = read('supabase/migrations/20261117120000_student_family_link_codes.sql')

  it('stores only a hashed, short-lived family link code', () => {
    const codeTable =
      migration.match(
        /create table if not exists public\.student_family_link_codes \([\s\S]*?\n\);/,
      )?.[0] || ''

    expect(codeTable).toContain(
      'student_profile_id uuid not null references public.student_profiles(id)',
    )
    expect(codeTable).toContain('created_by_user_id uuid not null references auth.users(id)')
    expect(codeTable).toContain('code_hash text not null unique')
    expect(codeTable).toContain('expires_at timestamptz not null')
    expect(codeTable).toContain('redeemed_at timestamptz')
    expect(codeTable).toContain('revoked_at timestamptz')
    expect(codeTable).not.toMatch(/\n\s*code\s+text/i)
    expect(migration).toContain("encode(digest(v_code, 'sha256'), 'hex')")
    expect(migration).toContain(
      'alter table public.student_family_link_codes enable row level security',
    )
    expect(migration).toContain(
      'revoke all on table public.student_family_link_codes from anon, authenticated',
    )
    expect(migration).toContain('student_family_link_codes_one_active_per_student_idx')
  })

  it('allows only a claimed student to create or revoke a code', () => {
    expect(migration).toContain('create_student_family_link_code')
    expect(migration).toContain('revoke_student_family_link_codes')
    expect(migration).toContain("v_role is distinct from 'student'")
    expect(migration).toContain('sp.student_user_id = p.id')
    expect(migration).toContain(
      'Only a student account with a claimed student profile can create a family link code',
    )
    expect(migration).toContain('A newly issued code intentionally invalidates any previous code')
  })

  it('requires a parent or guardian and student approval before a relationship exists', () => {
    expect(migration).toContain('request_student_family_link_by_code')
    expect(migration).toContain('request_student_family_link_by_email')
    expect(migration).toContain("v_requester_role not in ('parent', 'guardian')")
    expect(migration).toContain('invite_type,\n      status,\n      expires_at')
    expect(migration).toContain("'access_request'")
    expect(migration).toContain(
      'Only the student who owns this profile can approve an access request',
    )
    expect(migration).toContain('insert into public.family_relationships')
    expect(migration).toContain('set active_student_profile_id = v_invite.student_profile_id')
  })

  it('prevents email enumeration and retires direct UUID-based access requests', () => {
    expect(migration).toContain("return 'submitted';")
    expect(migration).toContain(
      'caller cannot use this operation to determine whether an account exists',
    )
    expect(migration).toContain('drop policy if exists spri_insert_access_request')
    expect(migration).toContain('Old installed clients will\n-- fail safely')
    expect(migration).toContain("coalesce(invite_type, 'supporter_invite') = 'supporter_invite'")
    expect(migration).toContain(
      'access requests must be approved by the protected approval operation',
    )
    expect(migration).toContain("set_config('app.allow_access_request_approval', 'true', true)")
  })

  it('keeps both access approval and managed-profile claims on narrow protected operations', () => {
    expect(migration).toContain('for update;')
    expect(migration).toContain(
      'student claim invitations must be accepted by the protected claim operation',
    )
    expect(migration).toContain("current_setting('app.allow_student_profile_claim', true)")
  })

  it('protects role and active-student context changes after onboarding', () => {
    expect(migration).toContain('profiles_enforce_active_student_membership')
    expect(migration).toContain(
      'active student profile must be owned by or linked to the current user',
    )
    expect(migration).toContain('profiles_protect_completed_role')
    expect(migration).toContain('account role changes require support review after onboarding')
    expect(migration).toContain('family_relationships_clear_active_student_profile')
    expect(migration).toContain('after delete on public.family_relationships')
  })

  it('keeps UUIDs out of current parent connection screens', () => {
    const webForm = read('apps/web/src/app/profile/ui/FamilyLinkRequestForm.tsx')
    const familyCard = read('apps/web/src/app/dashboard/family/ActiveStudentConnectionCard.tsx')
    const mobileStudents = read('apps/mobile/app/(app)/students.tsx')
    const mobileProfile = read('apps/mobile/app/(app)/profile.tsx')
    const legacyMobileWrapper = read('apps/mobile/src/data/parent-student.ts')

    expect(webForm).toContain("action: 'request_by_code'")
    expect(webForm).toContain("action: 'request_by_email'")
    expect(webForm).not.toContain('studentProfileId')
    expect(familyCard).toContain('FamilyLinkRequestForm')
    expect(familyCard).not.toContain('Copy Student ID')
    expect(mobileStudents).toContain('requestStudentFamilyLinkByCode')
    expect(mobileStudents).toContain('requestStudentFamilyLinkByEmail')
    expect(mobileStudents).not.toContain('Student Profile ID')
    expect(mobileProfile).toContain('createStudentFamilyLinkCode')
    expect(mobileProfile).toContain('Share.share')
    expect(legacyMobileWrapper).not.toContain('requestStudentAccessByProfileId')
    expect(legacyMobileWrapper).toContain('Family Link Codes and student-approved email requests')
  })

  it('keeps parent controls parent-focused instead of exposing student-only invite tools', () => {
    const relationshipInvites = read('apps/web/src/app/profile/ui/RelationshipInvites.tsx')
    const mobileProfile = read('apps/mobile/app/(app)/profile.tsx')

    expect(relationshipInvites).toContain("const isStudent = viewerRole === 'student'")
    expect(relationshipInvites).toContain(
      "const isFamily = viewerRole === 'parent' || viewerRole === 'guardian'",
    )
    expect(relationshipInvites).toContain('Manage student profiles')
    expect(relationshipInvites).toContain('{isStudent ? <StudentFamilyLinkCodeCard /> : null}')
    expect(mobileProfile).toContain('Manage Students')
    expect(mobileProfile).toContain('const canInviteSupporters = isStudent')
  })

  it('labels student approval requests clearly and omits student ownership from supporters', () => {
    const relationshipInvites = read('apps/web/src/app/profile/ui/RelationshipInvites.tsx')
    const linkedSupporters = read('apps/web/src/app/profile/ui/LinkedSupporters.tsx')
    const mobileProfile = read('apps/mobile/app/(app)/profile.tsx')

    expect(relationshipInvites).toContain('Connection requests awaiting your approval')
    expect(relationshipInvites).toContain('Accept only a parent or guardian you know')
    expect(relationshipInvites).toContain('connection request')
    expect(relationshipInvites).toContain('Awaiting your decision')
    expect(linkedSupporters).toContain(
      "const SUPPORTER_ROLES = new Set(['parent', 'guardian', 'counselor'])",
    )
    expect(linkedSupporters).toContain('const supporters = linked.filter')
    expect(mobileProfile).toContain('Connection requests awaiting your approval')
    expect(mobileProfile).toContain('Awaiting your decision')
  })
})
