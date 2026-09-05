import React, { useState } from 'react';
import {
  Database,
  Key,
  Globe,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Shield,
  FileCode,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { saveCustomCredentials } from '../lib/supabaseClient';

interface SetupGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SetupGuideModal: React.FC<SetupGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { isConfigured } = useAuth();
  const [url, setUrl] = useState(import.meta.env.VITE_SUPABASE_URL || '');
  const [anonKey, setAnonKey] = useState(import.meta.env.VITE_SUPABASE_ANON_KEY || '');
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !anonKey.trim()) return;

    saveCustomCredentials(url.trim(), anonKey.trim());
    setSaved(true);
    setTimeout(() => {
      window.location.reload();
    }, 800);
  };

  const copySqlHint = () => {
    navigator.clipboard.writeText(
      `-- See /supabase/schema.sql and /supabase/seed.sql in project root`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-2xl overflow-y-auto">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Supabase Backend Setup & Configuration
              </h3>
              <p className="text-xs text-slate-500">
                PostgreSQL Database, Auth, Row Level Security, and Storage
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-sm p-1 rounded"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status banner */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 ${
              isConfigured
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            {isConfigured ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="text-xs">
              <p className="font-semibold text-slate-900">
                {isConfigured
                  ? 'Supabase Backend Connected'
                  : 'Supabase Credentials Not Yet Configured'}
              </p>
              <p className="mt-0.5 text-slate-600 leading-relaxed">
                {isConfigured
                  ? 'The frontend is actively communicating with Supabase PostgreSQL using Row Level Security (RLS) policies.'
                  : 'Enter your project credentials below or configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.'}
              </p>
            </div>
          </div>

          {/* Form to enter/update credentials */}
          <form onSubmit={handleSaveCredentials} className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Project Connection Parameters
            </h4>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Supabase Project URL (e.g. https://xyzcompany.supabase.co)
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://your-project.supabase.co"
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Supabase Anon / Public Key (JWT)
              </label>
              <div className="relative">
                <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 font-mono"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Never supply your service-role secret key. The frontend only uses the public anon key with PostgreSQL RLS authorization.
              </p>
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-2"
            >
              {saved ? <Check className="w-4 h-4" /> : <Database className="w-4 h-4" />}
              <span>{saved ? 'Saved & Reloading...' : 'Save & Connect to Supabase'}</span>
            </button>
          </form>

          {/* Schema & RLS Setup steps */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <FileCode className="w-4 h-4 text-blue-600" />
              <span>Database Initialization & RLS Policies</span>
            </h4>

            <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
              <p>
                The complete, production-ready schema is located in <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-mono border border-slate-200">/supabase/schema.sql</code> and sample data is in <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-mono border border-slate-200">/supabase/seed.sql</code>.
              </p>
              <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-200 space-y-1.5">
                <p className="text-emerald-400">-- 1. Open Supabase Dashboard &gt; SQL Editor</p>
                <p className="text-emerald-400">-- 2. Paste contents of /supabase/schema.sql and Click RUN</p>
                <p className="text-emerald-400">-- 3. Run /supabase/seed.sql to insert sample academic data</p>
                <p className="text-emerald-400">-- 4. Enable Supabase Storage buckets: study-materials and notice-attachments</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2">
            <h5 className="font-semibold text-slate-900 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span>PostgreSQL RLS Verification Guarantee</span>
            </h5>
            <p className="text-slate-600 leading-relaxed">
              Every table has Row Level Security active. The helper function <code className="bg-white border border-slate-200 text-slate-800 px-1 py-0.5 rounded font-mono">public.is_admin()</code> ensures that authorization is executed entirely on the PostgreSQL database engine, rather than trusting client-side state.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
