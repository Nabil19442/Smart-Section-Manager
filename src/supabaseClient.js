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
