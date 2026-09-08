import { supabase } from './supabaseClient';

export const STORAGE_BUCKET = 'app-files';

/**
 * In-memory cache for generated signed URLs to avoid redundant Supabase requests.
 * Structure: Map<path, { url: string; expiresAt: number }>
 */
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

/**
 * Generate a clean, standardized storage path adhering strictly to:
 * ${userId}/${featureName}/${itemId}/${uuid}.${extension}
 */
export function buildStoragePath({
  userId,
  featureName,
  itemId,
  fileName,
}: {
  userId: string;
  featureName: 'materials' | 'notices' | 'avatars' | string;
  itemId?: string;
  fileName: string;
}): string {
  if (!userId) {
    throw new Error('User ID is required for storage path isolation.');
  }

  // Extract clean file extension
  const rawExt = fileName.split('.').pop() || '';
  const cleanExt = rawExt.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';

  // Generate unique ID
  const uuid =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // Default itemId to uuid if none provided
  const targetItemId = itemId && itemId !== 'new' ? itemId : uuid;

  return `${userId}/${featureName}/${targetItemId}/${uuid}.${cleanExt}`;
}

/**
 * Helper to extract the relative storage path inside 'app-files'
 * Handles raw paths like "userId/feature/..." as well as legacy or full URLs.
 */
export function extractStoragePath(pathOrUrl: string | null | undefined): string | null {
  if (!pathOrUrl || typeof pathOrUrl !== 'string') return null;

  const trimmed = pathOrUrl.trim();
  if (!trimmed) return null;

  // If it's an external non-supabase link (e.g., Google Drive, external CDN)
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://')
  ) {
    // Check if it's a Supabase storage URL targeting app-files
    const appFilesMarker = `/object/public/${STORAGE_BUCKET}/`;
    const appFilesSignMarker = `/object/sign/${STORAGE_BUCKET}/`;
    const appFilesAuthMarker = `/object/authenticated/${STORAGE_BUCKET}/`;

    if (trimmed.includes(appFilesMarker)) {
      const idx = trimmed.indexOf(appFilesMarker);
      return decodeURIComponent(trimmed.substring(idx + appFilesMarker.length).split('?')[0]);
    }
    if (trimmed.includes(appFilesSignMarker)) {
      const idx = trimmed.indexOf(appFilesSignMarker);
      return decodeURIComponent(trimmed.substring(idx + appFilesSignMarker.length).split('?')[0]);
    }
    if (trimmed.includes(appFilesAuthMarker)) {
      const idx = trimmed.indexOf(appFilesAuthMarker);
      return decodeURIComponent(trimmed.substring(idx + appFilesAuthMarker.length).split('?')[0]);
    }

    // It's a genuine external URL (e.g. drive.google.com, dropbox)
    return null;
  }

  // It is already a relative path, e.g., "userId/materials/123/abc.pdf"
  return trimmed;
}

/**
 * Check whether a string is an external link (Google Drive, external website, etc.)
 */
export function isExternalUrl(pathOrUrl: string | null | undefined): boolean {
  if (!pathOrUrl) return false;
  const trimmed = pathOrUrl.trim();
  if (
    (trimmed.startsWith('http://') || trimmed.startsWith('https://')) &&
    !trimmed.includes(STORAGE_BUCKET)
  ) {
    return true;
  }
  return false;
}

/**
 * Upload a user file to the private 'app-files' bucket.
 * Follows folder rule: ${auth.uid()}/${featureName}/${itemId}/${uuid}.${extension}
 */
export async function uploadUserFile({
  file,
  userId,
  featureName,
  itemId,
  maxSizeMB = 50,
}: {
  file: File;
  userId: string;
  featureName: 'materials' | 'notices' | 'avatars' | string;
  itemId?: string;
  maxSizeMB?: number;
}): Promise<{ path: string; fileName: string; signedUrl: string }> {
  if (!file) throw new Error('No file provided for upload.');
  if (!userId) throw new Error('Authentication required: user ID missing for storage.');

  if (file.size > maxSizeMB * 1024 * 1024) {
    throw new Error(`File size exceeds the allowed limit of ${maxSizeMB}MB.`);
  }

  const storagePath = buildStoragePath({
    userId,
    featureName,
    itemId,
    fileName: file.name,
  });

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    console.error('Supabase Storage upload error:', error);
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const returnedPath = data?.path || storagePath;

  // Retrieve signed URL for immediate use
  let signedUrl = '';
  try {
    const { data: signData, error: signError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(returnedPath, 3600);

    if (!signError && signData?.signedUrl) {
      signedUrl = signData.signedUrl;
      signedUrlCache.set(returnedPath, {
        url: signedUrl,
        expiresAt: Date.now() + 50 * 60 * 1000,
      });
    }
  } catch (err) {
    console.warn('Could not generate initial signed URL:', err);
  }

  return {
    path: returnedPath,
    fileName: file.name,
    signedUrl,
  };
}

/**
 * Retrieve a signed URL for a file path or URL from the private 'app-files' bucket.
 * If it's already an external URL, returns it directly.
 */
export async function getSignedFileUrl(
  pathOrUrl: string | null | undefined,
  expiresInSeconds = 3600
): Promise<string | null> {
  if (!pathOrUrl) return null;
  const trimmed = pathOrUrl.trim();
  if (!trimmed) return null;

  // Direct return for pure external URLs
  if (isExternalUrl(trimmed)) {
    return trimmed;
  }

  const storagePath = extractStoragePath(trimmed);
  if (!storagePath) {
    return trimmed;
  }

  // Check cache
  const cached = signedUrlCache.get(storagePath);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }

  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(storagePath, expiresInSeconds);

    if (error) {
      console.warn(`Failed to create signed URL for path "${storagePath}":`, error.message);
      return null;
    }

    if (data?.signedUrl) {
      signedUrlCache.set(storagePath, {
        url: data.signedUrl,
        expiresAt: Date.now() + Math.max(expiresInSeconds - 300, 60) * 1000,
      });
      return data.signedUrl;
    }

    return null;
  } catch (err) {
    console.error('Error generating signed URL:', err);
    return null;
  }
}

/**
 * Delete a file from the 'app-files' Supabase Storage bucket.
 */
export async function deleteStorageFile(
  pathOrUrl: string | null | undefined
): Promise<boolean> {
  if (!pathOrUrl) return true;

  const storagePath = extractStoragePath(pathOrUrl);
  if (!storagePath) {
    // Nothing in app-files storage to delete
    return true;
  }

  try {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([storagePath]);

    if (error) {
      console.warn(`Storage delete warning for "${storagePath}":`, error.message);
    }

    signedUrlCache.delete(storagePath);
    return true;
  } catch (err) {
    console.error('Failed to delete file from storage:', err);
    return false;
  }
}
