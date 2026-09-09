-- ==============================================================================
-- Migration: Add created_by column to public.materials & update RLS policies
-- Date: 2026-09-09
-- Purpose:
--   1. Add created_by UUID column referencing auth.users(id) if not present
--   2. Backfill existing records with user_id
--   3. Create performance index on created_by
--   4. Update Row Level Security (RLS) policies to allow authorized admins to insert
--   5. Reload PostgREST schema cache
-- ==============================================================================

-- 1. Ensure public.materials table exists
CREATE TABLE IF NOT EXISTS public.materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  material_type text NOT NULL DEFAULT 'lecture_note',
  file_url text,
  file_name text,
  external_url text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Add created_by column if it does not already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'materials' 
      AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.materials 
      ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid();
  END IF;
END $$;

-- 3. Backfill created_by with user_id for existing rows where created_by is NULL
UPDATE public.materials 
SET created_by = user_id 
WHERE created_by IS NULL AND user_id IS NOT NULL;

-- 4. Create index on created_by for optimized query lookups
CREATE INDEX IF NOT EXISTS idx_materials_created_by ON public.materials(created_by);
CREATE INDEX IF NOT EXISTS idx_materials_course_id ON public.materials(course_id);

-- 5. Enable Row Level Security
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

-- 6. Ensure public.is_admin() helper function exists
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT coalesce(
    (SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- 7. Configure Row Level Security (RLS) Policies on public.materials

-- 7.1 SELECT: All authenticated users can view study materials
DROP POLICY IF EXISTS "All authenticated users can view materials" ON public.materials;
DROP POLICY IF EXISTS "Users can view own materials" ON public.materials;
CREATE POLICY "All authenticated users can view materials"
  ON public.materials FOR SELECT
  TO authenticated
  USING (true);

-- 7.2 INSERT: Authorized admins can insert study materials (or authenticated users setting created_by = auth.uid())
DROP POLICY IF EXISTS "Admins can insert materials" ON public.materials;
DROP POLICY IF EXISTS "Users can insert own materials" ON public.materials;
CREATE POLICY "Admins can insert materials"
  ON public.materials FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin() 
    OR auth.uid() = created_by 
    OR auth.uid() = user_id
  );

-- 7.3 UPDATE: Authorized admins or owners can update materials
DROP POLICY IF EXISTS "Admins can update materials" ON public.materials;
DROP POLICY IF EXISTS "Users can update own materials" ON public.materials;
CREATE POLICY "Admins can update materials"
  ON public.materials FOR UPDATE
  TO authenticated
  USING (
    public.is_admin() 
    OR auth.uid() = created_by 
    OR auth.uid() = user_id
  )
  WITH CHECK (
    public.is_admin() 
    OR auth.uid() = created_by 
    OR auth.uid() = user_id
  );

-- 7.4 DELETE: Authorized admins or owners can delete materials
DROP POLICY IF EXISTS "Admins can delete materials" ON public.materials;
DROP POLICY IF EXISTS "Users can delete own materials" ON public.materials;
CREATE POLICY "Admins can delete materials"
  ON public.materials FOR DELETE
  TO authenticated
  USING (
    public.is_admin() 
    OR auth.uid() = created_by 
    OR auth.uid() = user_id
  );

-- 8. Refresh PostgREST schema cache so the new column is immediately active
NOTIFY pgrst, 'reload schema';
