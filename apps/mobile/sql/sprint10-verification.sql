-- Sprint 10: Verification Banners & Trust Layer
-- Run this SQL in Supabase SQL Editor

-- Add verification fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS verification_status text
  CHECK (verification_status IN ('unverified', 'pending', 'verified'))
  DEFAULT 'unverified',
ADD COLUMN IF NOT EXISTS verification_requested_at timestamptz;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.verification_status IS 'Verification status for business/teacher accounts: unverified, pending, verified';
COMMENT ON COLUMN public.profiles.verification_requested_at IS 'Timestamp when verification was requested';
