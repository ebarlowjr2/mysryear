# Web/Mobile Feature Parity Audit

Date: 2026-06-18

Scope:

- Web: `apps/web`
- Mobile: `apps/mobile`
- Shared: `packages/shared`
- Database/migrations: `supabase/migrations`

## 1. Executive Summary

The web app is currently ahead of mobile on the new rebuild architecture. Web has the newer `student_profiles`-owned identity model, A.U.R.A LifePath, student success dashboard, uploads/report card vault, active student profile selection, and relationship invite/request flows. Mobile is a recovered Expo app with valuable legacy flows, but it still writes mostly to older auth-user-owned tables and legacy columns such as `profiles.user_id`, `profiles.school`, `profiles.graduation_year`, `parent_student_links`, `school_memberships`, `user_tasks`, and `user_saved_scholarships`.

The highest-risk mismatch is identity ownership. Web treats `student_profiles` as the planning container. Mobile treats `profiles` and `user_id` as the planning container. If we add more mobile features before unifying this, parent/student relationships, uploads, tasks, scholarships, and LifePath progress can drift into incompatible records.

Current estimated parity score: **52/100**.

Biggest risks:

- Mobile parent/student flows use `parent_student_links`; web uses `student_profile_relationship_invites` plus `family_relationships`.
- Mobile onboarding stores school/graduation data on `profiles`; web stores school/graduation primarily on `student_profiles`.
- Mobile planner/dashboard use `user_tasks`; web success dashboard uses `student_success_tasks`, while web senior planner also still uses several legacy `user_*` tables.
- Web uploads and academic records are `student_profile_id` scoped; mobile has no equivalent document upload flow yet.
- Web LifePath is present; mobile has no LifePath implementation.
- Role sets differ: web canonical roles are `student`, `parent`, `guardian`, `counselor`; mobile uses `student`, `parent`, `teacher`, `business`.
- Mobile calls `supabase.auth.admin.listUsers()` from the client in `sendLinkRequest`, which is not safe/viable with an anon client and should be replaced before production use.

Highest priority parity gaps:

- Unify mobile identity reads/writes around `profiles.id = auth.users.id`, `student_profiles`, and `family_relationships`.
- Replace mobile `parent_student_links` flows with canonical invite/request flows.
- Add active student profile selection to mobile before adding LifePath/uploads there.
- Move shared identity/session/profile helpers into `packages/shared` in a way both apps can consume.
- Decide which legacy tables remain for compatibility and which are replaced by canonical student-profile-owned tables.

## 2. Feature Matrix

| Feature | Web status | Mobile status | Same behavior? | Data source/table/API | Notes | Priority |
| --- | --- | --- | --- | --- | --- | --- |
| Auth login | Implemented at `/login`; uses shared browser Supabase client. | Implemented at `app/(auth)/login.tsx`; uses mobile Supabase client with AsyncStorage. | Partial | Web: Supabase Auth via `@mysryear/shared`; Mobile: `src/contexts/AuthContext.tsx`, `src/lib/supabase.ts` | Both use Supabase Auth, but web uses shared helper and redirect query support; mobile has Expo router auth gate. | High |
| Auth signup | Implemented at `/signup`; includes role, school, grad year for students via auth metadata. | Implemented at `app/(auth)/signup.tsx`; basic email/password signup. | No | Web: `auth.signUp` metadata; Mobile: `AuthContext.signUp` | Mobile does not collect the full canonical setup at signup. | High |
| OAuth/deep link auth | Not a primary web flow in current audit, Google authorize API exists. | Google OAuth code exists in `AuthContext.signInWithGoogle`. | Partial | Web: `/api/integrations/google/authorize`; Mobile: `signInWithOAuth`, `app/auth/callback.tsx` | Needs end-to-end test and redirect URL alignment before relying on it. | Medium |
| Session persistence | Implemented with Supabase cookies and middleware. | Implemented with AsyncStorage and auth listener. | Partial | Web: Supabase SSR cookies; Mobile: AsyncStorage | Mechanisms differ appropriately by platform; shared policy docs needed. | High |
| Route protection | Web middleware protects non-public routes and uses `/login?redirectTo=...`. | Root `AuthGate` redirects unauthenticated users to login and incomplete profiles to onboarding. | Partial | Web: `apps/web/middleware.ts`; Mobile: `app/_layout.tsx` | Web allows public `/resources`, `/signup`, `/login`; mobile app shell is fully gated except auth/onboarding. | Medium |
| Onboarding | Web has `/onboarding` and signup bootstrap path; creates/updates `student_profiles`. | Mobile has 3-step onboarding; role, school text, grad year on `profiles`. | No | Web: `/api/onboarding`, `/api/bootstrap`, `student_profiles`; Mobile: `profiles` columns | Mobile school field is text, not `schools.id`; no student profile container. | Critical |
| Role selection | Web uses canonical shared roles: student, parent, guardian, counselor. | Mobile uses student, parent, teacher, business. | No | Web: `packages/shared/src/types/roles.ts`; Mobile: `src/data/profile.ts` | Teacher/business should not be discarded, but must be mapped intentionally later. | Critical |
| Student profile creation | Web creates `student_profiles` and relationship row. | Mobile creates/updates profile rows only. | No | Web: `student_profiles`, `family_relationships`; Mobile: `profiles` | Canonical planning container missing on mobile. | Critical |
| Parent-led student profile creation | Web supports parent/guardian creating student profile in onboarding/profile model. | Mobile parent flow links to existing student by email; no parent-created planning container. | No | Web: `student_profiles.created_by_user_id`, `family_relationships`; Mobile: `parent_student_links` | Parent-led student profile is web-only currently. | Critical |
| High school selection | Web searches `schools` table and saves `student_profiles.school_id`. | Mobile has school text in onboarding/profile and a separate school membership join flow. | Partial | Web: `schools`, `student_profiles.school_id`; Mobile: `profiles.school`, `school_memberships` | Mobile has valuable school search screen, but membership model differs from canonical profile school. | High |
| Graduation year | Web saves on `student_profiles.graduation_year`. | Mobile saves on `profiles.graduation_year`. | No | Web: `student_profiles`; Mobile: `profiles` | Must migrate mobile to student-profile-owned grad year. | High |
| Active student profile selection | Web has selector on `/profile` and active profile used by dashboard/LifePath/uploads. | Mobile has no active student profile concept. | No | Web: `profiles.active_student_profile_id`; Mobile: none | Required before mobile LifePath/uploads. | Critical |
| Parent/guardian invite | Web supports supporter invites by email. | Mobile legacy parent flow is parent requests link to student. | Partial | Web: `student_profile_relationship_invites`; Mobile: `parent_student_links` | Web supports student-led invites; mobile does not appear to expose student-led parent invite in current recovered UI. | Critical |
| Counselor invite | Web supports counselor as invite role and read/support access. | Mobile role set has teacher/staff, not counselor. | No | Web: `student_profile_relationship_invites`, `family_relationships`; Mobile: `school_memberships`, `teacher` role | Mobile teacher/staff needs intentional mapping to counselor/school_admin later. | High |
| Parent request student access | Web supports access request and approval RPC. | Mobile has parent request concept via `parent_student_links`, but UI stub currently does not call `sendLinkRequest`. | Partial | Web: `approve_access_request`, invites table; Mobile: `parent_student_links` | Mobile `StudentsScreen.handleLinkStudent` only shows success alert, no DB call. | Critical |
| Profile management | Web profile manages account, active student, student details, supporters, invites, school hub cards. | Mobile profile edits account-level name, grad year, state/county, notification preferences, sign out. | Partial | Web: `profiles`, `student_profiles`, `family_relationships`; Mobile: `profiles`, `school_memberships` | Mobile profile UI is polished but uses legacy account-owned fields. | High |
| Linked supporters display | Web lists linked supporters for active student profile. | Mobile parent side lists linked students; student-side pending requests exist in data layer but not clearly surfaced in profile. | Partial | Web: `family_relationships`; Mobile: `parent_student_links` | Needs unified relationship UI vocabulary. | High |
| Dashboard | Web is Student Success Dashboard with academic health, checklist, uploads, LifePath count. | Mobile dashboard is senior-year card dashboard with scholarships/tasks/deadlines and feature cards. | No | Web: `/api/dashboard/summary`, `student_success_tasks`, `academic_records`, `student_career_interests`; Mobile: `scraped_scholarships`, `user_tasks` | Web is 9th-11th recurring value layer; mobile is older senior-year dashboard. | Critical |
| Uploads/documents | Web supports authenticated Supabase Storage upload/delete/list with `student_profile_id`. | Mobile has no general upload/document vault implementation in recovered app. | No | Web: `/api/upload`, `uploaded_files`, `user-uploads` bucket | Must be mobile-added after active student profile exists. | High |
| Report card upload | Web has `ReportCardVault` and academic upload contexts. | Mobile has no report card upload. | No | Web: `uploaded_files`, `academic_records` | Web-only launch feature. | High |
| Academic records | Web creates/listens through dashboard upload flow and academic summary. | Mobile has no academic records. | No | Web: `academic_records` | Mobile needs read-only then upload support. | Medium |
| Student success tasks/checklists | Web creates grade-level tasks in `/api/dashboard/summary`; checklist UI updates status. | Mobile has senior planner tasks, not success checklist. | No | Web: `student_success_tasks`; Mobile: `user_tasks` | Needs canonical task model decision before mobile work. | High |
| A.U.R.A module launcher | Web has `/aura` launcher. | Mobile has no A.U.R.A module. | No | Web route/component; likely local + LifePath API | Web-only. | Medium |
| LifePath dashboard | Web has `/aura/lifepath` command center using selected careers. | Mobile has no LifePath. | No | Web: `student_career_interests`, local career data | Must wait until mobile active student profile is ready. | High |
| LifePath career selection | Web has searchable top-five career selector. | Mobile has no LifePath selector. | No | Web: `/api/aura/lifepath/interests`, `student_career_interests` | Web has localStorage fallback plus DB persistence. | High |
| LifePath career detail | Web has detail pages, scoring, scenarios, cost/debt, recommendations. | Mobile has no LifePath detail. | No | Web: local `CAREERS`, scoring utility | Candidate for shared non-UI logic later. | Medium |
| Test prep | Web currently has dashboard/resource references; dedicated route was not present in current `apps/web/src/app` inventory. | Mobile has `app/test-prep/index.tsx` and `[testId].tsx`, plus dashboard card. | Partial | Mobile local route/content; Web currently not fully routed in this branch | This contradicts desired parity; web needs route/status confirmation from merged PRs. | Medium |
| Essay/resume vault | Web has resources and dashboard link to resources; no dedicated vault route in current inventory. | Mobile has dashboard coming-soon card only. | Partial | Web: `/resources`; Mobile: disabled card | Both are incomplete but labels differ. | Low |
| Scholarships | Web has public `/scholarships`, `/open-dashboard/scholarships`, scrape API. | Mobile has scholarships tab/detail, search/save/apply. | Partial | Web: `scraped_scholarships`; Mobile: `scraped_scholarships`, `user_saved_scholarships` | Save/apply behavior exists on mobile but web saved state is minimal/open-dashboard only. | High |
| Scholarship tracking/saved | Web open dashboard has placeholder/saved area; no canonical student-profile-owned saved scholarships. | Mobile uses `user_saved_scholarships` by auth user. | No | Mobile: `user_saved_scholarships`; Web: no canonical table yet | Needs student-profile-owned scholarship saves before rebuild. | High |
| Planner | Web senior planner uses local/client state plus Supabase `user_tasks`, `user_documents`, `user_recommenders`, `user_visits`. | Mobile planner uses `user_tasks`. | Partial | Both use user-owned legacy task tables | Existing parity is legacy-compatible, but not aligned with student profile ownership. | High |
| Applications | Web has `/applications` placeholder and richer `/open-dashboard/applications` local app tracker. | Mobile dashboard Application Tracker is coming soon. | No | Web local/client; no canonical table | Web-only placeholder/MVP. | Low |
| School hub | Web profile has coming-soon cards. | Mobile `school` tab has school join and coming-soon announcements/calendar/directory. | Partial | Web: `student_profiles.school_id`; Mobile: `school_memberships` | Mobile has more school functionality; data model differs. | Medium |
| School announcements | Web coming soon. | Mobile coming soon. | Yes | None yet | Label parity only. | Low |
| Events calendar | Web coming soon. | Mobile coming soon. | Yes | None yet | Label parity only. | Low |
| Student directory | Web coming soon. | Mobile coming soon. | Yes | None yet | Label parity only. | Low |
| Notifications inbox | Migration exists. | No visible mobile notification inbox. | No | `notifications`; profile prefs | Table exists but UI absent both/mostly. | Low |
| Notification preferences | Web has database columns but limited UI. | Mobile profile has task/deadline reminder toggles. | Partial | Web: `profiles.notify_*`, `deadline_lead_days`; Mobile: `profiles.notifications_tasks`, `notifications_deadlines` | Column names differ. | Medium |
| Business/recruiter opportunities | Web has tracking tables/migrations and open dashboard placeholders. | Mobile has business listings tab using `opportunities`. | Partial | Mobile: `opportunities`; Web: `opportunities`, `user_tracked_opportunities` migration | Mobile has more listing UI; web role model does not currently include business/recruiter. | Medium |
| Counselor/teacher school flows | Web has counselor read/support relationship model. | Mobile has teacher role and school join flow. | No | Web: `family_relationships.role = counselor`; Mobile: `school_memberships.role = teacher` | Needs mapping decision. | Medium |
| Settings/profile preferences | Web profile shows planner defaults and role/onboarding; limited settings. | Mobile profile has editable location and notification toggles. | Partial | Web: `profiles.state/path/testing/...`; Mobile: `profiles.state/county/notifications_*` | Need canonical settings schema. | Low |

## 3. Mobile-only Features

- Role-gated bottom tabs for `students`, `school`, and `listings`.
- Teacher/staff school join flow through `school_memberships`.
- Business listing management through `opportunities`.
- Mobile Test Prep screens: `app/test-prep/index.tsx` and `app/test-prep/[testId].tsx`.
- Mobile profile avatar/initials presentation and simple edit mode.
- Mobile notification toggles for `notifications_tasks` and `notifications_deadlines`.
- Parent-side linked students tab, though the request action currently appears to be a UI stub and not wired to `sendLinkRequest`.
- Mobile-specific Google OAuth/deep-link implementation.

## 4. Web-only Features

- A.U.R.A module launcher.
- A.U.R.A LifePath dashboard, career selection, comparison, and career detail pages.
- Career Health scoring and scenario toggles.
- Active student profile selector.
- Canonical student-profile-owned dashboard.
- Academic health widget.
- Report Card Vault.
- Supabase Storage document uploads/deletes/listing.
- Academic records tied to uploaded files.
- Student success checklist based on grade/graduation year.
- Parent Action Center.
- Counselor read-only checklist behavior.
- Student-led parent/guardian/counselor invites.
- Student claim invites.
- Parent access request approval via canonical invite table and RPC.
- School Hub cards on profile.
- Public resources page with FAFSA/scholarship/essay guidance.

## 5. Behavior Mismatches

- **Profile identity key:** Web queries `profiles.id = auth.users.id`; mobile queries `profiles.user_id = auth.users.id`.
- **Planning container:** Web scopes key data to `student_profile_id`; mobile scopes most data directly to `user_id`.
- **Roles:** Web canonical roles are `student`, `parent`, `guardian`, `counselor`; mobile roles are `student`, `parent`, `teacher`, `business`.
- **Onboarding:** Web signup/onboarding requires school ID and grad year for students; mobile onboarding permits skip and stores school as plain text.
- **School selection:** Web saves `student_profiles.school_id`; mobile uses `profiles.school` and `school_memberships`.
- **Relationship flow:** Web uses invites + family relationships; mobile uses `parent_student_links`.
- **Parent request action:** Web has server API/RPC-backed requests; mobile UI currently shows success without actually sending the request in `StudentsScreen.handleLinkStudent`.
- **Uploads:** Web has Storage and metadata; mobile has no equivalent.
- **Dashboard:** Web dashboard is 9th-11th student success; mobile dashboard is older senior-year launch dashboard.
- **Scholarship save ownership:** Mobile saves by `user_id`; web should eventually save by `student_profile_id`.
- **Planner/task ownership:** Both use legacy user-owned tasks in places, but web success checklist uses student-profile-owned tasks.
- **Notifications preferences:** Web and mobile use different profile column names.
- **Business/teacher role support:** Mobile has UI; web canonical role set intentionally deferred those roles.

## 6. Supabase/Data Mismatches

Mobile tables/functions used that web does not use as canonical:

- `parent_student_links`
- `school_memberships`
- `profiles.user_id`
- `profiles.school`
- `profiles.graduation_year`
- `profiles.notifications_tasks`
- `profiles.notifications_deadlines`
- `tasks`
- `saved_scholarships`
- `user_saved_scholarships`
- `opportunities` for mobile business listings
- `get_user_id_by_email` RPC
- `supabase.auth.admin.listUsers()` attempted from client code

Web tables/functions/APIs used that mobile does not use yet:

- `student_profiles`
- `family_relationships`
- `student_profile_relationship_invites`
- `accept_student_claim_invite`
- `approve_access_request`
- `profiles.active_student_profile_id`
- `uploaded_files`
- `user-uploads` storage bucket
- `academic_records`
- `student_success_tasks`
- `student_career_interests`
- `lifepath_tasks`
- `/api/bootstrap`
- `/api/onboarding`
- `/api/profile/*`
- `/api/upload`
- `/api/dashboard/summary`
- `/api/dashboard/tasks`
- `/api/aura/lifepath/interests`

Tables shared or partially shared:

- `profiles` exists on both, but shape/primary lookup differs.
- `schools` exists on both, but web treats it as a field on `student_profiles`; mobile treats it as membership/standalone search.
- `scraped_scholarships` is used by both for read-only scholarship listings.
- `user_tasks` is used by mobile planner/dashboard and web senior planner, but it is not the canonical student success checklist table.
- `opportunities` exists from mobile legacy and Sprint 3 tracking, but web role alignment is incomplete.

## 7. Recommended Unification Plan

Do not implement this in the audit sprint. Recommended order:

1. **Identity compatibility layer first.**
   - Add shared helpers in `packages/shared` for reading the current user profile, active student profile, and linked student profiles.
   - Keep UI app-specific.
   - Make mobile consume `student_profiles` and `family_relationships` before adding new mobile features.

2. **Role mapping decision.**
   - Keep canonical roles as `student`, `parent`, `guardian`, `counselor`.
   - Document mobile `teacher` as future `counselor` or `school_admin` depending permissions.
   - Document mobile `business` as future `business/recruiter`.
   - Do not add teacher/business to the canonical role set until permissions and tables are designed.

3. **Mobile onboarding migration.**
   - Update mobile signup/onboarding to create/update `student_profiles`.
   - Replace school text entry with `schools` search and `student_profiles.school_id`.
   - Save graduation year to `student_profiles`.
   - Preserve mobile visual flow, but change data writes.

4. **Relationship flow migration.**
   - Replace mobile `parent_student_links` with `student_profile_relationship_invites` and `family_relationships`.
   - Add accept/decline UI for student-side requests.
   - Add parent/guardian active student selector.

5. **Active student profile on mobile.**
   - Add a mobile active student profile selector, likely under Profile first.
   - Persist selection to `profiles.active_student_profile_id`.
   - Use it for dashboard/planner/scholarships/uploads/LifePath later.

6. **Dashboard parity.**
   - Decide if mobile dashboard should mirror Student Success Dashboard or keep a mobile-specific compact version.
   - Shared logic should include academic health calculation, checklist definitions, and LifePath summaries.
   - UI should stay app-specific.

7. **Uploads and report card vault on mobile.**
   - Add mobile document upload after active student profile is stable.
   - Use same `uploaded_files`, `academic_records`, and `user-uploads` bucket.

8. **LifePath mobile.**
   - Move LifePath career data, scoring, scenarios, and types to `packages/shared`.
   - Keep web and mobile UI separate.
   - Mobile can implement LifePath after shared logic exists.

9. **Scholarship tracking redesign.**
   - Create a student-profile-owned saved scholarships model before expanding either web or mobile.
   - Keep `scraped_scholarships` as shared source.

10. **Legacy table migration plan.**
   - Treat `parent_student_links`, `school_memberships`, `tasks`, `saved_scholarships`, and `user_saved_scholarships` as legacy references until replaced.
   - Do not delete them until data migration and app cutover are complete.

What should become shared logic:

- Role constants and role mapping.
- Supabase env validation.
- Career data, LifePath scoring, LifePath scenario calculations.
- Student profile/session/active student lookup helpers.
- Dashboard academic health scoring.
- Grade-level checklist definitions.
- Upload context constants.
- Relationship invite/request type definitions.

What should stay app-specific:

- Web route handlers and Next middleware.
- Mobile Expo Router auth gate.
- UI components/layout.
- Platform-specific upload picker implementation.
- Platform-specific OAuth redirect handling.

What should wait:

- Shared UI package.
- Atomic design refactor.
- Full mobile LifePath UI.
- Public scholarship rebuild.
- Business/recruiter role expansion.
- Counselor write permissions.

## 8. Risk List

- **Data fragmentation:** Mobile can continue writing to legacy `profiles`/`user_id` fields while web reads `student_profiles`, causing invisible or duplicated student data.
- **Broken parent/student access:** `parent_student_links` and `family_relationships` can disagree about who has access.
- **Unsafe client admin call:** Mobile code attempts `supabase.auth.admin.listUsers()` from client logic; this should not be shipped as a production dependency.
- **Onboarding inconsistency:** Web may consider onboarding complete while mobile profile lacks a canonical student profile.
- **School mismatch:** Mobile users can join a school through `school_memberships` without updating `student_profiles.school_id`.
- **Task mismatch:** Senior planner tasks and success checklist tasks are separate systems; users may see different progress on web and mobile.
- **Scholarship save mismatch:** Mobile saved scholarships are user-owned; future web saves should be student-profile-owned.
- **Upload privacy:** Web upload RLS is student-profile-aware; mobile upload must reuse the same policy model or risk access gaps.
- **Role drift:** Adding teacher/business back too quickly could break the tighter web counselor/guardian model.
- **TestFlight production risk:** Mobile icon/splash assets are currently placeholder Expo assets and need restoration before public release.

## Parity Score

**52/100**

Rationale:

- Auth is mostly present on both.
- Scholarships and planner have partial overlap.
- Mobile preserved important legacy profile/school/parent concepts.
- Web has the new canonical architecture and major new planning features.
- The core ownership model is not yet unified across platforms.

## Top 10 Gaps

| Rank | Gap | Update first |
| --- | --- | --- |
| 1 | Mobile must adopt `student_profiles` as the planning container. | Mobile |
| 2 | Replace mobile `parent_student_links` with canonical invite/request + `family_relationships`. | Mobile |
| 3 | Add active student profile selection to mobile. | Mobile |
| 4 | Align role sets and map teacher/business intentionally. | Shared + Mobile |
| 5 | Move school/graduation year writes from mobile `profiles` to `student_profiles`. | Mobile |
| 6 | Add mobile report card/document upload using `uploaded_files` and `user-uploads`. | Mobile |
| 7 | Move LifePath data/scoring to shared before mobile LifePath UI. | Shared |
| 8 | Create student-profile-owned scholarship tracking before rebuilding scholarship saves. | Web/schema first, then mobile |
| 9 | Unify planner/success task ownership strategy. | Web/schema first |
| 10 | Restore branded mobile icon/splash assets before public release. | Mobile |

## Recommended Next Sprint

Recommended next sprint: **Mobile Identity Alignment Sprint**.

Purpose:

- Keep mobile UI mostly intact.
- Change mobile data access from legacy user-owned profile fields to the canonical web identity model.
- Add active student profile support.
- Replace parent/student link logic with canonical relationship invites.

Suggested sprint tasks:

- Create mobile data helpers for `student_profiles`, `family_relationships`, and `student_profile_relationship_invites`.
- Update mobile onboarding to save `student_profiles.school_id` and `student_profiles.graduation_year`.
- Add mobile active student profile selector under Profile.
- Update mobile Students/parent flow to use canonical access request/invite APIs or equivalent Supabase RPCs.
- Remove client-side dependency on `supabase.auth.admin.listUsers()`.
- Add a small compatibility read for legacy `profiles.school`/`profiles.graduation_year` only as fallback display, not as source of truth.

Do **not** start shared UI or atomic refactor until this identity alignment is complete.
