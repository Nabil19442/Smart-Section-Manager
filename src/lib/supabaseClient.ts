import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

// Environment variables with fallback to user's project credentials
const ENV_URL = import.meta.env.VITE_SUPABASE_URL || 'https://qtxkcwruqhrozbqqrgfa.supabase.co';
const ENV_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_QoHQj14Cgtut-rgUvpPXwQ_Fh4-KVHu';

// Fallback / Storage overrides (useful for testing or direct connection in preview)
const STORAGE_KEY_URL = 'campus_supabase_url';
const STORAGE_KEY_ANON = 'campus_supabase_anon_key';

export function getSupabaseCredentials() {
  const localUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_URL) : null;
  const localKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_ANON) : null;

  const url = (localUrl && localUrl.trim()) || (ENV_URL && ENV_URL.trim()) || '';
  const key = (localKey && localKey.trim()) || (ENV_KEY && ENV_KEY.trim()) || '';

  const isValidUrl = url.startsWith('http://') || url.startsWith('https://');
  const isConfigured = isValidUrl && Boolean(key && key.length > 20 && !key.includes('your-anon-key'));

  return {
    url,
    key,
    isConfigured,
    source: localUrl ? 'local_override' : ENV_URL ? 'env_variable' : 'unconfigured',
  };
}

export function saveCustomCredentials(url: string, key: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_URL, url.trim());
    localStorage.setItem(STORAGE_KEY_ANON, key.trim());
    // Reload to apply new client instance
    window.location.reload();
  }
}

export function clearCustomCredentials() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY_URL);
    localStorage.removeItem(STORAGE_KEY_ANON);
    window.location.reload();
  }
}

let clientInstance: SupabaseClient<any> | null = null;

export function getSupabaseClient(): SupabaseClient<any> {
  if (clientInstance) {
    return clientInstance;
  }

  const { url, key } = getSupabaseCredentials();

  // Use dummy url/key if not provided to prevent instantiate throw
  const effectiveUrl = url && (url.startsWith('http://') || url.startsWith('https://'))
    ? url
    : 'https://placeholder.supabase.co';
  const effectiveKey = key || 'placeholder-anon-key-with-sufficient-length-for-init-jwt';

  clientInstance = createClient(effectiveUrl, effectiveKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });

  return clientInstance;
}

export const supabase: SupabaseClient<any> = getSupabaseClient();

/**
 * Checks if a Supabase PostgREST error is due to a missing 'created_by' column
 * in the database schema or PostgREST schema cache.
 */
export function isMissingCreatedByError(error: any): boolean {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  const details = (error.details || '').toLowerCase();
  const hint = (error.hint || '').toLowerCase();
  return (
    msg.includes("'created_by'") ||
    msg.includes('created_by') ||
    msg.includes('schema cache') ||
    details.includes("'created_by'") ||
    details.includes('created_by') ||
    hint.includes('created_by') ||
    error.code === 'PGRST202' || // PostgREST could not find column in schema cache
    error.code === '42703'      // PostgreSQL undefined_column
  );
}

/**
 * Inserts a record into a table with created_by. If the column is missing in
 * the schema cache, transparently retries without created_by so the user's
 * workflow is never blocked, and flags fallbackUsed = true.
 */
export async function insertWithCreatedByFallback(
  table: string,
  payload: Record<string, any>,
  selectQuery: string = '*'
): Promise<{ data: any; error: any; fallbackUsed: boolean }> {
  let res = await supabase.from(table).insert(payload).select(selectQuery).single();
  
  if (res.error && isMissingCreatedByError(res.error) && 'created_by' in payload) {
    console.warn(`[Supabase] Table '${table}' missing 'created_by' column in database schema cache. Retrying without 'created_by'.`);
    const fallbackPayload = { ...payload };
    delete fallbackPayload.created_by;
    const retryRes = await supabase.from(table).insert(fallbackPayload).select(selectQuery).single();
    return { data: retryRes.data, error: retryRes.error, fallbackUsed: true };
  }
  
  return { data: res.data, error: res.error, fallbackUsed: false };
}
