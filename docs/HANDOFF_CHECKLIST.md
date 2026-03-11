# Handoff Checklist

## Quick Start

- `npm install --workspaces`
- `npm run dev`
- Visit http://localhost:3000

## Environment

- Copy `.env.local.example` to `.env.local`
- Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Set `CRON_SECRET`
- Set `NEXT_PUBLIC_BASE_URL` and Google OAuth vars if needed

## Supabase

- Migrations live in `supabase/migrations/`
- Legacy schema snapshot is in `docs/legacy/supabase-schema.sql` (reference only)
- If you have the Sprint 3 SQL script, convert it into a timestamped migration

## CI & Verification

Run locally:

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run test:e2e` (requires Playwright browsers)

Or use:

- `npm run verify`

## Route Guarding

Middleware currently protects:
- `/dashboard`
- `/open-dashboard`
- `/planner`
- `/applications`

Update both middleware and docs if you change this list.

## Deployment (Vercel)

- Set Vercel **Root Directory** to `apps/web`
- Confirm env vars are set in Vercel

## Open Items

- Confirm and import the missing Sprint 3 SQL migration
- Decide when to bring in the real `apps/mobile` source
