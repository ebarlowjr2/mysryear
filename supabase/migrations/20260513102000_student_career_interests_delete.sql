-- Allow members (student/parent/guardian/admin) to delete/reset career interests.

alter table public.student_career_interests enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'student_career_interests'
      and policyname = 'student_career_interests_delete_member'
  ) then
    create policy student_career_interests_delete_member
    on public.student_career_interests for delete
    using (
      exists (
        select 1
        from public.family_relationships fr
        where fr.student_profile_id = student_career_interests.student_profile_id
          and fr.user_id = auth.uid()
      )
      or exists (
        select 1
        from public.student_profiles sp
        where sp.id = student_career_interests.student_profile_id
          and sp.student_user_id = auth.uid()
      )
    );
  end if;
end $$;

