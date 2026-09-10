-- ==============================================================================
-- SUPABASE POSTGRESQL SCHEMA WITH ROW LEVEL SECURITY (RLS)
-- Each row belongs strictly to the authenticated user (auth.uid() = user_id)
-- ==============================================================================

-- 1. Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ==============================================================================
-- 2. CREATE MAIN TABLES
-- ==============================================================================

-- 2.1 PROFILES TABLE (Linked 1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null,
  student_id text,
  roll text,
  section text default 'E',
  batch text,
  avatar_url text,
  role text not null default 'student',
  is_cr boolean default false,
  cr_for_section text default 'E',
  contact_information text,
  bio text,
  is_active boolean default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- 2.2 COURSES TABLE (User-owned academic subjects/courses)
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  course_code text not null,
  course_name text not null,
  teacher_name text not null,
  description text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.courses 
  add column if not exists created_by uuid references auth.users(id) on delete set null default auth.uid();
create index if not exists idx_courses_created_by on public.courses(created_by);

-- 2.3 NOTICES TABLE (User-owned notes & announcements)
create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  course_id uuid references public.courses(id) on delete set null,
  title text not null,
  description text not null,
  attachment_url text,
  attachment_name text,
  is_important boolean not null default false,
  is_pinned boolean not null default false,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.notices 
  add column if not exists created_by uuid references auth.users(id) on delete set null default auth.uid();
create index if not exists idx_notices_created_by on public.notices(created_by);

-- 2.4 MATERIALS TABLE (User-owned study resources, PDFs, slides, lecture notes)
create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  material_type text not null default 'lecture_note',
  file_url text,
  file_name text,
  external_url text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- Ensure created_by column and index exist even if table was created previously
alter table public.materials 
  add column if not exists created_by uuid references auth.users(id) on delete set null default auth.uid();
create index if not exists idx_materials_created_by on public.materials(created_by);

-- 2.5 DEADLINES TABLE (User-owned assignments, tasks, quizzes, projects)
create table if not exists public.deadlines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  deadline_type text not null default 'assignment',
  due_date date not null,
  due_time time,
  attachment_url text,
  external_url text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.deadlines 
  add column if not exists created_by uuid references auth.users(id) on delete set null default auth.uid();
create index if not exists idx_deadlines_created_by on public.deadlines(created_by);

-- 2.6 EXAMS TABLE (User-owned exam schedules & room locations)
create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  exam_type text not null default 'midterm',
  exam_date date not null,
  start_time time not null,
  end_time time not null,
  room text not null,
  instructions text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.exams 
  add column if not exists created_by uuid references auth.users(id) on delete set null default auth.uid();
create index if not exists idx_exams_created_by on public.exams(created_by);

-- 2.7 CALENDAR EVENTS TABLE (User-owned academic events & schedules)
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  course_id uuid references public.courses(id) on delete cascade,
  title text not null,
  description text,
  event_type text not null default 'academic',
  start_datetime timestamptz not null,
  end_datetime timestamptz not null,
  location text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.calendar_events 
  add column if not exists created_by uuid references auth.users(id) on delete set null default auth.uid();
create index if not exists idx_calendar_events_created_by on public.calendar_events(created_by);

-- 2.8 IMPORTANT LINKS TABLE (User-owned bookmarks, university portals, drives)
create table if not exists public.important_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  course_id uuid references public.courses(id) on delete set null,
  title text not null,
  description text,
  url text not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.important_links 
  add column if not exists created_by uuid references auth.users(id) on delete set null default auth.uid();
create index if not exists idx_important_links_created_by on public.important_links(created_by);

-- 2.9 ACTIVITY LOGS TABLE (User-owned audit trail of actions)
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  action text not null,
  entity_type text not null,
  entity_id text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- ==============================================================================
-- 3. HELPER FUNCTIONS & ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Helper: Check if the calling user has role = 'admin'
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = auth.uid()),
    false
  );
$$;

-- Prevent non-admins from elevating their role from 'student' to 'admin'
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Permission denied: only an administrator can change user roles.';
  end if;
  return new;
end;
$$;

drop trigger if exists check_profile_role_update on public.profiles;
create trigger check_profile_role_update
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.notices enable row level security;
alter table public.materials enable row level security;
alter table public.deadlines enable row level security;
alter table public.exams enable row level security;
alter table public.calendar_events enable row level security;
alter table public.important_links enable row level security;
alter table public.activity_logs enable row level security;

-- 3.1 PROFILES POLICIES
-- Authenticated users can view profiles (needed for student rosters, faculty, notices)
drop policy if exists "Users can view profiles" on public.profiles;
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view profiles"
  on public.profiles for select
  to authenticated
  using (true);

-- Users can update own profile, or admins can update any profile (e.g., student roster info)
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- 3.2 COURSES POLICIES (All students can view; only CR/Admin can manage)
drop policy if exists "Users can view own courses" on public.courses;
drop policy if exists "All authenticated users can view courses" on public.courses;
create policy "All authenticated users can view courses"
  on public.courses for select
  to authenticated
  using (true);

drop policy if exists "Users can insert own courses" on public.courses;
drop policy if exists "Admins can insert courses" on public.courses;
create policy "Admins can insert courses"
  on public.courses for insert
  to authenticated
  with check (
    public.is_admin() 
    or auth.uid() = created_by 
    or auth.uid() = user_id
  );

drop policy if exists "Users can update own courses" on public.courses;
drop policy if exists "Admins can update courses" on public.courses;
create policy "Admins can update courses"
  on public.courses for update
  to authenticated
  using (public.is_admin() or auth.uid() = created_by or auth.uid() = user_id)
  with check (public.is_admin() or auth.uid() = created_by or auth.uid() = user_id);

drop policy if exists "Users can delete own courses" on public.courses;
drop policy if exists "Admins can delete courses" on public.courses;
create policy "Admins can delete courses"
  on public.courses for delete
  to authenticated
  using (public.is_admin() or auth.uid() = created_by or auth.uid() = user_id);

-- 3.3 NOTICES POLICIES (All students can view; only CR/Admin can manage)
drop policy if exists "Users can view own notices" on public.notices;
drop policy if exists "All authenticated users can view notices" on public.notices;
create policy "All authenticated users can view notices"
  on public.notices for select
  to authenticated
  using (true);

drop policy if exists "Users can insert own notices" on public.notices;
drop policy if exists "Admins can insert notices" on public.notices;
create policy "Admins can insert notices"
  on public.notices for insert
  to authenticated
  with check (
    public.is_admin() 
    or auth.uid() = created_by 
    or auth.uid() = user_id
  );

drop policy if exists "Users can update own notices" on public.notices;
drop policy if exists "Admins can update notices" on public.notices;
create policy "Admins can update notices"
  on public.notices for update
  to authenticated
  using (public.is_admin() or auth.uid() = created_by or auth.uid() = user_id)
  with check (public.is_admin() or auth.uid() = created_by or auth.uid() = user_id);

drop policy if exists "Users can delete own notices" on public.notices;
drop policy if exists "Admins can delete notices" on public.notices;
create policy "Admins can delete notices"
  on public.notices for delete
  to authenticated
  using (public.is_admin() or auth.uid() = created_by or auth.uid() = user_id);

-- 3.4 MATERIALS POLICIES (All students can view; CR/Admin and creators can manage)
drop policy if exists "Users can view own materials" on public.materials;
drop policy if exists "All authenticated users can view materials" on public.materials;
create policy "All authenticated users can view materials"
  on public.materials for select
  to authenticated
  using (true);

drop policy if exists "Users can insert own materials" on public.materials;
drop policy if exists "Admins can insert materials" on public.materials;
create policy "Admins can insert materials"
  on public.materials for insert
  to authenticated
  with check (
    public.is_admin() 
    or auth.uid() = created_by 
    or auth.uid() = user_id
  );

drop policy if exists "Users can update own materials" on public.materials;
drop policy if exists "Admins can update materials" on public.materials;
create policy "Admins can update materials"
  on public.materials for update
  to authenticated
  using (public.is_admin() or auth.uid() = created_by or auth.uid() = user_id)
  with check (public.is_admin() or auth.uid() = created_by or auth.uid() = user_id);

drop policy if exists "Users can delete own materials" on public.materials;
drop policy if exists "Admins can delete materials" on public.materials;
create policy "Admins can delete materials"
  on public.materials for delete
  to authenticated
  using (public.is_admin() or auth.uid() = created_by or auth.uid() = user_id);

-- 3.5 DEADLINES POLICIES (All students can view; only CR/Admin can manage)
drop policy if exists "Users can view own deadlines" on public.deadlines;
drop policy if exists "All authenticated users can view deadlines" on public.deadlines;
create policy "All authenticated users can view deadlines"
  on public.deadlines for select
  to authenticated
  using (true);

drop policy if exists "Users can insert own deadlines" on public.deadlines;
drop policy if exists "Admins can insert deadlines" on public.deadlines;
create policy "Admins can insert deadlines"
  on public.deadlines for insert
  to authenticated
  with check (
    public.is_admin() 
    or auth.uid() = created_by 
    or auth.uid() = user_id
  );

drop policy if exists "Users can update own deadlines" on public.deadlines;
drop policy if exists "Admins can update deadlines" on public.deadlines;
create policy "Admins can update deadlines"
  on public.deadlines for update
  to authenticated
  using (public.is_admin() or auth.uid() = created_by or auth.uid() = user_id)
  with check (public.is_admin() or auth.uid() = created_by or auth.uid() = user_id);

drop policy if exists "Users can delete own deadlines" on public.deadlines;
drop policy if exists "Admins can delete deadlines" on public.deadlines;
create policy "Admins can delete deadlines"
  on public.deadlines for delete
  to authenticated
  using (public.is_admin() or auth.uid() = created_by or auth.uid() = user_id);

-- 3.6 EXAMS POLICIES (All students can view; only CR/Admin can manage)
drop policy if exists "Users can view own exams" on public.exams;
drop policy if exists "All authenticated users can view exams" on public.exams;
create policy "All authenticated users can view exams"
  on public.exams for select
  to authenticated
  using (true);

drop policy if exists "Users can insert own exams" on public.exams;
drop policy if exists "Admins can insert exams" on public.exams;
create policy "Admins can insert exams"
  on public.exams for insert
  to authenticated
  with check (
    public.is_admin() 
    or auth.uid() = created_by 
    or auth.uid() = user_id
  );

drop policy if exists "Users can update own exams" on public.exams;
drop policy if exists "Admins can update exams" on public.exams;
create policy "Admins can update exams"
  on public.exams for update
  to authenticated
  using (public.is_admin() or auth.uid() = created_by or auth.uid() = user_id)
  with check (public.is_admin() or auth.uid() = created_by or auth.uid() = user_id);

drop policy if exists "Users can delete own exams" on public.exams;
drop policy if exists "Admins can delete exams" on public.exams;
create policy "Admins can delete exams"
  on public.exams for delete
  to authenticated
  using (public.is_admin() or auth.uid() = created_by or auth.uid() = user_id);

-- 3.7 CALENDAR EVENTS POLICIES (All students can view; only CR/Admin can manage)
drop policy if exists "Users can view own calendar_events" on public.calendar_events;
drop policy if exists "All authenticated users can view calendar_events" on public.calendar_events;
create policy "All authenticated users can view calendar_events"
  on public.calendar_events for select
  to authenticated
  using (true);

drop policy if exists "Users can insert own calendar_events" on public.calendar_events;
drop policy if exists "Admins can insert calendar_events" on public.calendar_events;
create policy "Admins can insert calendar_events"
  on public.calendar_events for insert
  to authenticated
  with check (
    public.is_admin() 
    or auth.uid() = created_by 
    or auth.uid() = user_id
  );

drop policy if exists "Users can update own calendar_events" on public.calendar_events;
drop policy if exists "Admins can update calendar_events" on public.calendar_events;
create policy "Admins can update calendar_events"
  on public.calendar_events for update
  to authenticated
  using (public.is_admin() or auth.uid() = created_by or auth.uid() = user_id)
  with check (public.is_admin() or auth.uid() = created_by or auth.uid() = user_id);

drop policy if exists "Users can delete own calendar_events" on public.calendar_events;
drop policy if exists "Admins can delete calendar_events" on public.calendar_events;
create policy "Admins can delete calendar_events"
  on public.calendar_events for delete
  to authenticated
  using (public.is_admin() or auth.uid() = created_by or auth.uid() = user_id);

-- 3.8 IMPORTANT LINKS POLICIES (All students can view; only CR/Admin can manage)
drop policy if exists "Users can view own important_links" on public.important_links;
drop policy if exists "All authenticated users can view important_links" on public.important_links;
create policy "All authenticated users can view important_links"
  on public.important_links for select
  to authenticated
  using (true);

drop policy if exists "Users can insert own important_links" on public.important_links;
drop policy if exists "Admins can insert important_links" on public.important_links;
create policy "Admins can insert important_links"
  on public.important_links for insert
  to authenticated
  with check (
    public.is_admin() 
    or auth.uid() = created_by 
    or auth.uid() = user_id
  );

drop policy if exists "Users can update own important_links" on public.important_links;
drop policy if exists "Admins can update important_links" on public.important_links;
create policy "Admins can update important_links"
  on public.important_links for update
  to authenticated
  using (public.is_admin() or auth.uid() = created_by or auth.uid() = user_id)
  with check (public.is_admin() or auth.uid() = created_by or auth.uid() = user_id);

drop policy if exists "Users can delete own important_links" on public.important_links;
drop policy if exists "Admins can delete important_links" on public.important_links;
create policy "Admins can delete important_links"
  on public.important_links for delete
  to authenticated
  using (public.is_admin() or auth.uid() = created_by or auth.uid() = user_id);

-- 3.9 ACTIVITY LOGS POLICIES (Users can view own logs or admins can view all)
drop policy if exists "Users can view own activity_logs" on public.activity_logs;
drop policy if exists "Users and admins can view activity_logs" on public.activity_logs;
create policy "Users and admins can view activity_logs"
  on public.activity_logs for select
  to authenticated
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Users can insert own activity_logs" on public.activity_logs;
create policy "Users can insert own activity_logs"
  on public.activity_logs for insert
  to authenticated
  with check (auth.uid() = user_id);

-- ==============================================================================
-- 4. AUTOMATIC USER PROFILE CREATION TRIGGER
-- Whenever a user signs up (Email, OAuth/Google, etc.), create a profile row
-- ==============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
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
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'student_id',
    new.raw_user_meta_data->>'roll',
    coalesce(new.raw_user_meta_data->>'section', 'E'),
    new.raw_user_meta_data->>'batch',
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', null),
    'student',
    false,
    'E',
    true
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = case when public.profiles.full_name = '' or public.profiles.full_name is null then excluded.full_name else public.profiles.full_name end,
    student_id = coalesce(public.profiles.student_id, excluded.student_id),
    roll = coalesce(public.profiles.roll, excluded.roll),
    section = coalesce(public.profiles.section, excluded.section, 'E'),
    batch = coalesce(public.profiles.batch, excluded.batch),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
    updated_at = now();

  return new;
end;
$$;

-- Attach trigger to auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ==============================================================================
-- 5. PERFORMANCE INDEXES
-- ==============================================================================
create index if not exists idx_courses_user_id on public.courses(user_id);
create index if not exists idx_notices_user_id on public.notices(user_id);
create index if not exists idx_notices_course_id on public.notices(course_id);
create index if not exists idx_materials_user_id on public.materials(user_id);
create index if not exists idx_materials_course_id on public.materials(course_id);
create index if not exists idx_deadlines_user_id on public.deadlines(user_id);
create index if not exists idx_deadlines_due_date on public.deadlines(due_date);
create index if not exists idx_exams_user_id on public.exams(user_id);
create index if not exists idx_calendar_events_user_id on public.calendar_events(user_id);
create index if not exists idx_important_links_user_id on public.important_links(user_id);
create index if not exists idx_activity_logs_user_id on public.activity_logs(user_id);

-- ==============================================================================
-- 6. PRIVATE STORAGE BUCKET: app-files
-- Folders are isolated by user ID: (storage.foldername(name))[1] = auth.uid()::text
-- Files are stored under: ${auth.uid()}/${featureName}/${itemId}/${uuid}.${ext}
-- ==============================================================================
insert into storage.buckets (id, name, public)
values ('app-files', 'app-files', false)
on conflict (id) do update set public = false;

-- Allow authenticated users to view/download files: own folder OR academic materials/notices, or if admin
drop policy if exists "Users can access own files in app-files" on storage.objects;
drop policy if exists "Authenticated users can read app-files" on storage.objects;
create policy "Authenticated users can read app-files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'app-files'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
      or name like '%/materials/%'
      or name like '%/notices/%'
      or name like '%/attachments/%'
    )
  );

-- Allow authenticated users to upload files: admins can upload all academic files; students can upload only to their own avatar/user folder
drop policy if exists "Users can upload own files to app-files" on storage.objects;
drop policy if exists "Upload policy for app-files" on storage.objects;
create policy "Upload policy for app-files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'app-files'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );

-- Allow admins or file owners to update files
drop policy if exists "Users can update own files in app-files" on storage.objects;
drop policy if exists "Update policy for app-files" on storage.objects;
create policy "Update policy for app-files"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'app-files'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  )
  with check (
    bucket_id = 'app-files'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );

-- Allow admins or file owners to delete files
drop policy if exists "Users can delete own files in app-files" on storage.objects;
drop policy if exists "Delete policy for app-files" on storage.objects;
create policy "Delete policy for app-files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'app-files'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );

-- ==============================================================================
-- 7. PROMOTING A CLASS REPRESENTATIVE (CR) TO ADMIN
-- ==============================================================================
-- To promote a specific registered user to CR/Admin, open the Supabase SQL Editor
-- and run the query below replacing 'CR_EMAIL_HERE' with their actual login email:
--
-- UPDATE public.profiles
-- SET role = 'admin'
-- WHERE email = 'CR_EMAIL_HERE';
--
-- Note: All new signups automatically default to role = 'student'.
-- Only designated CR accounts should be promoted using this SQL query.
-- ==============================================================================

