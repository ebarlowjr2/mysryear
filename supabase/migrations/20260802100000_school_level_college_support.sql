-- Signup polish: additive school-level + college support.
-- Safe migration. Existing Alabama high-school records default to high_school and active.

alter table public.schools
  add column if not exists school_level text not null default 'high_school',
  add column if not exists institution_identifier text,
  add column if not exists active boolean not null default true;

alter table public.schools
  drop constraint if exists schools_school_level_check;

alter table public.schools
  add constraint schools_school_level_check
  check (school_level in ('high_school', 'college'));

create index if not exists schools_level_active_name_idx
on public.schools(school_level, active, name);

create unique index if not exists schools_level_identifier_unique_idx
on public.schools(school_level, institution_identifier)
where institution_identifier is not null;
