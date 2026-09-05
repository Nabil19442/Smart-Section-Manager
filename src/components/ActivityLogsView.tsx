import React, { useState, useEffect } from 'react';
import {
  History,
  Shield,
  Clock,
  User,
  Search,
  Filter,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import type { Database } from '../types/database.types';
import { isTableMissingError, getFallbackActivityLogs } from '../lib/fallbackData';
import { SchemaNoticeBanner } from './SchemaNoticeBanner';

type ActivityLog = Database['public']['Tables']['activity_logs']['Row'];

export const ActivityLogsView: React.FC = () => {
  const { isAdmin, isConfigured } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSchemaMissing, setIsSchemaMissing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: logErr } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (logErr) {
        if (isTableMissingError(logErr)) {
          setIsSchemaMissing(true);
          setLogs(getFallbackActivityLogs());
          return;
        }
        throw new Error(logErr.message);
      }

      setLogs(data || []);
    } catch (err: any) {
      if (isTableMissingError(err)) {
        setIsSchemaMissing(true);
        setLogs(getFallbackActivityLogs());
      } else {
        console.error('Error fetching logs:', err);
        setError(err.message || 'Failed to load activity logs.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchLogs();
    }
  }, [isAdmin, isConfigured]);

  const filteredLogs = logs.filter((log) => {
    return (
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entity_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.user_id && log.user_id.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  return (
    <div className="space-y-6">
      {/* Schema Notice Banner if database table is not yet created in Supabase */}
      {isSchemaMissing && <SchemaNoticeBanner tableName="public.activity_logs" />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-amber-600" />
            <span>Administrative Audit & Activity Logs</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time security auditing and administrative action tracking (Protected by RLS is_admin policy).
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-sm self-start sm:self-auto transition-colors"
        >
          Refresh Logs
        </button>
      </div>

      <div className="relative bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
        <Search className="w-4 h-4 absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter logs by action, entity type, or user ID..."
          className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
        />
      </div>

      {loading && (
        <div className="py-16 text-center text-slate-500 flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
          <span className="text-xs">Querying audit logs from Supabase PostgreSQL...</span>
        </div>
      )}

      {!loading && error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
          <div>
            <p className="font-semibold">Access Denied or Query Error</p>
            <p className="text-rose-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {!loading && !error && filteredLogs.length === 0 && (
        <div className="py-16 text-center rounded-xl bg-white border border-slate-200 shadow-sm p-8">
          <History className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800">No activity logs recorded</h3>
          <p className="text-xs text-slate-500 mt-1">Actions performed by users will appear here.</p>
        </div>
      )}

      {!loading && !error && filteredLogs.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Timestamp (UTC)</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Entity Type</th>
                  <th className="px-4 py-3">Entity ID</th>
                  <th className="px-4 py-3">User ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {new Date(log.created_at).toISOString().replace('T', ' ').substring(0, 19)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold text-[10px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-800 font-sans font-medium">{log.entity_type}</td>
                    <td className="px-4 py-3 text-slate-500 text-[11px] truncate max-w-[120px]">
                      {log.entity_id || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-[11px] truncate max-w-[120px]">
                      {log.user_id || 'System'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
