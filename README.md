# MySRYear

MySRYear helps students and parents begin preparing for college as early as grade 9. This repo is now
structured as a monorepo to support web + mobile + shared packages over time.

## Repo Structure

- `apps/web` — Next.js web app
- `apps/mobile` — Expo (Expo Router) mobile app (preservation mode)
- `packages/shared` — shared types + Supabase helpers (source of truth)
- `supabase/` — Supabase config + migrations
- `docs/` — handoff and legacy references

## Requirements

- Node.js 20+ recommended
- npm 9+ recommended

## Getting Started

```bash
npm install --workspaces
npm run dev
```

Open http://localhost:3000

## Common Scripts (from repo root)

- `npm run dev` — start web app
- `npm run build` — build web app
- `npm run lint` — lint web app
- `npm run typecheck` — TypeScript typecheck
- `npm run test` — unit tests (Vitest)
- `npm run test:e2e` — Playwright smoke tests
- `npm run verify` — lint + typecheck + tests + build
- `npm run mobile:start` — start Expo dev server
- `npm run mobile:ios` — start Expo + open iOS simulator
- `npm run mobile:android` — start Expo + open Android emulator
- `npm run mobile:verify` — quick non-interactive Expo check

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill values:

```bash
cp .env.local.example .env.local
```

Minimum required for local dev:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `CRON_SECRET`

Optional but used by routes:

- `NEXT_PUBLIC_BASE_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

## Mobile

Mobile lives under `apps/mobile/`. This sprint preserves the recovered app and ensures it can run; deeper refactors and cross-platform packages come later.

- Mobile env vars: see `apps/mobile/.env.example`
- Current mobile structure + known alignment gaps: `docs/MOBILE_STATUS.md`

## Supabase

- Supabase config lives in `supabase/config.toml`
- Migrations belong in `supabase/migrations/`
- Legacy schema snapshot is in `docs/legacy/supabase-schema.sql`

Canonical entry points:
- Supabase env/client helpers: `packages/shared/src/supabase/*`
- Server-side session/profile helper: `apps/web/src/lib/auth.ts`

## CI

GitHub Actions runs:
- install (`npm ci`)
- lint
- typecheck
- unit tests
- build
- Playwright smoke test

CI uses placeholder env vars so the build can run in isolation.

## Deployment Notes

If deploying with Vercel, set the **Root Directory** to `apps/web` after merge.

## Support

See `AUTHENTICATION_SETUP.md` and `docs/HANDOFF_CHECKLIST.md` for handoff details.
