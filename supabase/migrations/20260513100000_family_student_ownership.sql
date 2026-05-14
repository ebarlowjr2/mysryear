-- Family + student ownership foundation for LifePath (additive)
-- Supports:
-- - Student-led onboarding (student invites parent)
-- - Parent-led onboarding (parent creates student profile; student claims later)
--
-- Core entities:
-- - student_profiles
-- - family_relationships
-- - student_career_interests
-- - lifepath_tasks
-- - uploaded_files linked to student_profiles

create extension if not exists pgcrypto;

-- 1) Student profiles
create table if not exists public.student_profiles (
  id uuid primary key default gen_random_uuid(),

  -- If/when the student has an auth account, link it here.
  student_user_id uuid unique references auth.users(id) on delete set null,

  created_by_user_id uuid references auth.users(id) on delete set null,

  first_name text,
  last_name text,
  grade_level int,
  graduation_year int,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.student_profiles enable row level security;

-- 2) Family relationships (links auth users to a student profile)
create table if not exists public.family_relationships (
  id uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references public.student_profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('student','parent','guardian','admin')),
  created_at timestamptz default now(),
  unique (student_profile_id, user_id)
);

alter table public.family_relationships enable row level security;

-- Student profile policies (defined after family_relationships exists)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'student_profiles'
      and policyname = 'student_profiles_select_member'
  ) then
    create policy student_profiles_select_member
    on public.student_profiles for select
    using (
      student_user_id = auth.uid()
      or exists (
        select 1
        from public.family_relationships fr
        where fr.student_profile_id = student_profiles.id
          and fr.user_id = auth.uid()
      )
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'student_profiles'
      and policyname = 'student_profiles_insert_authenticated'
  ) then
    create policy student_profiles_insert_authenticated
    on public.student_profiles for insert
    with check (auth.uid() is not null);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'student_profiles'
      and policyname = 'student_profiles_update_member'
  ) then
    create policy student_profiles_update_member
    on public.student_profiles for update
    using (
      student_user_id = auth.uid()
      or exists (
        select 1
        from public.family_relationships fr
        where fr.student_profile_id = student_profiles.id
          and fr.user_id = auth.uid()
          and fr.role in ('parent','guardian','admin')
      )
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'family_relationships'
      and policyname = 'family_relationships_select_member'
  ) then
    create policy family_relationships_select_member
    on public.family_relationships for select
    using (
      -- Always allow a user to see their own relationship rows.
      user_id = auth.uid()
      -- Allow the student (student_user_id) and the profile creator (created_by_user_id)
      -- to list all relationships for that student profile.
      or exists (
        select 1
        from public.student_profiles sp
        where sp.id = family_relationships.student_profile_id
          and (sp.student_user_id = auth.uid() or sp.created_by_user_id = auth.uid())
      )
    );
  end if;
end $$;

-- User can add themselves to a profile they created (admin), or accept an invite later.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'family_relationships'
      and policyname = 'family_relationships_insert_self'
  ) then
    create policy family_relationships_insert_self
    on public.family_relationships for insert
    with check (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'family_relationships'
      and policyname = 'family_relationships_delete_admin'
  ) then
    create policy family_relationships_delete_admin
    on public.family_relationships for delete
    using (
      exists (
        select 1
        from public.family_relationships fr
        where fr.student_profile_id = family_relationships.student_profile_id
          and fr.user_id = auth.uid()
          and fr.role = 'admin'
      )
    );
  end if;
end $$;

-- 3) Student career interests (LifePath top picks)
create table if not exists public.student_career_interests (
  id uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references public.student_profiles(id) on delete cascade,
  career_id text not null,
  rank int,
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  unique (student_profile_id, career_id)
);

alter table public.student_career_interests enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'student_career_interests'
      and policyname = 'student_career_interests_select_member'
  ) then
    create policy student_career_interests_select_member
    on public.student_career_interests for select
    using (
      exists (
        select 1
        from public.family_relationships fr
        where fr.student_profile_id = student_career_interests.student_profile_id
          and fr.user_id = auth.uid()
      )
      or exists (
        select 1
        from public.student_profiles sp
        where sp.id = student_career_interests.student_profile_id
          and sp.student_user_id = auth.uid()
      )
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'student_career_interests'
      and policyname = 'student_career_interests_write_member'
  ) then
    create policy student_career_interests_write_member
    on public.student_career_interests for insert
    with check (
      exists (
        select 1
        from public.family_relationships fr
        where fr.student_profile_id = student_career_interests.student_profile_id
          and fr.user_id = auth.uid()
      )
      or exists (
        select 1
        from public.student_profiles sp
        where sp.id = student_career_interests.student_profile_id
          and sp.student_user_id = auth.uid()
      )
    );
  end if;
end $$;

-- 4) LifePath tasks/milestones (parent or student managed)
create table if not exists public.lifepath_tasks (
  id uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references public.student_profiles(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo','doing','done')),
  due_date date,
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

alter table public.lifepath_tasks enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'lifepath_tasks'
      and policyname = 'lifepath_tasks_select_member'
  ) then
    create policy lifepath_tasks_select_member
    on public.lifepath_tasks for select
    using (
      exists (
        select 1
        from public.family_relationships fr
        where fr.student_profile_id = lifepath_tasks.student_profile_id
          and fr.user_id = auth.uid()
      )
      or exists (
        select 1
        from public.student_profiles sp
        where sp.id = lifepath_tasks.student_profile_id
          and sp.student_user_id = auth.uid()
      )
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'lifepath_tasks'
      and policyname = 'lifepath_tasks_write_member'
  ) then
    create policy lifepath_tasks_write_member
    on public.lifepath_tasks for insert
    with check (
      exists (
        select 1
        from public.family_relationships fr
        where fr.student_profile_id = lifepath_tasks.student_profile_id
          and fr.user_id = auth.uid()
      )
      or exists (
        select 1
        from public.student_profiles sp
        where sp.id = lifepath_tasks.student_profile_id
          and sp.student_user_id = auth.uid()
      )
    );
  end if;
end $$;

-- 5) Uploaded files link to student profile (non-breaking: keep existing user_id for now)
alter table public.uploaded_files
  add column if not exists student_profile_id uuid references public.student_profiles(id) on delete cascade;
