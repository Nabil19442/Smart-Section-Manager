import React, { useState, useEffect } from 'react';
import {
  User,
  Shield,
  Mail,
  Hash,
  Layers,
  GraduationCap,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  KeyRound,
  ExternalLink,
  Camera,
  Trash2,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import {
  uploadUserFile,
  getSignedFileUrl,
  deleteStorageFile,
} from '../lib/storageService';

export const ProfileView: React.FC = () => {
  const { user, profile, isAdmin, refreshProfile } = useAuth();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [studentId, setStudentId] = useState(profile?.student_id || '');
  const [roll, setRoll] = useState(profile?.roll || '');
  const [section, setSection] = useState(profile?.section || '');
  const [batch, setBatch] = useState(profile?.batch || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarSignedUrl, setAvatarSignedUrl] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync state when profile is loaded or refreshed
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setStudentId(profile.student_id || '');
      setRoll(profile.roll || '');
      setSection(profile.section || '');
      setBatch(profile.batch || '');
      setAvatarUrl(profile.avatar_url || '');
    }
  }, [profile]);

  // Generate signed URL for private avatar storage
  useEffect(() => {
    let isMounted = true;
    const loadAvatar = async () => {
      const urlToResolve = avatarUrl || profile?.avatar_url;
      if (urlToResolve) {
        try {
          const signed = await getSignedFileUrl(urlToResolve);
          if (isMounted) setAvatarSignedUrl(signed);
        } catch {
          if (isMounted) setAvatarSignedUrl(null);
        }
      } else {
        if (isMounted) setAvatarSignedUrl(null);
      }
    };
    loadAvatar();
    return () => {
      isMounted = false;
    };
  }, [avatarUrl, profile?.avatar_url]);

  if (!user) {
    return (
      <div className="py-16 text-center rounded-xl bg-white border border-slate-200 shadow-sm p-8 max-w-lg mx-auto">
        <User className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-900">Student Account Required</h3>
        <p className="text-xs text-slate-500 mt-1">
          Please sign in or create an account using the top-right button to view and manage your academic profile.
        </p>
      </div>
    );
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      let finalAvatarPath = avatarUrl.trim() || null;

      // Handle avatar image file upload to Supabase Storage 'app-files'
      if (avatarFile) {
        const uploadResult = await uploadUserFile({
          file: avatarFile,
          userId: user.id,
          featureName: 'avatars',
          itemId: user.id,
          maxSizeMB: 10,
        });

        // Clean up previous avatar if it was in storage and replaced
        if (profile?.avatar_url && profile.avatar_url !== uploadResult.path) {
          await deleteStorageFile(profile.avatar_url);
        }

        finalAvatarPath = uploadResult.path;
      } else if (!avatarUrl && profile?.avatar_url) {
        // User cleared the avatar field, remove old storage file
        await deleteStorageFile(profile.avatar_url);
        finalAvatarPath = null;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          student_id: studentId.trim() || null,
          roll: roll.trim() || null,
          section: section.trim() || null,
          batch: batch.trim() || null,
          avatar_url: finalAvatarPath,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw new Error(error.message);

      setAvatarFile(null);
      await refreshProfile();
      setSuccessMsg('Academic profile updated successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Update profile error:', err);
      setErrorMsg(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!window.confirm('Are you sure you want to remove your profile photo?')) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      if (profile?.avatar_url) {
        await deleteStorageFile(profile.avatar_url);
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          avatar_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw new Error(error.message);

      setAvatarUrl('');
      setAvatarFile(null);
      setAvatarSignedUrl(null);
      await refreshProfile();
      setSuccessMsg('Avatar photo removed successfully.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Remove avatar error:', err);
      setErrorMsg(err.message || 'Failed to remove avatar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <User className="w-5 h-5 text-blue-600" />
          <span>Student Academic Profile & Settings</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage your personal university credentials, batch details, and student identification.
        </p>
      </div>

      {/* Role & Status Card */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 text-lg font-bold overflow-hidden shrink-0 shadow-2xs">
            {avatarSignedUrl ? (
              <img src={avatarSignedUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {profile?.full_name || 'Registered Student'}
            </h3>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border ${
              isAdmin
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-blue-50 text-blue-800 border-blue-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>{isAdmin ? 'CR / Administrator' : 'Student Account'}</span>
          </div>
        </div>
      </div>

      {/* Main Profile Form */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <form onSubmit={handleSaveProfile} className="space-y-4">
          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Jane Doe"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address (Auth Managed)
              </label>
              <input
                type="email"
                disabled
                value={user.email || ''}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Student ID
              </label>
              <input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="e.g. 2021-1-60-042"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Roll Number
              </label>
              <input
                type="text"
                value={roll}
                onChange={(e) => setRoll(e.target.value)}
                placeholder="e.g. 42"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Section
              </label>
              <input
                type="text"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                placeholder="e.g. 1 or A"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Batch
            </label>
            <input
              type="text"
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
              placeholder="e.g. 52nd Batch"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
            />
          </div>

          {/* Avatar Photo (Supabase Storage: app-files) */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Profile Avatar Photo (Supabase Storage: app-files)
                </label>
                <p className="text-[11px] text-slate-500">
                  Upload an image file to private storage, or supply an external image URL.
                </p>
              </div>
              {(avatarUrl || profile?.avatar_url || avatarFile) && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={saving}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  title="Remove avatar photo from storage and database"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Remove Photo</span>
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3.5">
              <div className="w-12 h-12 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 text-base font-bold overflow-hidden shrink-0 shadow-xs">
                {avatarSignedUrl ? (
                  <img src={avatarSignedUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-5 h-5 text-blue-500" />
                )}
              </div>

              <div className="flex-1 space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setAvatarFile(file);
                    if (file) {
                      setAvatarSignedUrl(URL.createObjectURL(file));
                    }
                  }}
                  className="block w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                />
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 shrink-0">Or URL:</span>
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => {
                      setAvatarUrl(e.target.value);
                      setAvatarFile(null);
                    }}
                    placeholder="https://images.unsplash.com/... or web URL"
                    className="flex-1 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save Academic Profile</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
