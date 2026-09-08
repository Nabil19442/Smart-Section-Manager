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
  section text,
  batch text,
  avatar_url text,
  role text not null default 'student',
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
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- Rows belong strictly to the authenticated user using auth.uid() = user_id
-- ==============================================================================

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
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- 3.2 COURSES POLICIES (Strictly user-owned)
drop policy if exists "Users can view own courses" on public.courses;
create policy "Users can view own courses"
  on public.courses for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own courses" on public.courses;
create policy "Users can insert own courses"
  on public.courses for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own courses" on public.courses;
create policy "Users can update own courses"
  on public.courses for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own courses" on public.courses;
create policy "Users can delete own courses"
  on public.courses for delete
  to authenticated
  using (auth.uid() = user_id);

-- 3.3 NOTICES POLICIES (Strictly user-owned)
drop policy if exists "Users can view own notices" on public.notices;
create policy "Users can view own notices"
  on public.notices for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own notices" on public.notices;
create policy "Users can insert own notices"
  on public.notices for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own notices" on public.notices;
create policy "Users can update own notices"
  on public.notices for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own notices" on public.notices;
create policy "Users can delete own notices"
  on public.notices for delete
  to authenticated
  using (auth.uid() = user_id);

-- 3.4 MATERIALS POLICIES (Strictly user-owned)
drop policy if exists "Users can view own materials" on public.materials;
create policy "Users can view own materials"
  on public.materials for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own materials" on public.materials;
create policy "Users can insert own materials"
  on public.materials for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own materials" on public.materials;
create policy "Users can update own materials"
  on public.materials for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own materials" on public.materials;
create policy "Users can delete own materials"
  on public.materials for delete
  to authenticated
  using (auth.uid() = user_id);

-- 3.5 DEADLINES POLICIES (Strictly user-owned)
drop policy if exists "Users can view own deadlines" on public.deadlines;
create policy "Users can view own deadlines"
  on public.deadlines for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own deadlines" on public.deadlines;
create policy "Users can insert own deadlines"
  on public.deadlines for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own deadlines" on public.deadlines;
create policy "Users can update own deadlines"
  on public.deadlines for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own deadlines" on public.deadlines;
create policy "Users can delete own deadlines"
  on public.deadlines for delete
  to authenticated
  using (auth.uid() = user_id);

-- 3.6 EXAMS POLICIES (Strictly user-owned)
drop policy if exists "Users can view own exams" on public.exams;
create policy "Users can view own exams"
  on public.exams for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own exams" on public.exams;
create policy "Users can insert own exams"
  on public.exams for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own exams" on public.exams;
create policy "Users can update own exams"
  on public.exams for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own exams" on public.exams;
create policy "Users can delete own exams"
  on public.exams for delete
  to authenticated
  using (auth.uid() = user_id);

-- 3.7 CALENDAR EVENTS POLICIES (Strictly user-owned)
drop policy if exists "Users can view own calendar_events" on public.calendar_events;
create policy "Users can view own calendar_events"
  on public.calendar_events for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own calendar_events" on public.calendar_events;
create policy "Users can insert own calendar_events"
  on public.calendar_events for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own calendar_events" on public.calendar_events;
create policy "Users can update own calendar_events"
  on public.calendar_events for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own calendar_events" on public.calendar_events;
create policy "Users can delete own calendar_events"
  on public.calendar_events for delete
  to authenticated
  using (auth.uid() = user_id);

-- 3.8 IMPORTANT LINKS POLICIES (Strictly user-owned)
drop policy if exists "Users can view own important_links" on public.important_links;
create policy "Users can view own important_links"
  on public.important_links for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own important_links" on public.important_links;
create policy "Users can insert own important_links"
  on public.important_links for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own important_links" on public.important_links;
create policy "Users can update own important_links"
  on public.important_links for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own important_links" on public.important_links;
create policy "Users can delete own important_links"
  on public.important_links for delete
  to authenticated
  using (auth.uid() = user_id);

-- 3.9 ACTIVITY LOGS POLICIES (Strictly user-owned)
drop policy if exists "Users can view own activity_logs" on public.activity_logs;
create policy "Users can view own activity_logs"
  on public.activity_logs for select
  to authenticated
  using (auth.uid() = user_id);

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
  insert into public.profiles (id, full_name, email, avatar_url, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', null),
    'student'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = case when public.profiles.full_name = '' then excluded.full_name else public.profiles.full_name end,
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

-- Allow authenticated users to view/download files in their own folder
drop policy if exists "Users can access own files in app-files" on storage.objects;
create policy "Users can access own files in app-files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'app-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to upload files to their own folder
drop policy if exists "Users can upload own files to app-files" on storage.objects;
create policy "Users can upload own files to app-files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'app-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to update files in their own folder
drop policy if exists "Users can update own files in app-files" on storage.objects;
create policy "Users can update own files in app-files"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'app-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'app-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to delete files in their own folder
drop policy if exists "Users can delete own files in app-files" on storage.objects;
create policy "Users can delete own files in app-files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'app-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

