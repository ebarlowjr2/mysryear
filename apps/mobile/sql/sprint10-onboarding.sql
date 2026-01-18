-- Sprint 10 Add-on: Role-Based Onboarding
-- Run this SQL in Supabase SQL Editor

-- Add business profile fields to profiles table (Option A - store on profiles)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS org_state text,
ADD COLUMN IF NOT EXISTS org_counties text[];

-- Add teacher-specific fields
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS job_title text,
ADD COLUMN IF NOT EXISTS department text;

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.org_state IS 'Business organization state for location targeting';
COMMENT ON COLUMN public.profiles.org_counties IS 'Business organization counties (max 4) for location targeting';
COMMENT ON COLUMN public.profiles.job_title IS 'Teacher job title (optional)';
COMMENT ON COLUMN public.profiles.department IS 'Teacher department (optional)';
