# A.U.R.A LifePath Role Routing

## Purpose

A.U.R.A LifePath supports different role experiences without mixing official student planning data with parent exploration. The official LifePath belongs to the active `student_profile_id`; parent simulations belong only to the parent/guardian auth user.

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
- Parent/guardian can create notes through `lifepath_feedback` and can run their own Parent Simulation.
- Counselor can view linked student LifePath read-only. Counselor feedback/write access remains out of scope for this sprint.
- Business users do not enter A.U.R.A LifePath and are redirected to `/business/dashboard` on web.

## Parent Notes Permissions

The new `lifepath_feedback` table stores general or career-specific notes.

- `career_id = null` means a general LifePath note.
- `career_id` populated means a career-specific note.
- Students can read notes attached to their student profile.
- Linked parents/guardians can create notes for their linked student profile.
- Linked parents/guardians can update/delete only their own notes.
- Approved counselors can read notes through linked-profile access.
- Business users have no access.

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

Simulation screens display a visible “Parent Simulation” label and do not generate official student tasks.

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

It also adds indexes and RLS policies for linked-profile feedback access and owner-only simulation access.

## Production Verification Steps

After applying the migration in Supabase SQL Editor:

1. Student opens `/aura`, starts or opens official LifePath, selects careers, and opens career detail.
2. Parent/guardian opens `/aura/lifepath` and sees both family options.
3. Parent/guardian opens the student official LifePath and cannot edit career choices or mark tasks complete.
4. Parent/guardian adds a general note and a career-specific note.
5. Parent/guardian starts Parent Simulation, selects up to five careers, and opens simulation career detail.
6. Confirm Parent Simulation creates rows only in `lifepath_simulations` and `lifepath_simulation_interests`.
7. Confirm no Parent Simulation writes occur in `student_career_interests`, `lifepath_tasks`, `student_success_tasks`, or scholarship matching tables.
8. Counselor opens linked student LifePath and remains read-only.
9. Business direct visit to `/aura` or `/aura/lifepath` redirects away from A.U.R.A.
10. Mobile back controls return from career detail to LifePath and from LifePath to A.U.R.A.

## Rollback / Feature Disable Guidance

If the migration is applied but the feature must be disabled, hide or remove links to:

- `/aura/lifepath/simulation`
- `/aura/lifepath/simulation/select`
- `/aura/lifepath/simulation/career/[id]`

Official student LifePath can continue to run because the migration is additive and does not alter existing official LifePath tables.

## Known Gaps

- Mobile parent/counselor linked-student selection currently relies on the active student profile selected in Profile.
- Mobile parent feedback UI is not yet implemented; web supports feedback notes in this sprint.
- Parent Simulation scoring uses baseline shared Career Health logic only.
- Counselor write-scoped actions, comments, and milestone verification remain future permission-based work.
