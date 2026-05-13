# Identity Migrations (Additive)

This doc is the PR companion for `codex/identity-migrations`.

Goal: introduce a student-profile ownership model (and relationship invites) **additively** so web + mobile can support:

- student-led onboarding (student invites parent/guardian/counselor)
- parent-led onboarding (parent creates student profile; student claims later)
- shared planning ownership under `student_profiles` (not just `auth.users`)

This sprint does **not** refactor UI yet. It only adds schema + RLS foundations.

## New Migration Files

These are the new/additional migrations introduced in this sprint:

- `supabase/migrations/20260513100000_family_student_ownership.sql`
  - Creates `student_profiles`, `family_relationships`, `student_career_interests`, `lifepath_tasks`
  - Adds `uploaded_files.student_profile_id` (nullable, additive)
  - Adds member-based RLS policies for the new tables

- `supabase/migrations/20260513101000_uploads_student_profile_access.sql`
  - Adds **new** upload/table + storage access policies for the *student_profile folder* path
  - Preserves legacy user-owned upload policies so existing uploads continue working

- `supabase/migrations/20260513102000_student_career_interests_delete.sql`
  - Adds delete policy for `student_career_interests` so members can reset/edit picks

- `supabase/migrations/20260513120000_identity_onboarding_tables.sql`
  - Creates `schools` catalog table (high school selection)
  - Adds `student_profiles.school_id`
  - Expands `family_relationships.role` to include `counselor`
  - Creates `student_profile_relationship_invites` table + RLS policies
  - Adds invite-based insert policy for `family_relationships`

- `supabase/migrations/20260513121000_uploaded_files_uploader.sql`
  - Adds `uploaded_files.uploaded_by_user_id` (auditing)
  - Backfills it from `uploaded_files.user_id`
  - Tightens `uploaded_files_insert_member` to require `uploaded_by_user_id = auth.uid()`
  - Allows delete by uploader OR student-profile admin

## Prerequisite Migrations

These earlier migrations must already be applied (they are already in the repo, but listing here for clarity):

- `supabase/migrations/20260512140000_sprint2_profiles_onboarding.sql` (profiles table + RLS)
- `supabase/migrations/20260512153000_uploads_storage.sql` (uploads foundation: bucket + uploaded_files + legacy policies)

## Manual Supabase SQL Order

If you are applying manually via Supabase SQL editor (instead of `supabase db push`), run migrations in **lexicographic filename order**:

1. `20260513100000_family_student_ownership.sql`
2. `20260513101000_uploads_student_profile_access.sql`
3. `20260513102000_student_career_interests_delete.sql`
4. `20260513120000_identity_onboarding_tables.sql`
5. `20260513121000_uploaded_files_uploader.sql`

## Counselor Access Decision (Current)

As of **May 13, 2026**, counselors are **approved read/support access only**:

- Counselors can read linked student profiles and related planning data.
- Counselors should **not** be able to edit core student profile fields by default.
- Future counselor write access should be permission-based and scoped (comments, recommendations, milestone verification).

See `docs/identity-model.md` for details.

## Post-Migration Smoke Tests

After applying migrations, verify:

- Student can access their own `student_profiles` row(s).
- Parent/guardian can access linked `student_profiles` via `family_relationships`.
- Counselor can access linked student profiles but cannot update core `student_profiles` fields by default.
- Invite creator can view/manage their own invites (`student_profile_relationship_invites`).
- Invited user can accept/decline (status update) and then create the `family_relationships` link.
- Upload insert includes `uploaded_by_user_id` when using student-profile-owned uploads.
- Linked users can view student-profile files as intended.
- Only uploader/admin can delete uploaded files (legacy user-owned deletes still work for legacy rows).

