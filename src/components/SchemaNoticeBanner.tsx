import React, { useState } from 'react';
import { Database, Copy, Check, ExternalLink, X, AlertCircle } from 'lucide-react';
import { SCHEMA_SQL, copyToClipboard } from '../lib/sqlScripts';

interface SchemaNoticeBannerProps {
  onOpenSetupGuide?: () => void;
  tableName?: string;
}

export const SchemaNoticeBanner: React.FC<SchemaNoticeBannerProps> = ({
  onOpenSetupGuide,
  tableName = 'public.notices',
}) => {
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleCopy = async () => {
    const success = await copyToClipboard(SCHEMA_SQL);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="mb-6 p-4 rounded-xl bg-amber-50/90 border border-amber-200 text-slate-800 shadow-sm transition-all animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0 mt-0.5">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900">
                Supabase Schema Setup Notice
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-200/70 text-amber-900 font-mono font-semibold">
                Demo Mode Active
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
              Table <code className="bg-amber-100 text-amber-900 px-1 py-0.5 rounded font-mono text-[11px]">{tableName}</code> is not yet initialized in your Supabase project. We've loaded the default academic demo data so all features are interactive.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
            title="Copy schema.sql to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
            <span>{copied ? 'Copied SQL!' : 'Copy schema.sql'}</span>
          </button>

          {onOpenSetupGuide && (
            <button
              onClick={onOpenSetupGuide}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>SQL Guide</span>
            </button>
          )}

          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
            title="Dismiss notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
