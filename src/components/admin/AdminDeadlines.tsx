import React, { useState, useEffect } from 'react';
import {
  Clock,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
  Calendar,
  Layers,
  FileText
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';

interface DeadlineItem {
  id: string;
  title: string;
  course_id: string;
  deadline_type: string;
  description: string | null;
  due_date: string;
  due_time: string | null;
  attachment_url: string | null;
  created_at: string;
  courses?: {
    code: string;
    name: string;
  } | null;
}

interface CourseOption {
  id: string;
  code: string;
  name: string;
}

const DEADLINE_TYPES = [
  { value: 'assignment', label: 'Assignment' },
  { value: 'lab_report', label: 'Lab Report' },
  { value: 'quiz', label: 'Quiz / Test' },
  { value: 'project', label: 'Project Milestone' },
  { value: 'presentation', label: 'Presentation' },
  { value: 'other', label: 'Other Academic Deadline' },
];

export const AdminDeadlines: React.FC = () => {
  const { user } = useAuth();
  const [deadlines, setDeadlines] = useState<DeadlineItem[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('all');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedDeadlineId, setSelectedDeadlineId] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    course_id: '',
    deadline_type: 'assignment',
    description: '',
    due_date: '',
    due_time: '23:59',
    attachment_url: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deadlineToDelete, setDeadlineToDelete] = useState<DeadlineItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toast
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchDeadlinesAndCourses = async () => {
    setLoading(true);
    try {
      const [deadlinesRes, coursesRes] = await Promise.all([
        supabase
          .from('deadlines')
          .select(`
            id,
            title,
            course_id,
            deadline_type,
            description,
            due_date,
            due_time,
            attachment_url,
            created_at,
            courses (
              code,
              name
            )
          `)
          .order('due_date', { ascending: true }),
        supabase.from('courses').select('id, code, name').order('code', { ascending: true }),
      ]);

      if (deadlinesRes.data) setDeadlines(deadlinesRes.data as any[]);
      if (coursesRes.data) setCourses(coursesRes.data);
    } catch (err: any) {
      console.error('Fetch deadlines error:', err);
      showToast('error', err.message || 'Failed to fetch deadlines.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeadlinesAndCourses();
  }, []);

  const showToast = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedDeadlineId(null);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 3);
    const dateStr = tomorrow.toISOString().split('T')[0];

    setFormData({
      title: '',
      course_id: courses[0]?.id || '',
      deadline_type: 'assignment',
      description: '',
      due_date: dateStr,
      due_time: '23:59',
      attachment_url: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: DeadlineItem) => {
    setModalMode('edit');
    setSelectedDeadlineId(item.id);
    setFormData({
      title: item.title,
      course_id: item.course_id,
      deadline_type: item.deadline_type,
      description: item.description || '',
      due_date: item.due_date,
      due_time: item.due_time || '23:59',
      attachment_url: item.attachment_url || '',
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.course_id || !formData.due_date) {
      showToast('error', 'Title, course, and due date are required.');
      return;
    }

    setSubmitting(true);
    try {
      if (modalMode === 'create') {
        const { error } = await supabase.from('deadlines').insert({
          user_id: user?.id,
          created_by: user?.id,
          title: formData.title.trim(),
          course_id: formData.course_id,
          deadline_type: formData.deadline_type as any,
          description: formData.description.trim() || null,
          due_date: formData.due_date,
          due_time: formData.due_time || null,
          attachment_url: formData.attachment_url.trim() || null,
        });

        if (error) throw error;
        showToast('success', 'Academic deadline scheduled successfully!');
      } else if (modalMode === 'edit' && selectedDeadlineId) {
        const { error } = await supabase
          .from('deadlines')
          .update({
            title: formData.title.trim(),
            course_id: formData.course_id,
            deadline_type: formData.deadline_type as any,
            description: formData.description.trim() || null,
            due_date: formData.due_date,
            due_time: formData.due_time || null,
            attachment_url: formData.attachment_url.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedDeadlineId);

        if (error) throw error;
        showToast('success', 'Deadline updated successfully!');
      }

      setIsModalOpen(false);
      await fetchDeadlinesAndCourses();
    } catch (err: any) {
      console.error('Save deadline error:', err);
      showToast('error', err.message || 'Failed to save deadline.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deadlineToDelete) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('deadlines').delete().eq('id', deadlineToDelete.id);
      if (error) throw error;

      setDeadlines((prev) => prev.filter((d) => d.id !== deadlineToDelete.id));
      showToast('success', 'Deadline removed successfully.');
      setDeleteModalOpen(false);
      setDeadlineToDelete(null);
    } catch (err: any) {
      console.error('Delete deadline error:', err);
      showToast('error', err.message || 'Failed to delete deadline.');
    } finally {
      setDeleting(false);
    }
  };

  const filteredDeadlines = deadlines.filter((d) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      d.title.toLowerCase().includes(q) ||
      (d.description && d.description.toLowerCase().includes(q)) ||
      (d.courses && d.courses.code.toLowerCase().includes(q));

    const matchesCourse =
      selectedCourseFilter === 'all' || d.course_id === selectedCourseFilter;

    return matchesSearch && matchesCourse;
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
            <Clock className="w-5 h-5 text-indigo-600" />
            <span>Submission & Deadline Management</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Post assignment deadlines, lab submission dates, and project milestones.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add New Deadline</span>
        </button>
      </div>

      {/* Filters */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search deadlines by title or course..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
          />
        </div>

        <div className="w-full md:w-auto">
          <select
            value={selectedCourseFilter}
            onChange={(e) => setSelectedCourseFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code}
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
            <p className="text-xs text-slate-500">Loading deadlines...</p>
          </div>
        ) : filteredDeadlines.length === 0 ? (
          <div className="p-12 text-center">
            <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No deadlines scheduled</p>
            <p className="text-xs text-slate-500 mt-1">
              Click "+ Add New Deadline" to publish an upcoming submission date.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Deadline Title</th>
                  <th className="py-3 px-4">Course</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Due Date & Time</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDeadlines.map((d) => {
                  const isPast = new Date(`${d.due_date}T${d.due_time || '23:59'}`) < new Date();
                  return (
                    <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 max-w-sm">
                        <p className="font-bold text-slate-900">{d.title}</p>
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {d.description || 'No additional instructions.'}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px]">
                          {d.courses?.code || '—'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[10px] capitalize">
                          {d.deadline_type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div>
                          <span
                            className={`font-semibold ${
                              isPast ? 'text-slate-400 line-through' : 'text-rose-600'
                            }`}
                          >
                            {d.due_date}
                          </span>
                          {d.due_time && (
                            <span className="text-slate-400 ml-1.5 font-mono text-[11px]">
                              @{d.due_time}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(d)}
                            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                            title="Edit deadline"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setDeadlineToDelete(d);
                              setDeleteModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-white border border-slate-200 text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete deadline"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>{modalMode === 'create' ? 'Create Academic Deadline' : 'Edit Deadline'}</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Title / Assignment Name *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Lab Assignment 2 - Thread Synchronization"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-600 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Course *</label>
                  <select
                    required
                    value={formData.course_id}
                    onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-indigo-600"
                  >
                    <option value="">Select course...</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Type</label>
                  <select
                    value={formData.deadline_type}
                    onChange={(e) => setFormData({ ...formData, deadline_type: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-indigo-600"
                  >
                    {DEADLINE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cutoff Time</label>
                  <input
                    type="time"
                    value={formData.due_time}
                    onChange={(e) => setFormData({ ...formData, due_time: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Submission Details & Guidelines</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Specify submission platform (e.g. Google Classroom, moodle), format (.zip, .pdf), or late penalty..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Submission / Reference URL (Optional)</label>
                <input
                  type="url"
                  value={formData.attachment_url}
                  onChange={(e) => setFormData({ ...formData, attachment_url: e.target.value })}
                  placeholder="https://classroom.google.com/..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-600 font-mono"
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
                  <span>{modalMode === 'create' ? 'Publish Deadline' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModalOpen && deadlineToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Delete Deadline?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Are you sure you want to delete <span className="font-semibold text-slate-700">"{deadlineToDelete.title}"</span>?
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
                <span>Delete Deadline</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
