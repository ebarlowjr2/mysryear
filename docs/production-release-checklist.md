# Production Release Checklist

## Required Environment

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only; required for account deletion and scholarship administration)
- `NEXT_PUBLIC_SUPPORT_EMAIL`
- Mobile EAS production values for `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Never expose `SUPABASE_SERVICE_ROLE_KEY` through a `NEXT_PUBLIC_` or `EXPO_PUBLIC_` variable.

## Before Promoting Main

1. Confirm all required Supabase migrations have been applied.
2. Run `npm run verify`, `npm run mobile:verify`, and `npm run test:e2e`.
3. Run `npx expo-doctor@latest` and require all checks to pass.
4. Confirm the dependency audit has no critical findings.
5. Confirm the production Vercel environment contains the required variables above.

## Production Smoke Test

- Student signup, email confirmation, onboarding, and dashboard routing.
- Parent/guardian signup, student connection, invitation acceptance, and active-student switching.
- Student and parent document upload plus cross-platform visibility.
- LifePath selection and task completion on web and mobile.
- Scholarship and opportunity detail links.
- Public `/privacy`, `/terms`, `/contact`, `/how-it-works`, and `/resources` pages.
- Account deletion with a sacrificial test account on web and mobile. Confirm the account can no longer sign in and its owned uploaded files are gone.

## Mobile Distribution

1. Build from the same commit promoted to `main`.
2. Confirm EAS increments the iOS build number.
3. Install through TestFlight and run the role-based smoke tests on a physical iPhone.
4. Confirm Sentry receives a nonfatal test event before expanding beyond the tester group.
