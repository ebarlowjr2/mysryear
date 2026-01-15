-- Sprint 9A: Profile Completion Fields
-- Run this SQL in your Supabase SQL Editor

-- Add profile fields for name, graduation, location, notifications, and waitlists
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text,
ADD COLUMN IF NOT EXISTS graduation_year int,
ADD COLUMN IF NOT EXISTS state text,
ADD COLUMN IF NOT EXISTS county text,
ADD COLUMN IF NOT EXISTS notifications_tasks boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notifications_deadlines boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS waitlist_ai_aura boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS waitlist_drive boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS waitlist_onedrive boolean DEFAULT false;

-- Add updated_at trigger for profiles if not exists
CREATE OR REPLACE FUNCTION update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_profiles_updated_at();

-- Note: RLS policies for profiles should already exist
-- User can select their own profile: user_id = auth.uid()
-- User can update their own profile: user_id = auth.uid()
