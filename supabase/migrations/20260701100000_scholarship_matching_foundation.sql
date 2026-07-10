-- Scholarship Matching Foundation
-- Additive canonical scholarship schema and student-profile-owned match tracking.

create table if not exists public.scholarships (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  organization text,
  description text,
  amount numeric,
  renewable boolean default false,
  application_url text,
  deadline date,
  award_type text,
  state text,
  country text default 'US',
  minimum_gpa numeric,
  minimum_grade_level int,
  maximum_grade_level int,
  citizenship_requirement text,
  financial_need_required boolean default false,
  essay_required boolean default false,
  recommendation_required boolean default false,
  volunteer_required boolean default false,
  certification_tags text[],
  career_tags text[],
  major_tags text[],
  skill_tags text[],
  demographic_tags text[],
  opportunity_source text,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Compatibility for legacy scholarships table.
alter table public.scholarships add column if not exists id uuid default gen_random_uuid();
update public.scholarships set id = gen_random_uuid() where id is null;
alter table public.scholarships alter column id set default gen_random_uuid();
alter table public.scholarships alter column id set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.scholarships'::regclass
      and conname = 'scholarships_id_key'
  ) then
    alter table public.scholarships add constraint scholarships_id_key unique (id);
  end if;
end $$;

alter table public.scholarships add column if not exists organization text;
alter table public.scholarships add column if not exists description text;
alter table public.scholarships add column if not exists amount numeric;
alter table public.scholarships add column if not exists renewable boolean default false;
alter table public.scholarships add column if not exists application_url text;
alter table public.scholarships add column if not exists deadline date;
alter table public.scholarships add column if not exists award_type text;
alter table public.scholarships add column if not exists state text;
alter table public.scholarships add column if not exists country text default 'US';
alter table public.scholarships add column if not exists minimum_gpa numeric;
alter table public.scholarships add column if not exists minimum_grade_level int;
alter table public.scholarships add column if not exists maximum_grade_level int;
alter table public.scholarships add column if not exists citizenship_requirement text;
alter table public.scholarships add column if not exists financial_need_required boolean default false;
alter table public.scholarships add column if not exists essay_required boolean default false;
alter table public.scholarships add column if not exists recommendation_required boolean default false;
alter table public.scholarships add column if not exists volunteer_required boolean default false;
alter table public.scholarships add column if not exists certification_tags text[];
alter table public.scholarships add column if not exists career_tags text[];
alter table public.scholarships add column if not exists major_tags text[];
alter table public.scholarships add column if not exists skill_tags text[];
alter table public.scholarships add column if not exists demographic_tags text[];
alter table public.scholarships add column if not exists opportunity_source text;
alter table public.scholarships add column if not exists active boolean default true;
alter table public.scholarships add column if not exists created_at timestamptz default now();
alter table public.scholarships add column if not exists updated_at timestamptz default now();

-- Legacy link/title/deadline support.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'scholarships' and column_name = 'link'
  ) then
    update public.scholarships
    set application_url = coalesce(application_url, link)
    where application_url is null;
  end if;
end $$;

update public.scholarships
set organization = coalesce(organization, opportunity_source, 'Scholarship Provider'),
    description = coalesce(description, title),
    active = coalesce(active, true),
    country = coalesce(country, 'US')
where organization is null or description is null or active is null or country is null;

create table if not exists public.scholarship_requirements (
  id uuid primary key default gen_random_uuid(),
  scholarship_id uuid not null references public.scholarships(id) on delete cascade,
  requirement_type text not null,
  requirement_key text,
  requirement_label text not null,
  required_value text,
  numeric_value numeric,
  required boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists scholarship_requirements_scholarship_idx
on public.scholarship_requirements(scholarship_id, requirement_type);

create table if not exists public.student_scholarship_matches (
  id uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references public.student_profiles(id) on delete cascade,
  scholarship_id uuid not null references public.scholarships(id) on delete cascade,
  match_score int not null default 0,
  match_reason text[] default '{}',
  missing_requirements text[] default '{}',
  readiness_percentage int not null default 0,
  status text default 'suggested' check (status in ('suggested', 'saved', 'applying', 'submitted', 'awarded', 'rejected')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (student_profile_id, scholarship_id)
);

create index if not exists student_scholarship_matches_student_idx
on public.student_scholarship_matches(student_profile_id, status, match_score desc);

create index if not exists student_scholarship_matches_scholarship_idx
on public.student_scholarship_matches(scholarship_id);

create index if not exists scholarships_active_deadline_idx
on public.scholarships(active, deadline)
where active = true;

create index if not exists scholarships_active_state_idx
on public.scholarships(active, state)
where active = true;

alter table public.scholarships enable row level security;
alter table public.scholarship_requirements enable row level security;
alter table public.student_scholarship_matches enable row level security;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_scholarships_updated_at on public.scholarships;
create trigger set_scholarships_updated_at
before update on public.scholarships
for each row execute function public.set_updated_at();

drop trigger if exists set_scholarship_requirements_updated_at on public.scholarship_requirements;
create trigger set_scholarship_requirements_updated_at
before update on public.scholarship_requirements
for each row execute function public.set_updated_at();

drop trigger if exists set_student_scholarship_matches_updated_at on public.student_scholarship_matches;
create trigger set_student_scholarship_matches_updated_at
before update on public.student_scholarship_matches
for each row execute function public.set_updated_at();

-- Read active scholarships and requirements. Admin/moderation write paths come later.
drop policy if exists scholarships_select_active on public.scholarships;
create policy scholarships_select_active
on public.scholarships for select
using (active = true);

drop policy if exists scholarship_requirements_select_active_scholarship on public.scholarship_requirements;
create policy scholarship_requirements_select_active_scholarship
on public.scholarship_requirements for select
using (
  exists (
    select 1 from public.scholarships s
    where s.id = scholarship_requirements.scholarship_id
      and s.active = true
  )
);

drop policy if exists student_scholarship_matches_select_member on public.student_scholarship_matches;
create policy student_scholarship_matches_select_member
on public.student_scholarship_matches for select
using (public.is_student_profile_member(student_profile_id));

drop policy if exists student_scholarship_matches_insert_write_member on public.student_scholarship_matches;
create policy student_scholarship_matches_insert_write_member
on public.student_scholarship_matches for insert
with check (public.is_student_profile_write_member(student_profile_id));

drop policy if exists student_scholarship_matches_update_write_member on public.student_scholarship_matches;
create policy student_scholarship_matches_update_write_member
on public.student_scholarship_matches for update
using (public.is_student_profile_write_member(student_profile_id))
with check (public.is_student_profile_write_member(student_profile_id));

drop policy if exists student_scholarship_matches_delete_write_member on public.student_scholarship_matches;
create policy student_scholarship_matches_delete_write_member
on public.student_scholarship_matches for delete
using (public.is_student_profile_write_member(student_profile_id));
