# Parent / Student Connections

## Purpose

MySRYear is not a single-user planning app. A parent or guardian can support one or more students, and a student can invite trusted adults without giving them ownership of the student's official planning decisions.

This sprint removes student linking as a blocking parent signup step. Parents and guardians complete account setup first, land on the family dashboard, and manage students from the **Active Student Profile** card.

## Root Cause Fixed

The previous onboarding form treated `parent` and `guardian` as roles that required a `studentProfile` payload. That made the Add Student / Continue path depend on student first name, last name, school, and graduation-year state during mandatory onboarding. If those fields were missing or blocked by validation/RLS, the parent could not reach the dashboard.

The corrected rule is:

- `student` onboarding creates the student's own `student_profiles` row.
- `parent` and `guardian` onboarding is account-only.
- Student linking, managed profile creation, and claim invites happen after signup from the family dashboard.

## Canonical Model

- `auth.users`: login identity.
- `profiles`: account role and active student selection.
- `student_profiles`: student planning container.
- `family_relationships`: accepted access layer.
- `student_profile_relationship_invites`: pending/accepted/declined/expired/revoked relationship lifecycle.

Pending invitations do not grant access to student data. Access starts only after an accepted invite creates a `family_relationships` row or after a parent/guardian creates a managed student profile through the narrow RPC.

## Supported Flows

### Student Invites Supporter

1. Student has an official student profile.
2. Student invites parent, guardian, or counselor by email.
3. Recipient accepts after signup/login.
4. Accepted invite creates a `family_relationships` row.

### Parent Requests Existing Student Access

1. Parent/guardian signs up and reaches `/dashboard/family` without student data.
2. Parent opens **Active Student Profile** and chooses **Link Existing Student**.
3. Parent enters the student email and student profile ID shared by the student.
4. The request is stored as `invite_type = 'access_request'`.
5. The student accepts/declines.
6. Only acceptance creates a `family_relationships` row for the parent/guardian.

This flow intentionally avoids public student search and does not reveal whether an email has a MySRYear account.

### Parent Creates Managed Student Profile

1. Parent/guardian opens **Create Student Profile**.
2. Parent enters student first name, last name, optional school, graduation year, relationship, and optional student email.
3. `create_managed_student_profile(...)` creates a `student_profiles` row with `claim_status = 'managed'` and links the parent/guardian.
4. The profile becomes the parent's active student profile.
5. If a student email is provided, `create_student_claim_invite(...)` creates an expiring claim invite.

Parents cannot impersonate the student. A managed profile supports parent planning, Parent Simulation, notes, uploads where policy permits, and grade-aware parent actions.

### Student Claims Managed Profile

1. Student receives a claim invite and signs up/logs in.
2. Student accepts the invite.
3. `accept_student_claim_invite(...)` attaches the authenticated student account to the existing `student_profiles` row.
4. No duplicate student profile is created.
5. Existing managed-profile data remains attached.
6. Existing parent/guardian relationship remains.
7. If the student already has another student profile, the RPC raises a conflict instead of merging automatically.

## Invite Lifecycle

Supported statuses:

- `pending`
- `accepted`
- `declined`
- `expired`
- `revoked`

Claim and access RPCs enforce:

- authenticated user required
- email/user match required
- pending status required
- revoked invites rejected
- expired invites rejected
- single-use acceptance through status transition

## Web Routes

- `/signup`: parent/guardian account-only signup.
- `/onboarding`: account setup only for parent/guardian; student profile creation only for students.
- `/dashboard/family`: family dashboard and Active Student Profile manager.
- `/profile`: ongoing profile and relationship management.

## Mobile Screens

- `apps/mobile/app/onboarding/index.tsx`: parent/guardian account-first setup.
- `apps/mobile/app/(app)/students.tsx`: linked student selection, access request, managed profile creation.
- `apps/mobile/app/(app)/index.tsx`: parent dashboard empty state and parent actions.

## Migration

Apply after review, before deploying code that uses the new RPCs:

1. `supabase/migrations/20260809120000_parent_connection_action_center.sql`

Do not apply directly to production first. Apply to development/staging, then smoke test parent signup, managed profile creation, claim invite, and access request acceptance.

## RLS Assumptions

- Parents/guardians access student data through accepted `family_relationships` only.
- Pending invites grant no student data access.
- Parent action completions are scoped by `student_profile_id` and `parent_user_id`.
- Counselors remain read/support only and do not gain parent-management permissions.
- Business accounts remain blocked from family/A.U.R.A student planning surfaces.

## Open Follow-Ups

- Add relationship lifecycle fields directly to `family_relationships` if we need expired/paused accepted relationships.
- Add email delivery templates for claim/access invitations.
- Build a richer student-side claim-conflict resolution UI.
