-- Sprint 4 Database Tables: Profile Enhancements (Role-based)
-- Run this SQL in your Supabase SQL Editor

-- 1. Business Profiles table (for verification and org details)
CREATE TABLE IF NOT EXISTS public.business_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_name text,
  org_website text,
  org_email text,
  phone text,
  industry text,
  hq_state text,
  hq_county text,
  verification_status text NOT NULL DEFAULT 'unverified' 
    CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on business_profiles
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for business_profiles
CREATE POLICY "Business users can view their own profile" ON public.business_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Business users can insert their own profile" ON public.business_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Business users can update their own profile" ON public.business_profiles
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Index for verification status queries
CREATE INDEX IF NOT EXISTS idx_business_profiles_verification ON public.business_profiles(verification_status);

-- 2. Teacher Profiles table (for verification and school association)
CREATE TABLE IF NOT EXISTS public.teacher_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  title text,
  school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL,
  verification_status text NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on teacher_profiles
ALTER TABLE public.teacher_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for teacher_profiles
CREATE POLICY "Teacher users can view their own profile" ON public.teacher_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Teacher users can insert their own profile" ON public.teacher_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Teacher users can update their own profile" ON public.teacher_profiles
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Indexes for teacher_profiles
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_school ON public.teacher_profiles(school_id);
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_verification ON public.teacher_profiles(verification_status);

-- 3. Add requested_by column to parent_student_links (if not exists)
ALTER TABLE public.parent_student_links
ADD COLUMN IF NOT EXISTS requested_by text DEFAULT 'parent'
  CHECK (requested_by IN ('parent', 'student'));
