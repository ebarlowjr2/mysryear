-- Sprint 9B: Business Opportunities MVP
-- Run this SQL in your Supabase SQL Editor

-- 1. Create opportunities table
CREATE TABLE IF NOT EXISTS public.opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  org_name text,
  title text NOT NULL,
  type text NOT NULL DEFAULT 'internship'
    CHECK (type IN ('internship', 'webinar', 'seminar', 'volunteer')),
  description text,
  apply_url text,
  location_mode text DEFAULT 'local'
    CHECK (location_mode IN ('local', 'remote', 'hybrid')),

  state text,
  counties text[],

  start_date date,
  deadline date,

  is_published boolean NOT NULL DEFAULT true,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS opportunities_owner_idx ON public.opportunities(owner_user_id);
CREATE INDEX IF NOT EXISTS opportunities_deadline_idx ON public.opportunities(deadline);
CREATE INDEX IF NOT EXISTS opportunities_type_idx ON public.opportunities(type);
CREATE INDEX IF NOT EXISTS opportunities_state_idx ON public.opportunities(state);

-- 3. Add county max 4 constraint
ALTER TABLE public.opportunities
ADD CONSTRAINT opportunities_counties_max4
CHECK (counties IS NULL OR array_length(counties, 1) <= 4);

-- 4. Enable RLS
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies

-- Policy: Anyone authenticated can read published opportunities
CREATE POLICY "opportunities_select_published"
ON public.opportunities FOR SELECT
USING (is_published = true);

-- Policy: Owner can insert their own
CREATE POLICY "opportunities_insert_own"
ON public.opportunities FOR INSERT
WITH CHECK (owner_user_id = auth.uid());

-- Policy: Owner can update their own
CREATE POLICY "opportunities_update_own"
ON public.opportunities FOR UPDATE
USING (owner_user_id = auth.uid());

-- Policy: Owner can delete their own
CREATE POLICY "opportunities_delete_own"
ON public.opportunities FOR DELETE
USING (owner_user_id = auth.uid());

-- 6. Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_opportunities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS opportunities_updated_at ON public.opportunities;
CREATE TRIGGER opportunities_updated_at
  BEFORE UPDATE ON public.opportunities
  FOR EACH ROW
  EXECUTE FUNCTION update_opportunities_updated_at();
