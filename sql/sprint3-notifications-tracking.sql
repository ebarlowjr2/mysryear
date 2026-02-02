-- Sprint 3: Notifications Inbox + Saved/Tracked + Preferences
-- Run this SQL in Supabase SQL Editor

-- 1.1 Notifications table
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'notifications_select_own' AND tablename = 'notifications'
  ) THEN
    CREATE POLICY notifications_select_own ON public.notifications FOR SELECT USING (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'notifications_update_own' AND tablename = 'notifications'
  ) THEN
    CREATE POLICY notifications_update_own ON public.notifications FOR UPDATE USING (user_id = auth.uid());
  END IF;
END $$;

create index if not exists notifications_user_created_idx
on public.notifications(user_id, created_at desc);

-- 1.2 Tracked opportunities
create table if not exists public.user_tracked_opportunities (
  user_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, opportunity_id)
);

alter table public.user_tracked_opportunities enable row level security;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'track_opps_select_own' AND tablename = 'user_tracked_opportunities'
  ) THEN
    CREATE POLICY track_opps_select_own ON public.user_tracked_opportunities FOR SELECT USING (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'track_opps_insert_own' AND tablename = 'user_tracked_opportunities'
  ) THEN
    CREATE POLICY track_opps_insert_own ON public.user_tracked_opportunities FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'track_opps_delete_own' AND tablename = 'user_tracked_opportunities'
  ) THEN
    CREATE POLICY track_opps_delete_own ON public.user_tracked_opportunities FOR DELETE USING (user_id = auth.uid());
  END IF;
END $$;

-- 1.3 Tracked jobs
create table if not exists public.user_tracked_jobs (
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.job_posts(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, job_id)
);

alter table public.user_tracked_jobs enable row level security;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'track_jobs_select_own' AND tablename = 'user_tracked_jobs'
  ) THEN
    CREATE POLICY track_jobs_select_own ON public.user_tracked_jobs FOR SELECT USING (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'track_jobs_insert_own' AND tablename = 'user_tracked_jobs'
  ) THEN
    CREATE POLICY track_jobs_insert_own ON public.user_tracked_jobs FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'track_jobs_delete_own' AND tablename = 'user_tracked_jobs'
  ) THEN
    CREATE POLICY track_jobs_delete_own ON public.user_tracked_jobs FOR DELETE USING (user_id = auth.uid());
  END IF;
END $$;

-- 1.4 Notification prefs on profiles (if missing)
alter table public.profiles
add column if not exists notify_link_requests boolean default true,
add column if not exists notify_deadlines boolean default true,
add column if not exists notify_parent_updates boolean default true,
add column if not exists deadline_lead_days int default 3;
