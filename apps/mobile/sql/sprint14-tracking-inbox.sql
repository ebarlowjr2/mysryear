-- Sprint 14: Notifications Expansion + Inbox + Tracked Items
-- Run this in Supabase SQL Editor

-- Part 1: Add index for notifications inbox (table already exists from push-notifications.sql)
create index if not exists notifications_user_created_idx
on public.notifications(user_id, created_at desc);

-- Part 3.1: Create user_tracked_opportunities table
create table if not exists public.user_tracked_opportunities (
  user_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, opportunity_id)
);

alter table public.user_tracked_opportunities enable row level security;

create policy "track_opps_select_own"
on public.user_tracked_opportunities for select
using (user_id = auth.uid());

create policy "track_opps_insert_own"
on public.user_tracked_opportunities for insert
with check (user_id = auth.uid());

create policy "track_opps_delete_own"
on public.user_tracked_opportunities for delete
using (user_id = auth.uid());

-- Part 3.2: Create user_tracked_jobs table
create table if not exists public.user_tracked_jobs (
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.job_posts(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, job_id)
);

alter table public.user_tracked_jobs enable row level security;

create policy "track_jobs_select_own"
on public.user_tracked_jobs for select
using (user_id = auth.uid());

create policy "track_jobs_insert_own"
on public.user_tracked_jobs for insert
with check (user_id = auth.uid());

create policy "track_jobs_delete_own"
on public.user_tracked_jobs for delete
using (user_id = auth.uid());

-- Create indexes for faster queries
create index if not exists idx_tracked_opps_user_id on public.user_tracked_opportunities(user_id);
create index if not exists idx_tracked_jobs_user_id on public.user_tracked_jobs(user_id);
