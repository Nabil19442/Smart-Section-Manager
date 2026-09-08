import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Search,
  Edit2,
  Trash2,
  User,
  BookOpen,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';

interface CourseItem {
  id: string;
  code: string;
  name: string;
  teacher_name: string;
  description: string | null;
  created_at: string;
}

export const AdminCourses: React.FC = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    teacher_name: '',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<CourseItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toast
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('code', { ascending: true });

      if (error) throw error;
      setCourses(data || []);
    } catch (err: any) {
      console.error('Fetch courses error:', err);
      showToast('error', err.message || 'Failed to fetch courses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const showToast = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedCourseId(null);
    setFormData({
      code: '',
      name: '',
      teacher_name: '',
      description: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (course: CourseItem) => {
    setModalMode('edit');
    setSelectedCourseId(course.id);
    setFormData({
      code: course.code,
      name: course.name,
      teacher_name: course.teacher_name || '',
      description: course.description || '',
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.name.trim() || !formData.teacher_name.trim()) {
      showToast('error', 'Course code, name, and teacher name are required.');
      return;
    }

    setSubmitting(true);
    try {
      if (modalMode === 'create') {
        const { error } = await supabase.from('courses').insert({
          user_id: user?.id,
          code: formData.code.trim().toUpperCase(),
          name: formData.name.trim(),
          teacher_name: formData.teacher_name.trim(),
          description: formData.description.trim() || null,
        });
        if (error) throw error;
        showToast('success', 'Course added to curriculum successfully!');
      } else if (modalMode === 'edit' && selectedCourseId) {
        const { error } = await supabase
          .from('courses')
          .update({
            code: formData.code.trim().toUpperCase(),
            name: formData.name.trim(),
            teacher_name: formData.teacher_name.trim(),
            description: formData.description.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedCourseId);
        if (error) throw error;
        showToast('success', 'Course information updated!');
      }

      setIsModalOpen(false);
      await fetchCourses();
    } catch (err: any) {
      console.error('Save course error:', err);
      showToast('error', err.message || 'Failed to save course.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!courseToDelete) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('courses').delete().eq('id', courseToDelete.id);
      if (error) throw error;

      setCourses((prev) => prev.filter((c) => c.id !== courseToDelete.id));
      showToast('success', 'Course removed from curriculum.');
      setDeleteModalOpen(false);
      setCourseToDelete(null);
    } catch (err: any) {
      console.error('Delete course error:', err);
      showToast('error', err.message || 'Failed to delete course.');
    } finally {
      setDeleting(false);
    }
  };

  const filteredCourses = courses.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      (c.teacher_name && c.teacher_name.toLowerCase().includes(q))
    );
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
            <Layers className="w-5 h-5 text-indigo-600" />
            <span>Course Curriculum Management</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Maintain the department courses, assigned instructors, and course details.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add New Course</span>
        </button>
      </div>

      {/* Search */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by course code, course title, or instructor name..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Courses Grid / Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
            <p className="text-xs text-slate-500">Loading courses...</p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="p-12 text-center">
            <Layers className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No courses found</p>
            <p className="text-xs text-slate-500 mt-1">
              {searchQuery ? 'Try adjusting your search query.' : 'Click "+ Add New Course" to add courses to your section curriculum.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Course Code</th>
                  <th className="py-3 px-4">Course Name</th>
                  <th className="py-3 px-4">Assigned Instructor</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCourses.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700">
                        {c.code}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {c.name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{c.teacher_name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                      {c.description || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(c)}
                          className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
                          title="Edit course"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setCourseToDelete(c);
                            setDeleteModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-white border border-slate-200 text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors"
                          title="Delete course"
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
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>{modalMode === 'create' ? 'Add New Course' : 'Edit Course Information'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Course Code *</label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g. CSE 221"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:border-indigo-600 uppercase"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Course Title *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Algorithms & Data Structures"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Teacher / Instructor Name *</label>
                <input
                  type="text"
                  required
                  value={formData.teacher_name}
                  onChange={(e) => setFormData({ ...formData, teacher_name: e.target.value })}
                  placeholder="e.g. Dr. Jane Doe"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Course Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Provide syllabus highlights, office hours, or consultation info..."
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
                  <span>{modalMode === 'create' ? 'Save Course' : 'Update Course'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModalOpen && courseToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Delete Course?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Are you sure you want to remove <span className="font-semibold text-slate-700">{courseToDelete.code} - {courseToDelete.name}</span>?
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
                <span>Delete Course</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
