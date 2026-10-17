-- Apply in staging before deploying Grades. Existing records are preserved.
begin;

-- A reviewed digital card has a private source photo instead of a legacy
-- uploaded_files row. Preserve the FK but allow this canonical summary shape.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'academic_records'
      and column_name = 'uploaded_file_id'
  ) then
    alter table public.academic_records alter column uploaded_file_id drop not null;
  end if;
end $$;

create function public.can_manage_report_card(p_student_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p join public.student_profiles s on s.id = p_student_id
    where p.id = auth.uid() and (
      (p.role = 'student' and s.student_user_id = auth.uid())
      or (p.role = 'parent' and exists (
        select 1 from public.family_relationships f
        where f.student_profile_id = s.id and f.user_id = auth.uid() and f.role = 'parent'
      ))
    )
  );
$$;
revoke all on function public.can_manage_report_card(uuid) from public, anon;
grant execute on function public.can_manage_report_card(uuid) to authenticated;

create table public.student_report_cards (
  id uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references public.student_profiles(id) on delete cascade,
  created_by_user_id uuid references auth.users(id) on delete set null,
  academic_record_id uuid unique references public.academic_records(id) on delete set null,
  data jsonb not null check (jsonb_typeof(data) = 'object' and data->>'schema_version' = '1'),
  source_path text unique,
  reviewed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index student_report_cards_student_date on public.student_report_cards(student_profile_id, created_at desc);
create index student_report_cards_creator on public.student_report_cards(created_by_user_id);
alter table public.student_report_cards enable row level security;
revoke all on public.student_report_cards from anon, authenticated;
grant select on public.student_report_cards to authenticated;
create policy report_cards_read on public.student_report_cards for select to authenticated
  using (public.can_manage_report_card(student_profile_id));

-- Sources are deliberately isolated from the legacy document bucket, whose policies permit
-- additional roles. No public URLs; the API proxies sources with authorization on every read.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('report-card-sources', 'report-card-sources', false, 3145728, array['image/jpeg','image/png','image/webp']);
create function public.can_access_report_card_source(p_path text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.student_profiles s
    where s.id::text = split_part(p_path, '/', 1) and public.can_manage_report_card(s.id));
$$;
revoke all on function public.can_access_report_card_source(text) from public, anon;
grant execute on function public.can_access_report_card_source(text) to authenticated;
create policy report_card_source_read on storage.objects for select to authenticated
using (bucket_id = 'report-card-sources' and public.can_access_report_card_source(name));
create policy report_card_source_insert on storage.objects for insert to authenticated
with check (bucket_id = 'report-card-sources' and public.can_access_report_card_source(name)
  and split_part(name, '/', 2) = auth.uid()::text);
create policy report_card_source_delete on storage.objects for delete to authenticated
using (bucket_id = 'report-card-sources' and public.can_access_report_card_source(name)
  and split_part(name, '/', 2) = auth.uid()::text
  and not exists (select 1 from public.student_report_cards r where r.source_path = name));
-- Restrictive policies guard against older permissive storage policies in deployed databases.
create policy report_card_source_boundary on storage.objects as restrictive for all to authenticated
using (bucket_id <> 'report-card-sources' or public.can_access_report_card_source(name))
with check (bucket_id <> 'report-card-sources' or (
  public.can_access_report_card_source(name) and split_part(name, '/', 2) = auth.uid()::text));
create policy report_card_source_no_overwrite on storage.objects as restrictive for update to authenticated
using (bucket_id <> 'report-card-sources');
create policy report_card_source_keep_saved on storage.objects as restrictive for delete to authenticated
using (bucket_id <> 'report-card-sources' or (split_part(name, '/', 2) = auth.uid()::text
  and not exists (select 1 from public.student_report_cards r where r.source_path = name)));
create policy report_card_source_no_anon on storage.objects as restrictive for all to anon
using (bucket_id <> 'report-card-sources') with check (bucket_id <> 'report-card-sources');

-- Only this transaction can write a reviewed card and its academic summary together.
create function public.save_student_report_card(p_id uuid, p_student_id uuid, p_data jsonb, p_source_path text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_academic_id uuid; v_course jsonb; v_grade jsonb; v_existing record; v_count int;
begin
  if not public.can_manage_report_card(p_student_id) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  -- Serialize retries for the same request ID; never insert duplicate academic summaries.
  perform pg_advisory_xact_lock(hashtextextended(p_id::text, 0));
  select * into v_existing from public.student_report_cards where id = p_id;
  if found then
    if v_existing.student_profile_id <> p_student_id or v_existing.created_by_user_id <> auth.uid() then
      raise exception 'Invalid report ID' using errcode = '42501';
    end if;
    return p_id;
  end if;
  if jsonb_typeof(p_data) is distinct from 'object' or octet_length(p_data::text) > 100000
     or p_data->'schema_version' is distinct from '1'::jsonb
     or not (p_data ?& array['schema_version','school_name','school_year','grade_level','courses','attendance'])
     or jsonb_typeof(p_data->'school_name') not in ('string','null')
     or jsonb_typeof(p_data->'school_year') is distinct from 'string'
     or jsonb_typeof(p_data->'grade_level') is distinct from 'string'
     or coalesce(p_data->>'school_year','') !~ '^\d{4}-\d{4}$'
     or coalesce(p_data->>'grade_level','') !~ '^(K|[1-9]|1[0-2])$'
     or jsonb_typeof(p_data->'courses') is distinct from 'array'
     or jsonb_typeof(p_data->'attendance') is distinct from 'object' then
    raise exception 'Invalid report card';
  end if;
  if (right(p_data->>'school_year',4))::int <> (left(p_data->>'school_year',4))::int + 1
     or jsonb_array_length(p_data->'courses') not between 1 and 40 then
    raise exception 'Invalid school year or course count';
  end if;
  if (p_data - array['schema_version','school_name','school_year','grade_level','courses','attendance']) <> '{}'::jsonb
    then raise exception 'Unexpected report fields'; end if;
  if length(coalesce(p_data->>'school_name','')) > 200 then raise exception 'Invalid school name'; end if;
  v_count := 0;
  for v_course in select value from jsonb_array_elements(p_data->'courses') loop
    if jsonb_typeof(v_course) is distinct from 'object'
      or jsonb_typeof(v_course->'name') is distinct from 'string'
      or length(trim(coalesce(v_course->>'name',''))) not between 1 and 200
      or jsonb_typeof(v_course->'grades') is distinct from 'array'
      or (v_course - array['name','grades']) <> '{}'::jsonb then raise exception 'Invalid course'; end if;
    if jsonb_array_length(v_course->'grades') > 16 then raise exception 'Too many periods'; end if;
    if (select count(*) <> count(distinct lower(trim(value->>'period'))) from jsonb_array_elements(v_course->'grades'))
      then raise exception 'Duplicate period'; end if;
    for v_grade in select value from jsonb_array_elements(v_course->'grades') loop
      if jsonb_typeof(v_grade) is distinct from 'object'
        or not (v_grade ?& array['period','numeric','letter'])
        or jsonb_typeof(v_grade->'period') is distinct from 'string'
        or jsonb_typeof(v_grade->'letter') not in ('string','null')
        or length(trim(coalesce(v_grade->>'period',''))) not between 1 and 40
        or length(coalesce(v_grade->>'letter','')) > 12
        or (v_grade - array['period','numeric','letter']) <> '{}'::jsonb then raise exception 'Invalid grade'; end if;
      if v_grade->>'numeric' is not null and (jsonb_typeof(v_grade->'numeric') <> 'number'
        or (v_grade->>'numeric')::numeric not between 0 and 100) then raise exception 'Invalid numeric grade'; end if;
      if v_grade->>'numeric' is not null or nullif(trim(v_grade->>'letter'),'') is not null then v_count := v_count + 1; end if;
    end loop;
  end loop;
  if v_count = 0 then raise exception 'At least one grade is required'; end if;
  if not ((p_data->'attendance') ?& array['scope','absences','tardies'])
    or jsonb_typeof(p_data->'attendance'->'scope') not in ('string','null')
    or ((p_data->'attendance') - array['scope','absences','tardies']) <> '{}'::jsonb
    or length(coalesce(p_data->'attendance'->>'scope','')) > 80 then raise exception 'Invalid attendance'; end if;
  for v_grade in select value from jsonb_each(p_data->'attendance') where key in ('absences','tardies') loop
    if v_grade <> 'null'::jsonb and (jsonb_typeof(v_grade) <> 'number' or v_grade::text::numeric not between 0 and 366)
      then raise exception 'Invalid attendance count'; end if;
  end loop;
  if p_source_path is not null and (
    p_source_path not like p_student_id::text || '/' || auth.uid()::text || '/' || p_id::text || '.%'
    or not exists (select 1 from storage.objects where bucket_id = 'report-card-sources' and name = p_source_path)
  ) then raise exception 'Invalid source photo'; end if;
  insert into public.academic_records(student_profile_id, uploaded_by_user_id, document_type, school_year, grade_level, notes)
  values (p_student_id, auth.uid(), 'academic_report_card', p_data->>'school_year', p_data->>'grade_level', 'Reviewed digital report card')
  returning id into v_academic_id;
  insert into public.student_report_cards(id, student_profile_id, created_by_user_id, academic_record_id, data, source_path)
  values (p_id, p_student_id, auth.uid(), v_academic_id, p_data, p_source_path);
  return p_id;
end;
$$;
revoke all on function public.save_student_report_card(uuid,uuid,jsonb,text) from public, anon;
grant execute on function public.save_student_report_card(uuid,uuid,jsonb,text) to authenticated;

-- Durable extraction limit across server instances: 10 calls per user per hour.
create table public.report_card_analysis_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_start timestamptz not null,
  attempts int not null check (attempts between 1 and 10)
);
alter table public.report_card_analysis_limits enable row level security;
revoke all on public.report_card_analysis_limits from anon, authenticated;
create function public.reserve_report_card_analysis(p_student_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if not public.can_manage_report_card(p_student_id) then raise exception 'Not authorized' using errcode = '42501'; end if;
  insert into public.report_card_analysis_limits values (auth.uid(), now(), 1)
  on conflict(user_id) do update set
    window_start = case when report_card_analysis_limits.window_start < now() - interval '1 hour' then now() else report_card_analysis_limits.window_start end,
    attempts = case when report_card_analysis_limits.window_start < now() - interval '1 hour' then 1 else report_card_analysis_limits.attempts + 1 end
  where report_card_analysis_limits.window_start < now() - interval '1 hour' or report_card_analysis_limits.attempts < 10
  returning attempts into n;
  return n is not null;
end;
$$;
revoke all on function public.reserve_report_card_analysis(uuid) from public, anon;
grant execute on function public.reserve_report_card_analysis(uuid) to authenticated;
-- Legacy clients may still upload report cards as documents. Restrict those writes too.
-- Reads of existing vault documents are unchanged; digital cards and their sources are private.
create policy academic_report_card_insert_roles on public.academic_records as restrictive for insert to authenticated
with check (coalesce(document_type,'') not in ('report_card','academic_report_card') or public.can_manage_report_card(student_profile_id));
create policy academic_report_card_update_roles on public.academic_records as restrictive for update to authenticated
using (coalesce(document_type,'') not in ('report_card','academic_report_card') or public.can_manage_report_card(student_profile_id))
with check (coalesce(document_type,'') not in ('report_card','academic_report_card') or public.can_manage_report_card(student_profile_id));
create policy uploaded_report_card_insert_roles on public.uploaded_files as restrictive for insert to authenticated
with check (coalesce(upload_context,'') <> 'academic_report_card' or public.can_manage_report_card(student_profile_id));
create policy uploaded_report_card_update_roles on public.uploaded_files as restrictive for update to authenticated
using (coalesce(upload_context,'') <> 'academic_report_card' or public.can_manage_report_card(student_profile_id))
with check (coalesce(upload_context,'') <> 'academic_report_card' or public.can_manage_report_card(student_profile_id));
commit;
