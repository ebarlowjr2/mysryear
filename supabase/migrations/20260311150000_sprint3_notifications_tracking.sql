-- Sprint 3: notifications + tracking + profile notification prefs
-- Safe, additive migration only

-- 1) Notifications inbox
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  deep_link text,
  read_at timestamptz,
  created_at timestamptz default now()
);

alter table public.notifications enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'notifications'
      and policyname = 'notifications_select_own'
  ) then
    create policy notifications_select_own
    on public.notifications for select
    using (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'notifications'
      and policyname = 'notifications_update_own'
  ) then
    create policy notifications_update_own
    on public.notifications for update
    using (user_id = auth.uid());
  end if;
end $$;

create index if not exists notifications_user_created_idx
on public.notifications(user_id, created_at desc);

-- 2) Tracked opportunities
create table if not exists public.user_tracked_opportunities (
  user_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, opportunity_id)
);

alter table public.user_tracked_opportunities enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_tracked_opportunities'
      and policyname = 'track_opps_select_own'
  ) then
    create policy track_opps_select_own
    on public.user_tracked_opportunities for select
    using (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_tracked_opportunities'
      and policyname = 'track_opps_insert_own'
  ) then
    create policy track_opps_insert_own
    on public.user_tracked_opportunities for insert
    with check (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_tracked_opportunities'
      and policyname = 'track_opps_delete_own'
  ) then
    create policy track_opps_delete_own
    on public.user_tracked_opportunities for delete
    using (user_id = auth.uid());
  end if;
end $$;

-- 3) Tracked jobs
create table if not exists public.user_tracked_jobs (
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.job_posts(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, job_id)
);

alter table public.user_tracked_jobs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_tracked_jobs'
      and policyname = 'track_jobs_select_own'
  ) then
    create policy track_jobs_select_own
    on public.user_tracked_jobs for select
    using (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_tracked_jobs'
      and policyname = 'track_jobs_insert_own'
  ) then
    create policy track_jobs_insert_own
    on public.user_tracked_jobs for insert
    with check (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_tracked_jobs'
      and policyname = 'track_jobs_delete_own'
  ) then
    create policy track_jobs_delete_own
    on public.user_tracked_jobs for delete
    using (user_id = auth.uid());
  end if;
end $$;

-- 4) Notification preferences on profiles
alter table public.profiles
add column if not exists notify_link_requests boolean default true,
add column if not exists notify_deadlines boolean default true,
add column if not exists notify_parent_updates boolean default true,
add column if not exists deadline_lead_days int default 3;
