-- ==============================================================================
-- CAMPUS PORTAL — COMPLETE SUPABASE BACKEND SCHEMA & RLS MIGRATION
-- ==============================================================================
-- This script sets up:
-- 1. Custom extensions & helper functions (is_admin)
-- 2. Complete relational tables with foreign keys and cascading rules
-- 3. Automatic profiles trigger on auth.users signup (default role: student)
-- 4. Strict Row Level Security (RLS) policies on all tables
-- 5. Supabase Storage buckets & policies (study-materials, notice-attachments)
-- 6. Supabase Realtime publication setup
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ==============================================================================
-- 1. HELPER FUNCTION: is_admin()
-- Evaluates the role of the current authenticated user without causing RLS recursion
-- ==============================================================================
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

-- Grant execution to authenticated users
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_admin() to anon;

-- ==============================================================================
-- 2. TABLES DEFINITIONS
-- ==============================================================================

-- 2.1 PROFILES TABLE
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  student_id text,
  roll text,
  section text,
  batch text,
  avatar_url text,
  role text not null default 'student' check (role in ('student', 'admin')),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- 2.2 COURSES TABLE
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  course_code text not null unique,
  course_name text not null,
  teacher_name text not null,
  description text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- 2.3 NOTICES TABLE
create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  course_id uuid references public.courses(id) on delete set null,
  attachment_url text,
  attachment_name text,
  is_important boolean not null default false,
  is_pinned boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- 2.4 MATERIALS TABLE
create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  course_id uuid references public.courses(id) on delete cascade,
  material_type text not null check (
    material_type in (
      'lecture_note',
      'pdf',
      'slide',
      'assignment',
      'lab',
      'previous_question',
      'suggestion',
      'other'
    )
  ),
  file_url text,
  file_name text,
  external_url text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- 2.5 DEADLINES TABLE
create table if not exists public.deadlines (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  course_id uuid references public.courses(id) on delete cascade,
  deadline_type text not null check (
    deadline_type in (
      'assignment',
      'lab_report',
      'quiz',
      'project',
      'presentation',
      'other'
    )
  ),
  due_date date not null,
  due_time time without time zone,
  attachment_url text,
  external_url text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- 2.6 EXAMS TABLE
create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) on delete cascade,
  exam_type text not null check (
    exam_type in (
      'quiz',
      'midterm',
      'final',
      'lab_exam',
      'viva',
      'presentation'
    )
  ),
  exam_date date not null,
  start_time time without time zone not null,
  end_time time without time zone not null,
  room text not null,
  instructions text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- 2.7 CALENDAR EVENTS TABLE
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  course_id uuid references public.courses(id) on delete cascade,
  event_type text not null default 'academic',
  start_datetime timestamptz not null,
  end_datetime timestamptz not null,
  location text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- 2.8 IMPORTANT LINKS TABLE
create table if not exists public.important_links (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  url text not null,
  course_id uuid references public.courses(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- 2.9 NOTIFICATIONS TABLE
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'general',
  related_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- 2.10 ACTIVITY LOGS TABLE
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- ==============================================================================
-- 3. INDEXES FOR PERFORMANCE
-- ==============================================================================
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_notices_course on public.notices(course_id);
create index if not exists idx_notices_pinned on public.notices(is_pinned, is_important);
create index if not exists idx_materials_course on public.materials(course_id);
create index if not exists idx_materials_type on public.materials(material_type);
create index if not exists idx_deadlines_due on public.deadlines(due_date);
create index if not exists idx_deadlines_course on public.deadlines(course_id);
create index if not exists idx_exams_date on public.exams(exam_date);
create index if not exists idx_notifications_user on public.notifications(user_id, is_read);
create index if not exists idx_activity_logs_created on public.activity_logs(created_at desc);

-- ==============================================================================
-- 4. AUTOMATIC USER PROFILES TRIGGER
-- Default registration role: 'student'
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
    role
  ) values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'student_id', null),
    coalesce(new.raw_user_meta_data->>'roll', null),
    coalesce(new.raw_user_meta_data->>'section', null),
    coalesce(new.raw_user_meta_data->>'batch', null),
    coalesce(new.raw_user_meta_data->>'avatar_url', null),
    'student' -- Explicit default. Normal users CANNOT register as admin.
  )
  on conflict (id) do update set
    email = excluded.email,
    updated_at = timezone('utc'::text, now());

  return new;
end;
$$;

-- Drop trigger if already exists and recreate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ==============================================================================
-- 5. ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
-- ==============================================================================
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.notices enable row level security;
alter table public.materials enable row level security;
alter table public.deadlines enable row level security;
alter table public.exams enable row level security;
alter table public.calendar_events enable row level security;
alter table public.important_links enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_logs enable row level security;

-- ==============================================================================
-- 6. ROW LEVEL SECURITY POLICIES
-- ==============================================================================

-- 6.1 PROFILES POLICIES
-- Students can read their own profile, or admins can view all profiles
drop policy if exists "Profiles read policy" on public.profiles;
create policy "Profiles read policy"
  on public.profiles for select
  using (auth.uid() = id or is_admin());

-- Students can only update their own profile, and CANNOT change their role to admin
drop policy if exists "Profiles update policy" on public.profiles;
create policy "Profiles update policy"
  on public.profiles for update
  using (auth.uid() = id or is_admin())
  with check (
    -- If user is regular student, they cannot alter their role
    (auth.uid() = id and role = (select p.role from public.profiles p where p.id = auth.uid()))
    or is_admin()
  );

-- Admins can delete profiles if required
drop policy if exists "Profiles admin delete policy" on public.profiles;
create policy "Profiles admin delete policy"
  on public.profiles for delete
  using (is_admin());

-- 6.2 COURSES POLICIES
-- Authenticated users (students & admins) can read courses
drop policy if exists "Courses select policy" on public.courses;
create policy "Courses select policy"
  on public.courses for select
  to authenticated
  using (true);

-- Only admins can insert, update, or delete courses
drop policy if exists "Courses admin insert policy" on public.courses;
create policy "Courses admin insert policy"
  on public.courses for insert
  to authenticated
  with check (is_admin());

drop policy if exists "Courses admin update policy" on public.courses;
create policy "Courses admin update policy"
  on public.courses for update
  to authenticated
  using (is_admin())
  with check (is_admin());

drop policy if exists "Courses admin delete policy" on public.courses;
create policy "Courses admin delete policy"
  on public.courses for delete
  to authenticated
  using (is_admin());

-- 6.3 NOTICES POLICIES
-- Authenticated users can read notices
drop policy if exists "Notices select policy" on public.notices;
create policy "Notices select policy"
  on public.notices for select
  to authenticated
  using (true);

-- Only admins can insert, update, or delete notices
drop policy if exists "Notices admin insert policy" on public.notices;
create policy "Notices admin insert policy"
  on public.notices for insert
  to authenticated
  with check (is_admin());

drop policy if exists "Notices admin update policy" on public.notices;
create policy "Notices admin update policy"
  on public.notices for update
  to authenticated
  using (is_admin())
  with check (is_admin());

drop policy if exists "Notices admin delete policy" on public.notices;
create policy "Notices admin delete policy"
  on public.notices for delete
  to authenticated
  using (is_admin());

-- 6.4 MATERIALS POLICIES
-- Authenticated users can read materials
drop policy if exists "Materials select policy" on public.materials;
create policy "Materials select policy"
  on public.materials for select
  to authenticated
  using (true);

-- Only admins can insert, update, or delete study materials
drop policy if exists "Materials admin insert policy" on public.materials;
create policy "Materials admin insert policy"
  on public.materials for insert
  to authenticated
  with check (is_admin());

drop policy if exists "Materials admin update policy" on public.materials;
create policy "Materials admin update policy"
  on public.materials for update
  to authenticated
  using (is_admin())
  with check (is_admin());

drop policy if exists "Materials admin delete policy" on public.materials;
create policy "Materials admin delete policy"
  on public.materials for delete
  to authenticated
  using (is_admin());

-- 6.5 DEADLINES POLICIES
-- Authenticated users can read deadlines
drop policy if exists "Deadlines select policy" on public.deadlines;
create policy "Deadlines select policy"
  on public.deadlines for select
  to authenticated
  using (true);

-- Only admins can insert, update, or delete deadlines
drop policy if exists "Deadlines admin insert policy" on public.deadlines;
create policy "Deadlines admin insert policy"
  on public.deadlines for insert
  to authenticated
  with check (is_admin());

drop policy if exists "Deadlines admin update policy" on public.deadlines;
create policy "Deadlines admin update policy"
  on public.deadlines for update
  to authenticated
  using (is_admin())
  with check (is_admin());

drop policy if exists "Deadlines admin delete policy" on public.deadlines;
create policy "Deadlines admin delete policy"
  on public.deadlines for delete
  to authenticated
  using (is_admin());

-- 6.6 EXAMS POLICIES
-- Authenticated users can read exams
drop policy if exists "Exams select policy" on public.exams;
create policy "Exams select policy"
  on public.exams for select
  to authenticated
  using (true);

-- Only admins can insert, update, or delete exams
drop policy if exists "Exams admin insert policy" on public.exams;
create policy "Exams admin insert policy"
  on public.exams for insert
  to authenticated
  with check (is_admin());

drop policy if exists "Exams admin update policy" on public.exams;
create policy "Exams admin update policy"
  on public.exams for update
  to authenticated
  using (is_admin())
  with check (is_admin());

drop policy if exists "Exams admin delete policy" on public.exams;
create policy "Exams admin delete policy"
  on public.exams for delete
  to authenticated
  using (is_admin());

-- 6.7 CALENDAR EVENTS POLICIES
-- Authenticated users can read events
drop policy if exists "Calendar select policy" on public.calendar_events;
create policy "Calendar select policy"
  on public.calendar_events for select
  to authenticated
  using (true);

-- Only admins can modify events
drop policy if exists "Calendar admin insert policy" on public.calendar_events;
create policy "Calendar admin insert policy"
  on public.calendar_events for insert
  to authenticated
  with check (is_admin());

drop policy if exists "Calendar admin update policy" on public.calendar_events;
create policy "Calendar admin update policy"
  on public.calendar_events for update
  to authenticated
  using (is_admin())
  with check (is_admin());

drop policy if exists "Calendar admin delete policy" on public.calendar_events;
create policy "Calendar admin delete policy"
  on public.calendar_events for delete
  to authenticated
  using (is_admin());

-- 6.8 IMPORTANT LINKS POLICIES
-- Authenticated users can read links
drop policy if exists "Links select policy" on public.important_links;
create policy "Links select policy"
  on public.important_links for select
  to authenticated
  using (true);

-- Only admins can modify links
drop policy if exists "Links admin insert policy" on public.important_links;
create policy "Links admin insert policy"
  on public.important_links for insert
  to authenticated
  with check (is_admin());

drop policy if exists "Links admin update policy" on public.important_links;
create policy "Links admin update policy"
  on public.important_links for update
  to authenticated
  using (is_admin())
  with check (is_admin());

drop policy if exists "Links admin delete policy" on public.important_links;
create policy "Links admin delete policy"
  on public.important_links for delete
  to authenticated
  using (is_admin());

-- 6.9 NOTIFICATIONS POLICIES
-- Users can only read their own notifications
drop policy if exists "Notifications select own policy" on public.notifications;
create policy "Notifications select own policy"
  on public.notifications for select
  to authenticated
  using (auth.uid() = user_id);

-- Users can update (mark as read) their own notifications
drop policy if exists "Notifications update own policy" on public.notifications;
create policy "Notifications update own policy"
  on public.notifications for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Admins or system can insert notifications
drop policy if exists "Notifications insert policy" on public.notifications;
create policy "Notifications insert policy"
  on public.notifications for insert
  to authenticated
  with check (auth.uid() = user_id or is_admin());

-- 6.10 ACTIVITY LOGS POLICIES
-- Only admins can read activity logs
drop policy if exists "Activity logs select policy" on public.activity_logs;
create policy "Activity logs select policy"
  on public.activity_logs for select
  to authenticated
  using (is_admin());

-- Any authenticated user can insert an activity log entry for their own action
drop policy if exists "Activity logs insert policy" on public.activity_logs;
create policy "Activity logs insert policy"
  on public.activity_logs for insert
  to authenticated
  with check (auth.uid() = user_id or auth.uid() is not null);

-- ==============================================================================
-- 7. SUPABASE STORAGE BUCKETS & POLICIES
-- ==============================================================================
-- Insert buckets if not exists
insert into storage.buckets (id, name, public)
values ('study-materials', 'study-materials', true),
       ('notice-attachments', 'notice-attachments', true)
on conflict (id) do update set public = true;

-- Storage Read Policy: Authenticated users can read study-materials and notice-attachments
drop policy if exists "Study materials read policy" on storage.objects;
create policy "Study materials read policy"
  on storage.objects for select
  to authenticated
  using (bucket_id in ('study-materials', 'notice-attachments'));

-- Storage Write Policy: Only admins can upload to study-materials and notice-attachments
drop policy if exists "Study materials admin insert policy" on storage.objects;
create policy "Study materials admin insert policy"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id in ('study-materials', 'notice-attachments')
    and is_admin()
  );

drop policy if exists "Study materials admin update policy" on storage.objects;
create policy "Study materials admin update policy"
  on storage.objects for update
  to authenticated
  using (
    bucket_id in ('study-materials', 'notice-attachments')
    and is_admin()
  );

drop policy if exists "Study materials admin delete policy" on storage.objects;
create policy "Study materials admin delete policy"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id in ('study-materials', 'notice-attachments')
    and is_admin()
  );

-- ==============================================================================
-- 8. REALTIME CONFIGURATION
-- ==============================================================================
-- Add tables to realtime publication
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'notices') then
    alter publication supabase_realtime add table public.notices;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'materials') then
    alter publication supabase_realtime add table public.materials;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'deadlines') then
    alter publication supabase_realtime add table public.deadlines;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'exams') then
    alter publication supabase_realtime add table public.exams;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;

-- ==============================================================================
-- 9. ADMIN PROMOTION PROCEDURE
-- Run this in SQL Editor to elevate an initial user to admin:
-- e.g.: select public.promote_user_to_admin('admin@campus.edu');
-- ==============================================================================
create or replace function public.promote_user_to_admin(target_email text)
returns text
language plpgsql
security definer
as $$
declare
  updated_count int;
begin
  -- Only allow existing admin to run, OR allow if no admins currently exist in the database (bootstrap mode)
  if not is_admin() and exists (select 1 from public.profiles where role = 'admin') then
    raise exception 'Permission denied: Only an existing admin can promote users.';
  end if;

  update public.profiles
  set role = 'admin', updated_at = timezone('utc'::text, now())
  where email = target_email;

  get diagnostics updated_count = row_count;

  if updated_count = 0 then
    return 'User with email ' || target_email || ' not found in profiles.';
  else
    return 'Successfully promoted ' || target_email || ' to admin.';
  end if;
end;
$$;
