-- Mentors MVP SQL Migration
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. MENTOR PROFILES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS mentor_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  headline text,
  bio text,
  career_paths text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  is_remote boolean DEFAULT true,
  state text,
  county text,
  contact_email text,
  contact_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE mentor_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mentor_profiles
-- Anyone authenticated can read active mentors
CREATE POLICY "Anyone can read active mentors"
  ON mentor_profiles
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Mentor can read their own profile (even if inactive)
CREATE POLICY "Mentor can read own profile"
  ON mentor_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Mentor can insert their own profile
CREATE POLICY "Mentor can insert own profile"
  ON mentor_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Mentor can update their own profile
CREATE POLICY "Mentor can update own profile"
  ON mentor_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Mentor can delete their own profile
CREATE POLICY "Mentor can delete own profile"
  ON mentor_profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_mentor_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_mentor_profiles_updated_at ON mentor_profiles;
CREATE TRIGGER trigger_update_mentor_profiles_updated_at
  BEFORE UPDATE ON mentor_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_mentor_profiles_updated_at();

-- ============================================
-- 2. MENTOR AVAILABILITY TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS mentor_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  timezone text DEFAULT 'America/New_York',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT end_time_after_start_time CHECK (end_time > start_time)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_mentor_availability_user_id ON mentor_availability(user_id);
CREATE INDEX IF NOT EXISTS idx_mentor_availability_day ON mentor_availability(day_of_week);

-- Enable RLS
ALTER TABLE mentor_availability ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mentor_availability
-- Anyone authenticated can read active availability for active mentors
CREATE POLICY "Anyone can read active mentor availability"
  ON mentor_availability
  FOR SELECT
  TO authenticated
  USING (
    is_active = true 
    AND EXISTS (
      SELECT 1 FROM mentor_profiles 
      WHERE mentor_profiles.user_id = mentor_availability.user_id 
      AND mentor_profiles.is_active = true
    )
  );

-- Mentor can read their own availability
CREATE POLICY "Mentor can read own availability"
  ON mentor_availability
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Mentor can insert their own availability
CREATE POLICY "Mentor can insert own availability"
  ON mentor_availability
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Mentor can update their own availability
CREATE POLICY "Mentor can update own availability"
  ON mentor_availability
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Mentor can delete their own availability
CREATE POLICY "Mentor can delete own availability"
  ON mentor_availability
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_mentor_availability_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_mentor_availability_updated_at ON mentor_availability;
CREATE TRIGGER trigger_update_mentor_availability_updated_at
  BEFORE UPDATE ON mentor_availability
  FOR EACH ROW
  EXECUTE FUNCTION update_mentor_availability_updated_at();
