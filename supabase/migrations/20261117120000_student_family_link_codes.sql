-- Student Family Link Codes
--
-- Replaces the parent-facing requirement to know a student_profile_id with a
-- short-lived, one-time code created by the student. Plaintext codes are never
-- stored. Email requests are intentionally generic so they do not reveal whether
-- a student account exists.

create extension if not exists pgcrypto;

create table if not exists public.student_family_link_codes (
  id uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references public.student_profiles(id) on delete cascade,
  created_by_user_id uuid not null references auth.users(id) on delete cascade,
  code_hash text not null unique,
  expires_at timestamptz not null,
  redeemed_at timestamptz,
  redeemed_by_user_id uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_family_link_codes_expiry_check check (expires_at > created_at)
);

create unique index if not exists student_family_link_codes_one_active_per_student_idx
on public.student_family_link_codes(student_profile_id)
where redeemed_at is null and revoked_at is null;

create index if not exists student_family_link_codes_expiry_idx
on public.student_family_link_codes(expires_at)
where redeemed_at is null and revoked_at is null;

alter table public.student_family_link_codes enable row level security;

-- Codes must be created and redeemed through the RPCs below. This prevents a
-- client from reading hashes, mapping a code to a student, or changing lifecycle fields.
revoke all on table public.student_family_link_codes from anon, authenticated;

create or replace function public.student_family_link_codes_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.student_family_link_codes_touch_updated_at() from public;

drop trigger if exists student_family_link_codes_touch_updated_at on public.student_family_link_codes;
create trigger student_family_link_codes_touch_updated_at
before update on public.student_family_link_codes
for each row execute function public.student_family_link_codes_touch_updated_at();

create or replace function public.create_student_family_link_code(
  p_expires_minutes integer default 15
)
returns table(code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_profile_id uuid;
  v_role text;
  v_code text;
  v_code_hash text;
  v_expires_at timestamptz;
  v_attempts integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select p.role, sp.id
  into v_role, v_student_profile_id
  from public.profiles p
  join public.student_profiles sp on sp.student_user_id = p.id
  where p.id = auth.uid()
  for update of sp;

  if v_role is distinct from 'student' or v_student_profile_id is null then
    raise exception 'Only a student account with a claimed student profile can create a family link code';
  end if;

  v_expires_at := now() + make_interval(
    mins => least(greatest(coalesce(p_expires_minutes, 15), 5), 60)
  );

  -- A newly issued code intentionally invalidates any previous code for this student.
  update public.student_family_link_codes
  set revoked_at = now()
  where student_profile_id = v_student_profile_id
    and redeemed_at is null
    and revoked_at is null;

  loop
    v_attempts := v_attempts + 1;
    if v_attempts > 5 then
      raise exception 'Could not create a family link code. Please try again.';
    end if;

    -- 64 bits of entropy; presentation formatting happens in the client.
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16));
    v_code_hash := encode(digest(v_code, 'sha256'), 'hex');

    begin
      insert into public.student_family_link_codes (
        student_profile_id,
        created_by_user_id,
        code_hash,
        expires_at
      ) values (
        v_student_profile_id,
        auth.uid(),
        v_code_hash,
        v_expires_at
      );
      exit;
    exception when unique_violation then
      -- A code-hash collision is extraordinarily unlikely, but retry safely.
      null;
    end;
  end loop;

  return query select v_code, v_expires_at;
end;
$$;

revoke all on function public.create_student_family_link_code(integer) from public;
grant execute on function public.create_student_family_link_code(integer) to authenticated;

create or replace function public.revoke_student_family_link_codes()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_profile_id uuid;
  v_role text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select p.role, sp.id
  into v_role, v_student_profile_id
  from public.profiles p
  join public.student_profiles sp on sp.student_user_id = p.id
  where p.id = auth.uid();

  if v_role is distinct from 'student' or v_student_profile_id is null then
    raise exception 'Only the student who owns this profile can revoke a family link code';
  end if;

  update public.student_family_link_codes
  set revoked_at = now()
  where student_profile_id = v_student_profile_id
    and redeemed_at is null
    and revoked_at is null;
end;
$$;

revoke all on function public.revoke_student_family_link_codes() from public;
grant execute on function public.revoke_student_family_link_codes() to authenticated;

create or replace function public.request_student_family_link_by_code(p_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clean_code text;
  v_code_hash text;
  v_code_record record;
  v_requester_role text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select role into v_requester_role
  from public.profiles
  where id = auth.uid();

  if v_requester_role not in ('parent', 'guardian') then
    raise exception 'Only parent or guardian accounts can request a student connection';
  end if;

  v_clean_code := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if length(v_clean_code) <> 16 then
    raise exception 'Invalid or expired family link code';
  end if;
  v_code_hash := encode(digest(v_clean_code, 'sha256'), 'hex');

  select c.id, c.student_profile_id, sp.student_user_id
  into v_code_record
  from public.student_family_link_codes c
  join public.student_profiles sp on sp.id = c.student_profile_id
  where c.code_hash = v_code_hash
    and c.redeemed_at is null
    and c.revoked_at is null
    and c.expires_at > now()
  for update of c;

  if not found or v_code_record.student_user_id is null then
    raise exception 'Invalid or expired family link code';
  end if;

  if exists (
    select 1
    from public.family_relationships fr
    where fr.student_profile_id = v_code_record.student_profile_id
      and fr.user_id = auth.uid()
      and fr.role in ('parent', 'guardian')
  ) then
    return 'already_connected';
  end if;

  if exists (
    select 1
    from public.student_profile_relationship_invites i
    where i.student_profile_id = v_code_record.student_profile_id
      and i.created_by_user_id = auth.uid()
      and i.relationship_role = v_requester_role
      and i.invite_type = 'access_request'
      and i.status = 'pending'
      and i.revoked_at is null
      and (i.expires_at is null or i.expires_at > now())
  ) then
    return 'pending';
  end if;

  begin
    insert into public.student_profile_relationship_invites (
      student_profile_id,
      invited_email,
      invited_user_id,
      relationship_role,
      invite_type,
      status,
      expires_at,
      created_by_user_id
    ) values (
      v_code_record.student_profile_id,
      -- A code holder does not need to learn the student's account email.
      -- invited_user_id is sufficient for the student to receive the request.
      null,
      v_code_record.student_user_id,
      v_requester_role,
      'access_request',
      'pending',
      now() + interval '14 days',
      auth.uid()
    );
  exception when unique_violation then
    return 'pending';
  end;

  update public.student_family_link_codes
  set redeemed_at = now(), redeemed_by_user_id = auth.uid()
  where id = v_code_record.id;

  return 'requested';
end;
$$;

revoke all on function public.request_student_family_link_by_code(text) from public;
grant execute on function public.request_student_family_link_by_code(text) to authenticated;

create or replace function public.request_student_family_link_by_email(p_student_email text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requester_role text;
  v_email text;
  v_student_profile_id uuid;
  v_student_user_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select role into v_requester_role
  from public.profiles
  where id = auth.uid();

  if v_requester_role not in ('parent', 'guardian') then
    raise exception 'Only parent or guardian accounts can request a student connection';
  end if;

  v_email := lower(nullif(trim(coalesce(p_student_email, '')), ''));
  -- Always return the same result for an unknown or malformed email so the
  -- caller cannot use this operation to determine whether an account exists.
  if v_email is null or position('@' in v_email) = 0 then
    return 'submitted';
  end if;

  select sp.id, sp.student_user_id
  into v_student_profile_id, v_student_user_id
  from auth.users u
  join public.student_profiles sp on sp.student_user_id = u.id
  join public.profiles p on p.id = u.id and p.role = 'student'
  where lower(u.email) = v_email
  limit 1;

  if v_student_profile_id is null
     or v_student_user_id is null
     or v_student_user_id = auth.uid() then
    return 'submitted';
  end if;

  if exists (
    select 1
    from public.family_relationships fr
    where fr.student_profile_id = v_student_profile_id
      and fr.user_id = auth.uid()
      and fr.role in ('parent', 'guardian')
  ) then
    return 'submitted';
  end if;

  if exists (
    select 1
    from public.student_profile_relationship_invites i
    where i.student_profile_id = v_student_profile_id
      and i.created_by_user_id = auth.uid()
      and i.relationship_role = v_requester_role
      and i.invite_type = 'access_request'
      and i.status = 'pending'
      and i.revoked_at is null
      and (i.expires_at is null or i.expires_at > now())
  ) then
    return 'submitted';
  end if;

  begin
    insert into public.student_profile_relationship_invites (
      student_profile_id,
      invited_email,
      invited_user_id,
      relationship_role,
      invite_type,
      status,
      expires_at,
      created_by_user_id
    ) values (
      v_student_profile_id,
      v_email,
      v_student_user_id,
      v_requester_role,
      'access_request',
      'pending',
      now() + interval '14 days',
      auth.uid()
    );
  exception when unique_violation then
    null;
  end;

  return 'submitted';
end;
$$;

revoke all on function public.request_student_family_link_by_email(text) from public;
grant execute on function public.request_student_family_link_by_email(text) to authenticated;

-- Retire the old client-writable, UUID-based access-request path. It allowed a
-- caller who knew a student_profile_id to create a request directly. New
-- requests go through the code/email RPCs above, which resolve the recipient
-- internally and require a parent or guardian role. Old installed clients will
-- fail safely and should update to the Family Link flow.
drop policy if exists spri_insert_access_request on public.student_profile_relationship_invites;
create policy spri_insert_access_request
on public.student_profile_relationship_invites for insert
with check (
  false
);

-- The original creator policy did not distinguish supporter invitations from
-- access requests. Limit ordinary client inserts to supporter invitations;
-- claim and access-request creation are deliberately handled by narrow RPCs.
drop policy if exists spri_insert_creator on public.student_profile_relationship_invites;
create policy spri_insert_creator
on public.student_profile_relationship_invites for insert
with check (
  created_by_user_id = auth.uid()
  and coalesce(invite_type, 'supporter_invite') = 'supporter_invite'
  and exists (
    select 1
    from public.family_relationships fr
    where fr.student_profile_id = student_profile_relationship_invites.student_profile_id
      and fr.user_id = auth.uid()
      and fr.role in ('student', 'admin')
  )
);

-- The older RLS policies grant both a creator and an invited user UPDATE
-- permission. RLS cannot constrain changed columns, so use one lifecycle
-- trigger to prevent a creator from accepting their own access request or
-- rebinding it to a different account. Trusted server-side maintenance runs
-- without auth.uid() and remains available for expiration cleanup.
create or replace function public.spri_enforce_immutable_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(coalesce((auth.jwt() ->> 'email'), ''));
  v_is_creator boolean;
  v_is_recipient boolean;
begin
  if auth.uid() is null then
    return new;
  end if;

  if new.student_profile_id is distinct from old.student_profile_id
     or new.relationship_role is distinct from old.relationship_role
     or new.invite_type is distinct from old.invite_type
     or new.created_by_user_id is distinct from old.created_by_user_id
     or new.invited_email is distinct from old.invited_email
     or new.token is distinct from old.token
     or new.token_hash is distinct from old.token_hash
     or new.expires_at is distinct from old.expires_at then
    raise exception 'invite scope and delivery fields are immutable';
  end if;

  if old.status is distinct from 'pending' then
    raise exception 'closed invitations cannot be changed';
  end if;

  v_is_creator := old.created_by_user_id = auth.uid();
  v_is_recipient := old.invited_user_id = auth.uid()
    or (
      old.invited_user_id is null
      and old.invited_email is not null
      and lower(old.invited_email) = v_email
    );

  if new.invited_user_id is distinct from old.invited_user_id then
    if not v_is_recipient
       or old.invited_user_id is not null
       or new.invited_user_id is distinct from auth.uid() then
      raise exception 'only the invited account may claim an email invitation';
    end if;
  end if;

  if v_is_creator then
    if new.status is distinct from 'revoked'
       or new.revoked_at is null
       or new.accepted_at is distinct from old.accepted_at
       or new.declined_at is distinct from old.declined_at then
      raise exception 'an invitation creator may only revoke a pending invitation';
    end if;
    return new;
  end if;

  if not v_is_recipient then
    raise exception 'only an invitation creator or recipient may change an invitation';
  end if;

  if new.status = 'accepted' then
    if coalesce(old.invite_type, 'supporter_invite') = 'access_request'
       and coalesce(current_setting('app.allow_access_request_approval', true), '') <> 'true' then
      raise exception 'access requests must be approved by the protected approval operation';
    end if;

    -- Student-claim invitations also change authenticated ownership. They must
    -- go through the claim RPC, which atomically attaches the student account
    -- to the managed profile before the invitation is accepted.
    if old.relationship_role = 'student'
       and coalesce(current_setting('app.allow_student_profile_claim', true), '') <> 'true' then
      raise exception 'student claim invitations must be accepted by the protected claim operation';
    end if;

    if new.accepted_at is null
       or new.declined_at is distinct from old.declined_at
       or new.revoked_at is distinct from old.revoked_at then
      raise exception 'accepted invitations require an acceptance timestamp';
    end if;
    return new;
  end if;

  if new.status = 'declined' then
    if new.declined_at is null
       or new.accepted_at is distinct from old.accepted_at
       or new.revoked_at is distinct from old.revoked_at then
      raise exception 'declined invitations require a decline timestamp';
    end if;
    return new;
  end if;

  raise exception 'an invitation recipient may only accept or decline a pending invitation';
end;
$$;

revoke all on function public.spri_enforce_immutable_fields() from public;

-- Approval is student-owned. A parent cannot approve their own request, and
-- completing it updates the requester's active student context atomically.
create or replace function public.approve_access_request(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite record;
  v_email text;
  v_student_user_id uuid;
  v_approver_role text;
  v_requester_role text;
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
    and relationship_role in ('parent', 'guardian')
    and revoked_at is null
    and (expires_at is null or expires_at > now())
    and (
      invited_user_id = auth.uid()
      or (invited_user_id is null and invited_email is not null and lower(invited_email) = v_email)
    )
  for update;

  if not found then
    raise exception 'Invite not found, expired, revoked, or not eligible';
  end if;

  select student_user_id into v_student_user_id
  from public.student_profiles
  where id = v_invite.student_profile_id;

  select role into v_approver_role
  from public.profiles
  where id = auth.uid();

  select role into v_requester_role
  from public.profiles
  where id = v_invite.created_by_user_id;

  if v_student_user_id is distinct from auth.uid() or v_approver_role is distinct from 'student' then
    raise exception 'Only the student who owns this profile can approve an access request';
  end if;

  if v_requester_role is distinct from v_invite.relationship_role
     or v_requester_role not in ('parent', 'guardian') then
    raise exception 'The requester is no longer eligible for this connection';
  end if;

  perform set_config('app.allow_access_request_approval', 'true', true);

  update public.student_profile_relationship_invites
  set status = 'accepted',
      invited_user_id = auth.uid(),
      accepted_at = now(),
      updated_at = now()
  where id = p_invite_id;

  insert into public.family_relationships (student_profile_id, user_id, role)
  values (v_invite.student_profile_id, v_invite.created_by_user_id, v_invite.relationship_role)
  on conflict (student_profile_id, user_id) do nothing;

  update public.profiles
  set active_student_profile_id = v_invite.student_profile_id,
      updated_at = now()
  where id = v_invite.created_by_user_id;
end;
$$;

revoke all on function public.approve_access_request(uuid) from public;
grant execute on function public.approve_access_request(uuid) to authenticated;

-- Active student context may only point at the signed-in user's own or accepted
-- linked profile. This prevents a manually supplied UUID from becoming a usable
-- family context before approval.
create or replace function public.profiles_enforce_active_student_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.active_student_profile_id is not distinct from old.active_student_profile_id then
    return new;
  end if;

  -- Trusted migrations and administrator repairs run without an auth context.
  if auth.uid() is null or new.active_student_profile_id is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.student_profiles sp
    where sp.id = new.active_student_profile_id
      and sp.student_user_id = auth.uid()
  ) and not exists (
    select 1
    from public.family_relationships fr
    where fr.student_profile_id = new.active_student_profile_id
      and fr.user_id = auth.uid()
      and fr.role in ('student', 'parent', 'guardian', 'counselor', 'admin')
  ) then
    raise exception 'active student profile must be owned by or linked to the current user';
  end if;

  return new;
end;
$$;

revoke all on function public.profiles_enforce_active_student_membership() from public;

drop trigger if exists profiles_enforce_active_student_membership on public.profiles;
create trigger profiles_enforce_active_student_membership
before update of active_student_profile_id on public.profiles
for each row execute function public.profiles_enforce_active_student_membership();

-- Removing a supporter relationship must also remove its active context so a
-- revoked parent or guardian cannot retain a stale selected-student pointer.
create or replace function public.family_relationships_clear_active_student_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role in ('parent', 'guardian', 'counselor', 'admin') then
    update public.profiles
    set active_student_profile_id = null,
        updated_at = now()
    where id = old.user_id
      and active_student_profile_id = old.student_profile_id;
  end if;
  return old;
end;
$$;

revoke all on function public.family_relationships_clear_active_student_profile() from public;

drop trigger if exists family_relationships_clear_active_student_profile on public.family_relationships;
create trigger family_relationships_clear_active_student_profile
after delete on public.family_relationships
for each row execute function public.family_relationships_clear_active_student_profile();

-- A completed account cannot silently change its role from the client. Support
-- and trusted administrator SQL may still correct an account with no auth context.
create or replace function public.profiles_protect_completed_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
     and old.onboarding_complete
     and new.role is distinct from old.role then
    raise exception 'account role changes require support review after onboarding';
  end if;
  return new;
end;
$$;

revoke all on function public.profiles_protect_completed_role() from public;

drop trigger if exists profiles_protect_completed_role on public.profiles;
create trigger profiles_protect_completed_role
before update of role on public.profiles
for each row execute function public.profiles_protect_completed_role();
