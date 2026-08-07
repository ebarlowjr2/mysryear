-- Scholarship consistency hotfix
-- Additive, non-destructive. Captures, in a repo migration:
--   (1) two column nullability changes that production required so ingestion can
--       insert records with no fixed deadline (without this, a database rebuilt
--       from migrations would regress to NOT NULL and break ingestion again);
--   (2) a `reactivated_count` column on the ingestion-run log so runs classify
--       records clearly (created / updated / reactivated / skipped-deduplicated /
--       archived / failed).
--
-- Why `deadline` must be nullable:
--   The freshness model classifies deadlines as 'fixed', 'rolling', or
--   'unknown' (see 20260727120000_scholarship_freshness_verification.sql).
--     * fixed   -> a concrete date is stored in `deadline` / `deadline_at`.
--     * rolling -> the scholarship accepts applications continuously; there is
--                  no end date, so `deadline` is NULL and visibility is gated on
--                  recent verification (30-day window) instead.
--     * unknown -> the source did not provide a parseable deadline; `deadline`
--                  is NULL and the record is only shown while recently verified.
--   A NOT NULL `deadline` makes rolling/unknown records impossible to store.
--
-- Why `link` must be nullable:
--   `link` is a legacy column (predating the canonical `application_url` /
--   `source_url` fields). The ingestion pipeline writes the canonical URLs and
--   also mirrors a provider URL into `link` for backward compatibility, but a
--   usable URL is not always present, so the column must allow NULL.
--
-- Safety:
--   * Guarded so it is a no-op where the columns are already nullable.
--   * Guarded so it is a no-op where a column does not exist (e.g. a fresh
--     database built purely from migrations has no legacy `link` column).
--   * Only relaxes NOT NULL; it does not drop/rename columns, touch data, RLS
--     policies, grants, views, matches, or applications.

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'scholarships'
      and column_name = 'deadline'
      and is_nullable = 'NO'
  ) then
    alter table public.scholarships alter column deadline drop not null;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'scholarships'
      and column_name = 'link'
      and is_nullable = 'NO'
  ) then
    alter table public.scholarships alter column link drop not null;
  end if;
end $$;

-- Run-log: track reactivated records separately from updates. Additive; the
-- runs table was introduced in 20260727120000. Safe if the column already exists.
alter table public.scholarship_ingestion_runs
  add column if not exists reactivated_count int not null default 0;
