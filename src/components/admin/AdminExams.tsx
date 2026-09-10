import React, { useState, useEffect } from 'react';
import {
  Calendar,
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
  BookOpen,
  Database,
  Code,
  Copy,
  Check
} from 'lucide-react';
import { supabase, insertWithCreatedByFallback } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { ALL_MODULES_MIGRATION_SQL, copyToClipboard } from '../../lib/sqlScripts';

interface ExamItem {
  id: string;
  course_id: string;
  exam_type: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  room: string;
  instructions: string | null;
  created_at: string;
  courses?: {
    course_code: string;
    course_name: string;
  } | null;
}

interface CourseOption {
  id: string;
  course_code: string;
  course_name: string;
}

const EXAM_TYPES = [
  { value: 'quiz', label: 'Quiz' },
  { value: 'midterm', label: 'Midterm Examination' },
  { value: 'final', label: 'Final Examination' },
  { value: 'lab_exam', label: 'Lab Final Exam' },
  { value: 'viva', label: 'Viva Voce' },
  { value: 'presentation', label: 'Project Presentation' },
];

export const AdminExams: React.FC = () => {
  const { user } = useAuth();
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('all');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    course_id: '',
    exam_type: 'midterm',
    exam_date: '',
    start_time: '10:00',
    end_time: '12:00',
    room: '',
    instructions: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [examToDelete, setExamToDelete] = useState<ExamItem | null>(null);
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

  const fetchExamsAndCourses = async () => {
    setLoading(true);
    try {
      const [examsRes, coursesRes] = await Promise.all([
        supabase
          .from('exams')
          .select(`
            id,
            course_id,
            exam_type,
            exam_date,
            start_time,
            end_time,
            room,
            instructions,
            created_at,
            courses (
              course_code,
              course_name
            )
          `)
          .order('exam_date', { ascending: true }),
        supabase.from('courses').select('id, course_code, course_name').order('course_code', { ascending: true }),
      ]);

      if (examsRes.data) setExams(examsRes.data as any[]);
      if (coursesRes.data) setCourses(coursesRes.data);
    } catch (err: any) {
      console.error('Fetch exams error:', err);
      showToast('error', err.message || 'Failed to fetch exam schedules.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExamsAndCourses();
  }, []);

  const showToast = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedExamId(null);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const dateStr = nextWeek.toISOString().split('T')[0];

    setFormData({
      course_id: courses[0]?.id || '',
      exam_type: 'midterm',
      exam_date: dateStr,
      start_time: '10:00',
      end_time: '12:00',
      room: 'UB20401',
      instructions: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: ExamItem) => {
    setModalMode('edit');
    setSelectedExamId(item.id);
    setFormData({
      course_id: item.course_id,
      exam_type: item.exam_type,
      exam_date: item.exam_date,
      start_time: item.start_time,
      end_time: item.end_time,
      room: item.room,
      instructions: item.instructions || '',
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.course_id || !formData.exam_date || !formData.room.trim()) {
      showToast('error', 'Course, exam date, and room number are required.');
      return;
    }

    setSubmitting(true);
    try {
      if (modalMode === 'create') {
        const { error, fallbackUsed } = await insertWithCreatedByFallback('exams', {
          user_id: user?.id,
          created_by: user?.id,
          course_id: formData.course_id,
          exam_type: formData.exam_type as any,
          exam_date: formData.exam_date,
          start_time: formData.start_time,
          end_time: formData.end_time,
          room: formData.room.trim(),
          instructions: formData.instructions.trim() || null,
        });

        if (error) throw error;

        if (fallbackUsed) {
          setSchemaMigrationNeeded(true);
          showToast(
            'success',
            'Exam scheduled! (Note: Run schema migration in Supabase to link created_by to your admin account)'
          );
        } else {
          showToast('success', 'Exam routine entry scheduled successfully!');
        }
      } else if (modalMode === 'edit' && selectedExamId) {
        const { error } = await supabase
          .from('exams')
          .update({
            course_id: formData.course_id,
            exam_type: formData.exam_type as any,
            exam_date: formData.exam_date,
            start_time: formData.start_time,
            end_time: formData.end_time,
            room: formData.room.trim(),
            instructions: formData.instructions.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedExamId);

        if (error) throw error;
        showToast('success', 'Exam routine updated!');
      }

      setIsModalOpen(false);
      await fetchExamsAndCourses();
    } catch (err: any) {
      console.error('Save exam error:', err);
      showToast('error', err.message || 'Failed to save exam routine.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!examToDelete) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('exams').delete().eq('id', examToDelete.id);
      if (error) throw error;

      setExams((prev) => prev.filter((e) => e.id !== examToDelete.id));
      showToast('success', 'Exam entry removed from schedule.');
      setDeleteModalOpen(false);
      setExamToDelete(null);
    } catch (err: any) {
      console.error('Delete exam error:', err);
      showToast('error', err.message || 'Failed to delete exam entry.');
    } finally {
      setDeleting(false);
    }
  };

  const filteredExams = exams.filter((e) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (e.courses && (e.courses.course_code.toLowerCase().includes(q) || e.courses.course_name.toLowerCase().includes(q))) ||
      e.room.toLowerCase().includes(q) ||
      (e.instructions && e.instructions.toLowerCase().includes(q));

    const matchesCourse =
      selectedCourseFilter === 'all' || e.course_id === selectedCourseFilter;

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
            <Calendar className="w-5 h-5 text-indigo-600" />
            <span>Exam Routine & Hall Allocation</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Maintain midterms, finals, quizzes, seating rooms, and exam instructions.
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
            <span>+ Add Exam Schedule</span>
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

      {/* Search & Filter */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by course code, hall room, or instructions..."
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
                {c.course_code} - {c.course_name}
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
            <p className="text-xs text-slate-500">Loading exam schedule...</p>
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No exams scheduled</p>
            <p className="text-xs text-slate-500 mt-1">
              Click "+ Add Exam Schedule" to publish exam routine for students.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Course & Type</th>
                  <th className="py-3 px-4">Exam Date</th>
                  <th className="py-3 px-4">Time Window</th>
                  <th className="py-3 px-4">Hall / Room</th>
                  <th className="py-3 px-4">Instructions</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExams.map((exam) => (
                  <tr key={exam.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px]">
                          {exam.courses?.course_code || '—'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[10px] capitalize">
                          {exam.exam_type.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {exam.exam_date}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono">
                      {exam.start_time} - {exam.end_time}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 font-bold text-indigo-700 bg-indigo-50/60 px-2 py-0.5 rounded-md border border-indigo-100">
                        <MapPin className="w-3 h-3 text-indigo-500" />
                        <span>{exam.room}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                      {exam.instructions || 'Standard examination rules apply.'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(exam)}
                          className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                          title="Edit exam"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setExamToDelete(exam);
                            setDeleteModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-white border border-slate-200 text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete exam"
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
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span>{modalMode === 'create' ? 'Schedule Examination' : 'Edit Exam Details'}</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
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
                        {c.course_code} - {c.course_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Exam Type</label>
                  <select
                    value={formData.exam_type}
                    onChange={(e) => setFormData({ ...formData, exam_type: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-indigo-600"
                  >
                    {EXAM_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.exam_date}
                    onChange={(e) => setFormData({ ...formData, exam_date: e.target.value })}
                    className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-600 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-600 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-600 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Exam Hall / Room Allocation *</label>
                <input
                  type="text"
                  required
                  value={formData.room}
                  onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                  placeholder="e.g. UB20401 (Section E Roll 1-40)"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-600 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Instructions & Guidelines</label>
                <textarea
                  rows={3}
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  placeholder="Non-programmable calculators allowed, student ID cards mandatory, open-book rules..."
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
                  <span>{modalMode === 'create' ? 'Publish Exam Schedule' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModalOpen && examToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Delete Exam Schedule?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Are you sure you want to remove the exam entry for <span className="font-semibold text-slate-700">{examToDelete.courses?.course_code} ({examToDelete.exam_type})</span>?
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
                <span>Delete Entry</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
