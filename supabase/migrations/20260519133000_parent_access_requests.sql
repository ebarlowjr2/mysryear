-- Parent/guardian access request support (additive)
-- Allows a parent/guardian to request access to a student's profile by emailing the student.
-- The student accepts/declines, and on accept we link the *requestor* (invite creator) to the student profile.

do $$
begin
  -- Add a lightweight type discriminator so we can support both "supporter invite" (receiver becomes member)
  -- and "access request" (creator becomes member after receiver approves).
  alter table public.student_profile_relationship_invites
    add column if not exists invite_type text not null default 'supporter_invite';

  alter table public.student_profile_relationship_invites
    drop constraint if exists student_profile_relationship_invites_invite_type_check;

  alter table public.student_profile_relationship_invites
    add constraint student_profile_relationship_invites_invite_type_check
    check (invite_type in ('supporter_invite','access_request'));
exception
  when undefined_table then
    null;
end $$;

-- RLS: allow any authenticated user to create an access request for a known student_profile_id.
-- This is intentionally constrained:
-- - creator must be the logged-in user
-- - invite_type must be access_request
-- - relationship_role must be parent/guardian (requesting access)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'student_profile_relationship_invites'
      and policyname = 'spri_insert_access_request'
  ) then
    create policy spri_insert_access_request
    on public.student_profile_relationship_invites for insert
    with check (
      invite_type = 'access_request'
      and created_by_user_id = auth.uid()
      and relationship_role in ('parent','guardian')
      and invited_email is not null
      and student_profile_id is not null
    );
  end if;
end $$;

-- RPC: student approves a pending access request, linking the requestor to the student profile.
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

  select *
  into v_invite
  from public.student_profile_relationship_invites
  where id = p_invite_id
    and status = 'pending'
    and invite_type = 'access_request'
    and (
      invited_user_id = auth.uid()
      or (invited_user_id is null and invited_email is not null and lower(invited_email) = v_email)
    );

  if not found then
    raise exception 'Invite not found or not eligible';
  end if;

  -- Mark approved by the receiver (student) for auditability.
  update public.student_profile_relationship_invites
  set status = 'accepted',
      invited_user_id = auth.uid(),
      updated_at = now()
  where id = p_invite_id;

  -- Link the requestor (creator) to the student profile as the requested role.
  insert into public.family_relationships (student_profile_id, user_id, role)
  values (v_invite.student_profile_id, v_invite.created_by_user_id, v_invite.relationship_role)
  on conflict (student_profile_id, user_id) do nothing;
end;
$$;

do $$
begin
  execute 'grant execute on function public.approve_access_request(uuid) to authenticated';
exception
  when undefined_function then null;
end $$;
