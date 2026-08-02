-- A.U.R.A Parent Simulation Experience
-- Safe additive migration. Does not modify official student LifePath ownership tables.

-- 1) Expand parent simulation records from a single baseline picker into named draft/completed scenarios.
alter table public.lifepath_simulations
  add column if not exists assumptions jsonb not null default '{}'::jsonb,
  add column if not exists results jsonb,
  add column if not exists completed_at timestamptz;

alter table public.lifepath_simulations
  drop constraint if exists lifepath_simulations_status_check;

alter table public.lifepath_simulations
  add constraint lifepath_simulations_status_check
  check (status in ('draft', 'completed', 'active', 'archived'));

create index if not exists lifepath_simulations_owner_updated_idx
on public.lifepath_simulations(created_by_user_id, updated_at desc);

create index if not exists lifepath_simulations_status_updated_idx
on public.lifepath_simulations(status, updated_at desc);

-- 2) Explicit read-only parent simulation recommendations shared to linked students.
create table if not exists public.lifepath_simulation_shares (
  id uuid primary key default gen_random_uuid(),
  simulation_id uuid not null references public.lifepath_simulations(id) on delete cascade,
  student_profile_id uuid not null references public.student_profiles(id) on delete cascade,
  shared_by_user_id uuid not null references auth.users(id) on delete cascade,
  message text,
  status text not null default 'active',
  acknowledged_at timestamptz,
  dismissed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint lifepath_simulation_shares_status_check check (status in ('active', 'acknowledged', 'dismissed', 'revoked')),
  unique(simulation_id, student_profile_id)
);

alter table public.lifepath_simulation_shares enable row level security;

create index if not exists lifepath_simulation_shares_student_status_idx
on public.lifepath_simulation_shares(student_profile_id, status, created_at desc);

create index if not exists lifepath_simulation_shares_owner_idx
on public.lifepath_simulation_shares(shared_by_user_id, created_at desc);

-- Helper functions avoid recursive RLS policy references and centralize relationship checks.
create or replace function public.is_parent_guardian_for_student_profile(p_student_profile_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.family_relationships fr
    where fr.student_profile_id = p_student_profile_id
      and fr.user_id = p_user_id
      and fr.role in ('parent', 'guardian')
  );
$$;

create or replace function public.is_student_owner_for_student_profile(p_student_profile_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.student_profiles sp
    where sp.id = p_student_profile_id
      and (sp.student_user_id = p_user_id or sp.created_by_user_id = p_user_id)
  )
  or exists (
    select 1
    from public.family_relationships fr
    where fr.student_profile_id = p_student_profile_id
      and fr.user_id = p_user_id
      and fr.role = 'student'
  );
$$;

-- Owner-only simulation management remains intact. Add read access for explicitly shared students.
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'lifepath_simulations' and policyname = 'lifepath_simulations_select_shared_student'
  ) then
    create policy lifepath_simulations_select_shared_student
    on public.lifepath_simulations for select
    using (
      exists (
        select 1
        from public.lifepath_simulation_shares share
        where share.simulation_id = lifepath_simulations.id
          and share.status in ('active', 'acknowledged', 'dismissed')
          and public.is_student_owner_for_student_profile(share.student_profile_id)
      )
    );
  end if;
end $$;

-- Shared students may read the simulation interest rows for visible recommendations.
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'lifepath_simulation_interests' and policyname = 'lifepath_simulation_interests_select_shared_student'
  ) then
    create policy lifepath_simulation_interests_select_shared_student
    on public.lifepath_simulation_interests for select
    using (
      exists (
        select 1
        from public.lifepath_simulation_shares share
        where share.simulation_id = lifepath_simulation_interests.simulation_id
          and share.status in ('active', 'acknowledged', 'dismissed')
          and public.is_student_owner_for_student_profile(share.student_profile_id)
      )
    );
  end if;
end $$;

-- Share visibility: parent/guardian owner or the linked student recipient.
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'lifepath_simulation_shares' and policyname = 'lifepath_simulation_shares_select_owner_or_student'
  ) then
    create policy lifepath_simulation_shares_select_owner_or_student
    on public.lifepath_simulation_shares for select
    using (
      shared_by_user_id = auth.uid()
      or public.is_student_owner_for_student_profile(student_profile_id)
    );
  end if;
end $$;

-- Sharing requires the parent/guardian to own the simulation and have a valid family relationship to the student.
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'lifepath_simulation_shares' and policyname = 'lifepath_simulation_shares_insert_linked_parent'
  ) then
    create policy lifepath_simulation_shares_insert_linked_parent
    on public.lifepath_simulation_shares for insert
    with check (
      shared_by_user_id = auth.uid()
      and status = 'active'
      and public.is_parent_guardian_for_student_profile(student_profile_id)
      and exists (
        select 1
        from public.lifepath_simulations sim
        where sim.id = lifepath_simulation_shares.simulation_id
          and sim.created_by_user_id = auth.uid()
          and sim.simulation_type = 'parent'
          and sim.status = 'completed'
      )
    );
  end if;
end $$;

-- Parent/guardian can update their own share message or revoke sharing.
-- Students do not receive a direct UPDATE policy; acknowledgement/dismissal goes through the RPC below.
do $$
begin
  drop policy if exists lifepath_simulation_shares_update_owner_or_student on public.lifepath_simulation_shares;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'lifepath_simulation_shares' and policyname = 'lifepath_simulation_shares_update_owner'
  ) then
    create policy lifepath_simulation_shares_update_owner
    on public.lifepath_simulation_shares for update
    using (shared_by_user_id = auth.uid())
    with check (shared_by_user_id = auth.uid());
  end if;
end $$;

create or replace function public.respond_to_lifepath_simulation_share(p_share_id uuid, p_response text)
returns public.lifepath_simulation_shares
language plpgsql
security definer
set search_path = public
as $$
declare
  v_share public.lifepath_simulation_shares;
  v_next_status text;
begin
  if p_response not in ('acknowledged', 'dismissed') then
    raise exception 'Invalid response. Expected acknowledged or dismissed.';
  end if;

  select * into v_share
  from public.lifepath_simulation_shares share
  where share.id = p_share_id
    and share.status in ('active', 'acknowledged', 'dismissed')
    and public.is_student_owner_for_student_profile(share.student_profile_id, auth.uid())
  for update;

  if not found then
    raise exception 'Recommendation not found or not available.';
  end if;

  v_next_status := p_response;

  update public.lifepath_simulation_shares
  set
    status = v_next_status,
    acknowledged_at = case when v_next_status = 'acknowledged' then now() else acknowledged_at end,
    dismissed_at = case when v_next_status = 'dismissed' then now() else dismissed_at end,
    updated_at = now()
  where id = p_share_id
  returning * into v_share;

  return v_share;
end;
$$;

revoke all on function public.respond_to_lifepath_simulation_share(uuid, text) from public;
grant execute on function public.respond_to_lifepath_simulation_share(uuid, text) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'lifepath_simulation_shares' and policyname = 'lifepath_simulation_shares_delete_owner'
  ) then
    create policy lifepath_simulation_shares_delete_owner
    on public.lifepath_simulation_shares for delete
    using (shared_by_user_id = auth.uid());
  end if;
end $$;
