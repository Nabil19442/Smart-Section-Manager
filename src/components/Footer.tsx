import React from 'react';
import { ShieldCheck, Heart, Sparkles } from 'lucide-react';

interface FooterProps {
  variant?: 'student' | 'admin';
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({ variant = 'student', className = '' }) => {
  const isAdmin = variant === 'admin';

  return (
    <footer
      className={`w-full mt-auto pt-8 pb-6 border-t ${
        isAdmin
          ? 'border-slate-200 bg-slate-50/70 text-slate-600'
          : 'border-slate-200/90 bg-transparent text-slate-600'
      } ${className}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          {/* Brand & Tagline */}
          <div className="flex flex-col items-center sm:items-start gap-1">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                S
              </div>
              <span className="font-bold tracking-tight text-slate-900 text-sm">
                SectionHub
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                {isAdmin ? 'CR Admin' : 'Academic Portal'}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Smart Academic Management Platform
            </p>
          </div>

          {/* Author & Attribution */}
          <div className="flex flex-col items-center sm:items-end gap-1 text-xs">
            <div className="inline-flex items-center gap-1.5 text-slate-700 font-medium">
              <span>Made by</span>
              <span className="font-semibold text-indigo-700 px-2 py-0.5 rounded-md bg-indigo-50/80 border border-indigo-100">
                Nabil Mubashir
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              © 2026 SectionHub. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
