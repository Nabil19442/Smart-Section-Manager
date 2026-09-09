import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Plus,
  Search,
  Edit2,
  Trash2,
  Clock,
  MapPin,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
  Database,
  Code,
  Copy,
  Check
} from 'lucide-react';
import { supabase, insertWithCreatedByFallback } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { ALL_MODULES_MIGRATION_SQL, copyToClipboard } from '../../lib/sqlScripts';

interface CalendarEventItem {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  start_date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  created_at: string;
}

const EVENT_TYPES = [
  { value: 'class', label: 'Lecture / Class' },
  { value: 'exam', label: 'Exam / Quiz' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'holiday', label: 'University Holiday' },
  { value: 'event', label: 'Special Event' },
];

export const AdminCalendar: React.FC = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('all');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'event',
    start_date: '',
    end_date: '',
    start_time: '09:00',
    end_time: '10:30',
    location: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<CalendarEventItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toast & schema migration
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [schemaMigrationNeeded, setSchemaMigrationNeeded] = useState(false);
  const [copiedMigration, setCopiedMigration] = useState(false);

  const handleCopyMigration = async () => {
    const ok = await copyToClipboard(ALL_MODULES_MIGRATION_SQL);
    if (ok) {
      setCopiedMigration(true);
      showToast('success', 'Migration SQL copied! Run in Supabase SQL Editor.');
      setTimeout(() => setCopiedMigration(false), 3000);
    } else {
      showToast('error', 'Failed to copy SQL.');
    }
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .order('start_date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (err: any) {
      console.error('Fetch calendar events error:', err);
      showToast('error', err.message || 'Failed to fetch calendar events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const showToast = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedEventId(null);
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      title: '',
      description: '',
      event_type: 'event',
      start_date: today,
      end_date: today,
      start_time: '09:00',
      end_time: '10:30',
      location: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: CalendarEventItem) => {
    setModalMode('edit');
    setSelectedEventId(item.id);
    setFormData({
      title: item.title,
      description: item.description || '',
      event_type: item.event_type,
      start_date: item.start_date,
      end_date: item.end_date || item.start_date,
      start_time: item.start_time || '',
      end_time: item.end_time || '',
      location: item.location || '',
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.start_date) {
      showToast('error', 'Event title and start date are required.');
      return;
    }

    setSubmitting(true);
    try {
      if (modalMode === 'create') {
        const { error, fallbackUsed } = await insertWithCreatedByFallback('calendar_events', {
          user_id: user?.id,
          created_by: user?.id,
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          event_type: formData.event_type as any,
          start_date: formData.start_date,
          end_date: formData.end_date || null,
          start_time: formData.start_time || null,
          end_time: formData.end_time || null,
          location: formData.location.trim() || null,
        });

        if (error) throw error;

        if (fallbackUsed) {
          setSchemaMigrationNeeded(true);
          showToast(
            'success',
            'Calendar event created! (Note: Run schema migration in Supabase to link created_by to your admin account)'
          );
        } else {
          showToast('success', 'Calendar event created successfully!');
        }
      } else if (modalMode === 'edit' && selectedEventId) {
        const { error } = await supabase
          .from('calendar_events')
          .update({
            title: formData.title.trim(),
            description: formData.description.trim() || null,
            event_type: formData.event_type as any,
            start_date: formData.start_date,
            end_date: formData.end_date || null,
            start_time: formData.start_time || null,
            end_time: formData.end_time || null,
            location: formData.location.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedEventId);

        if (error) throw error;
        showToast('success', 'Event updated successfully!');
      }

      setIsModalOpen(false);
      await fetchEvents();
    } catch (err: any) {
      console.error('Save event error:', err);
      showToast('error', err.message || 'Failed to save event.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!eventToDelete) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('calendar_events').delete().eq('id', eventToDelete.id);
      if (error) throw error;

      setEvents((prev) => prev.filter((e) => e.id !== eventToDelete.id));
      showToast('success', 'Event deleted from calendar.');
      setDeleteModalOpen(false);
      setEventToDelete(null);
    } catch (err: any) {
      console.error('Delete event error:', err);
      showToast('error', err.message || 'Failed to delete event.');
    } finally {
      setDeleting(false);
    }
  };

  const filteredEvents = events.filter((ev) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      ev.title.toLowerCase().includes(q) ||
      (ev.description && ev.description.toLowerCase().includes(q)) ||
      (ev.location && ev.location.toLowerCase().includes(q));

    const matchesType =
      selectedTypeFilter === 'all' || ev.event_type === selectedTypeFilter;

    return matchesSearch && matchesType;
  });

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-indigo-600" />
            <span>Academic Calendar Management</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Add semester holidays, orientation programs, makeup classes, and academic events.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleCopyMigration}
            title="Copy SQL migration to add created_by column across all tables"
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border border-slate-200"
          >
            {copiedMigration ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Code className="w-3.5 h-3.5 text-slate-500" />}
            <span>{copiedMigration ? 'Copied SQL!' : 'Migration SQL'}</span>
          </button>

          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Calendar Event</span>
          </button>
        </div>
      </div>

      {/* Schema Migration Banner if needed */}
      {schemaMigrationNeeded && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <Database className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900">Database Schema Migration Recommended</p>
              <p className="text-amber-700 mt-0.5">
                The <code className="font-mono font-bold">created_by</code> column is missing in your Supabase database schema cache. Click below to copy the SQL migration script and run it in your Supabase SQL Editor.
              </p>
            </div>
          </div>
          <button
            onClick={handleCopyMigration}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-xl flex items-center gap-1.5 shrink-0 self-start sm:self-auto transition-colors"
          >
            {copiedMigration ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedMigration ? 'SQL Copied!' : 'Copy Migration SQL'}</span>
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search calendar events by name or location..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
          />
        </div>

        <div className="w-full md:w-auto">
          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Event Types</option>
            {EVENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
            <p className="text-xs text-slate-500">Loading events...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-12 text-center">
            <CalendarIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No events found</p>
            <p className="text-xs text-slate-500 mt-1">
              Click "+ Add Calendar Event" to add holidays or university schedules.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Event Title</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEvents.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 max-w-sm">
                      <p className="font-bold text-slate-900">{ev.title}</p>
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                        {ev.description || 'No description provided.'}
                      </p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[10px] capitalize">
                        {ev.event_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-800">{ev.start_date}</p>
                      {ev.start_time && (
                        <p className="text-slate-400 font-mono text-[11px]">
                          {ev.start_time} {ev.end_time ? `- ${ev.end_time}` : ''}
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {ev.location ? (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{ev.location}</span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(ev)}
                          className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                          title="Edit event"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setEventToDelete(ev);
                            setDeleteModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-white border border-slate-200 text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete event"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-indigo-600" />
                <span>{modalMode === 'create' ? 'Add Calendar Event' : 'Edit Event'}</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Event Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. University Foundation Day Holiday"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-600 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Event Type</label>
                <select
                  value={formData.event_type}
                  onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-indigo-600"
                >
                  {EVENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Location / Venue</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Auditorium / Campus Grounds / Online"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Event Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Additional details..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{modalMode === 'create' ? 'Publish Event' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModalOpen && eventToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Delete Event?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Are you sure you want to remove <span className="font-semibold text-slate-700">"{eventToDelete.title}"</span>?
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
              >
                {deleting && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>Delete Event</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
