-- Business Opportunities Board MVP
-- Additive: business profiles, opportunity postings, and student interest tracking.

create table if not exists public.business_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  organization_name text not null,
  contact_name text,
  contact_email text,
  phone text,
  website text,
  industry text,
  description text,
  address_city text,
  address_state text,
  verified boolean default false,
  status text default 'pending' check (status in ('pending', 'active', 'suspended')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists business_profiles_owner_idx
on public.business_profiles(owner_user_id);

alter table public.business_profiles enable row level security;

create table if not exists public.business_opportunities (
  id uuid primary key default gen_random_uuid(),
  business_profile_id uuid not null references public.business_profiles(id) on delete cascade,
  created_by_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  opportunity_type text not null check (opportunity_type in ('internship', 'volunteer', 'job_shadowing', 'apprenticeship', 'mentorship', 'workshop', 'summer_program', 'part_time_job', 'career_event')),
  description text not null,
  location_type text,
  city text,
  state text,
  remote_available boolean default false,
  age_min integer,
  grade_min text,
  grade_max text,
  career_category text,
  related_career_ids text[],
  skills text[],
  application_url text,
  contact_email text,
  deadline date,
  start_date date,
  end_date date,
  paid boolean default false,
  compensation text,
  hours_required text,
  status text default 'active' check (status in ('draft', 'pending', 'active', 'closed', 'archived')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists business_opportunities_active_idx
on public.business_opportunities(status, opportunity_type, career_category, state, created_at desc)
where status = 'active';

create index if not exists business_opportunities_business_idx
on public.business_opportunities(business_profile_id, created_at desc);

alter table public.business_opportunities enable row level security;

create table if not exists public.student_opportunity_interests (
  id uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references public.student_profiles(id) on delete cascade,
  opportunity_id uuid not null references public.business_opportunities(id) on delete cascade,
  status text default 'saved' check (status in ('saved', 'interested', 'applied', 'accepted', 'declined', 'completed')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (student_profile_id, opportunity_id)
);

create index if not exists student_opportunity_interests_student_idx
on public.student_opportunity_interests(student_profile_id, created_at desc);

create index if not exists student_opportunity_interests_opportunity_idx
on public.student_opportunity_interests(opportunity_id, created_at desc);

alter table public.student_opportunity_interests enable row level security;

-- updated_at helper fallback. Existing migrations usually create public.set_updated_at().
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_business_profiles_updated_at on public.business_profiles;
create trigger set_business_profiles_updated_at
before update on public.business_profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_business_opportunities_updated_at on public.business_opportunities;
create trigger set_business_opportunities_updated_at
before update on public.business_opportunities
for each row execute function public.set_updated_at();

drop trigger if exists set_student_opportunity_interests_updated_at on public.student_opportunity_interests;
create trigger set_student_opportunity_interests_updated_at
before update on public.student_opportunity_interests
for each row execute function public.set_updated_at();

-- Business profile RLS
drop policy if exists business_profiles_select_owner_or_public on public.business_profiles;
create policy business_profiles_select_owner_or_public
on public.business_profiles for select
using (
  owner_user_id = auth.uid()
  or status = 'active'
  or verified = true
);

drop policy if exists business_profiles_insert_owner on public.business_profiles;
create policy business_profiles_insert_owner
on public.business_profiles for insert
with check (owner_user_id = auth.uid());

drop policy if exists business_profiles_update_owner on public.business_profiles;
create policy business_profiles_update_owner
on public.business_profiles for update
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

-- Opportunity RLS
drop policy if exists business_opportunities_select_active_or_owner on public.business_opportunities;
create policy business_opportunities_select_active_or_owner
on public.business_opportunities for select
using (
  status = 'active'
  or exists (
    select 1 from public.business_profiles bp
    where bp.id = business_opportunities.business_profile_id
      and bp.owner_user_id = auth.uid()
  )
);

drop policy if exists business_opportunities_insert_owner on public.business_opportunities;
create policy business_opportunities_insert_owner
on public.business_opportunities for insert
with check (
  created_by_user_id = auth.uid()
  and exists (
    select 1 from public.business_profiles bp
    where bp.id = business_opportunities.business_profile_id
      and bp.owner_user_id = auth.uid()
  )
);

drop policy if exists business_opportunities_update_owner on public.business_opportunities;
create policy business_opportunities_update_owner
on public.business_opportunities for update
using (
  exists (
    select 1 from public.business_profiles bp
    where bp.id = business_opportunities.business_profile_id
      and bp.owner_user_id = auth.uid()
  )
)
with check (
  created_by_user_id = auth.uid()
  and exists (
    select 1 from public.business_profiles bp
    where bp.id = business_opportunities.business_profile_id
      and bp.owner_user_id = auth.uid()
  )
);

drop policy if exists business_opportunities_delete_owner on public.business_opportunities;
create policy business_opportunities_delete_owner
on public.business_opportunities for delete
using (
  exists (
    select 1 from public.business_profiles bp
    where bp.id = business_opportunities.business_profile_id
      and bp.owner_user_id = auth.uid()
  )
);

-- Student interest RLS. Uses canonical student profile membership helpers.
drop policy if exists student_opportunity_interests_select_member on public.student_opportunity_interests;
create policy student_opportunity_interests_select_member
on public.student_opportunity_interests for select
using (public.is_student_profile_member(student_profile_id));

drop policy if exists student_opportunity_interests_insert_write_member on public.student_opportunity_interests;
create policy student_opportunity_interests_insert_write_member
on public.student_opportunity_interests for insert
with check (public.is_student_profile_write_member(student_profile_id));

drop policy if exists student_opportunity_interests_update_write_member on public.student_opportunity_interests;
create policy student_opportunity_interests_update_write_member
on public.student_opportunity_interests for update
using (public.is_student_profile_write_member(student_profile_id))
with check (public.is_student_profile_write_member(student_profile_id));

drop policy if exists student_opportunity_interests_delete_write_member on public.student_opportunity_interests;
create policy student_opportunity_interests_delete_write_member
on public.student_opportunity_interests for delete
using (public.is_student_profile_write_member(student_profile_id));
