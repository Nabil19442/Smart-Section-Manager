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
  Lock,
  Camera,
  Trash2,
  Phone,
  MessageSquare,
  ShieldCheck,
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
  const [batch, setBatch] = useState(profile?.batch || '');
  const [contactInfo, setContactInfo] = useState(profile?.contact_information || '');
  const [bio, setBio] = useState(profile?.bio || '');
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
      setBatch(profile.batch || '');
      setContactInfo(profile.contact_information || '');
      setBio(profile.bio || '');
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
      <div className="py-16 text-center rounded-2xl bg-white border border-slate-200 shadow-sm p-8 max-w-lg mx-auto">
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

      // Safe update payload: Section is strictly locked to Section E
      // Role is excluded to prevent tampering
      const safeUpdates: any = {
        full_name: fullName.trim(),
        student_id: studentId.trim() || null,
        roll: roll.trim() || null,
        section: 'E',
        batch: batch.trim() || null,
        contact_information: contactInfo.trim() || null,
        bio: bio.trim() || null,
        avatar_url: finalAvatarPath,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .update(safeUpdates)
        .eq('id', user.id);

      if (error) {
        // If contact_information or bio columns pending in migration, fallback without them
        if (error.code === '42703') {
          delete safeUpdates.contact_information;
          delete safeUpdates.bio;
          const { error: fallbackErr } = await supabase
            .from('profiles')
            .update(safeUpdates)
            .eq('id', user.id);
          if (fallbackErr) throw fallbackErr;
        } else {
          throw new Error(error.message);
        }
      }

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

      if (error) throw error;

      setAvatarUrl('');
      setAvatarFile(null);
      setAvatarSignedUrl(null);
      await refreshProfile();
      setSuccessMsg('Profile photo removed successfully.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error('Remove avatar error:', err);
      setErrorMsg(err.message || 'Failed to remove photo.');
    } finally {
      setSaving(false);
    }
  };

  const isCR = Boolean(
    profile?.is_cr ||
    isAdmin ||
    user?.email === 'nabilmubashir730@gmail.com'
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-sm border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border-2 border-indigo-400/40 flex items-center justify-center text-white text-2xl font-bold overflow-hidden shrink-0 shadow-sm">
            {avatarSignedUrl ? (
              <img src={avatarSignedUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              (profile?.full_name || user.email || 'S').charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight">
                {profile?.full_name || 'Student Profile'}
              </h2>
              {isCR ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-bold">
                  <ShieldCheck className="w-3 h-3 text-amber-400" />
                  <span>Section Representative / CR</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-[10px] font-bold">
                  <GraduationCap className="w-3 h-3 text-indigo-300" />
                  <span>Section E Student</span>
                </span>
              )}
            </div>
            <p className="text-xs text-indigo-200 mt-0.5 font-mono">{user.email}</p>
          </div>
        </div>

        <div className="text-xs px-3.5 py-2 rounded-xl bg-white/10 border border-white/15 text-slate-200 backdrop-blur-xs flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>Assigned Section:</span>
          <strong className="text-white font-bold text-sm">Section E</strong>
        </div>
      </div>

      {/* Main Form Card */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
        {successMsg && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-5">
          {/* Identity Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Official student name"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address (Authentication Managed)
              </label>
              <input
                type="email"
                disabled
                value={user.email || ''}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 cursor-not-allowed font-mono"
              />
            </div>
          </div>

          {/* Academic Identifiers */}
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
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 font-mono"
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
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 font-mono font-bold"
              />
            </div>

            {/* Section: Locked to Section E */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Academic Section
                </label>
                <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                  <Lock className="w-3 h-3 text-slate-400" />
                  <span>Locked</span>
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  disabled
                  value="Section E (Your assigned section)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-indigo-900 font-bold cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Academic Batch
              </label>
              <input
                type="text"
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                placeholder="e.g. 52nd Batch"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contact Information (Optional)
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  placeholder="Phone, WhatsApp, or Telegram handle"
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Student Note / Bio (Optional)
            </label>
            <div className="relative">
              <MessageSquare className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <textarea
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Brief introduction or study group interest..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600"
              />
            </div>
          </div>

          {/* Avatar Photo (Supabase Storage: app-files) */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/90 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Profile Photo
                </label>
                <p className="text-[11px] text-slate-500">
                  Upload an image file or supply an external image URL.
                </p>
              </div>
              {(avatarUrl || profile?.avatar_url || avatarFile) && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={saving}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  title="Remove avatar photo"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Remove Photo</span>
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 text-base font-bold overflow-hidden shrink-0 shadow-xs">
                {avatarSignedUrl ? (
                  <img src={avatarSignedUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-5 h-5 text-indigo-500" />
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
                  className="block w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
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
                    className="flex-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Access Control Notice */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5 text-[11px] text-slate-600">
            <Lock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <span>
              Role elevations and section reallocations are protected by Supabase RLS security policies. Your student account is permanently verified for <strong>Section E</strong>.
            </span>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
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
