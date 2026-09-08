import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  Edit2,
  User,
  BookOpen,
  Bell,
  Clock,
  Search,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import type { Database } from '../types/database.types';
import {
  isTableMissingError,
  getFallbackCourses,
  saveFallbackCourses,
  getFallbackNotices,
  getFallbackMaterials,
  getFallbackDeadlines,
} from '../lib/fallbackData';
import { SchemaNoticeBanner } from './SchemaNoticeBanner';

type Course = Database['public']['Tables']['courses']['Row'];

interface CourseWithCounts extends Course {
  noticeCount?: number;
  materialCount?: number;
  deadlineCount?: number;
}

export const CoursesView: React.FC = () => {
  const { user, isAdmin, isConfigured } = useAuth();
  const [courses, setCourses] = useState<CourseWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSchemaMissing, setIsSchemaMissing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    course_code: '',
    course_name: '',
    teacher_name: '',
    description: '',
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: coursesData, error: coursesErr } = await supabase
        .from('courses')
        .select('*')
        .order('course_code', { ascending: true });

      if (coursesErr) {
        if (isTableMissingError(coursesErr)) {
          setIsSchemaMissing(true);
          const fallbackCourses = getFallbackCourses();
          const noticesList = getFallbackNotices();
          const materialsList = getFallbackMaterials();
          const deadlinesList = getFallbackDeadlines();
          const coursesWithCounts: CourseWithCounts[] = fallbackCourses.map((c) => ({
            ...c,
            noticeCount: noticesList.filter((n) => n.course_id === c.id).length,
            materialCount: materialsList.filter((m) => m.course_id === c.id).length,
            deadlineCount: deadlinesList.filter((d) => d.course_id === c.id).length,
          }));
          setCourses(coursesWithCounts);
          return;
        }
        throw new Error(coursesErr.message);
      }

      // Fetch related resource counts
      const [noticesRes, materialsRes, deadlinesRes] = await Promise.all([
        supabase.from('notices').select('course_id'),
        supabase.from('materials').select('course_id'),
        supabase.from('deadlines').select('course_id'),
      ]);

      const noticesList = noticesRes.data || getFallbackNotices();
      const materialsList = materialsRes.data || getFallbackMaterials();
      const deadlinesList = deadlinesRes.data || getFallbackDeadlines();

      const coursesWithCounts: CourseWithCounts[] = (coursesData || []).map((c) => ({
        ...c,
        noticeCount: noticesList.filter((n) => n.course_id === c.id).length,
        materialCount: materialsList.filter((m) => m.course_id === c.id).length,
        deadlineCount: deadlinesList.filter((d) => d.course_id === c.id).length,
      }));

      setCourses(coursesWithCounts);
    } catch (err: any) {
      if (isTableMissingError(err)) {
        setIsSchemaMissing(true);
        const fallbackCourses = getFallbackCourses();
        const noticesList = getFallbackNotices();
        const materialsList = getFallbackMaterials();
        const deadlinesList = getFallbackDeadlines();
        const coursesWithCounts: CourseWithCounts[] = fallbackCourses.map((c) => ({
          ...c,
          noticeCount: noticesList.filter((n) => n.course_id === c.id).length,
          materialCount: materialsList.filter((m) => m.course_id === c.id).length,
          deadlineCount: deadlinesList.filter((d) => d.course_id === c.id).length,
        }));
        setCourses(coursesWithCounts);
      } else {
        console.error('Error fetching courses:', err);
        setError(err.message || 'Failed to fetch courses.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isConfigured]);

  const openCreateModal = () => {
    setEditingCourse(null);
    setFormData({
      course_code: '',
      course_name: '',
      teacher_name: '',
      description: '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (c: Course) => {
    setEditingCourse(c);
    setFormData({
      course_code: c.course_code,
      course_name: c.course_name,
      teacher_name: c.teacher_name,
      description: c.description || '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);

    try {
      const payload = {
        course_code: formData.course_code.trim().toUpperCase(),
        course_name: formData.course_name.trim(),
        teacher_name: formData.teacher_name.trim(),
        description: formData.description.trim() || null,
        user_id: user?.id || null,
        created_by: user?.id || null,
        updated_at: new Date().toISOString(),
      };

      if (editingCourse) {
        const { error: updateErr } = await supabase
          .from('courses')
          .update(payload)
          .eq('id', editingCourse.id);

        if (updateErr) throw new Error(updateErr.message);

        if (user) {
          await supabase.from('activity_logs').insert({
            user_id: user.id,
            action: 'UPDATE_COURSE',
            entity_type: 'courses',
            entity_id: editingCourse.id,
          });
        }
      } else {
        const { data: insertData, error: insertErr } = await supabase
          .from('courses')
          .insert(payload)
          .select()
          .single();

        if (insertErr) throw new Error(insertErr.message);

        if (user && insertData) {
          await supabase.from('activity_logs').insert({
            user_id: user.id,
            action: 'CREATE_COURSE',
            entity_type: 'courses',
            entity_id: insertData.id,
          });
        }
      }

      setIsModalOpen(false);
      await fetchData();
    } catch (err: any) {
      console.error('Course save error:', err);
      setFormError(err.message || 'Error occurred while saving course.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (course: CourseWithCounts) => {
    const confirmation = window.confirm(
      `Delete course "${course.course_code}: ${course.course_name}"? \nNote: Notices and bookmarks linked to this course will remain preserved with general visibility.`
    );
    if (!confirmation) return;

    try {
      const { error: deleteErr } = await supabase.from('courses').delete().eq('id', course.id);
      if (deleteErr) throw new Error(deleteErr.message);

      if (user) {
        await supabase.from('activity_logs').insert({
          user_id: user.id,
          action: 'DELETE_COURSE',
          entity_type: 'courses',
          entity_id: course.id,
        });
      }

      await fetchData();
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    }
  };

  const filteredCourses = courses.filter((c) => {
    return (
      c.course_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.course_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.teacher_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  return (
    <div className="space-y-6">
      {/* Schema Notice Banner if database table is not yet created in Supabase */}
      {isSchemaMissing && <SchemaNoticeBanner tableName="public.courses" />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            <span>Academic Courses & Curricula</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Registered semester courses, instructors, syllabus overviews, and learning modules.
          </p>
        </div>

        {isAdmin && (
          <button
            id="btn-add-course"
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Course</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
        <Search className="w-4 h-4 absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          id="input-search-courses"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by course code, title, instructor name..."
          className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="py-16 text-center text-slate-500 flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-xs">Loading academic courses from Supabase...</span>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
          <div>
            <p className="font-semibold">Error loading courses</p>
            <p className="text-rose-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && filteredCourses.length === 0 && (
        <div className="py-16 text-center rounded-xl bg-white border border-slate-200 shadow-sm p-8">
          <Layers className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800">No courses found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            No courses match your search criteria or none have been initialized yet.
          </p>
          {isAdmin && (
            <button
              onClick={openCreateModal}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm"
            >
              Add Course
            </button>
          )}
        </div>
      )}

      {/* Courses Grid */}
      {!loading && !error && filteredCourses.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {filteredCourses.map((course) => (
            <div
              key={course.id}
              className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="inline-block px-2.5 py-1 rounded-md text-xs font-bold tracking-wider uppercase bg-blue-50 text-blue-700 border border-blue-200">
                    {course.course_code}
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(course)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-colors"
                        title="Edit Course"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(course)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Delete Course"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <h3 className="text-base font-bold text-slate-900 mt-2.5 leading-snug">
                  {course.course_name}
                </h3>

                <div className="flex items-center gap-2 mt-2 text-xs text-slate-600">
                  <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="font-semibold">{course.teacher_name}</span>
                </div>

                {course.description && (
                  <p className="text-xs text-slate-500 mt-2.5 leading-relaxed line-clamp-3">
                    {course.description}
                  </p>
                )}
              </div>

              {/* Resource Count Stats */}
              <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5" title="Notices for this course">
                    <Bell className="w-3.5 h-3.5 text-slate-400" />
                    <span>{course.noticeCount || 0} notices</span>
                  </span>

                  <span className="flex items-center gap-1.5" title="Study materials">
                    <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                    <span>{course.materialCount || 0} files</span>
                  </span>

                  <span className="flex items-center gap-1.5" title="Deadlines">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{course.deadlineCount || 0} deadlines</span>
                  </span>
                </div>
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
                {editingCourse ? 'Edit Course' : 'Create Course'}
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
                    Course Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.course_code}
                    onChange={(e) => setFormData({ ...formData, course_code: e.target.value })}
                    placeholder="e.g. CSE 311"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Instructor Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.teacher_name}
                    onChange={(e) => setFormData({ ...formData, teacher_name: e.target.value })}
                    placeholder="e.g. Dr. Alistair Finch"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Course Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.course_name}
                  onChange={(e) => setFormData({ ...formData, course_name: e.target.value })}
                  placeholder="e.g. Database Management Systems"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description / Syllabus Summary
                </label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Course topics, prerequisites, lab schedules, credits..."
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
                  <span>{editingCourse ? 'Save Changes' : 'Create Course'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
