-- Academic records schema alignment (Option B v2)
-- Goal: tolerate legacy `academic_records` shapes (extra NOT NULL columns like `credits`)
-- without dropping data or rewriting the legacy schema.
--
-- Strategy:
-- 1) Ensure the MVP-required columns exist (best-effort).
-- 2) Relax NOT NULL constraints on any *extra* columns so inserts from the new app flow succeed.

do $$
declare
  col record;
begin
  -- If the table doesn't exist yet (fresh env), do nothing; the main migration will create it.
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'academic_records'
  ) then
    return;
  end if;

  -- Ensure legacy `subject` exists and has a default.
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'academic_records'
      and column_name = 'subject'
  ) then
    execute 'alter table public.academic_records add column subject text';
  end if;
  execute 'alter table public.academic_records alter column subject set default ''general''';

  -- Relax NOT NULL for *extra* columns we don't write in the MVP flow.
  -- We keep constraints on the MVP columns we depend on.
  for col in
    select c.column_name
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'academic_records'
      and c.is_nullable = 'NO'
      and c.column_name not in (
        'id',
        'student_profile_id',
        'uploaded_file_id',
        'uploaded_by_user_id',
        'document_type',
        'school_year',
        'grading_period',
        'grade_level',
        'gpa',
        'notes',
        'created_at',
        'updated_at',
        'subject'
      )
  loop
    execute format('alter table public.academic_records alter column %I drop not null', col.column_name);
  end loop;
end $$;

