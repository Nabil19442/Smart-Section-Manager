import schemaRaw from '../../supabase/schema.sql?raw';
import seedRaw from '../../supabase/seed.sql?raw';
import materialsMigrationRaw from '../../supabase/migrations/20260909000001_add_created_by_to_materials.sql?raw';
import allModulesMigrationRaw from '../../supabase/migrations/20260909000002_add_created_by_to_all_modules.sql?raw';

export const SCHEMA_SQL = schemaRaw;
export const SEED_SQL = seedRaw;
export const MATERIALS_MIGRATION_SQL = materialsMigrationRaw;
export const ALL_MODULES_MIGRATION_SQL = allModulesMigrationRaw;

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // Fallback
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);
    return successful;
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
}
