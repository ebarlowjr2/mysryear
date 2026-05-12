-- Uploads foundation: private user bucket + file metadata table + RLS
-- Safe, additive migration only

-- 1) Create private bucket (RLS governs access)
insert into storage.buckets (id, name, public)
values ('user-uploads', 'user-uploads', false)
on conflict (id) do nothing;

-- 2) File metadata table
create table if not exists public.uploaded_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_type text,
  file_size bigint,
  upload_context text,
  created_at timestamptz default now()
);

alter table public.uploaded_files enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'uploaded_files'
      and policyname = 'uploaded_files_select_own'
  ) then
    create policy uploaded_files_select_own
    on public.uploaded_files for select
    using (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'uploaded_files'
      and policyname = 'uploaded_files_insert_own'
  ) then
    create policy uploaded_files_insert_own
    on public.uploaded_files for insert
    with check (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'uploaded_files'
      and policyname = 'uploaded_files_delete_own'
  ) then
    create policy uploaded_files_delete_own
    on public.uploaded_files for delete
    using (user_id = auth.uid());
  end if;
end $$;

create index if not exists uploaded_files_user_created_idx
on public.uploaded_files(user_id, created_at desc);

-- 3) Storage access policies (folder structure: {user_id}/{timestamp}-{filename})
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'user_uploads_insert_own_folder'
  ) then
    create policy user_uploads_insert_own_folder
    on storage.objects for insert to authenticated
    with check (
      bucket_id = 'user-uploads'
      and (storage.foldername(name))[1] = (select auth.uid()::text)
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'user_uploads_select_own_folder'
  ) then
    create policy user_uploads_select_own_folder
    on storage.objects for select to authenticated
    using (
      bucket_id = 'user-uploads'
      and (storage.foldername(name))[1] = (select auth.uid()::text)
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'user_uploads_delete_own_folder'
  ) then
    create policy user_uploads_delete_own_folder
    on storage.objects for delete to authenticated
    using (
      bucket_id = 'user-uploads'
      and (storage.foldername(name))[1] = (select auth.uid()::text)
    );
  end if;
end $$;

