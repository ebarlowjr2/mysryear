# Scholarship Freshness & Verification

Builds on the ingestion foundation (`docs/scholarship-ingestion.md`). Adds a
freshness/verification layer so students never see expired or stale scholarships,
with **two independent protections**:

1. **Ingestion/refresh** keeps records current (import, update, recheck deadlines,
   archive expired, flag broken).
2. **The display query** independently refuses to surface expired or stale
   records — so an old-scholarship problem cannot recur even if a refresh job
   fails.

---

## 1. Audit — why expired scholarships were still appearing

The student feeds queried the base table with only an `active = true` filter and
**no deadline/freshness predicate**:

- `apps/web/src/app/api/scholarships/matches/route.ts`
- `apps/web/src/app/api/scholarships/related/route.ts`
- `apps/mobile/src/data/scholarships.ts`

Expiry was applied **only** by the ingestion importer (which sets
`active = false` / `lifecycle_status = 'expired'`). It was never enforced at read
time. So any row with `active = true` and a past `deadline` — e.g. seeded rows,
or rows whose deadline passed after the last import, or any state where the
import had not run — still appeared in the feed. There was no independent
display-layer guard.

**Fix:** a freshness-guarded database view + a shared TypeScript predicate, both
of which exclude expired/stale/broken records regardless of ingestion state; the
feeds read from the view (and re-apply the predicate in code as defense in depth).

---

## 2. Schema (migration `20260727120000_scholarship_freshness_verification.sql`)

Additive, non-destructive. Columns added to `public.scholarships`:

| Column | Meaning |
| --- | --- |
| `deadline_at` (timestamptz) | Concrete deadline instant (end of the deadline day for fixed deadlines). |
| `deadline_type` (`fixed`/`rolling`/`unknown`) | How to interpret the deadline. |
| `source_updated_at` | When the source last changed the record (if reported). |
| `verification_status` (`verified`/`unverified`/`stale`/`broken`/`needs_review`) | Freshness state. |
| `next_verification_at` | When the record is next due for re-verification. |
| `archived_at` | Set when a record is archived (never deleted). |
| `canonical_url` | Normalized application URL for secondary dedup. |

Also:
- **`scholarship_ingestion_runs`** — ingestion-run log (created/updated/archived/
  duplicated/failed counts per run). RLS on; admins may read; writes are
  service-role only.
- **`student_visible_scholarships`** — `security_invoker` view; the independent
  display guard (see below).

The boolean `active` column is still what everything filters on; the new fields
augment it. Existing `select *` reads keep working.

## 3. The two layers

### Display layer (independent guard)

`public.student_visible_scholarships` shows a scholarship only when it is:
- `active = true`, `lifecycle_status = 'active'`, `archived_at IS NULL`,
- `verification_status NOT IN ('broken','stale')`, and
- **either** has a concrete future deadline, **or** (rolling/unknown/missing
  deadline) was verified within the freshness window (30 days).

The same rule is implemented in TypeScript as `isVisibleToStudents(...)`
(`apps/web/src/lib/scholarships/ingestion/freshness.ts`) and re-applied in the
matches route after the query — so the feed is safe even if pointed back at the
base table. This is the layer that prevents outdated scholarships from showing
**even if an import job fails**.

Feeds now read from the view:
`matches/route.ts`, `related/route.ts`, `apps/mobile/src/data/scholarships.ts`.

### Ingestion/refresh layer

`refreshScholarships(...)` (`ingestion/refresh.ts`) runs the scheduled process:

1. **Import new** scholarships (via a source adapter).
2. **Update existing** records (content-fingerprint change detection).
3. **Recheck deadlines** and (optionally) source availability.
4. **Archive expired** scholarships — an independent sweep
   (`repository.archiveExpired`) that runs even when the import brings nothing
   new. Expired records are archived (`active=false`, `lifecycle_status='expired'`,
   `archived_at` set), **never deleted**, preserving history and student
   matches/applications.
5. **Flag broken / materially-changed** records (`deriveVerification` →
   `broken` / `needs_review`).
6. **Record the run** in `scholarship_ingestion_runs`.

Rolling deadlines are supported (`deadline_type = 'rolling'`) and displayed only
while recently verified. Duplicates are collapsed by source `external_id` **or**
`canonical_url`.

## 4. Endpoints

| Route | Auth | Purpose |
| --- | --- | --- |
| `GET /api/cron/scholarship-refresh` | `Authorization: Bearer $CRON_SECRET` | Scheduled refresh. Query: `?dryRun=1`, `?source=legacy`, `?deactivateMissing=1`. |
| `POST /api/scholarships/admin/refresh` | Admin (`profiles.role='admin'`) | Manual refresh. Body: `{ dryRun?, source?, limit?, deactivateMissing? }`. |
| `GET /api/scholarships/admin/refresh` | Admin | Read the recent ingestion-run log. |

Refresh writes use a **service-role** client (`lib/scholarships/service-role.ts`),
server-side only. The scheduled job is configured in `vercel.json` (Vercel Cron)
to GET `/api/cron/scholarship-refresh` daily at 07:00 UTC; Vercel automatically
attaches `Authorization: Bearer $CRON_SECRET` when `CRON_SECRET` is set. The
route fails closed (401) if `CRON_SECRET` is unset or the header does not match.

The view is created `security_invoker` and explicitly granted `select` to
`anon, authenticated, service_role`; the underlying `scholarships` RLS
(`active = true`) is preserved per querying user.

## 5. Environment variables (server-side only)

- `CRON_SECRET` — guards the scheduled refresh route.
- `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`) and `SUPABASE_SERVICE_ROLE_KEY`
  — required for refresh writes. Never expose to clients.

## 6. UI

The scholarship detail (web `ScholarshipWorkspace`) shows the application
deadline (or "Rolling"), a **Last verified** date, and a direct **View at
provider** link (application URL, falling back to source URL).

## 7. Tests

`apps/web/src/lib/scholarships/ingestion/*.test.ts` cover: expired, upcoming,
rolling, missing-deadline, duplicate (id and canonical URL), broken-source,
reactivated, archive sweep, dry-run, and run-logging — all with fixtures, no
network calls.

## 8. Deployment (production-first, additive)

The migration is additive/non-destructive and applied manually via the Supabase
SQL Editor (see `docs/scholarship-ingestion-release.md` conventions). Old and new
code coexist: existing `select *` reads are unaffected; feeds gain the view.
Nothing here deletes data; expired records are archived.

## 8a. Consistency hotfix (migration `20260803120000_scholarship_consistency_hotfix.sql`)

Additive follow-up capturing production-required fixes so a fresh DB build cannot regress:
- **`scholarships.deadline` and legacy `scholarships.link` made nullable** (guarded; safe if already nullable or absent). `deadline` must be nullable for rolling/unknown deadlines; `link` is a legacy column the pipeline mirrors from the provider URL but which is not always present.
- **`scholarship_ingestion_runs.reactivated_count`** added so runs classify reactivations separately.

Behavior changes:
- The importer now mirrors a usable provider URL (`application_url`, falling back to `source_url`) into the legacy `link` column, without ever overwriting a valid existing link with null (the key is omitted when no URL is available). Canonical URL fields remain authoritative.
- **Duplicates are classified as skipped/deduplicated, never as failures.** Run status is `success` when there are no genuine errors even if duplicates were collapsed; only real normalize/validation/provider/database errors produce `partial`/`failed`. Reactivations are counted separately from updates.

## 8b. Re-observed = re-verified

A scheduled/manual refresh that re-fetches a record from its source and finds it
unchanged still counts as a **re-verification**: `last_verified_at` /
`next_verification_at` advance and `verification_status` becomes `verified`
(`ScholarshipRepository.touchVerification`, reported as `revalidated`). Without
this, rolling/unknown-deadline records (which are gated on verification within 30
days) would age out of the student feed even though the daily cron kept
confirming them. Fixed future-deadline records are unaffected either way.

## 9. Known gaps / follow-ups

- Source-availability HTTP rechecks are modeled (`deriveVerification` accepts a
  `sourceOk` signal) but no live per-URL checker is wired into the default
  refresh, to avoid unsolicited outbound requests. Add a rate-limited checker
  when an approved approach is chosen.
- The admin refresh currently uses the `legacy` (in-app `scraped_scholarships`)
  source; add live source adapters as they are approved.
- An admin UI surface for the run log/manual refresh button can consume the
  existing `GET/POST /api/scholarships/admin/refresh` endpoints.
