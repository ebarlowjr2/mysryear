-- Recruiter + Job Board MVP SQL Migration
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. RECRUITER PROFILES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS recruiter_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_name text NOT NULL,
  recruiter_type text NOT NULL CHECK (recruiter_type IN ('military', 'professional')),
  bio text,
  contact_email text,
  contact_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE recruiter_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recruiter_profiles
-- Anyone authenticated can read active recruiters
CREATE POLICY "Anyone can read active recruiters"
  ON recruiter_profiles
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Recruiter can read their own profile (even if inactive)
CREATE POLICY "Recruiter can read own profile"
  ON recruiter_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Recruiter can insert their own profile
CREATE POLICY "Recruiter can insert own profile"
  ON recruiter_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Recruiter can update their own profile
CREATE POLICY "Recruiter can update own profile"
  ON recruiter_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Recruiter can delete their own profile
CREATE POLICY "Recruiter can delete own profile"
  ON recruiter_profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_recruiter_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_recruiter_profiles_updated_at ON recruiter_profiles;
CREATE TRIGGER trigger_update_recruiter_profiles_updated_at
  BEFORE UPDATE ON recruiter_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_recruiter_profiles_updated_at();

-- ============================================
-- 2. JOB POSTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS job_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_name text NOT NULL,
  title text NOT NULL,
  category text NOT NULL CHECK (category IN ('internship', 'entry-level', 'apprenticeship', 'military program', 'scholarship program')),
  description text,
  apply_url text,
  location_mode text NOT NULL DEFAULT 'remote' CHECK (location_mode IN ('local', 'remote', 'hybrid')),
  state text,
  counties text[] DEFAULT '{}',
  deadline date,
  is_published boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT counties_max_4 CHECK (array_length(counties, 1) IS NULL OR array_length(counties, 1) <= 4)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_job_posts_owner ON job_posts(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_job_posts_category ON job_posts(category);
CREATE INDEX IF NOT EXISTS idx_job_posts_deadline ON job_posts(deadline);
CREATE INDEX IF NOT EXISTS idx_job_posts_location_mode ON job_posts(location_mode);

-- Enable RLS
ALTER TABLE job_posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for job_posts
-- Anyone authenticated can read published job posts
CREATE POLICY "Anyone can read published jobs"
  ON job_posts
  FOR SELECT
  TO authenticated
  USING (is_published = true);

-- Owner can read their own job posts (even if unpublished)
CREATE POLICY "Owner can read own jobs"
  ON job_posts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_user_id);

-- Owner can insert their own job posts
CREATE POLICY "Owner can insert own jobs"
  ON job_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_user_id);

-- Owner can update their own job posts
CREATE POLICY "Owner can update own jobs"
  ON job_posts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

-- Owner can delete their own job posts
CREATE POLICY "Owner can delete own jobs"
  ON job_posts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_user_id);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_job_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_job_posts_updated_at ON job_posts;
CREATE TRIGGER trigger_update_job_posts_updated_at
  BEFORE UPDATE ON job_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_job_posts_updated_at();
