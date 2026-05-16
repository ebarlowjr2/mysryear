-- Academic records schema alignment (Option B)
-- Goal: align to Student Success Dashboard MVP expectations without dropping legacy data.
--
-- Some environments may already have an `academic_records` table with a NOT NULL `subject` column.
-- We make `subject` optional with a default so inserts from the new MVP flow won't fail.

do $$
begin
  -- If subject exists and is NOT NULL, relax it.
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'academic_records'
      and column_name = 'subject'
      and is_nullable = 'NO'
  ) then
    execute 'alter table public.academic_records alter column subject drop not null';
  end if;
exception
  when undefined_table then
    -- academic_records doesn't exist yet; the main migration will create it.
    null;
end $$;

do $$
begin
  -- Ensure subject exists and has a default (even if nullable).
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
exception
  when undefined_table then
    null;
end $$;

