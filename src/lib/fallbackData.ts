import type { Database } from '../types/database.types';

export type Course = Database['public']['Tables']['courses']['Row'];
export type Notice = Database['public']['Tables']['notices']['Row'] & {
  courses?: Course | null;
};
export type Material = Database['public']['Tables']['materials']['Row'] & {
  courses?: Course | null;
};
export type Deadline = Database['public']['Tables']['deadlines']['Row'] & {
  courses?: Course | null;
};
export type Exam = Database['public']['Tables']['exams']['Row'] & {
  courses?: Course | null;
};
export type CalendarEvent = Database['public']['Tables']['calendar_events']['Row'] & {
  courses?: Course | null;
};
export type ImportantLink = Database['public']['Tables']['important_links']['Row'] & {
  courses?: Course | null;
};
export type ActivityLog = Database['public']['Tables']['activity_logs']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];

export function isTableMissingError(err: any): boolean {
  if (!err) return false;
  const msg = (typeof err === 'string' ? err : err.message || err.details || err.hint || '').toLowerCase();
  const code = (err.code || '').toUpperCase();
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    msg.includes('schema cache') ||
    msg.includes('could not find the table') ||
    msg.includes('does not exist') ||
    (msg.includes('relation') && msg.includes('not exist')) ||
    msg.includes('failed to fetch') // transient network or placeholder domain
  );
}

// Initial Course data
export const INITIAL_COURSES: Course[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    course_code: 'CSE 311',
    course_name: 'Database Management Systems',
    teacher_name: 'Dr. Alistair Finch',
    description: 'Relational database theory, normalization, SQL optimization, transactions, and distributed schemas.',
    created_by: null,
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    course_code: 'CSE 323',
    course_name: 'Operating Systems & Concurrency',
    teacher_name: 'Prof. Sarah Jenkins',
    description: 'Process management, virtual memory, threads, synchronization primitives, and Unix kernel architecture.',
    created_by: null,
    created_at: new Date(Date.now() - 28 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    course_code: 'MAT 205',
    course_name: 'Linear Algebra & Vector Calculus',
    teacher_name: 'Dr. Marcus Vance',
    description: 'Vector spaces, eigenvalues, matrix decompositions, and applications in data analysis.',
    created_by: null,
    created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    course_code: 'ENG 101',
    course_name: 'Technical Writing & Communication',
    teacher_name: 'Prof. Elena Rostova',
    description: 'Structured research documentation, technical proposals, and professional communication.',
    created_by: null,
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Initial Notices data
export const INITIAL_NOTICES: Notice[] = [
  {
    id: 'not-001',
    title: 'Midterm Examination Schedule Released',
    description: 'The official midterm examination timetable for Fall 2026 has been published. All students are advised to check seating arrangements and bring their student ID cards.',
    course_id: null,
    attachment_url: null,
    attachment_name: null,
    is_important: true,
    is_pinned: true,
    created_by: null,
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    courses: null,
  },
  {
    id: 'not-002',
    title: 'CSE 311: Lab Quiz 2 Postponed to Next Tuesday',
    description: 'Due to the departmental seminar on high-performance database architectures, Lab Quiz 2 has been rescheduled. Prepare queries up to Section 5.',
    course_id: '11111111-1111-1111-1111-111111111111',
    attachment_url: null,
    attachment_name: null,
    is_important: true,
    is_pinned: false,
    created_by: null,
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    courses: INITIAL_COURSES[0],
  },
  {
    id: 'not-003',
    title: 'Campus High-Speed WiFi Maintenance Window',
    description: 'Network maintenance will take place this Sunday from 02:00 AM to 05:00 AM. Academic portal and lab machines will experience temporary intermittent outages.',
    course_id: null,
    attachment_url: null,
    attachment_name: null,
    is_important: false,
    is_pinned: false,
    created_by: null,
    created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    courses: null,
  },
];

// Initial Study Materials
export const INITIAL_MATERIALS: Material[] = [
  {
    id: 'mat-001',
    title: 'Module 04: B-Trees and Indexing Optimizations',
    description: 'Comprehensive lecture slides covering disk I/O cost models, clustered vs unclustered indices, and composite B+ tree search.',
    course_id: '11111111-1111-1111-1111-111111111111',
    material_type: 'slide',
    file_url: null,
    file_name: 'cse311-module4-indexes.pdf',
    external_url: 'https://example.com/slides/cse311-module4-indexes.pdf',
    created_by: null,
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    courses: INITIAL_COURSES[0],
  },
  {
    id: 'mat-002',
    title: 'Operating Systems Lab Guide: POSIX Threads & Mutexes',
    description: 'Laboratory handout with sample C implementation of reader-writer locks and dining philosophers problem.',
    course_id: '22222222-2222-2222-2222-222222222222',
    material_type: 'lab',
    file_url: null,
    file_name: 'os-posix-threads.pdf',
    external_url: 'https://example.com/labs/os-posix-threads.pdf',
    created_by: null,
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    courses: INITIAL_COURSES[1],
  },
  {
    id: 'mat-003',
    title: 'Linear Algebra Final Exam Questions (Fall 2025)',
    description: 'Archived question paper with step-by-step solutions for spectral theorem and singular value decomposition.',
    course_id: '33333333-3333-3333-3333-333333333333',
    material_type: 'previous_question',
    file_url: null,
    file_name: 'mat205-fall2025.pdf',
    external_url: 'https://example.com/past-papers/mat205-fall2025.pdf',
    created_by: null,
    created_at: new Date(Date.now() - 8 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    courses: INITIAL_COURSES[2],
  },
  {
    id: 'mat-004',
    title: 'Technical Proposal Formatting Template (IEEE Standard)',
    description: 'LaTeX and Docx template required for submitting the final group project proposal.',
    course_id: '44444444-4444-4444-4444-444444444444',
    material_type: 'pdf',
    file_url: null,
    file_name: 'technical-proposal-ieee.pdf',
    external_url: 'https://example.com/templates/technical-proposal-ieee.pdf',
    created_by: null,
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    courses: INITIAL_COURSES[3],
  },
];

// Initial Deadlines
export const INITIAL_DEADLINES: Deadline[] = [
  {
    id: 'dl-001',
    title: 'Project Phase 1: Database Schema & ER Diagram',
    description: 'Submit full ERD diagram along with PostgreSQL DDL scripts on the portal.',
    course_id: '11111111-1111-1111-1111-111111111111',
    deadline_type: 'project',
    due_date: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
    due_time: '23:59',
    attachment_url: null,
    external_url: null,
    created_by: null,
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    courses: INITIAL_COURSES[0],
  },
  {
    id: 'dl-002',
    title: 'OS Kernel Synchronization Lab Report',
    description: 'Benchmarking thread performance under high contention with spinlocks vs semaphores.',
    course_id: '22222222-2222-2222-2222-222222222222',
    deadline_type: 'lab_report',
    due_date: new Date(Date.now() + 8 * 86400000).toISOString().split('T')[0],
    due_time: '18:00',
    attachment_url: null,
    external_url: null,
    created_by: null,
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    courses: INITIAL_COURSES[1],
  },
  {
    id: 'dl-003',
    title: 'Linear Algebra Problem Set 4',
    description: 'Problems 12 through 28 on orthogonal projections and Gram-Schmidt process.',
    course_id: '33333333-3333-3333-3333-333333333333',
    deadline_type: 'assignment',
    due_date: new Date(Date.now() + 12 * 86400000).toISOString().split('T')[0],
    due_time: '23:59',
    attachment_url: null,
    external_url: null,
    created_by: null,
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    courses: INITIAL_COURSES[2],
  },
];

// Initial Exams
export const INITIAL_EXAMS: Exam[] = [
  {
    id: 'exam-001',
    course_id: '11111111-1111-1111-1111-111111111111',
    exam_type: 'midterm',
    exam_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    start_time: '10:00',
    end_time: '12:00',
    room: 'Auditorium Hall B',
    instructions: 'Bring scientific calculator and official student ID. Closed book exam.',
    created_by: null,
    created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    courses: INITIAL_COURSES[0],
  },
  {
    id: 'exam-002',
    course_id: '22222222-2222-2222-2222-222222222222',
    exam_type: 'lab_exam',
    exam_date: new Date(Date.now() + 18 * 86400000).toISOString().split('T')[0],
    start_time: '14:00',
    end_time: '16:00',
    room: 'Computer Lab 304',
    instructions: 'Practical C programming on Unix terminal. Internet access disabled during testing.',
    created_by: null,
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    courses: INITIAL_COURSES[1],
  },
  {
    id: 'exam-003',
    course_id: '33333333-3333-3333-3333-333333333333',
    exam_type: 'quiz',
    exam_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    start_time: '11:30',
    end_time: '12:15',
    room: 'Room 502',
    instructions: 'Quiz covering Matrix diagonalization and Gram-Schmidt.',
    created_by: null,
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    courses: INITIAL_COURSES[2],
  },
];

// Initial Important Links
export const INITIAL_LINKS: ImportantLink[] = [
  {
    id: 'link-001',
    title: 'University Student Academic Portal',
    description: 'Central portal for grade transcripts, semester enrollment, and fee payments.',
    url: 'https://portal.university.edu',
    course_id: null,
    created_by: null,
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'link-002',
    title: 'PostgreSQL 16 Official Manual & Query Planner Guide',
    description: 'Reference documentation for complex SQL syntax, B-Tree indices, and EXPLAIN plans.',
    url: 'https://www.postgresql.org/docs/current/',
    course_id: '11111111-1111-1111-1111-111111111111',
    created_by: null,
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    courses: INITIAL_COURSES[0],
  },
  {
    id: 'link-003',
    title: 'Linux Kernel Documentation & Syscall Reference',
    description: 'POSIX system calls, thread scheduler, and virtual memory paging documentation.',
    url: 'https://kernel.org/doc/html/latest/',
    course_id: '22222222-2222-2222-2222-222222222222',
    created_by: null,
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    courses: INITIAL_COURSES[1],
  },
];

// Initial Calendar Events
export const INITIAL_CALENDAR_EVENTS: CalendarEvent[] = [
  {
    id: 'cal-001',
    title: 'Mid-Semester Examination Week',
    description: 'University-wide midterm evaluation schedule. All morning and afternoon sessions.',
    course_id: null,
    event_type: 'exam',
    start_datetime: new Date(Date.now() + 5 * 86400000).toISOString(),
    end_datetime: new Date(Date.now() + 10 * 86400000).toISOString(),
    location: 'Examination Halls 1 - 4',
    created_by: null,
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'cal-002',
    title: 'ACM ICPC Regional Programming Bootcamp',
    description: 'Intensive dynamic programming, graphs, and competitive coding masterclass.',
    course_id: '22222222-2222-2222-2222-222222222222',
    event_type: 'workshop',
    start_datetime: new Date(Date.now() + 3 * 86400000).toISOString(),
    end_datetime: new Date(Date.now() + 4 * 86400000).toISOString(),
    location: 'Auditorium B & Lab 3',
    created_by: null,
    created_at: new Date(Date.now() - 8 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    courses: INITIAL_COURSES[1],
  },
  {
    id: 'cal-003',
    title: 'Spring Break & Campus Recess',
    description: 'Official academic holiday. Administrative offices and research centers remain open on reduced hours.',
    course_id: null,
    event_type: 'holiday',
    start_datetime: new Date(Date.now() + 20 * 86400000).toISOString(),
    end_datetime: new Date(Date.now() + 27 * 86400000).toISOString(),
    location: 'Campus-wide',
    created_by: null,
    created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Initial Activity Logs
export const INITIAL_ACTIVITY_LOGS: ActivityLog[] = [
  {
    id: 'log-001',
    user_id: 'admin@university.edu',
    action: 'CREATE_NOTICE',
    entity_type: 'notices',
    entity_id: 'notice-001',
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: 'log-002',
    user_id: 'admin@university.edu',
    action: 'UPLOAD_MATERIAL',
    entity_type: 'materials',
    entity_id: 'mat-001',
    created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
  },
  {
    id: 'log-003',
    user_id: 'admin@university.edu',
    action: 'SCHEDULE_DEADLINE',
    entity_type: 'deadlines',
    entity_id: 'dl-001',
    created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
  },
];

// Local storage key management for demo state
const LS_PREFIX = 'smart_section_demo_';

function getLocalData<T>(key: string, defaultData: T): T {
  if (typeof window === 'undefined') return defaultData;
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    return raw ? JSON.parse(raw) : defaultData;
  } catch {
    return defaultData;
  }
}

function setLocalData<T>(key: string, data: T) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify(data));
  } catch {}
}

export function getFallbackCourses(): Course[] {
  return getLocalData('courses', INITIAL_COURSES);
}

export function saveFallbackCourses(courses: Course[]) {
  setLocalData('courses', courses);
}

export function getFallbackNotices(): Notice[] {
  const notices = getLocalData('notices', INITIAL_NOTICES);
  const courses = getFallbackCourses();
  // Ensure courses relation is attached
  return notices.map((n) => ({
    ...n,
    courses: n.course_id ? courses.find((c) => c.id === n.course_id) || null : null,
  }));
}

export function saveFallbackNotices(notices: Notice[]) {
  setLocalData('notices', notices);
}

export function getFallbackMaterials(): Material[] {
  const materials = getLocalData('materials', INITIAL_MATERIALS);
  const courses = getFallbackCourses();
  return materials.map((m) => ({
    ...m,
    courses: courses.find((c) => c.id === m.course_id) || null,
  }));
}

export function saveFallbackMaterials(materials: Material[]) {
  setLocalData('materials', materials);
}

export function getFallbackDeadlines(): Deadline[] {
  const deadlines = getLocalData('deadlines', INITIAL_DEADLINES);
  const courses = getFallbackCourses();
  return deadlines.map((d) => ({
    ...d,
    courses: courses.find((c) => c.id === d.course_id) || null,
  }));
}

export function saveFallbackDeadlines(deadlines: Deadline[]) {
  setLocalData('deadlines', deadlines);
}

export function getFallbackExams(): Exam[] {
  const exams = getLocalData('exams', INITIAL_EXAMS);
  const courses = getFallbackCourses();
  return exams.map((e) => ({
    ...e,
    courses: courses.find((c) => c.id === e.course_id) || null,
  }));
}

export function saveFallbackExams(exams: Exam[]) {
  setLocalData('exams', exams);
}

export function getFallbackLinks(): ImportantLink[] {
  const links = getLocalData('important_links', INITIAL_LINKS);
  const courses = getFallbackCourses();
  return links.map((l) => ({
    ...l,
    courses: l.course_id ? courses.find((c) => c.id === l.course_id) || null : null,
  }));
}

export function saveFallbackLinks(links: ImportantLink[]) {
  setLocalData('important_links', links);
}

export function getFallbackCalendarEvents(): CalendarEvent[] {
  const events = getLocalData('calendar_events', INITIAL_CALENDAR_EVENTS);
  const courses = getFallbackCourses();
  return events.map((e) => ({
    ...e,
    courses: e.course_id ? courses.find((c) => c.id === e.course_id) || null : null,
  }));
}

export function saveFallbackCalendarEvents(events: CalendarEvent[]) {
  setLocalData('calendar_events', events);
}

export function getFallbackActivityLogs(): ActivityLog[] {
  return getLocalData('activity_logs', INITIAL_ACTIVITY_LOGS);
}

export function saveFallbackActivityLogs(logs: ActivityLog[]) {
  setLocalData('activity_logs', logs);
}

export function getFallbackCounts() {
  return {
    notices: getFallbackNotices().length,
    materials: getFallbackMaterials().length,
    deadlines: getFallbackDeadlines().length,
    exams: getFallbackExams().length,
    courses: getFallbackCourses().length,
  };
}
