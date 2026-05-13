-- Sprint 3 Database Tables
-- Run this SQL in your Supabase SQL Editor

-- 1. Add role column to profiles (if not already present)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS role text CHECK (role IN ('student', 'parent', 'teacher', 'business')) DEFAULT 'student';

-- 2. Parent-Student Links table
CREATE TABLE IF NOT EXISTS public.parent_student_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(parent_user_id, student_user_id)
);

-- Enable RLS on parent_student_links
ALTER TABLE public.parent_student_links ENABLE ROW LEVEL SECURITY;

-- RLS policies for parent_student_links
CREATE POLICY "Parents can view their own links" ON public.parent_student_links
  FOR SELECT USING (auth.uid() = parent_user_id);

CREATE POLICY "Students can view links to them" ON public.parent_student_links
  FOR SELECT USING (auth.uid() = student_user_id);

CREATE POLICY "Parents can create links" ON public.parent_student_links
  FOR INSERT WITH CHECK (auth.uid() = parent_user_id);

CREATE POLICY "Students can update link status" ON public.parent_student_links
  FOR UPDATE USING (auth.uid() = student_user_id);

CREATE POLICY "Parents can delete their links" ON public.parent_student_links
  FOR DELETE USING (auth.uid() = parent_user_id);

-- 3. Schools table
CREATE TABLE IF NOT EXISTS public.schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text,
  state text,
  zip text,
  nces_id text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on schools
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- RLS policies for schools (public read)
CREATE POLICY "Anyone can view schools" ON public.schools
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create schools" ON public.schools
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 4. School Memberships table
CREATE TABLE IF NOT EXISTS public.school_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('student', 'teacher', 'staff', 'admin')) DEFAULT 'student',
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(school_id, user_id)
);

-- Enable RLS on school_memberships
ALTER TABLE public.school_memberships ENABLE ROW LEVEL SECURITY;

-- RLS policies for school_memberships
CREATE POLICY "Users can view their own memberships" ON public.school_memberships
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view memberships at their school" ON public.school_memberships
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.school_memberships sm
      WHERE sm.user_id = auth.uid() AND sm.school_id = school_memberships.school_id
    )
  );

CREATE POLICY "Users can create their own memberships" ON public.school_memberships
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own memberships" ON public.school_memberships
  FOR DELETE USING (auth.uid() = user_id);

-- 5. Opportunities table (for business listings)
CREATE TABLE IF NOT EXISTS public.opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_name text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  type text NOT NULL CHECK (type IN ('internship', 'webinar', 'seminar')),
  start_at timestamp with time zone,
  end_at timestamp with time zone,
  apply_url text,
  is_remote boolean DEFAULT false,
  state text,
  counties text[] DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on opportunities
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

-- RLS policies for opportunities
CREATE POLICY "Anyone can view opportunities" ON public.opportunities
  FOR SELECT USING (true);

CREATE POLICY "Business users can create opportunities" ON public.opportunities
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'business'
    )
  );

CREATE POLICY "Business users can update their own opportunities" ON public.opportunities
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Business users can delete their own opportunities" ON public.opportunities
  FOR DELETE USING (auth.uid() = created_by);

-- 6. Add created_by and assigned_by_role to tasks table (for parent task assignment)
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS assigned_by_role text;

-- 7. Update tasks RLS to allow parents to view/create tasks for linked students
CREATE POLICY "Parents can view linked student tasks" ON public.tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.parent_student_links
      WHERE parent_user_id = auth.uid()
        AND student_user_id = tasks.user_id
        AND status = 'accepted'
    )
  );

CREATE POLICY "Parents can create tasks for linked students" ON public.tasks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.parent_student_links
      WHERE parent_user_id = auth.uid()
        AND student_user_id = tasks.user_id
        AND status = 'accepted'
    )
  );

-- 8. Helper function to get user ID by email (for parent linking)
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(email_input text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT id FROM auth.users WHERE email = email_input LIMIT 1;
$$;
