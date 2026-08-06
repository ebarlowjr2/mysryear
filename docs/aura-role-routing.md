# A.U.R.A LifePath Role Routing

## Purpose

A.U.R.A LifePath supports role-specific planning without mixing official student planning data with parent exploration. The official LifePath belongs to the active `student_profile_id`; parent simulations belong only to the parent/guardian auth user.

## Route Map

### Web

- `/aura` is the A.U.R.A module launcher and redirects business users to `/business/dashboard`.
- `/aura/lifepath` is role-aware:
  - student: official LifePath dashboard or start flow
  - parent/guardian: family landing with “View My Student’s LifePath” and “Try A.U.R.A LifePath”
  - counselor: linked student read-only LifePath
  - business: redirected to `/business/dashboard`
- `/aura/lifepath/student` shows the active linked student’s official LifePath in read-only mode for parent/guardian/counselor roles.
- `/aura/lifepath/select` updates official student career choices only for the student role.
- `/aura/lifepath/compare` remains student-only official comparison.
- `/aura/lifepath/career/[id]` shows official career detail; linked roles are read-only.
- `/aura/lifepath/simulation` is parent/guardian-only and loads Parent Simulation careers.
- `/aura/lifepath/simulation/select` saves Parent Simulation career choices only.
- `/aura/lifepath/simulation/career/[id]` shows career detail with a Parent Simulation badge and no official tasks.
- `/aura/lifepath/recommendations` shows the student-facing parent recommendation inbox.

### Mobile

- `/aura` is the module launcher and redirects business users to the role dashboard surface.
- `/aura/lifepath` is mode-aware:
  - no mode + parent/guardian: shows the two family options
  - no mode + student: official LifePath
  - `mode=linked-student`: official linked student read-only view
  - `mode=parent-simulation`: isolated Parent Simulation
- `/aura/lifepath/select` saves official student choices only for student users.
- `/aura/lifepath/select?mode=parent-simulation` saves only Parent Simulation choices.
- `/aura/lifepath/career/[id]` shows official career detail.
- `/aura/lifepath/career/[id]?mode=linked-student` shows linked student detail read-only.
- `/aura/lifepath/career/[id]?mode=parent-simulation` shows simulation detail without official tasks or uploads.

## LifePath Modes

- `student`: the official student-owned LifePath. Reads and writes use `student_career_interests`, `lifepath_tasks`, and the active `student_profile_id`.
- `linked-student`: a read-only view of the official LifePath for a linked parent, guardian, or counselor.
- `parent-simulation`: an isolated parent/guardian experience backed by `lifepath_simulations` and `lifepath_simulation_interests`.

## Role Behavior

- Student can create and edit official LifePath selections and task completion for their active student profile.
- Parent/guardian can view the linked student’s official LifePath but cannot replace student career choices, reset the official LifePath, or mark official student tasks complete in this sprint.
- Parent/guardian can create, update, and delete their own notes through `lifepath_feedback`.
- Parent/guardian can run their own Parent Simulation.
- Counselor can view linked student LifePath read-only. Counselor commenting remains future work because the current requirement is read-only counselor access.
- Business users do not enter A.U.R.A LifePath and are redirected to `/business/dashboard` on web.

## Mobile Linked Student Selection

Mobile no longer requires parents/guardians to leave LifePath and switch students through Profile.

Behavior:

- Defaults to `profiles.active_student_profile_id` when that student is still present in the user’s linked `family_relationships` set.
- Falls back to the first linked student if the active profile is missing, expired, inactive, or no longer linked.
- Shows a no-linked-student state and keeps Parent Simulation available.
- Shows a single active student summary for one linked student.
- Shows an in-LifePath student selector for multiple linked students.
- Calls `setActiveStudentProfile()` only when the parent intentionally switches students.
- Reloads official LifePath careers and notes for the newly selected student.

`family_relationships` does not currently carry an active/expired status column, so inactive/expired relationship handling means the student is not returned by the current relationship query/RLS result.

## Parent Notes Permissions

The new `lifepath_feedback` table stores general or career-specific notes.

- `career_id = null` means a general LifePath note.
- `career_id` populated means a career-specific note.
- Students can read notes attached to their student profile.
- Linked parents/guardians can create notes for their linked student profile.
- Linked parents/guardians can update/delete only their own notes.
- Approved counselors can read notes through linked-profile access.
- Business users have no access.

Mobile parent feedback UI supports:

- general notes from the linked-student LifePath dashboard
- career-specific notes from linked-student career detail
- display of author role, date, selected student, and related career/path
- edit/delete only for the signed-in user’s own notes

Parent notes do not update Career Health, LifePath tasks, selected careers, uploads, scholarship matching, or dashboard progress.

## Parent Simulation Data Isolation

Parent Simulation data is stored in:

- `lifepath_simulations`
- `lifepath_simulation_interests`

Parent Simulation data is never stored in:

- `student_career_interests`
- `lifepath_tasks`
- `student_success_tasks`
- `student_scholarship_matches`

Simulation records are owned by `lifepath_simulations.created_by_user_id`, not by a linked student profile. Simulation interest rows reference only `lifepath_simulations.id`. The simulation tables intentionally do not include `student_profile_id`.

Simulation screens display a visible “Parent Simulation” label and do not generate official student tasks. Baseline Career Health scoring is reused for simulation and remains a documented nonblocking limitation for this sprint.

Student recommendation acknowledgement/dismissal uses `respond_to_lifepath_simulation_share` so students can only change response state and timestamps, not parent messages, recipients, ownership fields, simulation data, or official LifePath records.

## RLS Assumptions

The migration is additive and assumes these existing tables/functions already exist:

- `profiles`
- `student_profiles`
- `family_relationships`
- `auth.users`

RLS rules added by this sprint:

- `lifepath_feedback` select requires student ownership or valid linked `family_relationships` access.
- `lifepath_feedback` insert requires `author_user_id = auth.uid()` and a matching parent/guardian/student family relationship for the referenced `student_profile_id`.
- `lifepath_feedback` update/delete is author-only.
- `lifepath_simulations` insert/update requires owner identity plus `profiles.role in ('parent', 'guardian')`.
- `lifepath_simulations` select/delete is owner-only.
- `lifepath_simulation_interests` access requires owning the parent simulation.

## Navigation Rules

- Nested LifePath screens have visible back controls.
- Web nested routes include back links to LifePath and A.U.R.A.
- Mobile nested routes use `router.back()` when history exists and fall back to the logical parent route.
- Normal forward navigation uses `router.push()`.
- `router.replace()` is reserved for auth/onboarding-style redirects and business users who should not enter A.U.R.A.
- Deep-linked career detail pages show a safe return path.

## Migration Files

Run this additive migration before enabling parent notes/simulation in production:

- `supabase/migrations/20260726130000_aura_lifepath_feedback_simulations.sql`

It creates:

- `lifepath_feedback`
- `lifepath_simulations`
- `lifepath_simulation_interests`

It also adds constraints, indexes, timestamps, ownership columns, and RLS policies for linked-profile feedback access and owner-only parent simulation access.

## Migration Application Instructions

Do not apply this migration from Codex or any automated production script in this sprint.

Production owner steps:

1. Open the Supabase SQL Editor for the production project.
2. Paste the full contents of `supabase/migrations/20260726130000_aura_lifepath_feedback_simulations.sql`.
3. Run once.
4. Verify table creation with `information_schema.tables`.
5. Verify RLS policies with `pg_policies`.
6. Smoke test the app flows below before promoting the PR branch.

## Production Verification Steps

After applying the migration in Supabase SQL Editor:

1. Student opens A.U.R.A, official LifePath, career select, career detail, and returns via back links.
2. Parent/guardian opens `/aura/lifepath` and sees both family options.
3. Parent/guardian switches linked students inside mobile LifePath without visiting Profile.
4. Parent/guardian opens the student official LifePath and cannot edit career choices or mark tasks complete.
5. Parent/guardian adds a general note and a career-specific note.
6. Parent/guardian edits/deletes only their own note.
7. Parent/guardian starts Parent Simulation, selects up to five careers, and opens simulation career detail.
8. Confirm Parent Simulation creates rows only in `lifepath_simulations` and `lifepath_simulation_interests`.
9. Confirm no Parent Simulation writes occur in `student_career_interests`, `lifepath_tasks`, `student_success_tasks`, or scholarship matching tables.
10. Counselor opens linked student LifePath and remains read-only.
11. Business direct visit to `/aura` or `/aura/lifepath` redirects away from A.U.R.A.
12. Mobile back controls return from career detail to LifePath and from LifePath to A.U.R.A.

## Rollback / Feature Disable Guidance

If the migration is applied but the feature must be disabled, hide or remove links to:

- `/aura/lifepath/simulation`
- `/aura/lifepath/simulation/select`
- `/aura/lifepath/simulation/career/[id]`

Official student LifePath can continue to run because the migration is additive and does not alter existing official LifePath tables.

## Known Gaps

Blocking gaps: none known after this sprint’s mobile parity update.

Nonblocking gaps:

- Baseline Career Health is used for Parent Simulation scoring.
- Counselor commenting/review actions remain future scoped-permission work.
- `family_relationships` does not expose an explicit active/expired status field, so mobile treats missing/not-returned relationships as unavailable.
