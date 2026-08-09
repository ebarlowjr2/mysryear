-- Parent Connection + Grade-Aware Action Center
-- Safe additive migration only. Do not remove legacy mobile tables.

create extension if not exists pgcrypto;

-- 1) Managed/unclaimed student profile metadata.
alter table public.student_profiles
  add column if not exists managed_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists claim_status text not null default 'claimed',
  add column if not exists claimed_at timestamptz;

do $$
begin
  alter table public.student_profiles
    drop constraint if exists student_profiles_claim_status_check;

  alter table public.student_profiles
    add constraint student_profiles_claim_status_check
    check (claim_status in ('managed','claimed','claim_conflict'));
exception
  when undefined_table then null;
end $$;

create index if not exists student_profiles_managed_by_idx
on public.student_profiles(managed_by_user_id, created_at desc);

-- Backfill created parent-managed profiles without a student auth owner.
update public.student_profiles
set managed_by_user_id = coalesce(managed_by_user_id, created_by_user_id),
    claim_status = case when student_user_id is null then 'managed' else 'claimed' end,
    claimed_at = case when student_user_id is not null then coalesce(claimed_at, updated_at, created_at, now()) else claimed_at end
where managed_by_user_id is null
   or claim_status is null;

-- 2) Invite lifecycle: consistent statuses, expiration, revocation, and typed claim invites.
alter table public.student_profile_relationship_invites
  add column if not exists expires_at timestamptz,
  add column if not exists accepted_at timestamptz,
  add column if not exists declined_at timestamptz,
  add column if not exists revoked_at timestamptz,
  add column if not exists token_hash text;

do $$
begin
  alter table public.student_profile_relationship_invites
    drop constraint if exists student_profile_relationship_invites_status_check;

  alter table public.student_profile_relationship_invites
    add constraint student_profile_relationship_invites_status_check
    check (status in ('pending','accepted','declined','expired','revoked'));

  alter table public.student_profile_relationship_invites
    drop constraint if exists student_profile_relationship_invites_invite_type_check;

  alter table public.student_profile_relationship_invites
    add constraint student_profile_relationship_invites_invite_type_check
    check (invite_type in ('supporter_invite','access_request','student_claim'));
exception
  when undefined_table then null;
end $$;

create index if not exists spri_pending_email_idx
on public.student_profile_relationship_invites(lower(invited_email), status, expires_at)
where invited_email is not null;

create index if not exists spri_created_status_idx
on public.student_profile_relationship_invites(created_by_user_id, status, created_at desc);

-- 3) Parent action completion state: parent/guardian-owned, never student_success_tasks.
create table if not exists public.parent_action_completions (
  id uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references public.student_profiles(id) on delete cascade,
  parent_user_id uuid not null references auth.users(id) on delete cascade,
  action_key text not null,
  status text not null default 'completed',
  notes text,
  completed_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (student_profile_id, parent_user_id, action_key)
);

alter table public.parent_action_completions enable row level security;

do $$
begin
  alter table public.parent_action_completions
    drop constraint if exists parent_action_completions_status_check;

  alter table public.parent_action_completions
    add constraint parent_action_completions_status_check
    check (status in ('completed','dismissed'));
exception
  when undefined_table then null;
end $$;

create index if not exists parent_action_completions_student_idx
on public.parent_action_completions(student_profile_id, parent_user_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists parent_action_completions_touch_updated_at on public.parent_action_completions;
create trigger parent_action_completions_touch_updated_at
before update on public.parent_action_completions
for each row execute function public.touch_updated_at();

-- Parents/guardians can see and manage only their own parent action state for connected students.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'parent_action_completions'
      and policyname = 'parent_action_completions_select_own'
  ) then
    create policy parent_action_completions_select_own
    on public.parent_action_completions for select
    using (
      parent_user_id = auth.uid()
      and exists (
        select 1 from public.family_relationships fr
        where fr.student_profile_id = parent_action_completions.student_profile_id
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
      and tablename = 'parent_action_completions'
      and policyname = 'parent_action_completions_insert_own'
  ) then
    create policy parent_action_completions_insert_own
    on public.parent_action_completions for insert
    with check (
      parent_user_id = auth.uid()
      and exists (
        select 1 from public.family_relationships fr
        where fr.student_profile_id = parent_action_completions.student_profile_id
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
      and tablename = 'parent_action_completions'
      and policyname = 'parent_action_completions_update_own'
  ) then
    create policy parent_action_completions_update_own
    on public.parent_action_completions for update
    using (parent_user_id = auth.uid())
    with check (parent_user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'parent_action_completions'
      and policyname = 'parent_action_completions_delete_own'
  ) then
    create policy parent_action_completions_delete_own
    on public.parent_action_completions for delete
    using (parent_user_id = auth.uid());
  end if;
end $$;

-- 4) Narrow RPC: create a parent/guardian-managed student profile and relationship atomically.
create or replace function public.create_managed_student_profile(
  p_first_name text,
  p_last_name text,
  p_school_id uuid,
  p_graduation_year int,
  p_relationship_role text default 'parent'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_student_profile_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select role into v_role from public.profiles where id = auth.uid();
  if v_role not in ('parent','guardian') then
    raise exception 'Only parent or guardian accounts can create managed student profiles';
  end if;

  if p_relationship_role not in ('parent','guardian') then
    raise exception 'Invalid relationship role';
  end if;

  insert into public.student_profiles (
    student_user_id,
    created_by_user_id,
    managed_by_user_id,
    first_name,
    last_name,
    school_id,
    graduation_year,
    claim_status
  ) values (
    null,
    auth.uid(),
    auth.uid(),
    nullif(trim(coalesce(p_first_name, '')), ''),
    nullif(trim(coalesce(p_last_name, '')), ''),
    p_school_id,
    p_graduation_year,
    'managed'
  )
  returning id into v_student_profile_id;

  insert into public.family_relationships (student_profile_id, user_id, role)
  values (v_student_profile_id, auth.uid(), p_relationship_role)
  on conflict (student_profile_id, user_id) do nothing;

  update public.profiles
  set active_student_profile_id = v_student_profile_id,
      updated_at = now()
  where id = auth.uid();

  return v_student_profile_id;
end;
$$;

grant execute on function public.create_managed_student_profile(text,text,uuid,int,text) to authenticated;

-- 5) Narrow RPC: create a student-claim invite for a managed profile.
create or replace function public.create_student_claim_invite(
  p_student_profile_id uuid,
  p_invited_email text,
  p_expires_days int default 14
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_invite_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  v_email := lower(nullif(trim(coalesce(p_invited_email, '')), ''));
  if v_email is null or position('@' in v_email) = 0 then
    raise exception 'A valid student email is required';
  end if;

  if not exists (
    select 1 from public.family_relationships fr
    where fr.student_profile_id = p_student_profile_id
      and fr.user_id = auth.uid()
      and fr.role in ('parent','guardian','admin')
  ) then
    raise exception 'Not authorized to invite this student';
  end if;

  update public.student_profile_relationship_invites
  set status = 'revoked', revoked_at = now(), updated_at = now()
  where student_profile_id = p_student_profile_id
    and relationship_role = 'student'
    and invite_type = 'student_claim'
    and status = 'pending'
    and created_by_user_id = auth.uid();

  insert into public.student_profile_relationship_invites (
    student_profile_id,
    invited_email,
    relationship_role,
    invite_type,
    status,
    token_hash,
    expires_at,
    created_by_user_id
  ) values (
    p_student_profile_id,
    v_email,
    'student',
    'student_claim',
    'pending',
    encode(digest(gen_random_uuid()::text || ':' || v_email || ':' || now()::text, 'sha256'), 'hex'),
    now() + make_interval(days => greatest(coalesce(p_expires_days, 14), 1)),
    auth.uid()
  )
  returning id into v_invite_id;

  return v_invite_id;
end;
$$;

grant execute on function public.create_student_claim_invite(uuid,text,int) to authenticated;

-- 6) Harden existing accept/approve RPCs with lifecycle and conflict checks.
create or replace function public.accept_student_claim_invite(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite record;
  v_email text;
  v_existing_profile uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  v_email := lower(coalesce((auth.jwt() ->> 'email'), ''));

  select * into v_invite
  from public.student_profile_relationship_invites
  where id = p_invite_id
    and status = 'pending'
    and relationship_role = 'student'
    and coalesce(invite_type, 'student_claim') in ('student_claim','supporter_invite')
    and revoked_at is null
    and (expires_at is null or expires_at > now())
    and (
      invited_user_id = auth.uid()
      or (invited_user_id is null and invited_email is not null and lower(invited_email) = v_email)
    );

  if not found then
    raise exception 'Invite not found, expired, revoked, or not eligible';
  end if;

  select id into v_existing_profile
  from public.student_profiles
  where student_user_id = auth.uid()
    and id <> v_invite.student_profile_id
  limit 1;

  if v_existing_profile is not null then
    update public.student_profiles
    set claim_status = 'claim_conflict', updated_at = now()
    where id = v_invite.student_profile_id;
    raise exception 'Student already has a profile; conflict resolution is required';
  end if;

  update public.student_profile_relationship_invites
  set status = 'accepted',
      invited_user_id = auth.uid(),
      accepted_at = now(),
      updated_at = now()
  where id = p_invite_id;

  update public.student_profiles
  set student_user_id = auth.uid(),
      claim_status = 'claimed',
      claimed_at = now(),
      updated_at = now()
  where id = v_invite.student_profile_id
    and student_user_id is null;

  insert into public.family_relationships (student_profile_id, user_id, role)
  values (v_invite.student_profile_id, auth.uid(), 'student')
  on conflict (student_profile_id, user_id) do nothing;

  update public.profiles
  set active_student_profile_id = v_invite.student_profile_id,
      onboarding_complete = true,
      updated_at = now()
  where id = auth.uid();
end;
$$;

grant execute on function public.accept_student_claim_invite(uuid) to authenticated;

create or replace function public.approve_access_request(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite record;
  v_email text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  v_email := lower(coalesce((auth.jwt() ->> 'email'), ''));

  select * into v_invite
  from public.student_profile_relationship_invites
  where id = p_invite_id
    and status = 'pending'
    and invite_type = 'access_request'
    and relationship_role in ('parent','guardian')
    and revoked_at is null
    and (expires_at is null or expires_at > now())
    and (
      invited_user_id = auth.uid()
      or (invited_user_id is null and invited_email is not null and lower(invited_email) = v_email)
    );

  if not found then
    raise exception 'Invite not found, expired, revoked, or not eligible';
  end if;

  update public.student_profile_relationship_invites
  set status = 'accepted',
      invited_user_id = auth.uid(),
      accepted_at = now(),
      updated_at = now()
  where id = p_invite_id;

  insert into public.family_relationships (student_profile_id, user_id, role)
  values (v_invite.student_profile_id, v_invite.created_by_user_id, v_invite.relationship_role)
  on conflict (student_profile_id, user_id) do nothing;
end;
$$;

grant execute on function public.approve_access_request(uuid) to authenticated;
