-- Student claim invite support (additive)
-- Allows a parent/guardian/admin to invite a student to "claim" a student_profile.
-- This is needed for the parent-led onboarding flow.

do $$
begin
  -- Expand allowed invite roles to include 'student'
  alter table public.student_profile_relationship_invites
    drop constraint if exists student_profile_relationship_invites_relationship_role_check;

  alter table public.student_profile_relationship_invites
    add constraint student_profile_relationship_invites_relationship_role_check
    check (relationship_role in ('parent','guardian','counselor','student'));
exception
  when undefined_table then
    null;
end $$;

-- Security-definer RPC to accept a student claim invite, since updating student_profiles.student_user_id
-- would otherwise be blocked by RLS for a brand-new student user.
create or replace function public.accept_student_claim_invite(p_invite_id uuid)
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
    and relationship_role = 'student'
    and (
      invited_user_id = auth.uid()
      or (invited_user_id is null and invited_email is not null and lower(invited_email) = v_email)
    );

  if not found then
    raise exception 'Invite not found or not eligible';
  end if;

  -- Mark invite accepted
  update public.student_profile_relationship_invites
  set status = 'accepted',
      invited_user_id = auth.uid(),
      updated_at = now()
  where id = p_invite_id;

  -- Attach the student auth user to the planning container if not already claimed
  update public.student_profiles
  set student_user_id = auth.uid(),
      updated_at = now()
  where id = v_invite.student_profile_id
    and student_user_id is null;

  -- Ensure the student is a member in family_relationships
  insert into public.family_relationships (student_profile_id, user_id, role)
  values (v_invite.student_profile_id, auth.uid(), 'student')
  on conflict (student_profile_id, user_id) do nothing;
end;
$$;

-- Allow authenticated callers to execute the RPC
do $$
begin
  execute 'grant execute on function public.accept_student_claim_invite(uuid) to authenticated';
exception
  when undefined_function then null;
end $$;

