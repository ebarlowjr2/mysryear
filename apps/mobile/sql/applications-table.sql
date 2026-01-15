-- Application Tracker Database Tables
-- Run this SQL in your Supabase SQL Editor

-- Applications table (for tracking college/scholarship/program applications)
-- Note: Web app has college_applications with journey_id, but mobile uses user_id pattern
-- Status values match web app: not_started, in_progress, submitted, accepted, rejected
-- Added: waitlisted, deferred for more complete tracking
CREATE TABLE IF NOT EXISTS public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  college_name text NOT NULL,
  program_name text,                -- optional (e.g., Computer Science)
  application_type text DEFAULT 'college'
    CHECK (application_type IN ('college', 'scholarship', 'program', 'internship')),

  status text NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'submitted', 'accepted', 'rejected', 'waitlisted', 'deferred')),

  deadline date,                    -- target deadline
  date_applied date,                -- when submitted
  portal_url text,                  -- application portal link
  contact_email text,               -- optional (admissions contact)

  -- Match web app fields
  essay_status text DEFAULT 'not_started'
    CHECK (essay_status IN ('not_started', 'draft', 'completed')),
  recommendation_count integer DEFAULT 0,

  fee_amount numeric,               -- optional
  notes text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS applications_user_id_idx ON public.applications(user_id);
CREATE INDEX IF NOT EXISTS applications_deadline_idx ON public.applications(deadline);
CREATE INDEX IF NOT EXISTS applications_status_idx ON public.applications(status);

-- Enable RLS
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies (user can only access their own applications)
CREATE POLICY "applications_select_own"
ON public.applications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "applications_insert_own"
ON public.applications FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "applications_update_own"
ON public.applications FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "applications_delete_own"
ON public.applications FOR DELETE
USING (user_id = auth.uid());

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS applications_updated_at ON public.applications;
CREATE TRIGGER applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION update_applications_updated_at();
