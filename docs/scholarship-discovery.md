# Scholarship Discovery

How MySRYear builds a dependable, verified-open scholarship catalog, shows the
same discovery experience on web and Expo, and how to roll it out.

Related: `docs/scholarship-ingestion.md` (pipeline internals),
`docs/scholarship-freshness.md` (visibility guard history).

---

## 1. Diagnosis: why students saw no awards

Read-only production check, **2026-11-22** (Supabase project `mysrapp`,
SELECT only; no writes):

| Fact | Value |
| --- | --- |
| `public.scholarships` rows | 24 |
| `public.student_visible_scholarships` rows | **0** |
| `scraped_scholarships` last write | **2025-09-20 06:15 UTC** (121 rows, 20 active) |
| `scholarship_ingestion_runs` | 2 rows, both `partial`, 2026-08-03 23:24 and 23:35 UTC; none since |
| Legacy rows with deadline year 2001 | 8 (inactive/expired) |
| Legacy rows with no deadline | 11 (titles such as "Create your FREE student profile.", "Types of scholarships") |
| Hand-seeded rows | 5, never verified, deadlines 2024-10-31 … 2025-10-15 |
| Tracked statuses / tasks | 3 non-suggested matches, 12 tasks (counts only) |

### What actually failed (with evidence)

1. **The legacy scraper has produced nothing since 2025-09-20.**
   `scraped_scholarships.max(scraped_at) = 2025-09-20`. `ScholarshipScraper.scrapeAll`
   returns `[]` when `SCRAPINGBEE_API_KEY` is missing and swallows every
   per-site error into an empty list, so the cron answers
   `{ success: true, count: 0 }` and writes nothing — a silent success. When it
   did run, it rendered nine aggregator sites through a premium proxy with
   2–5 s random delays plus a 3 s render wait each (~60–90 s serially) on a
   route with no `maxDuration`, and wrote with the **anon** key: production RLS
   has INSERT but no UPDATE policy on `scraped_scholarships`, so "deactivate
   old rows" silently updated 0 rows.
2. **The scheduled refresh has not run since 2026-08-03.** Both recorded runs
   started at 23:24 / 23:35 UTC (the cron is `0 7 * * *`), i.e. they were
   manual calls with the cron secret, labeled `scheduled` by the route's
   default. No run row exists for any 07:00 slot. The cron routes live in
   `apps/web`, and `README.md` / `docs/HANDOFF_CHECKLIST.md` instruct setting the
   Vercel **Root Directory to `apps/web`** — but `vercel.json` (the only cron
   registration) was at the repository root, which Vercel does not read for a
   project rooted at `apps/web`. That is consistent with zero scheduled runs.
   *Not verified directly:* this session has no Vercel access, so the deployed
   Root Directory, the Cron Jobs tab and execution logs, and whether
   `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` and
   `SCRAPINGBEE_API_KEY` are set must be confirmed in the Vercel dashboard (see
   §7, step 1).
3. **The bridge corrupted what little data existed.**
   - The scraper stored `"September 30"` (year stripped by `parseDeadline`);
     `normalizeDeadline` passed it to `new Date()`, which resolves a yearless
     date to **2001** in V8 → the 8 rows dated 2001, immediately "expired".
   - `LegacyScrapedSourceAdapter` stamped `lastVerifiedAt: new Date()` every
     time it re-read the same cached rows, and the refresh "re-verified"
     unchanged rows. The 11 junk rows looked freshly verified until the runs
     stopped; their 30-day window lapsed on 2026-09-02 → **0 visible**.
   - The August 3 first run also hit `deadline NOT NULL` (fixed by the
     2026-08-03 hotfix migration, hence the second run).
4. **Clients compounded it.** Both readers (`/api/scholarships/matches` and
   `apps/mobile/src/data/scholarships.ts`) coerced grade 12 → 9 and capped the
   view at 100 rows *before* ranking. The native entry of `@mysryear/shared`
   (`mobile.ts`, used because Metro has package exports disabled) did not
   export any scholarship function, so native matching called `undefined`.
   `GET /api/scholarships` returned six `example.com` awards (and only those on
   any error) to `/open-dashboard/scholarships`.

---

## 2. Sources

Both sources are fetched **once into the shared catalog for all users**. No
request to a third party contains any student data; reverification is a plain
GET of the public sponsor page.

| Source (`scholarships.source`) | What it is | Permission / attribution | Coverage today | Refresh |
| --- | --- | --- | --- | --- |
| `mysryear-sponsor-verified` | Original factual entries MySRYear wrote from each sponsor/administrator page (`apps/web/src/lib/scholarships/ingestion/data/sponsor-verified.json`). Each record stores the page checked, the check date and short evidence quotes. | Facts (dates, amounts, criteria) with MySRYear-written summaries; direct links to the official page. | 5 awards: Burger King Scholars, GE-Reagan, Amazon Future Engineer, Penguin Random House Creative Writing, Central AlabamaWorks (AL). | Edit the JSON each cycle after rechecking the sponsor page; daily cron rechecks pages and refreshes only on fresh evidence. |
| `open-scholarships` | [Open Scholarships](https://github.com/Grudged/open-scholarships) directory — feed `https://scholarships.grudged.io/scholarships.json` (override: `OPEN_SCHOLARSHIPS_FEED_URL`), plus MySRYear sponsor-level checks (`data/open-scholarships-sponsor-checks.json`). | **CC BY 4.0** — "Open Scholarships by Grudged LLC — https://github.com/Grudged/open-scholarships (CC BY 4.0). Fields mapped by MySRYear." stored on every row (`attribution`) and shown on detail pages. Snapshot of upstream commit `956be5c` committed for offline/local import. | 112 listings (106 national, 6 Nevada). Annual listings without a current-cycle date are stored **unconfirmed (hidden)**. Sponsor-checked: APIA Scholars (open), Nevada Women's Fund (open; sponsor date Jan 3 overrides directory's Jan 5), NSA (opens Jan 15), MPOWER (closed early — funding cap), AWS (conflicting dates → review), Bryan Cameron (sponsor site blocked automated check), AFE (duplicate of source 1). | Daily cron pulls the feed; add a sponsor check entry to publish a listing. |
| `legacy-scraped` (retired) | Old aggregator scrape rows | Aggregator listings; scraping their compiled lists is not an approved source | 0 new rows since 2025-09-20 | Not scheduled. Can still be imported manually, always as unverified/hidden. |

Sponsor pages checked on 2026-11-22 (all reachable except Cameron, HTTP 403):

- Burger King — https://scholarshipamerica.org/scholarship/burgerking/ — closes Dec 15, 2026 11:59 PM CT; only the first 30,000 community applications reviewed.
- GE-Reagan — https://www.reaganfoundation.org/education/ge-reagan-foundation-scholarship — opened Oct 12, 2026; closes Jan 7, 2027 3:00 PM ET; apply at https://apply.mykaleidoscope.com/program/GEReagan2027Scholarship
- Amazon Future Engineer — https://scholarshipamerica.org/scholarship/amazonfutureengineer/ (and https://www.amazonfutureengineer.com/scholarships) — opened Nov 3, 2026; closes Jan 5, 2027 3:00 PM CT.
- Penguin Random House — https://scholarshipamerica.org/scholarship/penguinrandomhouse/ — closes Jan 15, 2027 3:00 PM CT or at 1,000 applications.
- Central AlabamaWorks — https://cacfinfo.org/scholarships/central-alabamaworks-scholarship/ — opens Dec 1, closes Mar 1 (year not printed; read as the 2026–27 cycle, reverify Dec 1).
- APIA — https://apiascholars.org/scholarship/ · NWF — https://www.nevadawomensfund.org/scholarships · NSA — https://nsacct.org/nsaf-scholarships/ · MPOWER — https://www.mpowerfinancing.com/scholarships/global-citizen · AWS — https://www.aws.org/foundation/page/scholarships

Paid data partnerships can be proposed separately; the first release works
with the two sources above.

---

## 3. Pipeline rules (what changed)

- **Dates keep their year and time zone.** A non-ISO date without a 4-digit
  year is `unknown`, never guessed. Sponsor local time + IANA zone
  (`deadline_timezone`) → exact UTC `deadline_at` (DST-aware). Opening dates
  (`opens_at`), early-closure conditions (`early_closure_note`) and actual early
  closures (`closed_at`, `closure_reason`) are stored.
- **Verification = evidence.** `last_verified_at` is the time the source was
  checked, never the import time. Re-reading an unchanged record does not move
  it; a newer evidence date or a sponsor-page recheck that still prints the
  closing date does (`ingestion/reverify.ts`). A page that says applications
  closed → `needs_review` (hidden); 404/410 → `broken`; anything else → no change.
- **Missing ≠ rolling.** `rolling` requires a sponsor-confirmed rolling award;
  a missing date is `unknown` and never shown.
- **Demo data is rejected** (`example.com` etc.).
- **Provider isolation.** Each provider runs separately; a failure is logged
  for that source only and cannot deactivate other providers' rows. Ingestion
  never writes `student_scholarship_matches` or `scholarship_application_tasks`.
- **Archive sweep** covers every source (including unsourced seeds) using the
  exact sponsor instant.
- **Run log** gets one row per provider per run with fetched / created /
  updated / unchanged / revalidated / archived / rejected / failed /
  **visible** counts and reverify details.

### Student-visible rule (`student_visible_scholarships`)

Active, not archived, not closed, not demo, `verification_status = 'verified'`,
has an application URL, and either a future sponsor deadline verified within
180 days or a sponsor-confirmed rolling award verified within 30 days. Rows
whose `opens_at` is in the future stay visible as "Opens …". The same rule runs
again in TypeScript (`scholarshipAvailability`) on both platforms.

Tracked awards stay readable after they close via policy
`scholarships_select_tracked_by_member`; a trigger keeps any tracked status
from being downgraded to `suggested` by an older client's bulk upsert.

---

## 4. One cross-platform contract

`packages/shared/src/scholarship-discovery.ts` (pure) and
`scholarship-discovery-data.ts` (loader) are used by the web API route, the
web browser (instant search/paging on the same input) and the Expo app:

- whole catalog read in 1,000-row chunks (no 100-row cap), deduped across sources;
- availability, deadline labels (explicit US time-zone rules, no `Intl`), search,
  location/field/deadline/level filters, deterministic ordering, pagination;
- "For your A.U.R.A. career plans": saved LifePath career IDs in rank order →
  sponsor fields and related majors; every match states why it appears and
  which published conditions still need checking, with the disclaimer that a
  career match is not eligibility;
- grade from `grade_level` or graduation year, keeping 12th graders as 12;
- tracker for Saved / Applying / Submitted / Awarded / Not awarded with tasks,
  including closed awards; readiness worded as actions ("Add your GPA").

Empty states are distinct: catalog unavailable, no open awards, no search
results, no personalized matches / no career plans.

---

## 5. Proof (LOCAL environment)

Local stack: PostgreSQL 16 + PostgREST 12.2.3 behind a `/rest/v1` gateway, all
repository migrations applied, production-shaped seed of the same 24 rows
(public listing data only) and three synthetic students.

| LOCAL | before | after migration + first import |
| --- | --- | --- |
| canonical rows | 24 | 140 |
| student-visible | **0** | **8** (6 open now, 2 opening soon) |
| visible by source | — | sponsor-verified 5 · open-scholarships 3 |
| rows dated before 2005 | 8 | 0 |
| past-deadline still active | 5 | 0 |
| tracked statuses | saved 1 · submitted 1 | saved 1 · submitted 1 (unchanged) |

Runs: (1) live Open Scholarships feed unreachable from the sandbox → that
provider `failed`, sponsor-verified still imported 5 → 5 visible;
(2) snapshot feed → 111 created; (3) reimport → 0 created, 116 unchanged,
0 revalidated, archive sweep 5 → status `success`.

Regenerate with `npx tsx scripts/scholarships/catalog-report.ts --label=<env>`.

---

## 6. Commands

```bash
npm run scholarships:ingest -- --refresh --dry-run            # all providers, no writes
npm run scholarships:ingest -- --refresh                       # live feed (production/staging)
npm run scholarships:ingest -- --refresh --feed=snapshot       # committed snapshot (local)
npm run scholarships:ingest -- --refresh --reverify=20         # also recheck 20 sponsor pages
npx tsx scripts/scholarships/catalog-report.ts --label=staging # read-only counts
npx tsx scripts/scholarships/build-catalog-fixture.ts          # regenerate shared test fixture
```

---

## 7. Production rollout (after Eddie approves)

1. **Vercel (dashboard, no secrets shared):** confirm Project → Settings →
   General → Root Directory (`apps/web` expected). Confirm env vars exist by
   name for Production: `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`,
   `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`). `SCRAPINGBEE_API_KEY` is no
   longer needed. Optional: `SCHOLARSHIP_REVERIFY_LIMIT` (default 20).
   Must **not** be set: `SCHOLARSHIP_FIXED_NOW`, `OPEN_SCHOLARSHIPS_FEED=snapshot`.
2. **Database:** apply `supabase/migrations/20261122120000_scholarship_discovery_catalog.sql`
   (additive; repairs the 8 rows dated 2001 to `unknown`/`needs_review`).
   Immediately after, `student_visible_scholarships` is expected to stay at 0
   (no verified rows yet) — that is correct.
3. **Deploy** the merged commit. In Vercel → Settings → Cron Jobs, confirm
   `/api/cron/scholarship-refresh` at `17 7 * * *` is listed and
   `/api/cron/scrape-scholarships` is gone.
4. **First refresh** — Cron Jobs → *Run*, or from a trusted shell:
   `curl -H "Authorization: Bearer $CRON_SECRET" "https://<prod-host>/api/cron/scholarship-refresh?reverify=10"`.
   Expect `"status":"success"` and
   `visibleBySource ≈ { "mysryear-sponsor-verified": 5, "open-scholarships": 3 }`.
   If the live feed is unreachable, open-scholarships reports `failed` and
   sponsor-verified still shows 5 — investigate the feed, do not use the snapshot
   in production.
5. **Checks** (read-only SQL):
   ```sql
   select count(*) from public.student_visible_scholarships;                 -- expect 8
   select source, status, fetched_count, created_count, visible_count, started_at
     from public.scholarship_ingestion_runs order by started_at desc limit 4;
   select count(*) from public.scholarships where extract(year from deadline) < 2005; -- expect 0
   select status, count(*) from public.student_scholarship_matches group by 1; -- tracked counts unchanged
   ```
6. **As a student** (web and app): Scholarships shows "6 open now · 2 opening
   soon"; Burger King reads "Closes Dec 15, 2026, 11:59 PM CT"; a student with
   LifePath "Software Engineer" sees Amazon Future Engineer under *For your
   A.U.R.A. career plans*; previously saved awards still appear in the tracker.
7. **Next day:** confirm a run row exists at ~07:17 UTC with trigger
   `scheduled`. If not, the cron is still not registered — recheck step 1.
8. **Before Dec 1, 2026:** reverify Central AlabamaWorks when the window opens;
   before each cycle, recheck every sponsor-verified entry and update its
   `lastVerifiedAt`/evidence.
