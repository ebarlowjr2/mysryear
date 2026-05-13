# Mobile Preservation + Readiness

This repo contains a recovered Expo (Expo Router) mobile app under `apps/mobile/`.

This sprint’s goal is preservation and basic readiness only:

- Keep the recovered app in the monorepo.
- Ensure it installs and starts.
- Do not refactor into atomic design yet.
- Do not rebuild major UI flows yet.

## Where Things Live

- Routes (Expo Router): `apps/mobile/app/`
- Reusable UI components: `apps/mobile/components/`
- Theme/tokens (mobile-only for now): `apps/mobile/src/theme/`
- Data calls / Supabase queries: `apps/mobile/src/data/`
- Auth/session context: `apps/mobile/src/contexts/AuthContext.tsx`
- Supabase client: `apps/mobile/src/lib/supabase.ts`

## Key Screens / Routes

- Auth:
  - `apps/mobile/app/(auth)/login.tsx`
  - `apps/mobile/app/(auth)/signup.tsx`
  - `apps/mobile/app/auth/callback.tsx`
- App:
  - `apps/mobile/app/(app)/profile.tsx`
  - `apps/mobile/app/(app)/students.tsx`
  - `apps/mobile/app/(app)/school.tsx`
  - `apps/mobile/app/(app)/planner.tsx`

## Local Commands

From repo root:

- `npm run mobile:start`
- `npm run mobile:ios`
- `npm run mobile:android`

Mobile “verification” (non-interactive):

- `npm run mobile:verify`

## Current Data Model Assumptions (Mobile)

The recovered mobile app currently assumes legacy tables/columns that may not match the new web foundation:

- `profiles` is keyed by `user_id` (mobile) vs `id` (web foundation expects `profiles.id = auth.users.id`).
- Roles include `student|parent|teacher|business` (mobile) but shared web types currently differ.
- Parent/student linking uses `parent_student_links` (mobile) while web is moving toward `student_profiles` + `family_relationships`.
- School selection uses `schools` + `school_memberships` tables (mobile).

These differences are expected for now; we are not doing the full alignment/refactor in this sprint.

## Known Alignment Work (Future)

After the web identity model + LifePath foundation are stable, the mobile app should be updated to align with:

- Shared auth/session + role types in `packages/shared`
- `student_profiles` + `family_relationships` ownership model
- LifePath selections stored in `student_career_interests`
- Uploads via Supabase Storage + `uploaded_files` linked to student profiles
- Future shared packages:
  - `packages/theme` (tokens)
  - `packages/ui` (cross-platform primitives)

