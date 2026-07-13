-- Scholarship Application Tracker MVP
-- Additive, student-profile-owned checklist layer for scholarship applications.

create table if not exists public.scholarship_application_tasks (
  id uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references public.student_profiles(id) on delete cascade,
  scholarship_id uuid not null references public.scholarships(id) on delete cascade,
  created_by_user_id uuid references auth.users(id) on delete set null,
  title text not null,
  description text,
  category text not null default 'general',
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'done')),
  due_date date,
  upload_required boolean not null default false,
  uploaded_file_id uuid references public.uploaded_files(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_profile_id, scholarship_id, title)
);

create index if not exists scholarship_application_tasks_student_idx
on public.scholarship_application_tasks(student_profile_id, status, due_date);

create index if not exists scholarship_application_tasks_scholarship_idx
on public.scholarship_application_tasks(scholarship_id);

alter table public.scholarship_application_tasks enable row level security;

drop trigger if exists set_scholarship_application_tasks_updated_at on public.scholarship_application_tasks;
create trigger set_scholarship_application_tasks_updated_at
before update on public.scholarship_application_tasks
for each row execute function public.set_updated_at();

drop policy if exists scholarship_application_tasks_select_member on public.scholarship_application_tasks;
create policy scholarship_application_tasks_select_member
on public.scholarship_application_tasks for select
using (public.is_student_profile_member(student_profile_id));

drop policy if exists scholarship_application_tasks_insert_write_member on public.scholarship_application_tasks;
create policy scholarship_application_tasks_insert_write_member
on public.scholarship_application_tasks for insert
with check (public.is_student_profile_write_member(student_profile_id));

drop policy if exists scholarship_application_tasks_update_write_member on public.scholarship_application_tasks;
create policy scholarship_application_tasks_update_write_member
on public.scholarship_application_tasks for update
using (public.is_student_profile_write_member(student_profile_id))
with check (public.is_student_profile_write_member(student_profile_id));

drop policy if exists scholarship_application_tasks_delete_write_member on public.scholarship_application_tasks;
create policy scholarship_application_tasks_delete_write_member
on public.scholarship_application_tasks for delete
using (public.is_student_profile_write_member(student_profile_id));
