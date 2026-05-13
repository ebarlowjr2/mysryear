-- Upload metadata: distinguish uploader from container ownership (student_profile).
-- Additive only: keep legacy columns; introduce uploaded_by_user_id for auditing.

alter table public.uploaded_files
  add column if not exists uploaded_by_user_id uuid references auth.users(id) on delete set null;

-- Backfill for existing rows.
update public.uploaded_files
set uploaded_by_user_id = user_id
where uploaded_by_user_id is null;

-- Replace insert policy to require uploaded_by_user_id = auth.uid()
drop policy if exists uploaded_files_insert_member on public.uploaded_files;

create policy uploaded_files_insert_member
on public.uploaded_files for insert
with check (
  uploaded_by_user_id = auth.uid()
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

-- Allow deletion by uploader OR an admin on the student profile.
drop policy if exists uploaded_files_delete_member on public.uploaded_files;

create policy uploaded_files_delete_member
on public.uploaded_files for delete
using (
  student_profile_id is not null
  and (
    uploaded_by_user_id = auth.uid()
    or user_id = auth.uid()
    or exists (
      select 1
      from public.family_relationships fr
      where fr.student_profile_id = uploaded_files.student_profile_id
        and fr.user_id = auth.uid()
        and fr.role = 'admin'
    )
  )
);
