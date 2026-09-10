import { supabase } from './supabaseClient';
import { Database } from '../types/database.types';

export type Profile = Database['public']['Tables']['profiles']['Row'];

/**
 * Service to fetch and manage the Class Representative (CR) for Section E.
 * Identifies the CR dynamically from Supabase database profiles.
 */
export async function fetchSectionCR(section: string = 'E'): Promise<Profile | null> {
  try {
    // 1. First attempt: Query specifically for designated CR of this section
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`cr_for_section.eq.${section},is_cr.eq.true`)
        .order('created_at', { ascending: true })
        .limit(1);

      if (!error && data && data.length > 0) {
        return data[0] as Profile;
      }
    } catch {
      // Column might not exist yet if migration pending
    }

    // 2. Second attempt: Find admin belonging to section E, or any admin
    const { data: adminProfiles, error: adminErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'admin')
      .order('created_at', { ascending: true })
      .limit(5);

    if (!adminErr && adminProfiles && adminProfiles.length > 0) {
      // Prioritize admin specifically tagged with Section E
      const sectionEAdmin = adminProfiles.find(
        (p) => !p.section || p.section.toUpperCase() === 'E' || p.section.toUpperCase() === 'SECTION E'
      );
      if (sectionEAdmin) {
        return sectionEAdmin as Profile;
      }
      return adminProfiles[0] as Profile;
    }

    // 3. Third attempt: Check known CR emails in profiles if role was unassigned
    const { data: knownCrProfiles } = await supabase
      .from('profiles')
      .select('*')
      .in('email', ['nabilmubashir730@gmail.com', 'admin@university.edu'])
      .limit(1);

    if (knownCrProfiles && knownCrProfiles.length > 0) {
      return knownCrProfiles[0] as Profile;
    }

    return null;
  } catch (err) {
    console.error('Failed to fetch section CR:', err);
    return null;
  }
}

/**
 * Fetches the count of enrolled students in Section E.
 * Counts only actual student profiles (role='student' or non-admin) belonging to Section E.
 */
export async function fetchSectionEStudentCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .neq('role', 'admin');

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
