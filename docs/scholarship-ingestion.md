# Scholarship Ingestion & Source Normalization

This document describes the scholarship **ingestion pipeline**: how approved
external scholarship data is collected, normalized, validated, deduplicated, and
written into the canonical `public.scholarships` table that the existing
**Scholarship Matching engine** already reads.

The ingestion pipeline does **not** replace or modify matching logic. It only
supplies clean, current, attributable records to it.

---

## 1. Current scholarship schema (source of truth)

The canonical table is `public.scholarships`, created by
`supabase/migrations/20260701100000_scholarship_matching_foundation.sql`.
Matching reads it in `apps/web/src/app/api/scholarships/matches/route.ts` via
`supabase.from('scholarships').select('*').eq('active', true)`.

Key existing columns used by matching: `id`, `title`, `organization`,
`description`, `amount`, `deadline`, `application_url`, `state`, `country`,
`minimum_gpa`, `minimum_grade_level`, `maximum_grade_level`,
`financial_need_required`, `essay_required`, `recommendation_required`,
`volunteer_required`, `certification_tags`, `career_tags`, `major_tags`,
`skill_tags`, `active`.

Related tables (unchanged by this sprint):

- `public.scholarship_requirements` — structured per-scholarship requirements.
- `public.student_scholarship_matches` — student-profile-owned match tracking.
- `public.scholarship_application_tasks` — application task tracker.

### Additive provenance/lifecycle columns

`supabase/migrations/20260721110000_scholarship_ingestion_provenance.sql` adds
(all additive, non-destructive, `add column if not exists`):

| Column | Purpose |
| --- | --- |
| `source` | Adapter/source name (e.g. `fixture-dataset`, `legacy-scraped`). |
| `external_id` | Stable per-source id, or a deterministic fingerprint. |
| `source_url` | Where the record originated. |
| `import_fingerprint` | Deterministic hash used to detect content changes. |
| `raw_source_metadata` | `jsonb` bag of source-specific detail. |
| `first_imported_at` / `last_imported_at` / `last_verified_at` | Provenance timestamps. |
| `amount_min` / `amount_max` / `amount_display` | Richer award value than the single `amount`. |
| `graduation_years` | `int[]` eligibility. |
| `transcript_required` | Boolean requirement flag. |
| `lifecycle_status` | `active` \| `inactive` \| `expired` \| `archived`. |

A **partial unique index** `scholarships_source_external_id_key` on
`(source, external_id) where source is not null and external_id is not null`
gives imports an idempotent natural key while leaving legacy/manually-curated
rows (no source) untouched.

`lifecycle_status` is the richer lifecycle field; the importer keeps the boolean
`active` column consistent with it so the matching engine's `active = true`
filter keeps working unchanged. `active` remains the field matching reads.

---

## 2. Matching engine connection

The pipeline writes rows into `public.scholarships`. Matching then reads
`active = true` rows and scores them against a student profile. No code in the
matching path was changed. The importer maps the canonical import contract onto
the exact column names matching already consumes (title, amount, deadline,
tags, requirement booleans, state, gpa, grade levels).

---

## 3. Architecture

```
scripts/scholarships/import-scholarships.ts     # CLI entrypoint (tsx)
  └─ scripts/scholarships/supabase-service-role.ts  # server-only service-role client + .env loader

apps/web/src/lib/scholarships/ingestion/
  types.ts            # ScholarshipImportRecord, adapter/repository ports, result type
  normalize.ts        # pure: amounts, deadlines, URLs, fingerprints, row mapping
  validate.ts         # pure: required-field + sanity validation → issues
  deduplicate.ts      # pure: collapse (source, external_id) duplicates in a batch
  ingest.ts           # orchestrator: fetch → normalize → validate → dedup → diff → persist
  repository.ts       # InMemory + Supabase ScholarshipRepository implementations
  sources/
    source-adapter.ts       # adapter contract + normalizeAll helper
    fixture-source.ts       # manually-supplied/approved dataset adapter (default)
    legacy-scraped-source.ts# bridges existing scraped_scholarships rows into canonical
```

The orchestrator depends on a `ScholarshipRepository` **port**, not on Supabase
directly. That keeps the core pure and makes dry-run first-class (writes are
skipped while all counts are still computed).

---

## 4. Source adapter design

Add a new source by implementing:

```ts
export interface ScholarshipSourceAdapter {
  sourceName: string
  fetchRecords(options?: { limit?: number; updatedSince?: string }): Promise<unknown[]>
  normalizeRecord(record: unknown): ScholarshipImportRecord | null
}
```

`fetchRecords` retrieves raw records from the source. `normalizeRecord` maps one
raw record into the canonical `ScholarshipImportRecord`, returning `null` to
skip a record. A record that throws during normalization is skipped, not fatal.

### Sources implemented

| Source (`sourceName`) | Kind | Notes |
| --- | --- | --- |
| `fixture-dataset` | Manually-supplied approved dataset | `scripts/scholarships/fixtures/sample-scholarships.json`. Real, publicly-listed programs with their own application URLs. Default source; also used by tests. |
| `legacy-scraped` | Data already in the app | Reads the existing `scraped_scholarships` table (populated by the pre-existing scraper) and bridges it into the canonical table so it can reach matching. No external calls. |

### Source permission / usage notes

The pipeline only ingests sources that are legally and technically appropriate:
documented APIs, public/structured feeds, pages that permit automated access,
manually-supplied datasets, and sources already used by the app. It must **not**
bypass authentication, CAPTCHAs, or anti-bot protection; scrape private,
paywalled, or unnecessary copyrighted content; or use student PII. Use
reasonable rate limits and always record source attribution.

> Note: the pre-existing `apps/web/src/lib/scrapers/scholarship-scraper.ts` uses
> a third-party proxy with `premium_proxy` / `render_js` to fetch aggregator
> sites. That approach is **not** source-compliant and is intentionally **not**
> used as an ingestion source here. It is left untouched; only its already-stored
> output (`scraped_scholarships`) is optionally bridged, and should be reviewed
> for source terms before being treated as live.

---

## 5. Normalization rules

- **Amounts**: parsed from numbers or currency strings; negatives/junk → `null`.
  `amount = amountMax ?? amountMin` feeds the matching engine's value math.
- **Deadlines**: normalized to `YYYY-MM-DD`; ISO and `Month DD, YYYY` accepted;
  unknown/invalid → `null` (never a crash).
- **URLs**: only valid `http(s)` URLs are kept; otherwise `null` (→ rejected).
- **Grade levels**: textual/numeric levels mapped to `minimum_grade_level` /
  `maximum_grade_level` (9–12). Non high-school levels leave the range open.
- **Tags**: trimmed, de-duplicated case-insensitively, empties dropped.
- **State/country**: first eligibility entry populates `state` / `country`
  (default `US`).

## 6. Deduplication rules

- **Natural key**: `source + external_id`.
- Sources without a stable id get a **deterministic fingerprint** id derived from
  `source + title + organization + deadline + application_url`, so re-imports
  converge to "unchanged".
- Within a batch, duplicate `(source, external_id)` rows are collapsed (last
  wins) and counted as `rejected`.
- Across runs, the natural key + `import_fingerprint` decide insert vs update vs
  unchanged. The importer is **idempotent**: running the same import twice
  creates no duplicates.

## 7. Deadline & lifecycle behavior

`lifecycle_status` ∈ `active` | `inactive` | `expired` | `archived`.

- **Active**: known/unknown-but-open deadline.
- **Unknown deadline**: `deadline = null` → never auto-expired.
- **Expired**: known deadline strictly before today → `active = false`,
  `lifecycle_status = 'expired'`.
- **Recurring annual**: re-import with a new deadline updates the same record
  (same natural key) rather than duplicating it.
- **No longer found at source**: with `--deactivate-missing` on a full import,
  active rows absent from the batch are deactivated (`inactive`).
- **Source temporarily unavailable**: a fetch failure is reported and **no**
  rows are written or deactivated.

Records are never hard-deleted. Historical `student_scholarship_matches` and
`scholarship_application_tasks` are preserved.

## 8. Provenance

Every imported row retains `source`, `source_url`, `external_id`,
`first_imported_at`, `last_imported_at`, `last_verified_at`, and
`raw_source_metadata`, so students and parents can see where a scholarship came
from.

---

## 9. Environment variables

| Variable | Where | Purpose |
| --- | --- | --- |
| `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`) | server-side script | Supabase project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | **server-side only** | Service-role key for writes. **Never** expose to web/mobile clients or commit it. |

The service-role key bypasses RLS and is read only inside
`scripts/scholarships/supabase-service-role.ts` at run time. Dry-run works
**without** any Supabase config (it uses an in-memory store).

## 10. Commands

```bash
# Dry-run: fetch, normalize, validate, and show proposed inserts/updates.
# Makes NO database changes. Works offline (in-memory store).
npm run scholarships:ingest -- --dry-run

# Live import (requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).
npm run scholarships:ingest

# Options
npm run scholarships:ingest -- --source=fixture --limit=50 --dry-run
npm run scholarships:ingest -- --source=legacy --deactivate-missing
```

Flags: `--dry-run`, `--source=fixture|legacy`, `--limit=<n>`,
`--deactivate-missing` (retire active rows absent from a **full** import only).

## 11. Scheduling recommendation

Run the importer as a **server-side scheduled job** (e.g. a protected Vercel
Cron route or a CI/scheduled task) daily or weekly, in this order:

1. `--source=fixture` (or your live approved source) for inserts/updates.
2. Periodically `--deactivate-missing` on full imports to retire vanished rows.

If exposing a trigger route, protect it with a server-side secret (as the
existing `CRON_SECRET`-guarded route does) — **never** expose a public ingestion
endpoint, and never ship the service-role key to a client.

## 12. Testing

Pure/core logic is covered by Vitest (no external calls; fixtures only):

```bash
npm --workspace apps/web run test   # includes ingestion tests
```

Covered: valid normalization, invalid-record rejection, deterministic
fingerprints, duplicate detection, idempotent upserts, deadline expiry, missing
optional fields, source-failure handling, and dry-run behavior.

## 13. Known gaps

- No live third-party API adapter is configured yet (no approved live source was
  present). The framework + fixture/legacy adapters demonstrate the full path;
  add a compliant API/feed adapter when one is approved.
- `legacy-scraped` bridges pre-existing scraped data; review each origin site's
  terms before treating that data as authoritative/live.
- `student_scholarship_matches` are recomputed lazily on the matches route; a
  post-import match refresh job is a possible future enhancement.

## 14. How to add another source

1. Create `apps/web/src/lib/scholarships/ingestion/sources/<name>-source.ts`
   implementing `ScholarshipSourceAdapter`.
2. Map raw records into `ScholarshipImportRecord` in `normalizeRecord` (reuse
   helpers from `normalize.ts`). Provide `source`, `sourceUrl`, `applicationUrl`,
   `title`, `organization`, `active`, `lastVerifiedAt`; add a stable `externalId`
   if the source has one, else leave it empty and the pipeline will fingerprint.
3. Register it in `scripts/scholarships/import-scholarships.ts` (`buildAdapter`).
4. Add a fixture + tests; run `npm run scholarships:ingest -- --source=<name> --dry-run`.
5. Confirm the source is permitted and rate-limit responsibly.
