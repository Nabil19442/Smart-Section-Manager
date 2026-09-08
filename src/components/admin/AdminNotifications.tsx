import React, { useState, useEffect } from 'react';
import {
  Bell,
  Send,
  Trash2,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
  Radio,
  Users
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';

interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export const AdminNotifications: React.FC = () => {
  const { user, profile } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [broadcasting, setBroadcasting] = useState(false);

  // Broadcast form
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info',
    target: 'all', // 'all' or 'cr_only'
  });

  // Toast
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchRecentNotifications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(25);

      if (error) throw error;
      setNotifications(data || []);
    } catch (err: any) {
      console.error('Fetch notifications error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentNotifications();
  }, []);

  const showToast = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.message.trim()) {
      showToast('error', 'Notification title and message are required.');
      return;
    }

    setBroadcasting(true);
    try {
      // Get target students from profiles
      let query = supabase.from('profiles').select('id');
      if (formData.target === 'cr_only') {
        query = query.eq('role', 'admin');
      }

      const { data: targetProfiles, error: targetError } = await query;
      if (targetError) throw targetError;

      if (!targetProfiles || targetProfiles.length === 0) {
        showToast('error', 'No recipient student profiles found.');
        setBroadcasting(false);
        return;
      }

      // Prepare batch insertions
      const recordsToInsert = targetProfiles.map((p) => ({
        user_id: p.id,
        title: formData.title.trim(),
        message: formData.message.trim(),
        type: formData.type as any,
        is_read: false,
      }));

      const { error: insertError } = await supabase.from('notifications').insert(recordsToInsert);
      if (insertError) throw insertError;

      showToast('success', `Notification broadcast dispatched to ${targetProfiles.length} students!`);
      setFormData({
        title: '',
        message: '',
        type: 'info',
        target: 'all',
      });
      await fetchRecentNotifications();
    } catch (err: any) {
      console.error('Broadcast notification error:', err);
      showToast('error', err.message || 'Failed to dispatch notification broadcast.');
    } finally {
      setBroadcasting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('notifications').delete().eq('id', id);
      if (error) throw error;

      setNotifications((prev) => prev.filter((n) => n.id !== id));
      showToast('success', 'Notification removed.');
    } catch (err: any) {
      showToast('error', 'Failed to delete notification.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs shadow-sm transition-all ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-semibold">{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Radio className="w-5 h-5 text-indigo-600" />
          <span>Broadcast Notification Center</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Push direct notification alerts to enrolled students' notification bells in the Student Portal.
        </p>
      </div>

      {/* Grid: Broadcast Form & Recent Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dispatch Card */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Send className="w-4 h-4 text-indigo-600" />
            <span>Compose Direct Broadcast</span>
          </h3>

          <form onSubmit={handleBroadcast} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Notification Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Class Rescheduled or Emergency Notice"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-600 font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Alert Category</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-indigo-600"
                >
                  <option value="info">General Info</option>
                  <option value="warning">Urgent / Action Required</option>
                  <option value="deadline">Submission Due Alert</option>
                  <option value="exam">Exam Routine Alert</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Audience</label>
                <select
                  value={formData.target}
                  onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-indigo-600"
                >
                  <option value="all">All Registered Students</option>
                  <option value="cr_only">CR / Administrators Only</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Notification Message *</label>
              <textarea
                rows={4}
                required
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Type the message that will display when students click their notification bell..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-600"
              />
            </div>

            <button
              type="submit"
              disabled={broadcasting}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              {broadcasting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>Send Broadcast to Students</span>
            </button>
          </form>
        </div>

        {/* History / Active Notifications */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Bell className="w-4 h-4 text-slate-600" />
              <span>Recent Dispatched Alerts</span>
            </h3>
            <span className="text-xs text-slate-500">Last 25 entries</span>
          </div>

          <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
            {loading ? (
              <div className="p-8 text-center">
                <Loader2 className="w-6 h-6 text-indigo-600 animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-500">Loading alerts...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl">
                <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500">No recent alerts recorded.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className="p-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{n.title}</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] uppercase font-bold bg-white border border-slate-200 text-slate-600">
                        {n.type}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">{n.message}</p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(n.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                    title="Remove alert"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
