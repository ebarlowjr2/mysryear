-- Upload ownership update: allow parents/guardians to manage uploads for a student profile.
-- Switches storage path to `user-uploads/{student_profile_id}/...` and updates RLS policies.

-- 1) Update uploaded_files RLS policies to allow access via student_profile membership.
alter table public.uploaded_files
  add column if not exists student_profile_id uuid references public.student_profiles(id) on delete cascade;

drop policy if exists uploaded_files_select_own on public.uploaded_files;
drop policy if exists uploaded_files_insert_own on public.uploaded_files;
drop policy if exists uploaded_files_delete_own on public.uploaded_files;

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

-- 2) Update storage.objects policies to enforce `{student_profile_id}/...` folder access.
drop policy if exists user_uploads_insert_own_folder on storage.objects;
drop policy if exists user_uploads_select_own_folder on storage.objects;
drop policy if exists user_uploads_delete_own_folder on storage.objects;

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

