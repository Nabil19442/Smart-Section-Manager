import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  Clock,
  MapPin,
  AlertCircle,
  Search,
  Filter,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import type { Database, ExamType } from '../types/database.types';
import {
  isTableMissingError,
  getFallbackExams,
  saveFallbackExams,
  getFallbackCourses,
} from '../lib/fallbackData';
import { SchemaNoticeBanner } from './SchemaNoticeBanner';

type Exam = Database['public']['Tables']['exams']['Row'] & {
  courses?: Database['public']['Tables']['courses']['Row'] | null;
};
type Course = Database['public']['Tables']['courses']['Row'];

const EXAM_TYPES: { key: ExamType | 'all'; label: string }[] = [
  { key: 'all', label: 'All Exams' },
  { key: 'midterm', label: 'Midterm' },
  { key: 'final', label: 'Final Examination' },
  { key: 'quiz', label: 'Quizzes' },
  { key: 'lab_exam', label: 'Lab Exams' },
  { key: 'viva', label: 'Viva Voce' },
  { key: 'presentation', label: 'Presentations' },
];

export const ExamsView: React.FC = () => {
  const { user, isAdmin, isConfigured } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSchemaMissing, setIsSchemaMissing] = useState(false);

  // Filters
  const [selectedType, setSelectedType] = useState<ExamType | 'all'>('all');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form
  const [formData, setFormData] = useState<{
    course_id: string;
    exam_type: ExamType;
    exam_date: string;
    start_time: string;
    end_time: string;
    room: string;
    instructions: string;
  }>({
    course_id: '',
    exam_type: 'midterm',
    exam_date: '',
    start_time: '10:00',
    end_time: '12:00',
    room: '',
    instructions: '',
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [examsRes, coursesRes] = await Promise.all([
        supabase
          .from('exams')
          .select('*, courses(*)')
          .order('exam_date', { ascending: true })
          .order('start_time', { ascending: true }),
        supabase.from('courses').select('*').order('course_code', { ascending: true }),
      ]);

      if (examsRes.error) {
        if (isTableMissingError(examsRes.error)) {
          setIsSchemaMissing(true);
          setExams(getFallbackExams());
          setCourses(getFallbackCourses());
          return;
        }
        throw new Error(examsRes.error.message);
      }

      if (coursesRes.error && isTableMissingError(coursesRes.error)) {
        setCourses(getFallbackCourses());
      } else {
        setCourses(coursesRes.data || []);
      }

      setExams(examsRes.data || []);
    } catch (err: any) {
      if (isTableMissingError(err)) {
        setIsSchemaMissing(true);
        setExams(getFallbackExams());
        setCourses(getFallbackCourses());
      } else {
        console.error('Error fetching exams:', err);
        setError(err.message || 'Failed to fetch exam schedules.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    if (!isConfigured) return;

    const channel = supabase
      .channel('realtime:exams')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'exams',
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
    setEditingExam(null);
    const inTwoWeeks = new Date();
    inTwoWeeks.setDate(inTwoWeeks.getDate() + 14);

    setFormData({
      course_id: courses[0]?.id || '',
      exam_type: 'midterm',
      exam_date: inTwoWeeks.toISOString().split('T')[0],
      start_time: '10:00',
      end_time: '12:00',
      room: 'Main Academic Hall 201',
      instructions: 'Bring Student ID card. Graph papers will be provided.',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (exam: Exam) => {
    setEditingExam(exam);
    setFormData({
      course_id: exam.course_id,
      exam_type: exam.exam_type,
      exam_date: exam.exam_date,
      start_time: exam.start_time.substring(0, 5),
      end_time: exam.end_time.substring(0, 5),
      room: exam.room,
      instructions: exam.instructions || '',
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
        course_id: formData.course_id,
        exam_type: formData.exam_type,
        exam_date: formData.exam_date,
        start_time: `${formData.start_time}:00`,
        end_time: `${formData.end_time}:00`,
        room: formData.room.trim(),
        instructions: formData.instructions.trim() || null,
        created_by: user?.id || null,
        updated_at: new Date().toISOString(),
      };

      if (editingExam) {
        const { error: updateErr } = await supabase
          .from('exams')
          .update(payload)
          .eq('id', editingExam.id);

        if (updateErr) throw new Error(updateErr.message);

        if (user) {
          await supabase.from('activity_logs').insert({
            user_id: user.id,
            action: 'UPDATE_EXAM',
            entity_type: 'exams',
            entity_id: editingExam.id,
          });
        }
      } else {
        const { data: insertData, error: insertErr } = await supabase
          .from('exams')
          .insert(payload)
          .select()
          .single();

        if (insertErr) throw new Error(insertErr.message);

        if (user && insertData) {
          await supabase.from('activity_logs').insert({
            user_id: user.id,
            action: 'CREATE_EXAM',
            entity_type: 'exams',
            entity_id: insertData.id,
          });
        }
      }

      setIsModalOpen(false);
      await fetchData();
    } catch (err: any) {
      console.error('Save exam error:', err);
      setFormError(err.message || 'Failed to save exam schedule.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this exam schedule?')) return;

    try {
      const { error: deleteErr } = await supabase.from('exams').delete().eq('id', id);
      if (deleteErr) throw new Error(deleteErr.message);

      if (user) {
        await supabase.from('activity_logs').insert({
          user_id: user.id,
          action: 'DELETE_EXAM',
          entity_type: 'exams',
          entity_id: id,
        });
      }

      await fetchData();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const filteredExams = exams.filter((exam) => {
    const matchesCourse = selectedCourse === 'all' || exam.course_id === selectedCourse;
    const matchesType = selectedType === 'all' || exam.exam_type === selectedType;
    const matchesSearch =
      exam.room.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (exam.instructions && exam.instructions.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (exam.courses?.course_name && exam.courses.course_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (exam.courses?.course_code && exam.courses.course_code.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCourse && matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Schema Notice Banner if database table is not yet created in Supabase */}
      {isSchemaMissing && <SchemaNoticeBanner tableName="public.exams" />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span>Examination Schedules & Venues</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Official dates, start & end times, hall assignments, and exam guidelines.
          </p>
        </div>

        {isAdmin && (
          <button
            id="btn-schedule-exam"
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Exam</span>
          </button>
        )}
      </div>

      {/* Type Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {EXAM_TYPES.map((t) => (
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

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
        <div className="sm:col-span-8 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="input-search-exams"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search exams by room, course, or instructions..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
          />
        </div>

        <div className="sm:col-span-4 relative">
          <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select
            id="select-exam-course-filter"
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
          <span className="text-xs">Loading examination timetable from Supabase...</span>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
          <div>
            <p className="font-semibold">Error loading exams</p>
            <p className="text-rose-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredExams.length === 0 && (
        <div className="py-16 text-center rounded-xl bg-white border border-slate-200 shadow-sm p-8">
          <FileText className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800">No exams scheduled</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            No exams match your selected course or exam type criteria.
          </p>
          {isAdmin && (
            <button
              onClick={openCreateModal}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm"
            >
              Schedule First Exam
            </button>
          )}
        </div>
      )}

      {/* Exams Grid */}
      {!loading && !error && filteredExams.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredExams.map((exam) => (
            <div
              key={exam.id}
              className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                      {exam.exam_type.replace('_', ' ')}
                    </span>
                    {exam.courses && (
                      <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        {exam.courses.course_code}
                      </span>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(exam)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(exam.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <h3 className="text-base font-bold text-slate-900 mt-2.5">
                  {exam.courses ? exam.courses.course_name : 'Academic Assessment'}
                </h3>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="font-semibold">{new Date(exam.exam_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold">
                      {exam.start_time.substring(0, 5)} - {exam.end_time.substring(0, 5)}
                    </span>
                  </div>
                </div>

                <div className="mt-2.5 flex items-center gap-2 text-xs text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                  <MapPin className="w-4 h-4 shrink-0 text-amber-600" />
                  <span className="font-semibold">Room / Venue: {exam.room}</span>
                </div>

                {exam.instructions && (
                  <div className="mt-3 text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-800 block mb-0.5">Instructions:</span>
                    {exam.instructions}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-base text-slate-900">
                {editingExam ? 'Edit Examination Schedule' : 'Schedule Examination'}
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
                    Exam Type *
                  </label>
                  <select
                    value={formData.exam_type}
                    onChange={(e) =>
                      setFormData({ ...formData, exam_type: e.target.value as ExamType })
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    <option value="quiz">Quiz</option>
                    <option value="midterm">Midterm</option>
                    <option value="final">Final Examination</option>
                    <option value="lab_exam">Lab Exam</option>
                    <option value="viva">Viva Voce</option>
                    <option value="presentation">Presentation</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Exam Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.exam_date}
                  onChange={(e) => setFormData({ ...formData, exam_date: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    End Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assigned Room / Venue *
                </label>
                <input
                  type="text"
                  required
                  value={formData.room}
                  onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                  placeholder="e.g. Science Complex Room 402 / Auditorium B"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Exam Guidelines & Instructions
                </label>
                <textarea
                  rows={3}
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  placeholder="Seating details, allowable items (calculators/formula sheets), ID rules..."
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
                  <span>{editingExam ? 'Update Schedule' : 'Confirm Exam Schedule'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
