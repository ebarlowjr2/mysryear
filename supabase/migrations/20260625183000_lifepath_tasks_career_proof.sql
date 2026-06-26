-- LifePath task completion sprint: career-specific tasks + proof links.
-- Safe additive migration. Existing tasks remain valid as general LifePath tasks when career_id is null.

alter table public.lifepath_tasks
  add column if not exists career_id text,
  add column if not exists uploaded_file_id uuid references public.uploaded_files(id) on delete set null;

create index if not exists lifepath_tasks_student_career_idx
on public.lifepath_tasks(student_profile_id, career_id, created_at);

-- Existing migration created select + insert policies only. Add update/delete for task completion and cleanup.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'lifepath_tasks'
      and policyname = 'lifepath_tasks_update_member'
  ) then
    create policy lifepath_tasks_update_member
    on public.lifepath_tasks for update
    using (
      exists (
        select 1
        from public.family_relationships fr
        where fr.student_profile_id = lifepath_tasks.student_profile_id
          and fr.user_id = auth.uid()
          and fr.role in ('student','parent','guardian','admin')
      )
      or exists (
        select 1
        from public.student_profiles sp
        where sp.id = lifepath_tasks.student_profile_id
          and sp.student_user_id = auth.uid()
      )
    )
    with check (
      exists (
        select 1
        from public.family_relationships fr
        where fr.student_profile_id = lifepath_tasks.student_profile_id
          and fr.user_id = auth.uid()
          and fr.role in ('student','parent','guardian','admin')
      )
      or exists (
        select 1
        from public.student_profiles sp
        where sp.id = lifepath_tasks.student_profile_id
          and sp.student_user_id = auth.uid()
      )
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'lifepath_tasks'
      and policyname = 'lifepath_tasks_delete_member'
  ) then
    create policy lifepath_tasks_delete_member
    on public.lifepath_tasks for delete
    using (
      exists (
        select 1
        from public.family_relationships fr
        where fr.student_profile_id = lifepath_tasks.student_profile_id
          and fr.user_id = auth.uid()
          and fr.role in ('student','parent','guardian','admin')
      )
      or exists (
        select 1
        from public.student_profiles sp
        where sp.id = lifepath_tasks.student_profile_id
          and sp.student_user_id = auth.uid()
      )
    );
  end if;
end $$;
