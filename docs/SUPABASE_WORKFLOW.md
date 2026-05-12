# Supabase Workflow (Local)

This repo keeps Supabase migrations under `supabase/migrations/`. Treat that folder as the authoritative history for schema changes.

## Prereqs

- Docker (Supabase local runs via containers)
- Supabase CLI (`supabase`)

## Commands

From repo root:

- `npm run supabase:start`: start local Supabase
- `npm run supabase:status`: show URLs/keys + container status
- `npm run supabase:reset`: reset DB and re-run migrations
- `npm run supabase:stop`: stop local Supabase

## Migrations

- Add new migrations to `supabase/migrations/` using a timestamped filename, e.g. `YYYYMMDDHHMMSS_description.sql`.
- Keep migrations additive when possible (avoid breaking changes during rebuild).

### Current baseline migrations

- `supabase/migrations/20260512140000_sprint2_profiles_onboarding.sql`
- `supabase/migrations/20260311150000_sprint3_notifications_tracking.sql`

## Web App Expectations

The web app expects:

- `public.profiles` is the source of truth for user role and onboarding state.
- `profiles.id` matches `auth.users.id`.
- RLS allows an authenticated user to `select`/`update` their own `profiles` row.

