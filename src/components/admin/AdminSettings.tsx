import React, { useState } from 'react';
import {
  Settings,
  ShieldCheck,
  Key,
  Copy,
  Check,
  Terminal,
  Database,
  User,
  Info,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AdminSettings: React.FC = () => {
  const { user, profile } = useAuth();
  const [copiedSql, setCopiedSql] = useState(false);

  const promotionSql = `-- 1. Add CR & Student Enrollment columns to profiles (safe idempotent)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_cr boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS cr_for_section text DEFAULT 'E',
  ADD COLUMN IF NOT EXISTS contact_information text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- 2. Designate Section E Class Representative
UPDATE public.profiles
SET 
  role = 'admin',
  is_cr = true,
  cr_for_section = 'E',
  section = 'E',
  bio = 'Section E Class Representative. Reach out for routine, exams, and academic queries.'
WHERE email = '${user?.email || 'nabilmubashir730@gmail.com'}';

-- 3. Verify Section E CR
SELECT id, email, full_name, role, is_cr, cr_for_section, section 
FROM public.profiles 
WHERE is_cr = true OR role = 'admin';`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(promotionSql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-600" />
          <span>System & Administrator Settings</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Review system parameters, Section E configuration, and PostgreSQL RLS security controls.
        </p>
      </div>

      {/* Admin Profile Overview */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <User className="w-4 h-4 text-indigo-600" />
          <span>Active CR Administrator Credentials</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block text-[11px]">Administrator Name</span>
            <span className="font-bold text-slate-900 text-sm mt-0.5 block">
              {profile?.full_name || 'Class Representative'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block text-[11px]">Verified Email</span>
            <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block truncate">
              {user?.email || 'admin@university.edu'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block text-[11px]">Assigned Section & Batch</span>
            <span className="font-bold text-slate-900 text-sm mt-0.5 block">
              Section {profile?.section && profile.section !== 'A' ? profile.section : 'E'} • Batch {profile?.batch || '2021-25'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block text-[11px]">Supabase PostgreSQL Role</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="font-mono font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-xs">
                {profile?.role || 'admin'}
              </span>
              <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Full CR Privileges
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Section & Academic Configuration Panel */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          <span>Academic Section Configuration</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-100">
            <span className="text-slate-500 block text-[11px]">Current Active Section</span>
            <span className="font-bold text-indigo-900 text-sm mt-0.5 block">Section E</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block text-[11px]">Canonical DB Storage Value</span>
            <span className="font-mono font-bold text-slate-800 text-sm mt-0.5 block">E</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block text-[11px]">Portal Display Format</span>
            <span className="font-semibold text-slate-800 text-sm mt-0.5 block">Section E / Sec E</span>
          </div>
        </div>
      </div>

      {/* SQL Promotion Guide */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Terminal className="w-4 h-4 text-slate-700" />
            <span>Database SQL Role Elevation Protocol</span>
          </h3>
          <button
            onClick={handleCopySql}
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            {copiedSql ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy SQL Query</span>
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          In strict compliance with university governance rules, the application does not allow self-promotion or public UI buttons to grant administrative powers. To promote an elected co-CR, run this SQL script in the <strong>Supabase Dashboard SQL Editor</strong>:
        </p>

        <div className="relative">
          <pre className="p-4 bg-slate-950 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto border border-slate-800 leading-relaxed">
            {promotionSql}
          </pre>
        </div>

        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-2">
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <Database className="w-4 h-4 text-indigo-600" />
            <span>PostgreSQL RLS Enforcement Rules:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600 pl-1">
            <li>Default role on signup is always enforced as <code className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200">'student'</code>.</li>
            <li>Direct updates to <code className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200">profiles.role</code> by normal authenticated users are blocked by database trigger <code className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200">protect_profile_role</code>.</li>
            <li>All academic write queries (<code className="font-mono">INSERT</code>, <code className="font-mono">UPDATE</code>, <code className="font-mono">DELETE</code>) require <code className="font-mono">public.is_admin() = true</code>.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
