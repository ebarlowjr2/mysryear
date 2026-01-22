-- Push Notifications SQL Migration
-- Run this in Supabase SQL Editor before testing push notifications

-- Step 2: Create device_tokens table for storing Expo push tokens
create table if not exists public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expo_push_token text not null,
  platform text,
  device_name text,
  created_at timestamptz default now(),
  last_seen_at timestamptz default now(),
  unique(user_id, expo_push_token)
);

alter table public.device_tokens enable row level security;

-- RLS policies for device_tokens
create policy "device_tokens_select_own" on public.device_tokens
for select using (user_id = auth.uid());

create policy "device_tokens_insert_own" on public.device_tokens
for insert with check (user_id = auth.uid());

create policy "device_tokens_update_own" on public.device_tokens
for update using (user_id = auth.uid());

create policy "device_tokens_delete_own" on public.device_tokens
for delete using (user_id = auth.uid());

-- Step 3: Add notification preferences to profiles table
alter table public.profiles
add column if not exists notify_link_requests boolean default true,
add column if not exists notify_deadlines boolean default true,
add column if not exists notify_parent_updates boolean default true,
add column if not exists deadline_lead_days int default 3;

-- Step 4: Create notifications inbox table for in-app notifications
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

-- RLS policies for notifications
create policy "notifications_select_own" on public.notifications
for select using (user_id = auth.uid());

create policy "notifications_update_own" on public.notifications
for update using (user_id = auth.uid());

-- Allow Edge Functions to insert notifications for any user (service role)
-- Note: Edge Functions use service role key which bypasses RLS

-- Create index for faster queries
create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_created_at on public.notifications(created_at desc);
create index if not exists idx_device_tokens_user_id on public.device_tokens(user_id);
