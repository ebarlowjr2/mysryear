-- A.U.R.A LifePath role routing: parent feedback + isolated parent simulations
-- Additive only. Do not run against production until reviewed.

create table if not exists public.lifepath_feedback (
  id uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references public.student_profiles(id) on delete cascade,
  career_id text,
  author_user_id uuid not null references auth.users(id) on delete cascade,
  author_role text not null,
  note text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.lifepath_feedback enable row level security;

create index if not exists lifepath_feedback_student_created_idx
on public.lifepath_feedback(student_profile_id, created_at desc);

create index if not exists lifepath_feedback_author_idx
on public.lifepath_feedback(author_user_id);

-- Read official LifePath feedback for the student profile owner, linked family, and approved counselors.
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'lifepath_feedback' and policyname = 'lifepath_feedback_select_linked'
  ) then
    create policy lifepath_feedback_select_linked
    on public.lifepath_feedback for select
    using (
      exists (
        select 1 from public.student_profiles sp
        where sp.id = lifepath_feedback.student_profile_id
          and sp.student_user_id = auth.uid()
      )
      or exists (
        select 1 from public.family_relationships fr
        where fr.student_profile_id = lifepath_feedback.student_profile_id
          and fr.user_id = auth.uid()
          and fr.role in ('student', 'parent', 'guardian', 'counselor')
      )
    );
  end if;
end $$;

-- Parents and guardians may add feedback for linked students. Students may also add notes for their own profile.
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'lifepath_feedback' and policyname = 'lifepath_feedback_insert_linked_family'
  ) then
    create policy lifepath_feedback_insert_linked_family
    on public.lifepath_feedback for insert
    with check (
      author_user_id = auth.uid()
      and author_role in ('student', 'parent', 'guardian')
      and exists (
        select 1 from public.family_relationships fr
        where fr.student_profile_id = lifepath_feedback.student_profile_id
          and fr.user_id = auth.uid()
          and fr.role = lifepath_feedback.author_role
          and fr.role in ('student', 'parent', 'guardian')
      )
    );
  end if;
end $$;

-- Authors may update/delete only their own notes.
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'lifepath_feedback' and policyname = 'lifepath_feedback_update_own'
  ) then
    create policy lifepath_feedback_update_own
    on public.lifepath_feedback for update
    using (author_user_id = auth.uid())
    with check (author_user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'lifepath_feedback' and policyname = 'lifepath_feedback_delete_own'
  ) then
    create policy lifepath_feedback_delete_own
    on public.lifepath_feedback for delete
    using (author_user_id = auth.uid());
  end if;
end $$;

create table if not exists public.lifepath_simulations (
  id uuid primary key default gen_random_uuid(),
  created_by_user_id uuid not null references auth.users(id) on delete cascade,
  simulation_type text not null default 'parent',
  title text,
  status text not null default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.lifepath_simulations enable row level security;

create index if not exists lifepath_simulations_owner_status_idx
on public.lifepath_simulations(created_by_user_id, status, created_at desc);

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'lifepath_simulations' and policyname = 'lifepath_simulations_owner_all'
  ) then
    create policy lifepath_simulations_owner_all
    on public.lifepath_simulations for all
    using (created_by_user_id = auth.uid())
    with check (created_by_user_id = auth.uid());
  end if;
end $$;

create table if not exists public.lifepath_simulation_interests (
  id uuid primary key default gen_random_uuid(),
  simulation_id uuid not null references public.lifepath_simulations(id) on delete cascade,
  career_id text not null,
  rank int,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(simulation_id, career_id)
);

alter table public.lifepath_simulation_interests enable row level security;

create index if not exists lifepath_simulation_interests_sim_rank_idx
on public.lifepath_simulation_interests(simulation_id, rank);

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'lifepath_simulation_interests' and policyname = 'lifepath_simulation_interests_owner_all'
  ) then
    create policy lifepath_simulation_interests_owner_all
    on public.lifepath_simulation_interests for all
    using (
      exists (
        select 1 from public.lifepath_simulations s
        where s.id = lifepath_simulation_interests.simulation_id
          and s.created_by_user_id = auth.uid()
      )
    )
    with check (
      exists (
        select 1 from public.lifepath_simulations s
        where s.id = lifepath_simulation_interests.simulation_id
          and s.created_by_user_id = auth.uid()
      )
    );
  end if;
end $$;
