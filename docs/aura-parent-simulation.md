# A.U.R.A Parent Simulation

## Purpose

A.U.R.A Parent Simulation lets a parent or guardian explore LifePath scenarios without changing a linked student's official LifePath. It is an exploratory planning layer for cost, debt, career readiness, and parent recommendations.

## User Experience

Parents and guardians can:

- Start a private simulation from `/aura/lifepath`.
- Select up to five careers.
- Save a draft and resume later.
- Name, complete, duplicate, and archive scenarios.
- Adjust pathway assumptions such as route, school type, contribution, scholarships, work earnings, borrowing, and housing.
- Compare scenario results side by side on web and stacked on mobile.
- Share a completed scenario with a linked student as a read-only recommendation.
- Revoke a shared recommendation.

Students can:

- Open the parent recommendation inbox from LifePath.
- See only simulations explicitly shared with their active student profile.
- Review parent name, message, shared date, careers, costs, debt, salary, and Career Health results.
- Acknowledge or dismiss recommendations without importing careers or changing official LifePath data.

The UI must state that simulation choices do not update official student career selections, LifePath tasks, scholarships, uploads, or dashboard progress.

## Routes And Screens

Web:

- `/aura/lifepath/simulation`: parent scenario dashboard, assumptions, results, share controls.
- `/aura/lifepath/simulation/select`: simulation career picker.
- `/aura/lifepath/simulation/career/[id]`: simulation career detail.
- `/aura/lifepath/recommendations`: student-facing parent recommendation inbox.

Mobile:

- `/aura/lifepath?mode=parent-simulation`: simulation dashboard and scenario controls.
- `/aura/lifepath/select?mode=parent-simulation`: simulation career picker.
- `/aura/lifepath/career/[id]?mode=parent-simulation`: simulation career detail.
- `/aura/lifepath/recommendations`: student-facing parent recommendation inbox.

## Database Model

Existing tables from PR #47:

- `lifepath_simulations`: parent-owned simulation records.
- `lifepath_simulation_interests`: selected career IDs for a simulation.

New additive migration:

- `supabase/migrations/20260801120000_aura_parent_simulation_experience.sql`

Changes:

- Adds `assumptions jsonb`, `results jsonb`, and `completed_at` to `lifepath_simulations`.
- Expands simulation status to `draft`, `completed`, `active`, and `archived` so legacy active rows still work.
- Creates `lifepath_simulation_shares` for read-only student recommendations.
- Adds helper functions for parent/guardian relationship checks and student ownership checks.
- Adds RLS policies for owner-only simulation management and explicit shared-student read access.
- Adds `respond_to_lifepath_simulation_share(share_id, response)` so students can only acknowledge/dismiss through a constrained operation.

## Ownership And Sharing

Simulation ownership is always `lifepath_simulations.created_by_user_id`.

A simulation must not use `student_profile_id` as writable ownership. The linked student profile is only used as a share recipient in `lifepath_simulation_shares`.

Sharing rules:

- Only a parent/guardian who owns a completed simulation can share it.
- Sharing requires a valid `family_relationships` row for the target `student_profile_id`.
- The student can read shared simulations when the share is `active`, `acknowledged`, or `dismissed`.
- Revoked shares immediately stop student simulation visibility.
- Students cannot edit parent simulations or simulation interests.
- Students cannot update share message, recipient, sharing parent, ownership fields, simulation data, or revoke state.

## Career Health Calculations

Shared calculation logic lives in `packages/shared/src/parent-simulation.ts`.

Inputs:

- Career selections.
- Pathway: degree, certification, apprenticeship, military, direct work.
- Institution route: public, private, community college, trade school, none.
- In-state or out-of-state.
- Scholarships and grants.
- Family contribution.
- Student earnings/work-study.
- Expected borrowing.
- Living at home or independent housing.
- Optional adjusted cost.

Outputs:

- Estimated education/training cost.
- Estimated out-of-pocket cost.
- Estimated student debt.
- Entry salary range and expected salary.
- Debt-to-income ratio.
- Debt-risk designation.
- Time to career readiness.
- Certification-friendly and alternative-entry-path flags.
- Demand/outlook label when supported by the catalog.
- Composite Career Health score.
- Milestones, lower-cost alternatives, and plain-language explanation.

Missing data behavior:

- Unknown or invalid money inputs normalize to safe non-negative defaults.
- Missing careers are ignored.
- Results are directional estimates and must be refined with real program costs later.

## RLS Policies

The migration preserves official LifePath isolation:

- Parent/guardian can select, insert, update, and archive only their own `lifepath_simulations`.
- Parent/guardian can manage `lifepath_simulation_interests` only for owned simulations.
- Shared student can select a simulation and its interests only through an active/acknowledged/dismissed `lifepath_simulation_shares` row.
- Share creation requires owned completed simulation plus parent/guardian relationship to the student profile.
- Student acknowledgement/dismissal is enforced by the `respond_to_lifepath_simulation_share` RPC, not by direct row updates.
- Counselor access is not expanded in this sprint.
- Business accounts do not gain A.U.R.A LifePath or Parent Simulation access.

Archive/delete behavior:

- Scenario deletion is implemented as owner-only soft deletion by setting `lifepath_simulations.status = 'archived'`.
- Archived simulations are excluded from default scenario lists and cannot be shared as new recommendations.
- Existing shares tied to archived simulations should be revoked by the parent if they should disappear from the student inbox.
- Permanent removal is intentionally not exposed in this sprint so audit/history can be preserved. A later admin-only purge policy can remove archived scenarios after a retention window.

## Migration Instructions

Apply in development/staging first, not production:

1. Open Supabase SQL Editor for the correct development/staging project.
2. Paste and run `supabase/migrations/20260801120000_aura_parent_simulation_experience.sql`.
3. Confirm:
   - `lifepath_simulations.assumptions` exists.
   - `lifepath_simulations.results` exists.
   - `lifepath_simulation_shares` exists.
   - `respond_to_lifepath_simulation_share(uuid,text)` exists.
   - RLS is enabled on `lifepath_simulation_shares`.
   - Policies include owner-only simulation access and shared-student read access.

## Smoke Tests

- Parent starts a simulation, selects careers, saves draft, exits, and resumes.
- Parent completes a simulation and sees cost/debt/Career Health results.
- Parent duplicates, renames, and archives a scenario.
- Parent shares a completed scenario with a linked student.
- Student sees the recommendation as read-only in `/aura/lifepath/recommendations`.
- Student cannot write to `lifepath_simulations` or `lifepath_simulation_interests`.
- Student can acknowledge or dismiss through the RPC without changing official LifePath records.
- Revoked share disappears from student-visible recommendations.
- One parent cannot access another parent's private simulation.
- Counselor remains read-only for official linked LifePath and does not gain simulation access.
- Business user is blocked from A.U.R.A LifePath.
