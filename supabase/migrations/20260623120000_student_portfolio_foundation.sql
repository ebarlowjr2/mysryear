-- Student Portfolio Foundation (additive)
-- Student-profile-owned activities, service hours, achievements, and certifications.

create extension if not exists pgcrypto;

-- 1) Activities & leadership
create table if not exists public.student_activities (
  id uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references public.student_profiles(id) on delete cascade,
  created_by_user_id uuid references auth.users(id) on delete set null,
  title text not null,
  category text,
  description text,
  organization text,
  role text,
  start_date date,
  end_date date,
  uploaded_file_id uuid references public.uploaded_files(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists student_activities_student_idx
on public.student_activities(student_profile_id, created_at desc);

alter table public.student_activities enable row level security;

-- 2) Volunteer / service hours
create table if not exists public.student_service_hours (
  id uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references public.student_profiles(id) on delete cascade,
  created_by_user_id uuid references auth.users(id) on delete set null,
  title text not null,
  category text,
  description text,
  organization text,
  service_date date,
  hours numeric not null default 0,
  supervisor_contact text,
  uploaded_file_id uuid references public.uploaded_files(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists student_service_hours_student_idx
on public.student_service_hours(student_profile_id, created_at desc);

alter table public.student_service_hours enable row level security;

-- 3) Awards & achievements
create table if not exists public.student_achievements (
  id uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references public.student_profiles(id) on delete cascade,
  created_by_user_id uuid references auth.users(id) on delete set null,
  title text not null,
  category text,
  description text,
  organization text,
  earned_date date,
  uploaded_file_id uuid references public.uploaded_files(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists student_achievements_student_idx
on public.student_achievements(student_profile_id, created_at desc);

alter table public.student_achievements enable row level security;

-- 4) Certifications
create table if not exists public.student_certifications (
  id uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references public.student_profiles(id) on delete cascade,
  created_by_user_id uuid references auth.users(id) on delete set null,
  name text not null,
  category text,
  description text,
  provider text,
  status text not null default 'planned' check (status in ('planned','in_progress','completed')),
  earned_date date,
  expiration_date date,
  credential_id text,
  uploaded_file_id uuid references public.uploaded_files(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists student_certifications_student_idx
on public.student_certifications(student_profile_id, created_at desc);

alter table public.student_certifications enable row level security;

-- Shared RLS policy installer for portfolio tables.
do $$
declare
  tbl text;
begin
  foreach tbl in array array['student_activities','student_service_hours','student_achievements','student_certifications']
  loop
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = tbl and policyname = tbl || '_select_member'
    ) then
      execute format(
        'create policy %I on public.%I for select using (public.is_student_profile_member(student_profile_id))',
        tbl || '_select_member', tbl
      );
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = tbl and policyname = tbl || '_insert_write_member'
    ) then
      execute format(
        'create policy %I on public.%I for insert with check (public.is_student_profile_write_member(student_profile_id) and created_by_user_id = auth.uid())',
        tbl || '_insert_write_member', tbl
      );
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = tbl and policyname = tbl || '_update_write_member'
    ) then
      execute format(
        'create policy %I on public.%I for update using (public.is_student_profile_write_member(student_profile_id)) with check (public.is_student_profile_write_member(student_profile_id))',
        tbl || '_update_write_member', tbl
      );
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = tbl and policyname = tbl || '_delete_write_member'
    ) then
      execute format(
        'create policy %I on public.%I for delete using (public.is_student_profile_write_member(student_profile_id))',
        tbl || '_delete_write_member', tbl
      );
    end if;
  end loop;
end $$;

-- Keep updated_at fresh.
drop trigger if exists set_student_activities_updated_at on public.student_activities;
create trigger set_student_activities_updated_at
before update on public.student_activities
for each row execute function public.set_updated_at();

drop trigger if exists set_student_service_hours_updated_at on public.student_service_hours;
create trigger set_student_service_hours_updated_at
before update on public.student_service_hours
for each row execute function public.set_updated_at();

drop trigger if exists set_student_achievements_updated_at on public.student_achievements;
create trigger set_student_achievements_updated_at
before update on public.student_achievements
for each row execute function public.set_updated_at();

drop trigger if exists set_student_certifications_updated_at on public.student_certifications;
create trigger set_student_certifications_updated_at
before update on public.student_certifications
for each row execute function public.set_updated_at();
