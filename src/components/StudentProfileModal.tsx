import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Mail,
  Hash,
  Layers,
  GraduationCap,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Phone,
  MessageSquare,
} from 'lucide-react';
import { getSignedFileUrl } from '../lib/storageService';

export interface StudentProfileData {
  id: string;
  email: string | null;
  full_name: string | null;
  student_id: string | null;
  roll: string | null;
  section: string | null;
  batch: string | null;
  avatar_url?: string | null;
  role: string | null;
  is_cr?: boolean | null;
  cr_for_section?: string | null;
  contact_information?: string | null;
  bio?: string | null;
  is_active?: boolean | null;
  created_at: string;
}

interface StudentProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentProfileData | null;
}

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  isOpen,
  onClose,
  student,
}) => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const resolveAvatar = async () => {
      if (student?.avatar_url) {
        try {
          const signed = await getSignedFileUrl(student.avatar_url);
          if (isMounted) setAvatarUrl(signed);
        } catch {
          if (isMounted) setAvatarUrl(student.avatar_url);
        }
      } else {
        if (isMounted) setAvatarUrl(null);
      }
    };

    if (isOpen && student) {
      resolveAvatar();
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, student]);

  if (!isOpen || !student) return null;

  const displayName = student.full_name || 'Enrolled Student';
  const displayEmail = student.email || '—';
  const sectionLabel = student.section && student.section.toUpperCase().includes('E') ? 'Section E' : `Section ${student.section || 'E'}`;
  const formattedJoinedDate = student.created_at
    ? new Date(student.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Recently';

  const isActive = student.is_active !== false;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
            title="Close modal"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border-2 border-indigo-400/40 text-indigo-200 flex items-center justify-center text-2xl font-bold shrink-0 overflow-hidden shadow-md">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                displayName.charAt(0).toUpperCase()
              )}
            </div>

            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                    isActive
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {isActive ? (
                    <>
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Active Enrolled</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3 h-3" />
                      <span>Inactive</span>
                    </>
                  )}
                </span>

                {student.role === 'admin' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 text-[10px] font-bold">
                    <ShieldCheck className="w-3 h-3 text-amber-400" />
                    <span>CR / Admin</span>
                  </span>
                )}
              </div>

              <h3 className="text-lg font-bold text-white tracking-tight truncate">
                {displayName}
              </h3>
              <p className="text-xs text-slate-300 font-medium truncate">
                {displayEmail}
              </p>
            </div>
          </div>
        </div>

        {/* Body Details */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold mb-1">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                <span>Academic Section</span>
              </div>
              <p className="font-bold text-slate-900">{sectionLabel}</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold mb-1">
                <Hash className="w-3.5 h-3.5 text-indigo-600" />
                <span>Class Roll</span>
              </div>
              <p className="font-mono font-bold text-slate-900">
                {student.roll ? student.roll : 'Unassigned'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold mb-1">
                <User className="w-3.5 h-3.5 text-indigo-600" />
                <span>Student ID</span>
              </div>
              <p className="font-mono font-bold text-slate-900 truncate">
                {student.student_id || 'Not registered'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold mb-1">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>Batch</span>
              </div>
              <p className="font-bold text-slate-900">
                {student.batch ? `${student.batch} Batch` : 'Standard Batch'}
              </p>
            </div>
          </div>

          {/* Enrollment Date & Contact Info */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2 text-slate-500">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="font-medium">Enrollment Date:</span>
              </div>
              <span className="font-bold text-slate-800">{formattedJoinedDate}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2 text-slate-500 truncate">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="font-medium">University Email:</span>
              </div>
              <a
                href={`mailto:${displayEmail}`}
                className="font-semibold text-indigo-600 hover:underline truncate max-w-[200px]"
              >
                {displayEmail}
              </a>
            </div>

            {student.contact_information && (
              <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-medium">Contact / Channels:</span>
                </div>
                <p className="font-semibold text-slate-800">{student.contact_information}</p>
              </div>
            )}

            {student.bio && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-semibold">
                  <MessageSquare className="w-3 h-3 text-slate-400" />
                  <span>Student Note / Bio</span>
                </div>
                <p className="text-slate-700 italic">"{student.bio}"</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Section E Student Directory
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
