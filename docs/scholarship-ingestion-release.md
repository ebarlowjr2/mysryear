# Scholarship Ingestion — Production Release Runbook

Controlled, production-first release procedure for the scholarship ingestion
pipeline. We run against a **single hosted Supabase project** (no separate
staging DB), using **Supabase daily backups** as the recovery checkpoint.

> **Guardrails**
> - Only the designated integration owner runs production SQL or write-enabled imports.
> - Every DB change is additive, backward-compatible, and non-destructive.
> - **Do not** run a write-enabled import without explicit approval (see the
>   approval checkpoints below).
> - Vercel preview deployments may still connect to **production** Supabase —
>   a preview is **not** an isolated database.
> - Supabase Storage objects (report cards, resumes, certifications) are **not**
>   covered by this pipeline and must not be bulk-modified.

---

## 0. Pre-flight — confirm the production backup

Before any migration or import:

1. Open Supabase → **Database → Backups**.
2. Confirm the **latest daily backup completed successfully** and note its
   timestamp. This is the recovery checkpoint for this release.
3. Do not proceed if the most recent backup failed or is stale.

---

## 1. Migration

- **File:** `supabase/migrations/20260721110000_scholarship_ingestion_provenance.sql`
- **Application status:** ✅ **Applied to production** via the Supabase SQL Editor
  (additive columns + one-time `lifecycle_status` backfill + `CHECK` constraint +
  three partial indexes). Re-runnable — every statement uses `if not exists` /
  safe defaults.
- **Scope:** augments `public.scholarships` only. No RLS, RPC, storage, drops,
  renames, or destructive type changes. Deployed app code reads
  `select * ... where active = true` and ignores the new columns, so old and new
  code coexist safely.

See `docs/scholarship-ingestion.md` for the full schema/field reference.

### 1a. Post-migration verification queries (read-only)

```sql
-- Row count unchanged vs. pre-migration snapshot
select count(*) from public.scholarships;

-- Backfill complete — expect 0
select count(*) from public.scholarships where lifecycle_status is null;

-- New columns present — expect 11 rows
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'scholarships'
  and column_name in ('source','external_id','source_url','import_fingerprint',
                      'lifecycle_status','amount_min','amount_max','graduation_years',
                      'transcript_required','last_verified_at','raw_source_metadata');

-- New indexes present — expect 3 rows
select indexname from pg_indexes
where tablename = 'scholarships'
  and indexname in ('scholarships_source_external_id_key',
                    'scholarships_import_fingerprint_idx',
                    'scholarships_source_idx');
```

**Verified in production:** row count unchanged, `lifecycle_status IS NULL` → `0`,
all three indexes present (`scholarships_source_external_id_key`,
`scholarships_import_fingerprint_idx`, `scholarships_source_idx`).

---

## 2. Required server-side environment variables

Needed **only** for a live (write-enabled) import. Server-side only — never
expose to web/mobile clients, never commit, and do not change existing
production env vars without approval.

| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`) | Supabase project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key (bypasses RLS). Server-side only. |

The dry-run needs **no** configuration (it uses an in-memory store).

---

## 3. Dry-run (no writes)

```bash
npm run scholarships:ingest -- --dry-run
```

Fetches, normalizes, validates, deduplicates, and reports **proposed** changes.
Makes **no** database changes. Review proposed inserts / updates / expirations /
rejects here before anything touches production.

### Expected dry-run output (current fixture dataset)

```
Scholarship ingestion — source="fixture-dataset" mode=DRY-RUN (in-memory store)

  fetched:    6
  normalized: 6
  inserted:   6 (proposed)
  updated:    0 (proposed)
  unchanged:  0
  rejected:   0
  expired:    1        # the past-deadline "Closed Cycle Validation Record" fixture
  errors:     0
```

All six fixture records are prefixed `TEST Scholarship — …`, so any rows a canary
creates in production are unmistakable.

---

## ✅ APPROVAL CHECKPOINT #1 — before ANY production write

Do not proceed past this line without the integration owner's **explicit**
written approval to run a write-enabled import against production, confirming:

- [ ] Latest daily backup confirmed (Section 0).
- [ ] Migration verified in production (Section 1a).
- [ ] Dry-run output reviewed and matches expectations (Section 3).
- [ ] `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` set in a **server-side** shell
      (not a preview/client env).

---

## 4. Three-record canary (write-enabled — approval required)

```bash
npm run scholarships:ingest -- --limit=3
```

Imports only the first 3 fixture records (all future-dated, so `expired: 0`).
Expected: `inserted: 3`, `updated: 0`, `unchanged: 0`, `rejected: 0`, `errors: 0`.

### 4a. Verify the canary in Supabase (read-only)

```sql
-- Expect exactly the 3 canary rows, all clearly marked and attributed
select id, title, source, external_id, lifecycle_status, active, last_imported_at
from public.scholarships
where source = 'fixture-dataset'
order by last_imported_at desc;
```

Confirm: `source = 'fixture-dataset'`, `external_id` populated, `active = true`,
`lifecycle_status = 'active'`, and every `title` begins with `TEST Scholarship —`.

### 4b. Verify in the application

- Open the scholarships/matching view with a **production test account**
  (e.g. `TEST Student`) and confirm the `TEST Scholarship —` records appear and
  render correctly. Use only clearly-marked test accounts for this check.

### 4c. Second-run idempotency check (write-enabled — same approval)

```bash
npm run scholarships:ingest -- --limit=3
```

Expected on the **second** run: `inserted: 0`, `updated: 0`, `unchanged: 3`.
Then re-run the Section 4a query and confirm the row count is **still 3** (no
duplicates). This proves the `(source, external_id)` upsert key is working.

### 4d. Matching-engine sanity check

The ingestion pipeline does not change matching logic; confirm matching still
behaves against the newly-ingested rows:

- With a `TEST Student` account, load the matches endpoint/page and confirm the
  `TEST Scholarship —` records are scored and returned (they read from
  `public.scholarships where active = true`).
- Spot-check that `student_scholarship_matches` / `scholarship_application_tasks`
  for existing real students are **unchanged** (ingestion never writes those
  tables):

```sql
select count(*) from public.student_scholarship_matches;   -- compare to pre-canary
select count(*) from public.scholarship_application_tasks;  -- compare to pre-canary
```

---

## ✅ APPROVAL CHECKPOINT #2 — before scaling beyond the canary

Only after the canary + idempotency + matching checks pass, and with the
integration owner's explicit approval, increase volume gradually (raise
`--limit`, then a full `npm run scholarships:ingest`). Monitor Supabase and
Vercel logs between increments.

---

## 5. Cleanup — removing `TEST Scholarship` records

Because every canary title begins with `TEST Scholarship —`, cleanup is precise.
**Prefer soft-deactivation over deletion** (matches our non-destructive policy
and preserves any historical matches/applications):

```sql
-- Preferred: soft-retire canary records (keeps history, hides from matching)
update public.scholarships
set active = false, lifecycle_status = 'archived'
where source = 'fixture-dataset'
  and title like 'TEST Scholarship —%';
```

Hard deletion should only be done by the integration owner, after confirming no
student has saved/applied to a canary record, and after a fresh backup:

```sql
-- Destructive — owner only, post-backup, after dependency check
-- Check dependencies first:
select ssm.scholarship_id, count(*)
from public.student_scholarship_matches ssm
join public.scholarships s on s.id = ssm.scholarship_id
where s.source = 'fixture-dataset' and s.title like 'TEST Scholarship —%'
group by ssm.scholarship_id;

-- Only if the above returns nothing you need to preserve:
delete from public.scholarships
where source = 'fixture-dataset'
  and title like 'TEST Scholarship —%';
```

---

## 6. Rollback / disable strategy

- **Migration:** safe to leave applied — it changes no existing behavior. To
  "disable," simply don't run the importer; the new columns sit null/unused.
  Indexes may be dropped safely (`drop index if exists ...`); per policy, the
  added **columns are not dropped** except in a later, separately-reviewed
  release. The daily backup is a clean recovery point.
- **Import:** to undo a canary, use the soft-retire query in Section 5. Because
  imports are idempotent and rows are attributable by `source` + the
  `TEST Scholarship —` prefix, a canary is fully reversible without touching any
  real data.
- **Storage:** not involved in this pipeline; do not modify Storage objects as
  part of any rollback here.

---

## 7. Coexistence summary

Old (currently deployed) and new code run safely at the same time: deployed code
reads `scholarships` via `select *` filtered on `active = true` and never
references the new columns; inserts by existing code omit them (nullable /
defaulted). The importer is the only writer of the new columns and runs
server-side only.
