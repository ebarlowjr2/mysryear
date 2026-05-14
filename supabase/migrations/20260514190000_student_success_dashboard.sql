-- Student Success Dashboard MVP (additive)
-- Adds academic_records + student_success_tasks owned by student_profiles.

create extension if not exists pgcrypto;

-- Helper: member who can write (student/parent/guardian/admin). Counselors are read/support only.
create or replace function public.is_student_profile_write_member(p_student_profile_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.student_profiles sp
    where sp.id = p_student_profile_id
      and (sp.student_user_id = auth.uid() or sp.created_by_user_id = auth.uid())
  )
  or exists (
    select 1
    from public.family_relationships fr
    where fr.student_profile_id = p_student_profile_id
      and fr.user_id = auth.uid()
      and fr.role in ('student','parent','guardian','admin')
  );
$$;

-- 1) Academic records (links an uploaded file to academic metadata)
create table if not exists public.academic_records (
  id uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references public.student_profiles(id) on delete cascade,
  uploaded_file_id uuid not null references public.uploaded_files(id) on delete cascade,
  uploaded_by_user_id uuid references auth.users(id) on delete set null,
  document_type text not null,
  school_year text,
  grading_period text,
  grade_level text,
  gpa numeric,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists academic_records_student_created_idx
on public.academic_records(student_profile_id, created_at desc);

alter table public.academic_records enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='academic_records' and policyname='academic_records_select_member'
  ) then
    create policy academic_records_select_member
    on public.academic_records for select
    using (public.is_student_profile_member(academic_records.student_profile_id));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='academic_records' and policyname='academic_records_insert_write_member'
  ) then
    create policy academic_records_insert_write_member
    on public.academic_records for insert
    with check (
      public.is_student_profile_write_member(academic_records.student_profile_id)
      and uploaded_by_user_id = auth.uid()
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='academic_records' and policyname='academic_records_update_write_member'
  ) then
    create policy academic_records_update_write_member
    on public.academic_records for update
    using (public.is_student_profile_write_member(academic_records.student_profile_id))
    with check (public.is_student_profile_write_member(academic_records.student_profile_id));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='academic_records' and policyname='academic_records_delete_write_member'
  ) then
    create policy academic_records_delete_write_member
    on public.academic_records for delete
    using (public.is_student_profile_write_member(academic_records.student_profile_id));
  end if;
end $$;

-- Keep updated_at fresh
drop trigger if exists set_academic_records_updated_at on public.academic_records;
create trigger set_academic_records_updated_at
before update on public.academic_records
for each row execute function public.set_updated_at();

-- 2) Student success tasks (grade-level checklist)
create table if not exists public.student_success_tasks (
  id uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references public.student_profiles(id) on delete cascade,
  title text not null,
  description text,
  grade_level text,
  school_year text,
  category text,
  status text not null default 'not_started' check (status in ('not_started','in_progress','done')),
  due_date date,
  upload_required boolean default false,
  uploaded_file_id uuid references public.uploaded_files(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists student_success_tasks_student_idx
on public.student_success_tasks(student_profile_id, created_at desc);

alter table public.student_success_tasks enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='student_success_tasks' and policyname='sst_select_member'
  ) then
    create policy sst_select_member
    on public.student_success_tasks for select
    using (public.is_student_profile_member(student_success_tasks.student_profile_id));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='student_success_tasks' and policyname='sst_insert_write_member'
  ) then
    create policy sst_insert_write_member
    on public.student_success_tasks for insert
    with check (public.is_student_profile_write_member(student_success_tasks.student_profile_id));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='student_success_tasks' and policyname='sst_update_write_member'
  ) then
    create policy sst_update_write_member
    on public.student_success_tasks for update
    using (public.is_student_profile_write_member(student_success_tasks.student_profile_id))
    with check (public.is_student_profile_write_member(student_success_tasks.student_profile_id));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='student_success_tasks' and policyname='sst_delete_write_member'
  ) then
    create policy sst_delete_write_member
    on public.student_success_tasks for delete
    using (public.is_student_profile_write_member(student_success_tasks.student_profile_id));
  end if;
end $$;

drop trigger if exists set_student_success_tasks_updated_at on public.student_success_tasks;
create trigger set_student_success_tasks_updated_at
before update on public.student_success_tasks
for each row execute function public.set_updated_at();

