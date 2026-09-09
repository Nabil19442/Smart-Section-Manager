import { createClient } from '@supabase/supabase-js';

// ============================================================================
// SUPABASE CONFIGURATION
// Replace the values below with your own Supabase project credentials if needed.
// ============================================================================

// Paste your Supabase Project URL here:
const SUPABASE_URL = 'https://qtxkcwruqhrozbqqrgfa.supabase.co';

// Paste your Supabase Anon / Public Key here:
const SUPABASE_PUBLIC_KEY = 'sb_publishable_QoHQj14Cgtut-rgUvpPXwQ_Fh4-KVHu';

// Initialize and export the Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);

/**
 * Sign in with Google using Supabase OAuth
 */
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/` : undefined,
    },
  });
  return { data, error };
}

// ============================================================================
// SUPABASE CRUD HELPER FUNCTIONS
// Pure, clean, copy-pasteable database queries with auth.uid() enforcement
// ============================================================================

/**
 * 1. LOAD USER DATA
 * Retrieves rows from a table belonging to the authenticated user
 */
export async function loadUserData(tableName, options = {}) {
  const {
    select = '*',
    orderBy = 'created_at',
    ascending = false,
    eq = null,
  } = options;

  let query = supabase.from(tableName).select(select);

  if (eq && eq.column && eq.value !== undefined) {
    query = query.eq(eq.column, eq.value);
  }

  if (orderBy) {
    query = query.order(orderBy, { ascending });
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/**
 * 2. CREATE ITEM
 * Automatically attaches user_id from active session and inserts row
 */
export async function createItem(tableName, itemData) {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;

  const payload = {
    ...itemData,
    ...(userId ? { user_id: userId, created_by: userId } : {}),
  };

  let { data, error } = await supabase
    .from(tableName)
    .insert(payload)
    .select()
    .single();

  if (error && (error.message?.includes("'created_by'") || error.message?.includes('schema cache'))) {
    console.warn(`Table '${tableName}' missing 'created_by' column in database schema. Retrying without created_by.`);
    const fallbackPayload = { ...payload };
    delete fallbackPayload.created_by;
    const retry = await supabase.from(tableName).insert(fallbackPayload).select().single();
    if (retry.error) throw retry.error;
    return retry.data;
  }

  if (error) throw error;
  return data;
}

/**
 * 3. UPDATE ITEM
 * Updates a row by id with new fields and updated timestamp
 */
export async function updateItem(tableName, id, updates) {
  const payload = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from(tableName)
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * 4. DELETE ITEM
 * Deletes a row by id
 */
export async function deleteItem(tableName, id) {
  const { error } = await supabase
    .from(tableName)
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

// ============================================================================
// CONVENIENCE ENTITY FUNCTIONS (COURSES, NOTICES, MATERIALS, DEADLINES, ETC.)
// ============================================================================

// --- Courses ---
export const loadCourses = () => loadUserData('courses', { orderBy: 'course_code', ascending: true });
export const createCourse = (data) => createItem('courses', data);
export const updateCourse = (id, data) => updateItem('courses', id, data);
export const deleteCourse = (id) => deleteItem('courses', id);

// --- Notices ---
export const loadNotices = () => loadUserData('notices', { select: '*, courses(*)', orderBy: 'created_at', ascending: false });
export const createNotice = (data) => createItem('notices', data);
export const updateNotice = (id, data) => updateItem('notices', id, data);
export const deleteNotice = (id) => deleteItem('notices', id);

// --- Materials ---
export const loadMaterials = () => loadUserData('materials', { select: '*, courses(*)', orderBy: 'created_at', ascending: false });
export const createMaterial = (data) => createItem('materials', data);
export const updateMaterial = (id, data) => updateItem('materials', id, data);
export const deleteMaterial = (id) => deleteItem('materials', id);

// --- Deadlines ---
export const loadDeadlines = () => loadUserData('deadlines', { select: '*, courses(*)', orderBy: 'due_date', ascending: true });
export const createDeadline = (data) => createItem('deadlines', data);
export const updateDeadline = (id, data) => updateItem('deadlines', id, data);
export const deleteDeadline = (id) => deleteItem('deadlines', id);

// --- Exams ---
export const loadExams = () => loadUserData('exams', { select: '*, courses(*)', orderBy: 'exam_date', ascending: true });
export const createExam = (data) => createItem('exams', data);
export const updateExam = (id, data) => updateItem('exams', id, data);
export const deleteExam = (id) => deleteItem('exams', id);

// --- Calendar Events ---
export const loadCalendarEvents = () => loadUserData('calendar_events', { select: '*, courses(*)', orderBy: 'start_datetime', ascending: true });
export const createCalendarEvent = (data) => createItem('calendar_events', data);
export const updateCalendarEvent = (id, data) => updateItem('calendar_events', id, data);
export const deleteCalendarEvent = (id) => deleteItem('calendar_events', id);

// --- Important Links ---
export const loadImportantLinks = () => loadUserData('important_links', { select: '*, courses(*)', orderBy: 'created_at', ascending: false });
export const createImportantLink = (data) => createItem('important_links', data);
export const updateImportantLink = (id, data) => updateItem('important_links', id, data);
export const deleteImportantLink = (id) => deleteItem('important_links', id);

