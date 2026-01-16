-- Sprint 9C: Parent Experience MVP
-- Run this SQL in your Supabase SQL Editor

-- 1. Add assigned_by columns to user_tasks table
-- This allows students to see which tasks were assigned by their parent
ALTER TABLE public.user_tasks
ADD COLUMN IF NOT EXISTS assigned_by_user_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS assigned_by_role text;

-- 2. Create index for faster lookups of assigned tasks
CREATE INDEX IF NOT EXISTS user_tasks_assigned_by_idx ON public.user_tasks(assigned_by_user_id);

-- 3. Add comment for documentation
COMMENT ON COLUMN public.user_tasks.assigned_by_user_id IS 'User ID of the person who assigned this task (e.g., parent)';
COMMENT ON COLUMN public.user_tasks.assigned_by_role IS 'Role of the person who assigned this task (e.g., parent, teacher)';
