import React, { useState, useEffect } from 'react';
import {
  Clock,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  AlertCircle,
  CheckCircle,
  Search,
  Filter,
  ExternalLink,
  FileDown,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import type { Database, DeadlineType } from '../types/database.types';
import {
  isTableMissingError,
  getFallbackDeadlines,
  saveFallbackDeadlines,
  getFallbackCourses,
} from '../lib/fallbackData';
import { SchemaNoticeBanner } from './SchemaNoticeBanner';

type Deadline = Database['public']['Tables']['deadlines']['Row'] & {
  courses?: Database['public']['Tables']['courses']['Row'] | null;
};
type Course = Database['public']['Tables']['courses']['Row'];

const DEADLINE_TYPES: { key: DeadlineType | 'all'; label: string }[] = [
  { key: 'all', label: 'All Tasks' },
  { key: 'assignment', label: 'Assignments' },
  { key: 'lab_report', label: 'Lab Reports' },
  { key: 'quiz', label: 'Quizzes' },
  { key: 'project', label: 'Projects' },
  { key: 'presentation', label: 'Presentations' },
  { key: 'other', label: 'Other' },
];

export const DeadlinesView: React.FC = () => {
  const { user, isAdmin, isConfigured } = useAuth();
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSchemaMissing, setIsSchemaMissing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<DeadlineType | 'all'>('all');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'upcoming' | 'overdue'>('upcoming');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDeadline, setEditingDeadline] = useState<Deadline | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    course_id: string;
    deadline_type: DeadlineType;
    due_date: string;
    due_time: string;
    external_url: string;
    attachment_url: string;
  }>({
    title: '',
    description: '',
    course_id: '',
    deadline_type: 'assignment',
    due_date: '',
    due_time: '23:59',
    external_url: '',
    attachment_url: '',
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [deadlinesRes, coursesRes] = await Promise.all([
        supabase
          .from('deadlines')
          .select('*, courses(*)')
          .order('due_date', { ascending: true })
          .order('due_time', { ascending: true, nullsFirst: false }),
        supabase.from('courses').select('*').order('course_code', { ascending: true }),
      ]);

      if (deadlinesRes.error) {
        if (isTableMissingError(deadlinesRes.error)) {
          setIsSchemaMissing(true);
          setDeadlines(getFallbackDeadlines());
          setCourses(getFallbackCourses());
          return;
        }
        throw new Error(deadlinesRes.error.message);
      }

      if (coursesRes.error && isTableMissingError(coursesRes.error)) {
        setCourses(getFallbackCourses());
      } else {
        setCourses(coursesRes.data || []);
      }

      setDeadlines(deadlinesRes.data || []);
    } catch (err: any) {
      if (isTableMissingError(err)) {
        setIsSchemaMissing(true);
        setDeadlines(getFallbackDeadlines());
        setCourses(getFallbackCourses());
      } else {
        console.error('Error loading deadlines:', err);
        setError(err.message || 'Failed to fetch deadlines.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    if (!isConfigured) return;

    // Realtime channel for deadlines
    const channel = supabase
      .channel('realtime:deadlines')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deadlines',
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isConfigured]);

  const openCreateModal = () => {
    setEditingDeadline(null);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    const defaultDate = tomorrow.toISOString().split('T')[0];

    setFormData({
      title: '',
      description: '',
      course_id: courses[0]?.id || '',
      deadline_type: 'assignment',
      due_date: defaultDate,
      due_time: '23:59',
      external_url: '',
      attachment_url: '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: Deadline) => {
    setEditingDeadline(item);
    setFormData({
      title: item.title,
      description: item.description || '',
      course_id: item.course_id,
      deadline_type: item.deadline_type,
      due_date: item.due_date,
      due_time: item.due_time ? item.due_time.substring(0, 5) : '23:59',
      external_url: item.external_url || '',
      attachment_url: item.attachment_url || '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.course_id) {
      setFormError('Please select a course.');
      return;
    }

    setFormSubmitting(true);
    setFormError(null);

    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        course_id: formData.course_id,
        deadline_type: formData.deadline_type,
        due_date: formData.due_date,
        due_time: formData.due_time ? `${formData.due_time}:00` : null,
        external_url: formData.external_url.trim() || null,
        attachment_url: formData.attachment_url.trim() || null,
        user_id: user?.id || null,
        created_by: user?.id || null,
        updated_at: new Date().toISOString(),
      };

      if (editingDeadline) {
        const { error: updateErr } = await supabase
          .from('deadlines')
          .update(payload)
          .eq('id', editingDeadline.id);

        if (updateErr) throw new Error(updateErr.message);

        if (user) {
          await supabase.from('activity_logs').insert({
            user_id: user.id,
            action: 'UPDATE_DEADLINE',
            entity_type: 'deadlines',
            entity_id: editingDeadline.id,
          });
        }
      } else {
        const { data: insertData, error: insertErr } = await supabase
          .from('deadlines')
          .insert(payload)
          .select()
          .single();

        if (insertErr) throw new Error(insertErr.message);

        if (user && insertData) {
          await supabase.from('activity_logs').insert({
            user_id: user.id,
            action: 'CREATE_DEADLINE',
            entity_type: 'deadlines',
            entity_id: insertData.id,
          });
        }
      }

      setIsModalOpen(false);
      await fetchData();
    } catch (err: any) {
      console.error('Save deadline error:', err);
      setFormError(err.message || 'Error occurred while saving deadline.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this deadline?')) return;

    try {
      const { error: deleteErr } = await supabase.from('deadlines').delete().eq('id', id);
      if (deleteErr) throw new Error(deleteErr.message);

      if (user) {
        await supabase.from('activity_logs').insert({
          user_id: user.id,
          action: 'DELETE_DEADLINE',
          entity_type: 'deadlines',
          entity_id: id,
        });
      }

      await fetchData();
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    }
  };

  // Helper to calculate countdown & urgency
  const getDeadlineStatus = (dueDate: string, dueTime: string | null) => {
    const timeStr = dueTime ? dueTime.substring(0, 5) : '23:59';
    const target = new Date(`${dueDate}T${timeStr}`);
    const now = new Date();
    const diffMs = target.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));

    if (diffMs < 0) {
      return {
        label: 'Overdue',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 font-bold',
        isOverdue: true,
        diffDays,
      };
    } else if (diffHours <= 24) {
      return {
        label: `Due in ${diffHours}h`,
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-300 font-bold',
        isOverdue: false,
        diffDays,
      };
    } else if (diffDays <= 3) {
      return {
        label: `Due in ${diffDays} days`,
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/90 font-bold',
        isOverdue: false,
        diffDays,
      };
    } else {
      return {
        label: `${diffDays} days left`,
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 font-semibold',
        isOverdue: false,
        diffDays,
      };
    }
  };

  const filteredDeadlines = deadlines.filter((d) => {
    const matchesSearch =
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.description && d.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (d.courses?.course_name && d.courses.course_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (d.courses?.course_code && d.courses.course_code.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = selectedType === 'all' || d.deadline_type === selectedType;
    const matchesCourse = selectedCourse === 'all' || d.course_id === selectedCourse;

    const status = getDeadlineStatus(d.due_date, d.due_time);
    const matchesStatus =
      filterStatus === 'all'
        ? true
        : filterStatus === 'upcoming'
        ? !status.isOverdue
        : status.isOverdue;

    return matchesSearch && matchesType && matchesCourse && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Schema Notice Banner if database table is not yet created in Supabase */}
      {isSchemaMissing && <SchemaNoticeBanner tableName="public.deadlines" />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <span>Academic Deadlines & Deliverables</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Assignment submissions, lab reports, project milestones, and presentations.
          </p>
        </div>

        {isAdmin && (
          <button
            id="btn-add-deadline"
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Deadline</span>
          </button>
        )}
      </div>

      {/* Type & Status Filter */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {DEADLINE_TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => setSelectedType(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shadow-2xs ${
                selectedType === t.key
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
          <button
            onClick={() => setFilterStatus('upcoming')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              filterStatus === 'upcoming'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              filterStatus === 'all'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterStatus('overdue')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              filterStatus === 'overdue'
                ? 'bg-red-600 text-white shadow-2xs font-semibold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Past Due
          </button>
        </div>
      </div>

      {/* Search & Course Filter */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
        <div className="sm:col-span-8 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="input-search-deadlines"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search deadlines by title or course..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
          />
        </div>

        <div className="sm:col-span-4 relative">
          <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select
            id="select-deadline-course-filter"
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-600 appearance-none cursor-pointer"
          >
            <option value="all">All Courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.course_code} - {c.course_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="py-16 text-center text-slate-500 flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-xs">Loading deadlines from Supabase...</span>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
          <div>
            <p className="font-semibold">Error loading deadlines</p>
            <p className="text-rose-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredDeadlines.length === 0 && (
        <div className="py-16 text-center rounded-xl bg-white border border-slate-200 shadow-sm p-8">
          <Clock className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800">No deadlines found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {filterStatus === 'upcoming'
              ? 'Great news! There are no upcoming deadlines matching your filters.'
              : 'No deadlines match your current search and filters.'}
          </p>
          {isAdmin && (
            <button
              onClick={openCreateModal}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm"
            >
              Add First Deadline
            </button>
          )}
        </div>
      )}

      {/* Deadlines List */}
      {!loading && !error && filteredDeadlines.length > 0 && (
        <div className="space-y-3.5">
          {filteredDeadlines.map((deadline) => {
            const status = getDeadlineStatus(deadline.due_date, deadline.due_time);
            return (
              <div
                key={deadline.id}
                className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md hover:border-indigo-200 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${status.badgeClass}`}
                    >
                      {status.label}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md uppercase">
                      {deadline.deadline_type.replace('_', ' ')}
                    </span>
                    {deadline.courses && (
                      <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                        {deadline.courses.course_code}: {deadline.courses.course_name}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    {deadline.title}
                  </h3>

                  {deadline.description && (
                    <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
                      {deadline.description}
                    </p>
                  )}
                </div>

                {/* Due Date Info & Controls */}
                <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                  <div className="text-left sm:text-right">
                    <div className="flex items-center gap-1.5 text-xs text-slate-800 font-semibold">
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      <span>{new Date(deadline.due_date).toLocaleDateString()}</span>
                    </div>
                    {deadline.due_time && (
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        Due: {deadline.due_time.substring(0, 5)}
                      </div>
                    )}
                  </div>

                  {/* Actions & Links */}
                  <div className="flex items-center gap-1.5">
                    {deadline.external_url && (
                      <a
                        href={deadline.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-slate-500 hover:text-blue-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                        title="Submission Link"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}

                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(deadline)}
                          className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(deadline.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-rose-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-base text-slate-900">
                {editingDeadline ? 'Edit Academic Deadline' : 'Add Academic Deadline'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Lab 3: Inter-process Communication Report"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Course *
                  </label>
                  <select
                    required
                    value={formData.course_id}
                    onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    <option value="">Select Course</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.course_code} - {c.course_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Task Type *
                  </label>
                  <select
                    value={formData.deadline_type}
                    onChange={(e) =>
                      setFormData({ ...formData, deadline_type: e.target.value as DeadlineType })
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    <option value="assignment">Assignment</option>
                    <option value="lab_report">Lab Report</option>
                    <option value="quiz">Quiz</option>
                    <option value="project">Project</option>
                    <option value="presentation">Presentation</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Due Time (Optional)
                  </label>
                  <input
                    type="time"
                    value={formData.due_time}
                    onChange={(e) => setFormData({ ...formData, due_time: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Submission Instructions / Details
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Specify submission format (PDF, GitHub repo, ZIP), criteria, or rubric..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Submission / External Link
                </label>
                <input
                  type="url"
                  value={formData.external_url}
                  onChange={(e) => setFormData({ ...formData, external_url: e.target.value })}
                  placeholder="https://classroom.google.com/... or submission portal"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm"
                >
                  {formSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingDeadline ? 'Update Deadline' : 'Save Deadline'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
