import { supabase } from './supabaseClient';
import type { Course, Notice, Material, Deadline, Exam, CalendarEvent, ImportantLink, Profile } from './fallbackData';

/**
 * Supabase API Service Layer
 * Fully connected to PostgreSQL with Row Level Security (RLS).
 * All rows belong strictly to the authenticated user (auth.uid() = user_id).
 */

// ============================================================================
// GENERIC CRUD PRIMITIVES
// ============================================================================

export async function fetchUserRecords<T>(
  tableName: string,
  options: {
    select?: string;
    orderBy?: string;
    ascending?: boolean;
    filters?: Record<string, any>;
  } = {}
): Promise<T[]> {
  const { select = '*', orderBy = 'created_at', ascending = false, filters } = options;

  let query = (supabase.from(tableName as any) as any).select(select);

  if (filters) {
    for (const [col, val] of Object.entries(filters)) {
      if (val !== undefined && val !== null) {
        query = query.eq(col, val);
      }
    }
  }

  if (orderBy) {
    query = query.order(orderBy, { ascending });
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as T[]) || [];
}

export async function createUserRecord<T>(
  tableName: string,
  recordData: Record<string, any>
): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;

  const payload = {
    ...recordData,
    ...(userId ? { user_id: userId, created_by: userId } : {}),
  };

  const { data, error } = await (supabase.from(tableName as any) as any)
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data as T;
}

export async function updateUserRecord<T>(
  tableName: string,
  id: string,
  updates: Record<string, any>
): Promise<T> {
  const payload = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await (supabase.from(tableName as any) as any)
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as T;
}

export async function deleteUserRecord(tableName: string, id: string): Promise<boolean> {
  const { error } = await (supabase.from(tableName as any) as any)
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

// ============================================================================
// 1. COURSES CRUD
// ============================================================================
export async function getCourses(): Promise<Course[]> {
  return fetchUserRecords<Course>('courses', {
    orderBy: 'course_code',
    ascending: true,
  });
}

export async function createCourse(data: {
  course_code: string;
  course_name: string;
  teacher_name: string;
  description?: string | null;
}): Promise<Course> {
  return createUserRecord<Course>('courses', data);
}

export async function updateCourse(
  id: string,
  data: Partial<Course>
): Promise<Course> {
  return updateUserRecord<Course>('courses', id, data);
}

export async function deleteCourse(id: string): Promise<boolean> {
  return deleteUserRecord('courses', id);
}

// ============================================================================
// 2. NOTICES CRUD
// ============================================================================
export async function getNotices(): Promise<Notice[]> {
  return fetchUserRecords<Notice>('notices', {
    select: '*, courses(*)',
    orderBy: 'created_at',
    ascending: false,
  });
}

export async function createNotice(data: {
  title: string;
  description: string;
  course_id?: string | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
  is_important?: boolean;
  is_pinned?: boolean;
}): Promise<Notice> {
  return createUserRecord<Notice>('notices', data);
}

export async function updateNotice(
  id: string,
  data: Partial<Notice>
): Promise<Notice> {
  return updateUserRecord<Notice>('notices', id, data);
}

export async function deleteNotice(id: string): Promise<boolean> {
  return deleteUserRecord('notices', id);
}

// ============================================================================
// 3. STUDY MATERIALS CRUD
// ============================================================================
export async function getMaterials(): Promise<Material[]> {
  return fetchUserRecords<Material>('materials', {
    select: '*, courses(*)',
    orderBy: 'created_at',
    ascending: false,
  });
}

export async function createMaterial(data: {
  course_id: string;
  title: string;
  description?: string | null;
  material_type: string;
  file_url?: string | null;
  file_name?: string | null;
  external_url?: string | null;
}): Promise<Material> {
  return createUserRecord<Material>('materials', data);
}

export async function updateMaterial(
  id: string,
  data: Partial<Material>
): Promise<Material> {
  return updateUserRecord<Material>('materials', id, data);
}

export async function deleteMaterial(id: string): Promise<boolean> {
  return deleteUserRecord('materials', id);
}

// ============================================================================
// 4. DEADLINES CRUD
// ============================================================================
export async function getDeadlines(): Promise<Deadline[]> {
  return fetchUserRecords<Deadline>('deadlines', {
    select: '*, courses(*)',
    orderBy: 'due_date',
    ascending: true,
  });
}

export async function createDeadline(data: {
  course_id: string;
  title: string;
  description?: string | null;
  deadline_type: string;
  due_date: string;
  due_time?: string | null;
  attachment_url?: string | null;
  external_url?: string | null;
}): Promise<Deadline> {
  return createUserRecord<Deadline>('deadlines', data);
}

export async function updateDeadline(
  id: string,
  data: Partial<Deadline>
): Promise<Deadline> {
  return updateUserRecord<Deadline>('deadlines', id, data);
}

export async function deleteDeadline(id: string): Promise<boolean> {
  return deleteUserRecord('deadlines', id);
}

// ============================================================================
// 5. EXAMS CRUD
// ============================================================================
export async function getExams(): Promise<Exam[]> {
  return fetchUserRecords<Exam>('exams', {
    select: '*, courses(*)',
    orderBy: 'exam_date',
    ascending: true,
  });
}

export async function createExam(data: {
  course_id: string;
  exam_type: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  room: string;
  instructions?: string | null;
}): Promise<Exam> {
  return createUserRecord<Exam>('exams', data);
}

export async function updateExam(
  id: string,
  data: Partial<Exam>
): Promise<Exam> {
  return updateUserRecord<Exam>('exams', id, data);
}

export async function deleteExam(id: string): Promise<boolean> {
  return deleteUserRecord('exams', id);
}

// ============================================================================
// 6. CALENDAR EVENTS CRUD
// ============================================================================
export async function getCalendarEvents(): Promise<CalendarEvent[]> {
  return fetchUserRecords<CalendarEvent>('calendar_events', {
    select: '*, courses(*)',
    orderBy: 'start_datetime',
    ascending: true,
  });
}

export async function createCalendarEvent(data: {
  course_id?: string | null;
  title: string;
  description?: string | null;
  event_type?: string;
  start_datetime: string;
  end_datetime: string;
  location?: string | null;
}): Promise<CalendarEvent> {
  return createUserRecord<CalendarEvent>('calendar_events', data);
}

export async function updateCalendarEvent(
  id: string,
  data: Partial<CalendarEvent>
): Promise<CalendarEvent> {
  return updateUserRecord<CalendarEvent>('calendar_events', id, data);
}

export async function deleteCalendarEvent(id: string): Promise<boolean> {
  return deleteUserRecord('calendar_events', id);
}

// ============================================================================
// 7. IMPORTANT LINKS CRUD
// ============================================================================
export async function getImportantLinks(): Promise<ImportantLink[]> {
  return fetchUserRecords<ImportantLink>('important_links', {
    select: '*, courses(*)',
    orderBy: 'created_at',
    ascending: false,
  });
}

export async function createImportantLink(data: {
  title: string;
  url: string;
  description?: string | null;
  course_id?: string | null;
}): Promise<ImportantLink> {
  return createUserRecord<ImportantLink>('important_links', data);
}

export async function updateImportantLink(
  id: string,
  data: Partial<ImportantLink>
): Promise<ImportantLink> {
  return updateUserRecord<ImportantLink>('important_links', id, data);
}

export async function deleteImportantLink(id: string): Promise<boolean> {
  return deleteUserRecord('important_links', id);
}

// ============================================================================
// 8. PROFILE CRUD
// ============================================================================
export async function getUserProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No row found
    throw error;
  }
  return data as Profile;
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<Profile>
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data as Profile;
}
