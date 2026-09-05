import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

// Environment variables
const ENV_URL = import.meta.env.VITE_SUPABASE_URL || '';
const ENV_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

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
