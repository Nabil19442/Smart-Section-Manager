import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Mail,
  GraduationCap,
  ArrowRight,
  Shield,
  Loader2,
  AlertCircle,
  Phone,
  User,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { fetchSectionCR, Profile, getInitials, sanitizeAvatarUrl } from '../lib/crService';
import { CRProfileModal } from './CRProfileModal';
import { getSignedFileUrl } from '../lib/storageService';

interface CRRepresentativeCardProps {
  onOpenProfileModal?: () => void;
}

export const CRRepresentativeCard: React.FC<CRRepresentativeCardProps> = () => {
  const [cr, setCr] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadCR = async () => {
    try {
      const data = await fetchSectionCR('E');
      setCr(data);

      const cleanAvatar = sanitizeAvatarUrl(data?.avatar_url);
      if (cleanAvatar) {
        try {
          const signed = await getSignedFileUrl(cleanAvatar);
          setAvatarUrl(signed);
        } catch {
          setAvatarUrl(cleanAvatar);
        }
      } else {
        setAvatarUrl(null);
      }
    } catch (err) {
      console.error('Error in CRRepresentativeCard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCR();

    // Subscribe to realtime updates on profiles table so CR updates reflect live
    const channel = supabase
      .channel('public:profiles:cr_card')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          loadCR();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all p-5 flex flex-col justify-between group">
        <div>
          {/* Card Header */}
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Section Representative
              </span>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Shield className="w-3 h-3 text-indigo-600" />
              <span>Section E</span>
            </span>
          </div>

          {/* CR Content Body */}
          {loading ? (
            <div className="py-6 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
              <p className="text-xs">Connecting to Section E registry...</p>
            </div>
          ) : cr ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-base flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={cr.full_name || 'CR'}
                      className="w-full h-full object-cover"
                      onError={() => setAvatarUrl(null)}
                    />
                  ) : (
                    <span>{getInitials(cr.full_name)}</span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h4 className="text-base font-bold text-slate-900 truncate tracking-tight group-hover:text-indigo-600 transition-colors">
                    {cr.full_name || 'Class Representative'}
                  </h4>
                  <p className="text-xs font-semibold text-indigo-600">
                    Class Representative — Section E
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 pt-1 text-xs text-slate-600">
                {cr.student_id && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      Student ID:{' '}
                      <strong className="font-mono text-slate-800">{cr.student_id}</strong>
                    </span>
                  </div>
                )}
                {(cr.phone || cr.contact_information) && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      Phone:{' '}
                      <a
                        href={`tel:${cr.phone || cr.contact_information}`}
                        className="font-medium text-slate-800 hover:text-indigo-600"
                      >
                        {cr.phone || cr.contact_information}
                      </a>
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-slate-600 truncate">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <a
                    href={`mailto:${cr.email}`}
                    className="hover:text-indigo-600 hover:underline truncate"
                  >
                    {cr.email}
                  </a>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-semibold text-slate-800">Section E</span>
                  {cr.batch && (
                    <span className="text-slate-400">• {cr.batch} Batch</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-4 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-700 font-bold">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Section E Representative</span>
              </div>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Class Representative profile for Section E is not yet assigned in the database.
              </p>
            </div>
          )}
        </div>

        {/* Footer / CTA Action */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={() => cr && setIsModalOpen(true)}
            disabled={!cr}
            className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200/80 hover:border-indigo-200 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>View CR Profile</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>

      {/* Detail Modal */}
      <CRProfileModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        crProfile={cr}
      />
    </>
  );
};

