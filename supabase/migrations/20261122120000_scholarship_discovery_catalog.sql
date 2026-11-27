-- Scholarship Discovery: dependable, verified-open catalog
-- Additive and non-destructive (no drops, no deletes of student data).
--
-- Why this exists (production evidence, read-only check 2026-11-22):
--   * public.scholarships held 24 rows; public.student_visible_scholarships held 0.
--   * 8 legacy rows carried a deadline in 2001: the legacy scraper stored
--     "September 30" with no year and `new Date('September 30')` resolved to 2001.
--   * 11 legacy rows had no deadline and were shown only because the legacy
--     adapter stamped "verified now" every time it re-read cached rows; their
--     30-day window lapsed after the last run on 2026-08-03.
--   * 5 hand-seeded rows were never verified and carried 2024/2025 deadlines.
--
-- This migration:
--   1. Adds availability facts we must preserve from sponsors: application
--      window (opens_at), sponsor time zone, early-closure note/state, audience,
--      field tags, attribution, and a demo flag.
--   2. Redefines the student-visible view so ONLY sponsor-verified, currently
--      published awards appear (fixed future deadline verified within the
--      cycle, or a sponsor-confirmed rolling award verified in the last 30
--      days). "Unknown" deadlines, demo/example rows, early-closed awards and
--      unverified rows never appear. Upcoming windows (opens_at in the future)
--      stay visible so clients can label them "Opens <date>".
--   3. Lets a student profile member read scholarships they already track even
--      after the award closes, so the tracker keeps closed awards and their
--      status instead of silently dropping them.
--   4. Guards tracked statuses: an update that would move a tracked award back
--      to 'suggested' (e.g. an older client's bulk "suggested" upsert racing a
--      save on another device) keeps the tracked status.
--   5. Repairs the 2001 rows to an honest "unknown, needs review" state.
--   6. Extends the run log with per-source revalidated/visible counts.

-- 1) Availability facts ------------------------------------------------------
alter table public.scholarships add column if not exists opens_at timestamptz;
alter table public.scholarships add column if not exists deadline_timezone text;
alter table public.scholarships add column if not exists early_closure_note text;
alter table public.scholarships add column if not exists closed_at timestamptz;
alter table public.scholarships add column if not exists closure_reason text;
alter table public.scholarships add column if not exists eligibility_summary text;
alter table public.scholarships add column if not exists audience_levels text[];
alter table public.scholarships add column if not exists field_tags text[];
alter table public.scholarships add column if not exists award_scope text;
alter table public.scholarships add column if not exists attribution text;
alter table public.scholarships add column if not exists availability_evidence jsonb;
alter table public.scholarships add column if not exists is_demo boolean not null default false;

-- Any row pointing at a placeholder domain is demo data, never a real award.
update public.scholarships
set is_demo = true
where is_demo = false
  and (
    coalesce(application_url, '') ~* '://([a-z0-9-]+\.)*example\.(com|org|net)(/|$)'
    or coalesce(source_url, '') ~* '://([a-z0-9-]+\.)*example\.(com|org|net)(/|$)'
  );

create index if not exists scholarships_visible_lookup_idx
  on public.scholarships(verification_status, deadline_type, deadline_at)
  where active = true and archived_at is null and closed_at is null;

-- 5) Repair legacy rows whose year was stripped by the old parser ------------
update public.scholarships
set deadline = null,
    deadline_at = null,
    deadline_type = 'unknown',
    verification_status = 'needs_review',
    raw_source_metadata = coalesce(raw_source_metadata, '{}'::jsonb)
      || jsonb_build_object('repair', 'deadline year missing at source; 2001 placeholder removed 2026-11-22')
where source = 'legacy-scraped'
  and deadline is not null
  and extract(year from deadline) < 2005;

-- 2) Verified-open student view ----------------------------------------------
create or replace view public.student_visible_scholarships
with (security_invoker = true) as
select s.*
from public.scholarships s
where s.active = true
  and coalesce(s.lifecycle_status, 'active') = 'active'
  and s.archived_at is null
  and s.closed_at is null
  and coalesce(s.is_demo, false) = false
  and s.verification_status = 'verified'
  and s.last_verified_at is not null
  and coalesce(s.application_url, '') <> ''
  and (
    -- A. Sponsor-published fixed deadline still in the future, confirmed within
    --    this application cycle (not a year-old listing).
    (
      coalesce(s.deadline_type, 'fixed') = 'fixed'
      and coalesce(s.deadline_at, (s.deadline + 1)::timestamptz) > now()
      and s.last_verified_at > now() - interval '180 days'
    )
    or
    -- B. Sponsor-confirmed rolling award, re-confirmed recently. A missing date
    --    ('unknown') is NOT rolling and never appears.
    (
      s.deadline_type = 'rolling'
      and s.last_verified_at > now() - interval '30 days'
    )
  );

comment on view public.student_visible_scholarships is
  'Verified-open student catalog: sponsor-verified awards with a future published deadline (verified within 180 days) or sponsor-confirmed rolling awards (verified within 30 days). Excludes unknown deadlines, demo rows, early-closed, expired, archived, broken and stale records. Rows with a future opens_at are upcoming windows.';

grant select on public.student_visible_scholarships to anon, authenticated, service_role;

-- 3) Tracked awards stay readable after they close ----------------------------
drop policy if exists scholarships_select_tracked_by_member on public.scholarships;
create policy scholarships_select_tracked_by_member
on public.scholarships for select
using (
  exists (
    select 1
    from public.student_scholarship_matches m
    where m.scholarship_id = scholarships.id
      and m.status <> 'suggested'
      and public.is_student_profile_member(m.student_profile_id)
  )
);

-- 4) Never silently downgrade a tracked status to 'suggested' ----------------
create or replace function public.preserve_tracked_scholarship_status()
returns trigger
language plpgsql
as $$
begin
  if old.status is not null
     and old.status <> 'suggested'
     and new.status = 'suggested' then
    new.status := old.status;
  end if;
  return new;
end;
$$;

drop trigger if exists preserve_tracked_scholarship_status on public.student_scholarship_matches;
create trigger preserve_tracked_scholarship_status
before update on public.student_scholarship_matches
for each row execute function public.preserve_tracked_scholarship_status();

-- 6) Run log: meaningful per-source counts ------------------------------------
alter table public.scholarship_ingestion_runs add column if not exists revalidated_count int not null default 0;
alter table public.scholarship_ingestion_runs add column if not exists visible_count int;
alter table public.scholarship_ingestion_runs add column if not exists details jsonb;
