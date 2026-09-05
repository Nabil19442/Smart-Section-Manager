-- ==============================================================================
-- CAMPUS PORTAL — SAMPLE ACADEMIC SEED DATA
-- Run this in your Supabase SQL Editor after running schema.sql
-- ==============================================================================

-- 1. Insert Sample Courses
insert into public.courses (id, course_code, course_name, teacher_name, description)
values
  ('11111111-1111-1111-1111-111111111111', 'CSE 311', 'Database Management Systems', 'Dr. Alistair Finch', 'Relational database theory, normalization, SQL optimization, transactions, and distributed schemas.'),
  ('22222222-2222-2222-2222-222222222222', 'CSE 323', 'Operating Systems & Concurrency', 'Prof. Sarah Jenkins', 'Process management, virtual memory, threads, synchronization primitives, and Unix kernel architecture.'),
  ('33333333-3333-3333-3333-333333333333', 'MAT 205', 'Linear Algebra & Vector Calculus', 'Dr. Marcus Vance', 'Vector spaces, eigenvalues, matrix decompositions, and applications in data analysis.'),
  ('44444444-4444-4444-4444-444444444444', 'ENG 101', 'Technical Writing & Communication', 'Prof. Elena Rostova', 'Structured research documentation, technical proposals, and professional communication.')
on conflict (course_code) do update set
  course_name = excluded.course_name,
  teacher_name = excluded.teacher_name;

-- 2. Insert Sample Notices
insert into public.notices (title, description, course_id, is_important, is_pinned)
values
  (
    'Midterm Examination Schedule Released',
    'The official midterm examination timetable for Fall 2026 has been published. All students are advised to check seating arrangements and bring their student ID cards.',
    null,
    true,
    true
  ),
  (
    'CSE 311: Lab Quiz 2 Postponed to Next Tuesday',
    'Due to the departmental seminar on high-performance database architectures, Lab Quiz 2 has been rescheduled. Prepare queries up to Section 5.',
    '11111111-1111-1111-1111-111111111111',
    true,
    false
  ),
  (
    'Campus High-Speed WiFi Maintenance Window',
    'Network maintenance will take place this Sunday from 02:00 AM to 05:00 AM. Academic portal and lab machines will experience temporary intermittent outages.',
    null,
    false,
    false
  );

-- 3. Insert Sample Study Materials
insert into public.materials (title, description, course_id, material_type, external_url, file_name)
values
  (
    'Module 04: B-Trees and Indexing Optimizations',
    'Comprehensive lecture slides covering disk I/O cost models, clustered vs unclustered indices, and composite B+ tree search.',
    '11111111-1111-1111-1111-111111111111',
    'slide',
    'https://example.com/slides/cse311-module4-indexes.pdf',
    'cse311-module4-indexes.pdf'
  ),
  (
    'Operating Systems Lab Guide: POSIX Threads & Mutexes',
    'Laboratory handout with sample C implementation of reader-writer locks and dining philosophers problem.',
    '22222222-2222-2222-2222-222222222222',
    'lab',
    'https://example.com/labs/os-posix-threads.pdf',
    'os-posix-threads.pdf'
  ),
  (
    'Linear Algebra Final Exam Questions (Fall 2025)',
    'Archived question paper with step-by-step solutions for spectral theorem and singular value decomposition.',
    '33333333-3333-3333-3333-333333333333',
    'previous_question',
    'https://example.com/past-papers/mat205-fall2025.pdf',
    'mat205-fall2025.pdf'
  ),
  (
    'Technical Proposal Formatting Template (IEEE Standard)',
    'LaTeX and Docx template required for submitting the final group project proposal.',
    '44444444-4444-4444-4444-444444444444',
    'pdf',
    'https://example.com/templates/technical-proposal-ieee.pdf',
    'technical-proposal-ieee.pdf'
  );

-- 4. Insert Sample Deadlines
insert into public.deadlines (title, description, course_id, deadline_type, due_date, due_time)
values
  (
    'Project Phase 1: Database Schema & ER Diagram',
    'Submit full ERD diagram along with PostgreSQL DDL scripts on the portal.',
    '11111111-1111-1111-1111-111111111111',
    'project',
    current_date + interval '5 days',
    '23:59:00'
  ),
  (
    'OS Kernel Synchronization Lab Report',
    'Benchmarking thread performance under high contention with spinlocks vs semaphores.',
    '22222222-2222-2222-2222-222222222222',
    'lab_report',
    current_date + interval '9 days',
    '18:00:00'
  ),
  (
    'Linear Algebra Problem Set 4',
    'Problems 12 through 28 on orthogonal projections and Gram-Schmidt process.',
    '33333333-3333-3333-3333-333333333333',
    'assignment',
    current_date + interval '3 days',
    '17:00:00'
  );

-- 5. Insert Sample Exams
insert into public.exams (course_id, exam_type, exam_date, start_time, end_time, room, instructions)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'midterm',
    current_date + interval '14 days',
    '10:00:00',
    '12:00:00',
    'Room 402 (Science Complex)',
    'Calculators not permitted. Scratch paper will be provided. Bring Student ID card.'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'midterm',
    current_date + interval '18 days',
    '14:00:00',
    '16:00:00',
    'Auditorium B',
    'Comprehensive examination covering CPU scheduling, memory virtualization, and paging.'
  );

-- 6. Insert Sample Important Links
insert into public.important_links (title, description, url, course_id)
values
  ('University Central Library Digital Archives', 'Access IEEE Xplore, ACM Digital Library, and Springer journal subscriptions.', 'https://library.university.edu', null),
  ('PostgreSQL 16 Official Manual', 'Official reference documentation for advanced SQL syntax and internals.', 'https://www.postgresql.org/docs/current/', '11111111-1111-1111-1111-111111111111'),
  ('Linux Kernel Source Tree (Linus Torvalds)', 'Reference implementation of Linux kernel scheduler and syscall subsystem.', 'https://github.com/torvalds/linux', '22222222-2222-2222-2222-222222222222');
