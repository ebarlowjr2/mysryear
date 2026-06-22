# Mobile Identity Alignment

Date: 2026-06-18

## Purpose

This sprint aligns the recovered Expo mobile app with the canonical identity model established by the web rebuild. The goal is not a mobile redesign. The goal is to make mobile read and write the same identity and relationship records as web before we add LifePath, uploads, report cards, or shared UI.

## Canonical Model

- `auth.users` is the login identity.
- `profiles` is account-level metadata and uses `profiles.id = auth.users.id`.
- `student_profiles` is the student planning container.
- `family_relationships` is the linked access layer.
- `student_profile_relationship_invites` is the invite/request workflow.
- `schools` is the canonical school directory.

## Old Mobile Model

The recovered mobile app used several legacy assumptions:

- `profiles.user_id` as the user lookup key.
- `profiles.school` as free-text school storage.
- `profiles.graduation_year` as account-level student data.
- `parent_student_links` for parent/student relationships.
- `school_memberships` for school connection.
- `user_tasks` and `user_saved_scholarships` as auth-user-owned planning data.
- Mobile roles `teacher` and `business`.

## What Changed

- Added `apps/mobile/src/data/identity.ts` as the canonical mobile identity data layer.
- Updated mobile profile lookup to prefer `profiles.id = auth.users.id`.
- Kept `profiles.user_id` as temporary compatibility fallback only.
- Updated mobile onboarding to create `student_profiles` for student, parent, and guardian setup.
- Updated mobile onboarding to save `student_profiles.school_id` and `student_profiles.graduation_year`.
- Updated mobile onboarding to set `profiles.active_student_profile_id`.
- Added active student profile display and switching to the mobile Profile screen.
- Added supporter invite UI on mobile Profile using `student_profile_relationship_invites`.
- Added pending invite accept/decline handling using canonical helpers.
- Replaced mobile parent/student helper implementation with a compatibility wrapper around canonical helpers.
- Removed the unsafe mobile client dependency on `supabase.auth.admin.listUsers()`.
- Updated mobile dashboard to read and display the active student profile.

## Role Alignment

Canonical roles now used by mobile identity helpers:

- `student`
- `parent`
- `guardian`
- `counselor`

Legacy mapping:

- `teacher` maps conservatively to `counselor` as a temporary read/support role.
- `business` is not canonical yet and should be reintroduced later as `business` or `recruiter` after permissions are designed.

## Tables Replaced As Primary Model

No legacy tables were deleted. They are no longer primary for identity flows.

- `parent_student_links` is replaced by `student_profile_relationship_invites` and `family_relationships`.
- `profiles.school` is replaced by `student_profiles.school_id`.
- `profiles.graduation_year` is replaced by `student_profiles.graduation_year`.
- `profiles.user_id` is replaced by `profiles.id`.

## Fallback Behavior

Temporary fallback remains for recovered/older mobile database states:

- `getCurrentProfile()` first queries `profiles.id`, then falls back to `profiles.user_id`.
- School membership helpers remain for the mobile School screen as a legacy/reference School Hub model.
- Planner and scholarships still use older user-owned tables until those features get their own parity sprint.

## Remaining Legacy Dependencies

Still present by design or as reference:

- `apps/mobile/src/data/schools.ts` still uses `school_memberships` for the mobile School Hub reference screen.
- `apps/mobile/src/data/planner.ts` still uses `user_tasks`.
- `apps/mobile/src/data/scholarships.ts` still uses `user_saved_scholarships`.
- `apps/mobile/src/data/opportunities.ts` still uses `opportunities` for legacy business listings.
- `apps/mobile/sql/*` contains legacy SQL reference files and should not be treated as canonical migrations.

## Known Limitation

Parent request-by-email cannot be safely implemented purely from the mobile anon client without a backend lookup/invite service. The unsafe `supabase.auth.admin.listUsers()` usage was removed. Current mobile access request support requires a `student_profile_id`. A future API/RPC should support request-by-email safely from the server side.

## Next Recommended Sprint

Recommended next sprint: **Mobile Dashboard + Upload Readiness**.

Before building new UI, decide whether mobile dashboard should mirror the web Student Success Dashboard or remain a compact mobile-specific dashboard. Then add mobile document upload using the existing canonical `uploaded_files`, `academic_records`, and `user-uploads` bucket.

Do not start shared UI or atomic design until mobile identity, active student profile, and relationship flows are stable in TestFlight.
