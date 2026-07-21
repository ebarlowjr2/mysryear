-- Scholarship Ingestion Provenance & Lifecycle
-- Additive, non-destructive columns that let the ingestion pipeline supply
-- clean, deduplicated, attributable scholarship records to the EXISTING
-- scholarship matching engine (public.scholarships). This migration does not
-- change matching logic; it only augments the canonical table so imports can
-- be idempotent, attributable, and lifecycle-aware.
--
-- The matching engine continues to read public.scholarships where active = true.
-- The importer keeps the boolean `active` column consistent with the richer
-- `lifecycle_status` column so existing reads keep working unchanged.

-- Source provenance ---------------------------------------------------------
alter table public.scholarships add column if not exists source text;
alter table public.scholarships add column if not exists external_id text;
alter table public.scholarships add column if not exists source_url text;
alter table public.scholarships add column if not exists import_fingerprint text;
alter table public.scholarships add column if not exists raw_source_metadata jsonb;

-- Import lifecycle timestamps ----------------------------------------------
alter table public.scholarships add column if not exists first_imported_at timestamptz;
alter table public.scholarships add column if not exists last_imported_at timestamptz;
alter table public.scholarships add column if not exists last_verified_at timestamptz;

-- Richer amount + eligibility fields from the canonical import contract ------
alter table public.scholarships add column if not exists amount_min numeric;
alter table public.scholarships add column if not exists amount_max numeric;
alter table public.scholarships add column if not exists amount_display text;
alter table public.scholarships add column if not exists graduation_years int[];
alter table public.scholarships add column if not exists transcript_required boolean default false;

-- Lifecycle status. Kept in sync with the boolean `active` column by the
-- importer. `active` remains the field the matching engine filters on.
alter table public.scholarships add column if not exists lifecycle_status text;

update public.scholarships
set lifecycle_status = case
    when lifecycle_status is not null then lifecycle_status
    when active is false then 'inactive'
    else 'active'
  end
where lifecycle_status is null;

alter table public.scholarships alter column lifecycle_status set default 'active';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.scholarships'::regclass
      and conname = 'scholarships_lifecycle_status_check'
  ) then
    alter table public.scholarships
      add constraint scholarships_lifecycle_status_check
      check (lifecycle_status in ('active', 'inactive', 'expired', 'archived'));
  end if;
end $$;

-- Idempotent upsert key. A source that provides a stable external id gets a
-- natural key of (source, external_id). Records without a source/external id
-- (e.g. legacy or manually curated rows) are left untouched by this index.
create unique index if not exists scholarships_source_external_id_key
on public.scholarships(source, external_id)
where source is not null and external_id is not null;

-- Lookup by fingerprint for sources without a stable external id.
create index if not exists scholarships_import_fingerprint_idx
on public.scholarships(import_fingerprint)
where import_fingerprint is not null;

-- Helpful for lifecycle sweeps and provenance display.
create index if not exists scholarships_source_idx
on public.scholarships(source)
where source is not null;
