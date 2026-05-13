-- Identity/onboarding additive migrations (source: docs/identity-model.md)
-- Safe, additive changes only. Do not drop legacy mobile tables.

create extension if not exists pgcrypto;

-- 1) Schools catalog (high schools)
create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  state text,
  zip text,
  nces_id text,
  created_at timestamptz default now()
);

alter table public.schools enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'schools'
      and policyname = 'schools_select_all'
  ) then
    create policy schools_select_all
    on public.schools for select
    using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'schools'
      and policyname = 'schools_insert_authenticated'
  ) then
    create policy schools_insert_authenticated
    on public.schools for insert
    with check (auth.uid() is not null);
  end if;
end $$;

-- 2) Attach school selection to student planning container
alter table public.student_profiles
  add column if not exists school_id uuid references public.schools(id) on delete set null;

-- 3) Expand relationship roles (add counselor now; others reserved for later)
alter table public.family_relationships
  drop constraint if exists family_relationships_role_check;

alter table public.family_relationships
  add constraint family_relationships_role_check
  check (role in ('student','parent','guardian','counselor','admin'));

-- Replace permissive insert policy with safer, explicit pathways:
-- - students can self-link when student_user_id matches
-- - creators can add themselves as admin on profiles they created
-- - invites will be handled by invite-specific policy below
drop policy if exists family_relationships_insert_self on public.family_relationships;

create policy family_relationships_insert_student_self
on public.family_relationships for insert
with check (
  user_id = auth.uid()
  and role = 'student'
  and exists (
    select 1
    from public.student_profiles sp
    where sp.id = family_relationships.student_profile_id
      and sp.student_user_id = auth.uid()
  )
);

create policy family_relationships_insert_creator_admin
on public.family_relationships for insert
with check (
  user_id = auth.uid()
  and role = 'admin'
  and exists (
    select 1
    from public.student_profiles sp
    where sp.id = family_relationships.student_profile_id
      and sp.created_by_user_id = auth.uid()
  )
);

-- 4) Invite/request workflow entity
create table if not exists public.student_profile_relationship_invites (
  id uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references public.student_profiles(id) on delete cascade,
  invited_email text,
  invited_user_id uuid references auth.users(id) on delete cascade,
  relationship_role text not null check (relationship_role in ('parent','guardian','counselor')),
  status text not null default 'pending' check (status in ('pending','accepted','declined','expired')),
  token text,
  created_by_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists spri_student_idx
on public.student_profile_relationship_invites(student_profile_id, created_at desc);

create index if not exists spri_invited_user_idx
on public.student_profile_relationship_invites(invited_user_id, created_at desc);

alter table public.student_profile_relationship_invites enable row level security;

-- Creator can view their invites; invited user can view theirs; if invited_email is set, match by jwt email claim.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'student_profile_relationship_invites'
      and policyname = 'spri_select_creator_or_invited'
  ) then
    create policy spri_select_creator_or_invited
    on public.student_profile_relationship_invites for select
    using (
      created_by_user_id = auth.uid()
      or invited_user_id = auth.uid()
      or (
        invited_user_id is null
        and invited_email is not null
        and lower(invited_email) = lower((auth.jwt() ->> 'email'))
      )
    );
  end if;
end $$;

-- Creator can create invites for student profiles they can administer (admin/student).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'student_profile_relationship_invites'
      and policyname = 'spri_insert_creator'
  ) then
    create policy spri_insert_creator
    on public.student_profile_relationship_invites for insert
    with check (
      created_by_user_id = auth.uid()
      and exists (
        select 1
        from public.family_relationships fr
        where fr.student_profile_id = student_profile_relationship_invites.student_profile_id
          and fr.user_id = auth.uid()
          and fr.role in ('student','admin')
      )
    );
  end if;
end $$;

-- Creator can cancel/expire their own invites.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'student_profile_relationship_invites'
      and policyname = 'spri_update_creator'
  ) then
    create policy spri_update_creator
    on public.student_profile_relationship_invites for update
    using (created_by_user_id = auth.uid())
    with check (created_by_user_id = auth.uid());
  end if;
end $$;

-- Invited user/email can accept/decline (status update only).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'student_profile_relationship_invites'
      and policyname = 'spri_update_invited'
  ) then
    create policy spri_update_invited
    on public.student_profile_relationship_invites for update
    using (
      invited_user_id = auth.uid()
      or (
        invited_user_id is null
        and invited_email is not null
        and lower(invited_email) = lower((auth.jwt() ->> 'email'))
      )
    )
    with check (
      invited_user_id = auth.uid()
      or (
        invited_user_id is null
        and invited_email is not null
        and lower(invited_email) = lower((auth.jwt() ->> 'email'))
      )
    );
  end if;
end $$;

-- 5) Allow adding family_relationships entries based on accepted invites (no triggers yet; app will insert)
create policy family_relationships_insert_via_invite
on public.family_relationships for insert
with check (
  user_id = auth.uid()
  and role in ('parent','guardian','counselor')
  and exists (
    select 1
    from public.student_profile_relationship_invites i
    where i.student_profile_id = family_relationships.student_profile_id
      and i.status = 'accepted'
      and (
        i.invited_user_id = auth.uid()
        or (i.invited_user_id is null and i.invited_email is not null and lower(i.invited_email) = lower((auth.jwt() ->> 'email')))
      )
      and i.relationship_role = family_relationships.role
  )
);

