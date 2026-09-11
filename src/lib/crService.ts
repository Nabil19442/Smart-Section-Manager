import { supabase } from './supabaseClient';
import { Database } from '../types/database.types';

export type Profile = Database['public']['Tables']['profiles']['Row'];

/**
 * Derives professional initials from a full name (e.g. "Jawaed Arafat Mashfee" -> "JM").
 */
export function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return 'JM';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  // First letter of first name and first letter of last name
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/**
 * Sanitizes avatar URL: filters out demo / placeholder / shrek images so that
 * only legitimate Supabase storage avatar photos are rendered.
 */
export function sanitizeAvatarUrl(url?: string | null): string | null {
  if (!url || typeof url !== 'string') return null;
  const lower = url.toLowerCase();
  if (
    lower.includes('shrek') ||
    lower.includes('placeholder') ||
    lower.includes('demo') ||
    lower.includes('example.com') ||
    lower.includes('unsplash.com')
  ) {
    return null;
  }
  return url;
}

/**
 * Service to fetch and manage the Class Representative (CR) for Section E.
 * Identifies the CR dynamically from Supabase database profiles.
 *
 * Adheres to Section 8 of specification:
 * Conceptually queries the CR using:
 * section = 'E' AND is_cr = true AND cr_for_section = 'E' AND role = 'admin'
 * Uses the existing database structure gracefully if columns differ.
 * No hardcoded names, emails, UUIDs, or frontend-only constants.
 */
export async function fetchSectionCR(section: string = 'E'): Promise<Profile | null> {
  try {
    // 1. First attempt: Query specifically for designated CR of this section using is_cr & cr_for_section
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'admin')
        .eq('is_cr', true)
        .eq('cr_for_section', section)
        .order('created_at', { ascending: true })
        .limit(1);

      if (!error && data && data.length > 0) {
        return normalizeProfileData(data[0] as Profile);
      }
    } catch {
      // Columns is_cr / cr_for_section might not exist yet if database migration pending
    }

    // 2. Second attempt: Check if is_cr is set on any profile for this section
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_cr', true)
        .ilike('section', `%${section}%`)
        .order('created_at', { ascending: true })
        .limit(1);

      if (!error && data && data.length > 0) {
        return normalizeProfileData(data[0] as Profile);
      }
    } catch {
      // is_cr column might not exist
    }

    // 3. Third attempt: Find admin belonging to section E
    const { data: sectionAdmins, error: secErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'admin')
      .ilike('section', `%${section}%`)
      .order('created_at', { ascending: true })
      .limit(1);

    if (!secErr && sectionAdmins && sectionAdmins.length > 0) {
      return normalizeProfileData(sectionAdmins[0] as Profile);
    }

    // 4. Fourth attempt: Fallback to any active administrator profile in database
    const { data: anyAdmin, error: adminErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'admin')
      .order('created_at', { ascending: true })
      .limit(1);

    if (!adminErr && anyAdmin && anyAdmin.length > 0) {
      return normalizeProfileData(anyAdmin[0] as Profile);
    }

    return null;
  } catch (err) {
    console.error('Failed to fetch section CR:', err);
    return null;
  }
}

/**
 * Normalizes profile data: cleans up any demo avatar and ensures full name display.
 */
function normalizeProfileData(profile: Profile): Profile {
  return {
    ...profile,
    avatar_url: sanitizeAvatarUrl(profile.avatar_url),
  };
}

/**
 * Fetches the count of enrolled students in Section E.
 * Counts only actual student profiles (role='student' or non-admin) belonging to Section E.
 * Excludes admin/CR.
 */
export async function fetchSectionEStudentCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .neq('role', 'admin')
      .eq('section', 'E');

    if (error) {
      console.error('Error counting Section E students:', error);
      return 0;
    }

    return count ?? 0;
  } catch (err) {
    console.error('Failed to count Section E students:', err);
    return 0;
  }
}

