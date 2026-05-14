-- Upload ownership update: allow parents/guardians to manage uploads for a student profile.
--
-- IMPORTANT: This migration is additive and preserves the existing user-owned upload path:
-- - Legacy: `user-uploads/{user_id}/...` (kept working for current web/mobile flows)
-- - New:    `user-uploads/{student_profile_id}/...` (for family/student_profile ownership)
--
-- We intentionally DO NOT drop the legacy RLS/storage policies here to avoid breaking
-- existing uploads while the app transitions to student_profile ownership.

-- 1) Update uploaded_files RLS policies to allow access via student_profile membership.
alter table public.uploaded_files
  add column if not exists student_profile_id uuid references public.student_profiles(id) on delete cascade;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'uploaded_files'
      and policyname = 'uploaded_files_select_member'
  ) then
    create policy uploaded_files_select_member
    on public.uploaded_files for select
    using (
      user_id = auth.uid()
      or (
        student_profile_id is not null
        and (
          exists (
            select 1
            from public.student_profiles sp
            where sp.id = uploaded_files.student_profile_id
              and sp.student_user_id = auth.uid()
          )
          or exists (
            select 1
            from public.family_relationships fr
            where fr.student_profile_id = uploaded_files.student_profile_id
              and fr.user_id = auth.uid()
          )
        )
      )
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'uploaded_files'
      and policyname = 'uploaded_files_insert_member'
  ) then
    create policy uploaded_files_insert_member
    on public.uploaded_files for insert
    with check (
      user_id = auth.uid()
      and student_profile_id is not null
      and (
        exists (
          select 1
          from public.student_profiles sp
          where sp.id = uploaded_files.student_profile_id
            and sp.student_user_id = auth.uid()
        )
        or exists (
          select 1
          from public.family_relationships fr
          where fr.student_profile_id = uploaded_files.student_profile_id
            and fr.user_id = auth.uid()
        )
      )
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'uploaded_files'
      and policyname = 'uploaded_files_delete_member'
  ) then
    create policy uploaded_files_delete_member
    on public.uploaded_files for delete
    using (
      user_id = auth.uid()
      and student_profile_id is not null
      and (
        exists (
          select 1
          from public.student_profiles sp
          where sp.id = uploaded_files.student_profile_id
            and sp.student_user_id = auth.uid()
        )
        or exists (
          select 1
          from public.family_relationships fr
          where fr.student_profile_id = uploaded_files.student_profile_id
            and fr.user_id = auth.uid()
        )
      )
    );
  end if;
end $$;

-- 2) Add storage.objects policies to enforce `{student_profile_id}/...` folder access.
-- Note: legacy `{user_id}/...` policies are preserved.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'user_uploads_insert_student_profile_folder'
  ) then
    create policy user_uploads_insert_student_profile_folder
    on storage.objects for insert to authenticated
    with check (
      bucket_id = 'user-uploads'
      and exists (
        select 1
        from public.student_profiles sp
        where sp.id::text = (storage.foldername(name))[1]
          and (
            sp.student_user_id = auth.uid()
            or exists (
              select 1
              from public.family_relationships fr
              where fr.student_profile_id = sp.id
                and fr.user_id = auth.uid()
            )
          )
      )
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'user_uploads_select_student_profile_folder'
  ) then
    create policy user_uploads_select_student_profile_folder
    on storage.objects for select to authenticated
    using (
      bucket_id = 'user-uploads'
      and exists (
        select 1
        from public.student_profiles sp
        where sp.id::text = (storage.foldername(name))[1]
          and (
            sp.student_user_id = auth.uid()
            or exists (
              select 1
              from public.family_relationships fr
              where fr.student_profile_id = sp.id
                and fr.user_id = auth.uid()
            )
          )
      )
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'user_uploads_delete_student_profile_folder'
  ) then
    create policy user_uploads_delete_student_profile_folder
    on storage.objects for delete to authenticated
    using (
      bucket_id = 'user-uploads'
      and exists (
        select 1
        from public.student_profiles sp
        where sp.id::text = (storage.foldername(name))[1]
          and (
            sp.student_user_id = auth.uid()
            or exists (
              select 1
              from public.family_relationships fr
              where fr.student_profile_id = sp.id
                and fr.user_id = auth.uid()
            )
          )
      )
    );
  end if;
end $$;
