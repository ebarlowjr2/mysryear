# Identity & Onboarding Model (Source of Truth)

## 1. Purpose

MySRYear is a multi-role family/student planning platform, not a single-user app. Students, parents/guardians, counselors, and (later) other roles collaborate on a shared planning container representing a student’s journey. The system must support both student-led and parent-led onboarding without forcing a single “owner = auth user” model.

## 2. Core Principle

Canonical separation of concerns:

- `auth.users` = login identity (authentication only)
- `student_profiles` = planning container (the student record and all planning/progress data attaches here)
- `family_relationships` = access/relationship layer (who can view/assist/manage which student profile)

The most important architectural rule:

- Planning data belongs to `student_profiles`, not directly to `auth.users`.

## 3. Mobile Legacy Mapping (Old → Canonical)

The recovered mobile app is a reference point. Its tables/assumptions should be mapped to the canonical model, not blindly copied forward.

- `profiles` (mobile keyed by `user_id`) → `profiles` (auth-identity metadata) + `student_profiles` (student planning record)
  - Identity-level fields (role, onboarding flags, notification prefs) belong on `profiles`.
  - Student-specific fields (school, grad year, LifePath progress) belong on `student_profiles`.

- `parent_student_links` → `student_profile_relationship_invites` + `family_relationships`
  - Canonical model supports both:
    - student invites parent/guardian/counselor
    - parent requests access; student approves/declines
  - End-state access is represented by `family_relationships`.

- `schools` → `schools` (same concept)
  - Keep `schools` as canonical source for high schools.

- `school_memberships` → `student_profiles.school_id` (canonical) OR keep as legacy layer (to decide)
  - Mobile used membership as a user-to-school join.
  - Canonical model attaches the school to the student planning container.

- `tasks`, `saved_scholarships`, `applications`, uploads, etc. → student-profile-owned planning records
  - These should ultimately reference `student_profile_id`.
  - If legacy tables are user-owned today, they should be migrated (additive first) toward student-profile ownership.

## 4. Canonical Role Set

Canonical relationship roles (access layer) should be independent of “account type”:

- `student`
- `parent`
- `guardian`
- `counselor`
- `school_admin` (later)
- `mentor` (later)
- `business` / `recruiter` (later)

Notes:

- Mobile included `teacher` and `business` account types. Do not discard those concepts.
- For the rebuild, map them intentionally:
  - `teacher` likely maps to `counselor` or a future `school_staff` role.
  - `business` maps to `business/recruiter` roles and opportunity-posting permissions.

## 5. Required Onboarding Flows

### Student-led

1. Student signs up (`auth.users`)
2. Student completes onboarding:
   - selects high school (from `schools`)
   - selects expected graduation year
   - creates/links a `student_profiles` record
3. Student invites parent/guardian/counselor
4. Invitee accepts → relationship becomes active in `family_relationships`

### Parent-led

1. Parent signs up (`auth.users`)
2. Parent creates a student profile (`student_profiles`) immediately
3. Parent starts planning right away for that student profile
4. Student claims/links later:
   - student creates auth account
   - student is linked to the existing `student_profiles` via claim/invite flow

### Parent requests access (student approval)

1. Parent sends a request (by student email or claim link)
2. Student reviews request → approves/declines
3. Approval creates `family_relationships` membership

### Counselor support (later)

- Counselor relationship is supported by the same invite/request mechanism.
- **Current decision (May 13, 2026): counselors are approved read/support access only.**
  - Counselors can view linked student profiles and related planning data.
  - Counselors should **not** be able to edit core student profile fields by default.
  - Future counselor write access should be permission-based and scoped (comments, task recommendations, milestone verification, counselor-reviewed flags).

## 6. Required Canonical Tables

Existing or canonical tables to converge on:

- `profiles`
  - identity metadata for a login user (role, onboarding flags, notification preferences)
- `student_profiles`
  - student planning container (school, grad year, student-owned planning fields)
- `family_relationships`
  - links `auth.users` to `student_profiles` with an access role
- `student_profile_relationship_invites` (proposed)
  - invite/request workflow entity for parent/guardian/counselor linking
- `schools`
  - canonical high school catalog
- `uploaded_files`
  - stores metadata for uploaded files; should link to `student_profile_id`
- `student_career_interests`
  - LifePath selected careers; owned by `student_profile_id`
- `lifepath_tasks`
  - LifePath tasks/milestones; owned by `student_profile_id`

## 7. Ownership Rules (Non-Negotiable)

The following must be owned by `student_profiles`:

- LifePath selections, tasks, and dashboards
- scholarships (saved/tracked), applications, deadlines, progress
- uploads/documents
- certification tracking, proof documents
- parent/counselor “assist” actions (their authorship is separate from ownership)

Actors (parents/guardians/counselors) operate on a student profile by virtue of `family_relationships`.

## 8. Additive Migration Plan (Exact Items)

Do not implement until this spec is approved. When approved, migrations should be additive and staged:

1. Add school linkage to student profile:
   - Add `school_id uuid references public.schools(id)` to `public.student_profiles`
   - Ensure `graduation_year` lives on `student_profiles` (already present in some versions)

2. Create invite/request workflow table:
   - Create `public.student_profile_relationship_invites`
     - `id uuid pk`
     - `student_profile_id uuid fk`
     - `invited_email text` (or `invited_user_id uuid` when known)
     - `relationship_role text` (parent|guardian|counselor)
     - `status text` (pending|accepted|declined|expired)
     - `token text` (optional for claim links)
     - `created_by_user_id uuid fk auth.users`
     - `created_at timestamptz`

3. Create/adjust `family_relationships`:
   - Ensure roles include parent/guardian/counselor/student/admin
   - Ensure RLS supports:
     - members can read the student profile and planning records
     - only appropriate roles can invite/manage relationships (to define)

4. Update uploads to be student-profile owned:
   - Ensure `uploaded_files.student_profile_id` exists
   - Ensure `uploaded_files.uploaded_by_user_id` (or use `user_id` as uploader) exists
   - Ensure Storage paths are `{student_profile_id}/{timestamp}-{filename}`
   - RLS allows linked members to read/write within that student profile scope

5. Update LifePath and planning tables to reference student profiles:
   - Ensure `student_career_interests.student_profile_id`
   - Ensure `lifepath_tasks.student_profile_id`
   - For legacy tables (tasks/scholarships/applications), add `student_profile_id` columns first, then migrate ownership over time.

## 9. Web Page Ownership (Flow → Page)

Canonical flow ownership for the web rebuild:

- `/signup` and onboarding flow
  - create login identity
  - capture account type
  - create or link `student_profiles` depending on role

- `/profile`
  - user identity: name/preferences/role
  - student profile: school selection + graduation year
  - relationships: invite parent/guardian/counselor + approve/decline requests

- `/aura`
  - module launcher only (LifePath tile, future modules)

- `/aura/lifepath`
  - LifePath command center for the active `student_profile_id`

- `/aura/lifepath/career/[id]`
  - detailed pathway plan (tasks, checklist, uploads, debt/cost)

- `/dashboard`
  - student/parent summary (based on active student profile)

- `/uploads`
  - document center (student-profile-owned files; uploaded by any linked member)

## 10. Open Questions

- Should `school_memberships` remain as a legacy concept, or be replaced fully by `student_profiles.school_id`?
- Do counselors require approval from the student only, or student + parent, or either?
- How should `business/recruiter` roles map later (opportunity posting, visibility, verification)?
- Parent permissions: can parents edit core student fields by default, or only assist (suggest/assign) unless explicitly granted?
