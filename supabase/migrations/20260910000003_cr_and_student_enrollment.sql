-- ==============================================================================
-- MIGRATION: CR AND STUDENT ENROLLMENT SYSTEM (SECTION E)
-- ==============================================================================

-- 1. Extend profiles table with CR identification and enrollment fields
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_cr boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cr_for_section text DEFAULT 'E';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS contact_information text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- 2. Performance indexes for section directory and CR lookup
CREATE INDEX IF NOT EXISTS idx_profiles_section ON public.profiles(section);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_cr ON public.profiles(is_cr);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);

-- 3. Update existing profile for Section E Class Representative (Student ID 251-15-480)
UPDATE public.profiles
SET
  full_name = 'Jawaed Arafat Mashfee',
  student_id = '251-15-480',
  phone = '01955334622',
  role = 'admin',
  is_cr = true,
  cr_for_section = 'E',
  section = 'E',
  batch = '68',
  roll = '480',
  bio = coalesce(bio, 'Feel free to contact me regarding section-related academic matters, class schedules, or exam guidelines.')
WHERE student_id = '251-15-480' OR role = 'admin' OR email IN ('nabilcse442@gmail.com', 'nabilmubashir730@gmail.com', 'admin@university.edu');

-- 4. Enable RLS on profiles (already enabled, ensure policies are comprehensive)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view profiles (students need to view Section E CR and peer directory)
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;
CREATE POLICY "Users can view profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Allow users to update their own profile; admins can update any profile
DROP POLICY IF EXISTS "Users can update profile" ON public.profiles;
CREATE POLICY "Users can update profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- Allow users or triggers to insert their own profile
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- 5. Updated handle_new_user trigger function
-- Enforces that new registrants are enrolled with role='student' and section='E'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    student_id,
    roll,
    section,
    batch,
    avatar_url,
    role,
    is_cr,
    cr_for_section,
    is_active
  )
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'student_id',
    new.raw_user_meta_data->>'roll',
    coalesce(new.raw_user_meta_data->>'section', 'E'),
    new.raw_user_meta_data->>'batch',
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', null),
    'student', -- ALWAYS student for newly registered accounts
    false,
    'E',
    true
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = excluded.email,
    full_name = CASE WHEN public.profiles.full_name = '' OR public.profiles.full_name IS NULL THEN excluded.full_name ELSE public.profiles.full_name END,
    student_id = coalesce(public.profiles.student_id, excluded.student_id),
    roll = coalesce(public.profiles.roll, excluded.roll),
    section = coalesce(public.profiles.section, excluded.section, 'E'),
    batch = coalesce(public.profiles.batch, excluded.batch),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
    updated_at = now();

  RETURN new;
END;
$$;

-- 6. Trigger to prevent normal students from self-promoting to admin or CR status
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Prevent non-admins from changing role, is_cr, or cr_for_section
  IF (new.role IS DISTINCT FROM old.role OR new.is_cr IS DISTINCT FROM old.is_cr) AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied: only an administrator or active CR can modify system role or CR status.';
  END IF;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS tr_protect_profile_role ON public.profiles;
CREATE TRIGGER tr_protect_profile_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_role();

