-- ==============================================================================
-- Migration: Add created_by column & update RLS policies across all admin modules
-- Date: 2026-09-09
-- Purpose:
--   1. Add created_by UUID REFERENCES auth.users(id) to all content tables:
--      - notices
--      - courses
--      - materials
--      - deadlines
--      - exams
--      - calendar_events (academic calendar)
--      - important_links
--      - academic_calendar, routine, student_directory, broadcast_alerts, notifications (if present)
--   2. Backfill existing records with user_id so created_by is never orphaned
--   3. Create performance indexes on created_by across all tables
--   4. Update Row Level Security (RLS) policies allowing authorized admins and creators
--      to INSERT/UPDATE records containing created_by
--   5. Reload the PostgREST schema cache
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Helper function: public.is_admin()
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = auth.uid() 
      AND role = 'admin'
  );
$$;

-- ------------------------------------------------------------------------------
-- 2. Module: NOTICES
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notices') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'notices' AND column_name = 'created_by'
    ) THEN
      ALTER TABLE public.notices 
        ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid();
    END IF;
  END IF;
END $$;

UPDATE public.notices 
SET created_by = user_id 
WHERE created_by IS NULL AND user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notices_created_by ON public.notices(created_by);
CREATE INDEX IF NOT EXISTS idx_notices_user_id ON public.notices(user_id);
CREATE INDEX IF NOT EXISTS idx_notices_course_id ON public.notices(course_id);

ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can insert notices" ON public.notices;
DROP POLICY IF EXISTS "Admins can update notices" ON public.notices;
DROP POLICY IF EXISTS "Admins can delete notices" ON public.notices;
DROP POLICY IF EXISTS "Anyone can view notices" ON public.notices;
DROP POLICY IF EXISTS "Authenticated users can view notices" ON public.notices;

CREATE POLICY "Authenticated users can view notices"
  ON public.notices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert notices"
  ON public.notices FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin() 
    OR auth.uid() = created_by 
    OR auth.uid() = user_id
  );

CREATE POLICY "Admins can update notices"
  ON public.notices FOR UPDATE
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

CREATE POLICY "Admins can delete notices"
  ON public.notices FOR DELETE
  TO authenticated
  USING (
    public.is_admin() 
    OR auth.uid() = created_by 
    OR auth.uid() = user_id
  );

-- ------------------------------------------------------------------------------
-- 3. Module: COURSES
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'courses') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'created_by'
    ) THEN
      ALTER TABLE public.courses 
        ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid();
    END IF;
  END IF;
END $$;

UPDATE public.courses 
SET created_by = user_id 
WHERE created_by IS NULL AND user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_courses_created_by ON public.courses(created_by);
CREATE INDEX IF NOT EXISTS idx_courses_user_id ON public.courses(user_id);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can insert courses" ON public.courses;
DROP POLICY IF EXISTS "Admins can update courses" ON public.courses;
DROP POLICY IF EXISTS "Admins can delete courses" ON public.courses;
DROP POLICY IF EXISTS "Authenticated users can view courses" ON public.courses;

CREATE POLICY "Authenticated users can view courses"
  ON public.courses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert courses"
  ON public.courses FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin() 
    OR auth.uid() = created_by 
    OR auth.uid() = user_id
  );

CREATE POLICY "Admins can update courses"
  ON public.courses FOR UPDATE
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

CREATE POLICY "Admins can delete courses"
  ON public.courses FOR DELETE
  TO authenticated
  USING (
    public.is_admin() 
    OR auth.uid() = created_by 
    OR auth.uid() = user_id
  );

-- ------------------------------------------------------------------------------
-- 4. Module: STUDY MATERIALS
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'materials') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'materials' AND column_name = 'created_by'
    ) THEN
      ALTER TABLE public.materials 
        ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid();
    END IF;
  END IF;
END $$;

UPDATE public.materials 
SET created_by = user_id 
WHERE created_by IS NULL AND user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_materials_created_by ON public.materials(created_by);
CREATE INDEX IF NOT EXISTS idx_materials_user_id ON public.materials(user_id);
CREATE INDEX IF NOT EXISTS idx_materials_course_id ON public.materials(course_id);

ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can insert materials" ON public.materials;
DROP POLICY IF EXISTS "Admins can update materials" ON public.materials;
DROP POLICY IF EXISTS "Admins can delete materials" ON public.materials;
DROP POLICY IF EXISTS "Authenticated users can view materials" ON public.materials;

CREATE POLICY "Authenticated users can view materials"
  ON public.materials FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert materials"
  ON public.materials FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin() 
    OR auth.uid() = created_by 
    OR auth.uid() = user_id
  );

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

CREATE POLICY "Admins can delete materials"
  ON public.materials FOR DELETE
  TO authenticated
  USING (
    public.is_admin() 
    OR auth.uid() = created_by 
    OR auth.uid() = user_id
  );

-- ------------------------------------------------------------------------------
-- 5. Module: DEADLINES & ASSIGNMENTS
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'deadlines') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'deadlines' AND column_name = 'created_by'
    ) THEN
      ALTER TABLE public.deadlines 
        ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid();
    END IF;
  END IF;
END $$;

UPDATE public.deadlines 
SET created_by = user_id 
WHERE created_by IS NULL AND user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_deadlines_created_by ON public.deadlines(created_by);
CREATE INDEX IF NOT EXISTS idx_deadlines_user_id ON public.deadlines(user_id);
CREATE INDEX IF NOT EXISTS idx_deadlines_course_id ON public.deadlines(course_id);

ALTER TABLE public.deadlines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can insert deadlines" ON public.deadlines;
DROP POLICY IF EXISTS "Admins can update deadlines" ON public.deadlines;
DROP POLICY IF EXISTS "Admins can delete deadlines" ON public.deadlines;
DROP POLICY IF EXISTS "Authenticated users can view deadlines" ON public.deadlines;

CREATE POLICY "Authenticated users can view deadlines"
  ON public.deadlines FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert deadlines"
  ON public.deadlines FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin() 
    OR auth.uid() = created_by 
    OR auth.uid() = user_id
  );

CREATE POLICY "Admins can update deadlines"
  ON public.deadlines FOR UPDATE
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

CREATE POLICY "Admins can delete deadlines"
  ON public.deadlines FOR DELETE
  TO authenticated
  USING (
    public.is_admin() 
    OR auth.uid() = created_by 
    OR auth.uid() = user_id
  );

-- ------------------------------------------------------------------------------
-- 6. Module: EXAMS & ROUTINE
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'exams') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'exams' AND column_name = 'created_by'
    ) THEN
      ALTER TABLE public.exams 
        ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid();
    END IF;
  END IF;
END $$;

UPDATE public.exams 
SET created_by = user_id 
WHERE created_by IS NULL AND user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_exams_created_by ON public.exams(created_by);
CREATE INDEX IF NOT EXISTS idx_exams_user_id ON public.exams(user_id);
CREATE INDEX IF NOT EXISTS idx_exams_course_id ON public.exams(course_id);

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can insert exams" ON public.exams;
DROP POLICY IF EXISTS "Admins can update exams" ON public.exams;
DROP POLICY IF EXISTS "Admins can delete exams" ON public.exams;
DROP POLICY IF EXISTS "Authenticated users can view exams" ON public.exams;

CREATE POLICY "Authenticated users can view exams"
  ON public.exams FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert exams"
  ON public.exams FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin() 
    OR auth.uid() = created_by 
    OR auth.uid() = user_id
  );

CREATE POLICY "Admins can update exams"
  ON public.exams FOR UPDATE
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

CREATE POLICY "Admins can delete exams"
  ON public.exams FOR DELETE
  TO authenticated
  USING (
    public.is_admin() 
    OR auth.uid() = created_by 
    OR auth.uid() = user_id
  );

-- ------------------------------------------------------------------------------
-- 7. Module: CALENDAR EVENTS / ACADEMIC CALENDAR
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'calendar_events') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'calendar_events' AND column_name = 'created_by'
    ) THEN
      ALTER TABLE public.calendar_events 
        ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid();
    END IF;
  END IF;
END $$;

UPDATE public.calendar_events 
SET created_by = user_id 
WHERE created_by IS NULL AND user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by ON public.calendar_events(created_by);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON public.calendar_events(user_id);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can insert calendar_events" ON public.calendar_events;
DROP POLICY IF EXISTS "Admins can update calendar_events" ON public.calendar_events;
DROP POLICY IF EXISTS "Admins can delete calendar_events" ON public.calendar_events;
DROP POLICY IF EXISTS "Authenticated users can view calendar_events" ON public.calendar_events;

CREATE POLICY "Authenticated users can view calendar_events"
  ON public.calendar_events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert calendar_events"
  ON public.calendar_events FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin() 
    OR auth.uid() = created_by 
    OR auth.uid() = user_id
  );

CREATE POLICY "Admins can update calendar_events"
  ON public.calendar_events FOR UPDATE
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

CREATE POLICY "Admins can delete calendar_events"
  ON public.calendar_events FOR DELETE
  TO authenticated
  USING (
    public.is_admin() 
    OR auth.uid() = created_by 
    OR auth.uid() = user_id
  );

-- ------------------------------------------------------------------------------
-- 8. Module: IMPORTANT LINKS
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'important_links') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'important_links' AND column_name = 'created_by'
    ) THEN
      ALTER TABLE public.important_links 
        ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid();
    END IF;
  END IF;
END $$;

UPDATE public.important_links 
SET created_by = user_id 
WHERE created_by IS NULL AND user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_important_links_created_by ON public.important_links(created_by);
CREATE INDEX IF NOT EXISTS idx_important_links_user_id ON public.important_links(user_id);

ALTER TABLE public.important_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can insert important_links" ON public.important_links;
DROP POLICY IF EXISTS "Admins can update important_links" ON public.important_links;
DROP POLICY IF EXISTS "Admins can delete important_links" ON public.important_links;
DROP POLICY IF EXISTS "Authenticated users can view important_links" ON public.important_links;

CREATE POLICY "Authenticated users can view important_links"
  ON public.important_links FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert important_links"
  ON public.important_links FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin() 
    OR auth.uid() = created_by 
    OR auth.uid() = user_id
  );

CREATE POLICY "Admins can update important_links"
  ON public.important_links FOR UPDATE
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

CREATE POLICY "Admins can delete important_links"
  ON public.important_links FOR DELETE
  TO authenticated
  USING (
    public.is_admin() 
    OR auth.uid() = created_by 
    OR auth.uid() = user_id
  );

-- ------------------------------------------------------------------------------
-- 9. Optional / Additional Tables (routine, academic_calendar, broadcast_alerts, notifications, student_directory)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  -- routine
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'routine') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'routine' AND column_name = 'created_by'
    ) THEN
      ALTER TABLE public.routine ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid();
    END IF;
  END IF;

  -- academic_calendar
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'academic_calendar') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'academic_calendar' AND column_name = 'created_by'
    ) THEN
      ALTER TABLE public.academic_calendar ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid();
    END IF;
  END IF;

  -- broadcast_alerts
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'broadcast_alerts') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'broadcast_alerts' AND column_name = 'created_by'
    ) THEN
      ALTER TABLE public.broadcast_alerts ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid();
    END IF;
  END IF;

  -- notifications
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'created_by'
    ) THEN
      ALTER TABLE public.notifications ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid();
    END IF;
  END IF;

  -- student_directory
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'student_directory') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'student_directory' AND column_name = 'created_by'
    ) THEN
      ALTER TABLE public.student_directory ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid();
    END IF;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 10. Force PostgREST schema cache reload
-- ------------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
