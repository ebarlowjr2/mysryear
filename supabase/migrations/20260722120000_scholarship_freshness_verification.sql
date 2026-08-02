-- Scholarship Freshness & Verification Pass
-- Additive, non-destructive. Builds on the ingestion provenance migration
-- (20260721110000). Adds freshness/verification fields, an ingestion-run log,
-- and a security-invoker view that INDEPENDENTLY excludes expired/stale/broken
-- scholarships from the student feed — a second layer of protection that holds
-- even if an ingestion/refresh job fails.
--
-- Nothing here changes matching logic or removes data. Existing reads that use
-- `select * ... where active = true` keep working; feeds are pointed at the new
-- view via a minimal, compatible change in application code.

-- 1) Freshness / verification columns on the canonical table -----------------
alter table public.scholarships add column if not exists deadline_at timestamptz;
alter table public.scholarships add column if not exists deadline_type text;
alter table public.scholarships add column if not exists source_updated_at timestamptz;
alter table public.scholarships add column if not exists verification_status text;
alter table public.scholarships add column if not exists next_verification_at timestamptz;
alter table public.scholarships add column if not exists archived_at timestamptz;
alter table public.scholarships add column if not exists canonical_url text;
-- (last_verified_at already added by 20260721110000)

-- Backfill safe defaults for existing rows (fills only the new columns).
update public.scholarships
set deadline_type = case
      when deadline_type is not null then deadline_type
      when deadline is null then 'unknown'
      else 'fixed'
    end
where deadline_type is null;

update public.scholarships
set deadline_at = (deadline::timestamptz)
where deadline_at is null and deadline is not null;

update public.scholarships
set verification_status = coalesce(verification_status, 'unverified')
where verification_status is null;

update public.scholarships
set canonical_url = lower(trim(coalesce(application_url, '')))
where canonical_url is null and application_url is not null;

alter table public.scholarships alter column deadline_type set default 'fixed';
alter table public.scholarships alter column verification_status set default 'unverified';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'scholarships_deadline_type_check') then
    alter table public.scholarships add constraint scholarships_deadline_type_check
      check (deadline_type in ('fixed', 'rolling', 'unknown'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'scholarships_verification_status_check') then
    alter table public.scholarships add constraint scholarships_verification_status_check
      check (verification_status in ('verified', 'unverified', 'stale', 'broken', 'needs_review'));
  end if;
end $$;

create index if not exists scholarships_canonical_url_idx
  on public.scholarships(canonical_url) where canonical_url is not null;
create index if not exists scholarships_next_verification_idx
  on public.scholarships(next_verification_at) where next_verification_at is not null;
create index if not exists scholarships_deadline_at_idx
  on public.scholarships(deadline_at) where deadline_at is not null;

-- 2) Ingestion-run log --------------------------------------------------------
create table if not exists public.scholarship_ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  source text,
  trigger text not null default 'manual' check (trigger in ('scheduled', 'manual', 'dry_run')),
  dry_run boolean not null default false,
  status text not null default 'running' check (status in ('running', 'success', 'partial', 'failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  fetched_count int not null default 0,
  created_count int not null default 0,
  updated_count int not null default 0,
  unchanged_count int not null default 0,
  archived_count int not null default 0,
  duplicate_count int not null default 0,
  flagged_count int not null default 0,
  rejected_count int not null default 0,
  failed_count int not null default 0,
  errors jsonb,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists scholarship_ingestion_runs_started_idx
  on public.scholarship_ingestion_runs(started_at desc);

alter table public.scholarship_ingestion_runs enable row level security;

-- Only platform admins may read the run log from the client. All writes happen
-- server-side via the service role (which bypasses RLS); no insert/update policy
-- is granted to anon/authenticated on purpose.
drop policy if exists scholarship_ingestion_runs_select_admin on public.scholarship_ingestion_runs;
create policy scholarship_ingestion_runs_select_admin
on public.scholarship_ingestion_runs for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

-- 3) Student-visible view (INDEPENDENT display-layer guard) -------------------
-- security_invoker so the base table's RLS still applies. This view refuses to
-- surface expired, archived, broken, or stale-without-a-firm-future-deadline
-- records regardless of whether any ingestion/refresh job has run.
create or replace view public.student_visible_scholarships
with (security_invoker = true) as
select s.*
from public.scholarships s
where s.active = true
  and coalesce(s.lifecycle_status, 'active') = 'active'
  and s.archived_at is null
  and coalesce(s.verification_status, 'unverified') not in ('broken', 'stale')
  and (
    -- A. A concrete future deadline (date or timestamp) is always shown.
    --    (deadline date includes the whole final day.)
    coalesce(s.deadline_at, (s.deadline + 1)::timestamptz) > now()
    or
    -- B. No concrete deadline (rolling / unknown / missing): only show when
    --    recently verified, so unverified stale records never surface.
    (
      s.deadline_at is null
      and s.deadline is null
      and s.last_verified_at is not null
      and s.last_verified_at > (now() - interval '30 days')
    )
  );

comment on view public.student_visible_scholarships is
  'Freshness-guarded student feed: excludes expired/archived/broken/stale scholarships independently of ingestion. Rolling/unknown-deadline records appear only when verified within 30 days.';
