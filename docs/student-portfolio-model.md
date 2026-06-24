# Student Portfolio Model Draft

Date: 2026-06-18

## Purpose

The Student Portfolio is the next student-profile-owned data layer after academic records and student success tasks. It should capture the non-academic proof that matters for college, trade, scholarship, career, and parent/counselor planning.

## Ownership Rule

Portfolio records belong to `student_profiles`, not directly to auth users.

Every record should include:

- `student_profile_id`
- `created_by_user_id`
- optional `verified_by_user_id`
- timestamps

Parents/guardians can help create and manage records for linked students. Counselors should start with read/support access and later get scoped verification/comment permissions.

## Proposed Tables

### student_activities

- `id uuid primary key`
- `student_profile_id uuid references student_profiles(id)`
- `created_by_user_id uuid references auth.users(id)`
- `title text not null`
- `organization text nullable`
- `category text nullable`
- `role_title text nullable`
- `description text nullable`
- `start_date date nullable`
- `end_date date nullable`
- `hours numeric nullable`
- `is_current boolean default false`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

### student_awards

- `id uuid primary key`
- `student_profile_id uuid references student_profiles(id)`
- `created_by_user_id uuid references auth.users(id)`
- `title text not null`
- `issuer text nullable`
- `award_date date nullable`
- `description text nullable`
- `level text nullable`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

### student_volunteer_hours

- `id uuid primary key`
- `student_profile_id uuid references student_profiles(id)`
- `created_by_user_id uuid references auth.users(id)`
- `organization text not null`
- `activity text not null`
- `service_date date nullable`
- `hours numeric not null default 0`
- `supervisor_name text nullable`
- `supervisor_email text nullable`
- `verification_status text default 'unverified'`
- `verified_by_user_id uuid references auth.users(id) nullable`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

### student_certifications

- `id uuid primary key`
- `student_profile_id uuid references student_profiles(id)`
- `created_by_user_id uuid references auth.users(id)`
- `name text not null`
- `issuer text nullable`
- `issued_date date nullable`
- `expires_date date nullable`
- `credential_url text nullable`
- `uploaded_file_id uuid references uploaded_files(id) nullable`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

## RLS Direction

Use the same student profile membership helpers as academic records:

- students can manage their own portfolio records
- linked parent/guardian can manage records
- linked counselor can view records
- future counselor verification must be scoped to verification/comment fields only

## Feature Connections

- Dashboard: portfolio completion score and next action
- LifePath: recommended certifications and career proof
- Essay/Resume Vault: resume generation from portfolio records
- Scholarships: activities/awards matching and eligibility
- Parent Action Center: reminders to update activities and service hours

## Not In This Sprint

- No migrations yet
- No UI yet
- No resume builder yet
- No scholarship matching yet

This doc is the design target for a later additive migration sprint.
