-- Sprint 2: profiles + onboarding baseline (additive)
-- Goal: make the repo migrations represent the schema the web app expects.
-- This migration is safe to run multiple times.

-- Ensure gen_random_uuid exists (usually available via pgcrypto on Supabase).
create extension if not exists pgcrypto;

-- 1) Core profiles table (source of truth for role + onboarding + student profile basics)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,

  -- Auth + onboarding
  role text,
  onboarding_complete boolean default false,

  -- Planner "profile" fields (migrated away from legacy `user_profiles`)
  state text,
  path text,
  testing text,
  early_action boolean default false,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Ensure expected columns exist even if table was created elsewhere.
alter table public.profiles
  add column if not exists role text,
  add column if not exists onboarding_complete boolean default false,
  add column if not exists state text,
  add column if not exists path text,
  add column if not exists testing text,
  add column if not exists early_action boolean default false,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

-- 2) Keep updated_at fresh.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- 3) Auto-create a profiles row on new auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- 4) RLS policies: users can read/update/insert their own profile row.
alter table public.profiles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_select_own'
  ) then
    create policy profiles_select_own
    on public.profiles for select
    using (id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_update_own'
  ) then
    create policy profiles_update_own
    on public.profiles for update
    using (id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_insert_own'
  ) then
    create policy profiles_insert_own
    on public.profiles for insert
    with check (id = auth.uid());
  end if;
end $$;

