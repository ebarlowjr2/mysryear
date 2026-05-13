-- Profile Page Database Updates
-- Run this SQL in your Supabase SQL Editor

-- Add new columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text,
ADD COLUMN IF NOT EXISTS graduation_date date,
ADD COLUMN IF NOT EXISTS state text,
ADD COLUMN IF NOT EXISTS county text,
ADD COLUMN IF NOT EXISTS org_name text,
ADD COLUMN IF NOT EXISTS website text,
ADD COLUMN IF NOT EXISTS notifications_tasks boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notifications_deadlines boolean DEFAULT true;

-- Update RLS policy to allow users to update their own profile
-- (This should already exist, but adding IF NOT EXISTS pattern)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile" ON public.profiles
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Ensure users can select their own profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Users can view own profile'
  ) THEN
    CREATE POLICY "Users can view own profile" ON public.profiles
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;
