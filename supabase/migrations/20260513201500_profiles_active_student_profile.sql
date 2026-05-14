-- Add active student profile selection to profiles (additive).
-- This supports parent-led accounts managing multiple students and consistent container selection.

alter table public.profiles
  add column if not exists active_student_profile_id uuid references public.student_profiles(id) on delete set null;

-- Best-effort backfill for existing users (safe to skip if no relationships exist).
-- Note: this runs under admin context when applied via SQL editor.
update public.profiles p
set active_student_profile_id = (
  select fr.student_profile_id
  from public.family_relationships fr
  where fr.user_id = p.id
  order by fr.created_at asc
  limit 1
)
where p.active_student_profile_id is null;

