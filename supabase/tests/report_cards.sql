-- Run against a disposable database after the migration. Every fixture is rolled back.
-- This script assumes the canonical tables; do not run it against production.
begin;
create function pg_temp.assert(ok boolean, label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAILED: %', label; end if; end $$;
create function pg_temp.denied(statement text) returns boolean language plpgsql as $$
begin execute statement; return false; exception when others then return true; end $$;

insert into auth.users(id) values
 ('11111111-1111-4111-8111-111111111111'), ('22222222-2222-4222-8222-222222222222'),
 ('33333333-3333-4333-8333-333333333333'), ('44444444-4444-4444-8444-444444444444'),
 ('55555555-5555-4555-8555-555555555555'), ('66666666-6666-4666-8666-666666666666'),
 ('77777777-7777-4777-8777-777777777777');
insert into public.profiles(id,role) values
 ('11111111-1111-4111-8111-111111111111','student'), ('22222222-2222-4222-8222-222222222222','parent'),
 ('33333333-3333-4333-8333-333333333333','parent'), ('44444444-4444-4444-8444-444444444444','student'),
 ('55555555-5555-4555-8555-555555555555','counselor'), ('66666666-6666-4666-8666-666666666666','business'),
 ('77777777-7777-4777-8777-777777777777','guardian')
on conflict(id) do update set role=excluded.role;
insert into public.student_profiles(id,student_user_id) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','44444444-4444-4444-8444-444444444444');
insert into public.family_relationships(student_profile_id,user_id,role) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','22222222-2222-4222-8222-222222222222','parent'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','33333333-3333-4333-8333-333333333333','parent'),
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','55555555-5555-4555-8555-555555555555','counselor'),
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','77777777-7777-4777-8777-777777777777','guardian');
select set_config('test.card', '{"schema_version":1,"school_name":"Example High School","school_year":"2026-2027","grade_level":"9","courses":[{"name":"Math","grades":[{"period":"Q1","numeric":82,"letter":"B"},{"period":"Q2","numeric":null,"letter":null}]}],"attendance":{"scope":"Year to date","absences":2,"tardies":1}}', true);
select pg_temp.assert((select is_nullable = 'YES' from information_schema.columns
  where table_schema = 'public' and table_name = 'academic_records' and column_name = 'uploaded_file_id'),
  'digital report cards allow a private source instead of a legacy upload row');
set local role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
select pg_temp.assert(public.can_manage_report_card('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 'linked parent allowed');
select pg_temp.assert(not public.can_manage_report_card('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'), 'cross-parent denied');
select pg_temp.assert(pg_temp.denied($q$select public.save_student_report_card('cccccccc-cccc-4ccc-8ccc-cccccccccccc','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',current_setting('test.card')::jsonb)$q$), 'cross-parent save denied');
insert into storage.objects(bucket_id,name) values ('report-card-sources','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/22222222-2222-4222-8222-222222222222/cccccccc-cccc-4ccc-8ccc-cccccccccccc.jpg');
select pg_temp.assert((select count(*)=1 from storage.objects where bucket_id='report-card-sources'), 'parent can read source');
select pg_temp.assert(pg_temp.denied($q$insert into storage.objects(bucket_id,name) values ('report-card-sources','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/22222222-2222-4222-8222-222222222222/x.jpg')$q$), 'cross-student storage upload denied');
select pg_temp.assert(pg_temp.denied($q$insert into storage.objects(bucket_id,name) values ('report-card-sources','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/33333333-3333-4333-8333-333333333333/x.jpg')$q$), 'forged source uploader denied');
select public.save_student_report_card('cccccccc-cccc-4ccc-8ccc-cccccccccccc','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',current_setting('test.card')::jsonb,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/22222222-2222-4222-8222-222222222222/cccccccc-cccc-4ccc-8ccc-cccccccccccc.jpg');
delete from storage.objects where bucket_id='report-card-sources';
update storage.objects set name='rewritten.jpg' where bucket_id='report-card-sources';
select pg_temp.assert((select count(*)=1 from storage.objects where name like '%/cccccccc-cccc-4ccc-8ccc-cccccccccccc.jpg'), 'saved source cannot be deleted or overwritten');

select public.save_student_report_card('cccccccc-cccc-4ccc-8ccc-cccccccccccc','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',current_setting('test.card')::jsonb);
select pg_temp.assert((select count(*)=1 from public.student_report_cards), 'same request retries once');
select pg_temp.assert(pg_temp.denied($q$update public.student_report_cards set student_profile_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'$q$), 'direct ownership update denied');
select pg_temp.assert(pg_temp.denied($q$insert into public.student_report_cards(student_profile_id,data) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',current_setting('test.card')::jsonb)$q$), 'direct insert denied');
select pg_temp.assert(pg_temp.denied($q$select public.save_student_report_card('dddddddd-dddd-4ddd-8ddd-dddddddddddd','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',jsonb_set(current_setting('test.card')::jsonb,'{courses,0,grades,0,numeric}','101'))$q$), 'invalid grade rejected');
select pg_temp.assert(pg_temp.denied($q$select public.save_student_report_card('dddddddd-dddd-4ddd-8ddd-dddddddddddd','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',current_setting('test.card')::jsonb,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/source.jpg')$q$), 'cross-student source denied');
select pg_temp.assert(pg_temp.denied($q$select public.save_student_report_card('dddddddd-dddd-4ddd-8ddd-dddddddddddd','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',current_setting('test.card')::jsonb || '{"student_user_id":"attacker"}'::jsonb)$q$), 'identity injection denied');
select pg_temp.assert(bool_and(public.reserve_report_card_analysis('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')), 'ten analyses allowed') from generate_series(1,10);
select pg_temp.assert(not public.reserve_report_card_analysis('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 'eleventh analysis denied');
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
select pg_temp.assert((select count(*)=1 from public.student_report_cards), 'student sees parent-created card');
select pg_temp.assert(not public.can_manage_report_card('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'), 'cross-student denied');
select public.save_student_report_card('dddddddd-dddd-4ddd-8ddd-dddddddddddd','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',current_setting('test.card')::jsonb);
select pg_temp.assert((select count(*)=2 from public.student_report_cards), 'student can add own card');
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
select pg_temp.assert((select count(*)=0 from public.student_report_cards), 'other parent cannot read');
select pg_temp.assert((select count(*)=0 from storage.objects where bucket_id='report-card-sources'), 'other parent cannot read sources');
select set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',true);
select pg_temp.assert((select count(*)=0 from public.student_report_cards), 'other student cannot read');
select set_config('request.jwt.claim.sub','55555555-5555-4555-8555-555555555555',true);
select pg_temp.assert(not public.can_manage_report_card('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 'linked counselor denied');
select pg_temp.assert(pg_temp.denied($q$insert into public.academic_records(student_profile_id,document_type) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','academic_report_card')$q$), 'legacy academic report-card insert denied for counselor');
select pg_temp.assert(pg_temp.denied($q$insert into public.uploaded_files(id,student_profile_id,upload_context) values ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','academic_report_card')$q$), 'legacy upload metadata insert denied for counselor');
select pg_temp.assert((select count(*)=0 from public.student_report_cards), 'counselor cannot read grades');
select pg_temp.assert(pg_temp.denied($q$select public.save_student_report_card('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',current_setting('test.card')::jsonb)$q$), 'counselor save denied');
select pg_temp.assert((select count(*)=0 from storage.objects where bucket_id='report-card-sources'), 'counselor cannot read sources');
select set_config('request.jwt.claim.sub','66666666-6666-4666-8666-666666666666',true);
select pg_temp.assert(not public.can_manage_report_card('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 'business denied');
select pg_temp.assert(pg_temp.denied($q$select public.save_student_report_card('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',current_setting('test.card')::jsonb)$q$), 'business save denied');
select set_config('request.jwt.claim.sub','77777777-7777-4777-8777-777777777777',true);
select pg_temp.assert(not public.can_manage_report_card('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 'guardian denied under parents/students-only requirement');
reset role;
select pg_temp.assert((select count(*)=2 from public.academic_records where student_profile_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 'one academic row per reviewed card, invalid saves rolled back');
delete from public.family_relationships where user_id='22222222-2222-4222-8222-222222222222';
set local role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
select pg_temp.assert(not public.can_manage_report_card('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 'revocation removes write access');
select pg_temp.assert((select count(*)=0 from public.student_report_cards), 'revocation removes read access including own uploads');
select pg_temp.assert(not public.can_access_report_card_source('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/22222222-2222-4222-8222-222222222222/source.jpg'), 'revocation removes photo access');
select pg_temp.assert((select count(*)=0 from storage.objects where bucket_id='report-card-sources'), 'revoked parent cannot read source objects');
reset role;
set local role anon;
select pg_temp.assert(pg_temp.denied($q$select public.save_student_report_card('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',current_setting('test.card')::jsonb)$q$), 'anonymous RPC denied');
select pg_temp.assert((select count(*)=0 from storage.objects where bucket_id='report-card-sources'), 'anonymous source denied');
reset role;
rollback;
