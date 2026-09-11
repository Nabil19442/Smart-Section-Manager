import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Mail,
  Hash,
  Layers,
  GraduationCap,
  ShieldCheck,
  Phone,
  MessageSquare,
  Copy,
  Check,
} from 'lucide-react';
import { Profile, getInitials, sanitizeAvatarUrl } from '../lib/crService';
import { getSignedFileUrl } from '../lib/storageService';

interface CRProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  crProfile: Profile | null;
}

export const CRProfileModal: React.FC<CRProfileModalProps> = ({
  isOpen,
  onClose,
  crProfile,
}) => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const resolveAvatar = async () => {
      const cleanAvatar = sanitizeAvatarUrl(crProfile?.avatar_url);
      if (cleanAvatar) {
        try {
          const signed = await getSignedFileUrl(cleanAvatar);
          if (isMounted) setAvatarUrl(signed);
        } catch {
          if (isMounted) setAvatarUrl(cleanAvatar);
        }
      } else {
        if (isMounted) setAvatarUrl(null);
      }
    };

    if (isOpen && crProfile) {
      resolveAvatar();
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, crProfile]);

  if (!isOpen || !crProfile) return null;

  const handleCopyEmail = () => {
    if (crProfile.email) {
      navigator.clipboard.writeText(crProfile.email);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  const phoneValue = crProfile.phone || crProfile.contact_information || '';

  const handleCopyPhone = () => {
    if (phoneValue) {
      navigator.clipboard.writeText(phoneValue);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    }
  };

  const displayName = crProfile.full_name || 'Jawaed Arafat Mashfee';
  const displayEmail = crProfile.email;
  const sectionLabel = 'Section E';
  const bioMessage =
    crProfile.bio ||
    'Feel free to contact me regarding section-related academic matters, class schedules, or exam guidelines.';

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
            title="Close modal"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border-2 border-indigo-400/40 text-indigo-200 flex items-center justify-center text-xl font-bold shrink-0 overflow-hidden shadow-md">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-full h-full object-cover"
                  onError={() => setAvatarUrl(null)}
                />
              ) : (
                <span>{getInitials(displayName)}</span>
              )}
            </div>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-400/30 text-[11px] font-bold text-indigo-200 uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>SECTION REPRESENTATIVE</span>
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">{displayName}</h3>
              <p className="text-xs text-indigo-200 font-medium">
                Class Representative — {sectionLabel}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Message / Bio from CR */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
              <span>Message from Section CR</span>
            </div>
            <p className="text-xs text-slate-600 italic leading-relaxed">
              "{bioMessage}"
            </p>
          </div>

          {/* Academic Profile Details Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold mb-1">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                <span>Academic Section</span>
              </div>
              <p className="font-bold text-slate-900">{sectionLabel}</p>
            </div>

            <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold mb-1">
                <Hash className="w-3.5 h-3.5 text-indigo-600" />
                <span>Class Roll</span>
              </div>
              <p className="font-bold text-slate-900 font-mono">
                {crProfile.roll ? `Roll ${crProfile.roll}` : 'Roll 480'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold mb-1">
                <User className="w-3.5 h-3.5 text-indigo-600" />
                <span>Student ID</span>
              </div>
              <p className="font-mono font-bold text-slate-900">
                {crProfile.student_id || '251-15-480'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold mb-1">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>Batch</span>
              </div>
              <p className="font-bold text-slate-900">
                {crProfile.batch ? `${crProfile.batch} Batch` : '68 Batch'}
              </p>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Communication Channels
            </h4>

            {/* Phone */}
            {phoneValue && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Phone className="w-3.5 h-3.5" />
                  </div>
                  <div className="truncate">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">Phone Number</p>
                    <a
                      href={`tel:${phoneValue}`}
                      className="text-xs font-bold text-slate-800 hover:text-emerald-600 truncate block font-mono"
                    >
                      {phoneValue}
                    </a>
                  </div>
                </div>
                <button
                  onClick={handleCopyPhone}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors shrink-0 ml-2"
                  title="Copy Phone Number"
                >
                  {copiedPhone ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedPhone ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            )}

            {/* Email with copy button */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <div className="truncate">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">University Email</p>
                  <a
                    href={`mailto:${displayEmail}`}
                    className="text-xs font-semibold text-indigo-600 hover:underline truncate block"
                  >
                    {displayEmail}
                  </a>
                </div>
              </div>
              <button
                onClick={handleCopyEmail}
                className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors shrink-0 ml-2"
                title="Copy Email"
              >
                {copiedEmail ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedEmail ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Verified Class Representative for Section E
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

