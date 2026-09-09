import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Download,
  Copy,
  Edit2,
  Trash2,
  ExternalLink,
  Paperclip,
  Check,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  FileText
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { uploadUserFile, deleteStorageFile, getSignedFileUrl } from '../../lib/storageService';

interface MaterialItem {
  id: string;
  title: string;
  course_id: string;
  material_type: string;
  description: string | null;
  file_url: string;
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

const MATERIAL_TYPES = [
  { value: 'lecture_note', label: 'Lecture Note' },
  { value: 'pdf', label: 'PDF Document' },
  { value: 'slide', label: 'Lecture Slide' },
  { value: 'assignment', label: 'Assignment Spec' },
  { value: 'lab', label: 'Lab Manual' },
  { value: 'previous_question', label: 'Past Exam Question' },
  { value: 'suggestion', label: 'Exam Suggestion' },
  { value: 'other', label: 'Other Resource' },
];

export const AdminMaterials: React.FC = () => {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('all');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    course_id: '',
    material_type: 'lecture_note',
    description: '',
    file_url: '',
  });
  const [uploadSource, setUploadSource] = useState<'file' | 'url'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState<MaterialItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Toast
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchMaterialsAndCourses = async () => {
    setLoading(true);
    try {
      const [matRes, coursesRes] = await Promise.all([
        supabase
          .from('materials')
          .select(`
            id,
            title,
            course_id,
            material_type,
            description,
            file_url,
            created_at,
            courses (
              course_code,
              course_name
            )
          `)
          .order('created_at', { ascending: false }),
        supabase.from('courses').select('id, course_code, course_name').order('course_code', { ascending: true }),
      ]);

      if (matRes.data) setMaterials(matRes.data as any[]);
      if (coursesRes.data) setCourses(coursesRes.data);
    } catch (err: any) {
      console.error('Fetch materials error:', err);
      showToast('error', err.message || 'Failed to fetch study materials.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterialsAndCourses();
  }, []);

  const showToast = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedMaterialId(null);
    setFormData({
      title: '',
      course_id: courses[0]?.id || '',
      material_type: 'lecture_note',
      description: '',
      file_url: '',
    });
    setSelectedFile(null);
    setUploadSource('file');
    setIsModalOpen(true);
  };

  const openEditModal = (item: MaterialItem) => {
    setModalMode('edit');
    setSelectedMaterialId(item.id);
    setFormData({
      title: item.title,
      course_id: item.course_id,
      material_type: item.material_type,
      description: item.description || '',
      file_url: item.file_url || '',
    });
    setSelectedFile(null);
    setUploadSource(item.file_url.startsWith('http') ? 'url' : 'file');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.course_id) {
      showToast('error', 'Title and course assignment are required.');
      return;
    }

    setSubmitting(true);
    try {
      let finalUrl = formData.file_url.trim();

      // If uploading a new file to app-files
      if (uploadSource === 'file' && selectedFile && user) {
        const uploadRes = await uploadUserFile({
          file: selectedFile,
          userId: user.id,
          featureName: 'materials',
        });
        finalUrl = uploadRes.path;
      }

      if (!finalUrl) {
        showToast('error', 'Please provide a file upload or external resource URL.');
        setSubmitting(false);
        return;
      }

      if (modalMode === 'create') {
        const { error } = await supabase.from('materials').insert({
          user_id: user?.id,
          created_by: user?.id,
          title: formData.title.trim(),
          course_id: formData.course_id,
          material_type: formData.material_type as any,
          description: formData.description.trim() || null,
          file_url: finalUrl,
        });

        if (error) throw error;
        showToast('success', 'Study material uploaded and published successfully!');
      } else if (modalMode === 'edit' && selectedMaterialId) {
        const { error } = await supabase
          .from('materials')
          .update({
            title: formData.title.trim(),
            course_id: formData.course_id,
            material_type: formData.material_type as any,
            description: formData.description.trim() || null,
            file_url: finalUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedMaterialId);

        if (error) throw error;
        showToast('success', 'Material updated successfully!');
      }

      setIsModalOpen(false);
      await fetchMaterialsAndCourses();
    } catch (err: any) {
      console.error('Save material error:', err);
      showToast('error', err.message || 'Failed to save study material.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!materialToDelete) return;
    setDeleting(true);
    try {
      // If it's stored in app-files storage, delete it
      if (materialToDelete.file_url && !materialToDelete.file_url.startsWith('http')) {
        await deleteStorageFile(materialToDelete.file_url).catch((e) => console.warn('Storage cleanup warn:', e));
      }

      const { error } = await supabase.from('materials').delete().eq('id', materialToDelete.id);
      if (error) throw error;

      setMaterials((prev) => prev.filter((m) => m.id !== materialToDelete.id));
      showToast('success', 'Material deleted successfully.');
      setDeleteModalOpen(false);
      setMaterialToDelete(null);
    } catch (err: any) {
      console.error('Delete material error:', err);
      showToast('error', err.message || 'Failed to delete material.');
    } finally {
      setDeleting(false);
    }
  };

  const handleCopyLink = async (item: MaterialItem) => {
    try {
      let downloadUrl = item.file_url;
      if (!item.file_url.startsWith('http')) {
        downloadUrl = (await getSignedFileUrl(item.file_url)) || item.file_url;
      }
      await navigator.clipboard.writeText(downloadUrl);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2500);
      showToast('success', 'Download link copied to clipboard!');
    } catch (e) {
      showToast('error', 'Could not copy link to clipboard.');
    }
  };

  const handleOpenOrDownload = async (item: MaterialItem) => {
    try {
      let targetUrl = item.file_url;
      if (!item.file_url.startsWith('http')) {
        targetUrl = (await getSignedFileUrl(item.file_url)) || item.file_url;
      }
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    } catch (e: any) {
      showToast('error', e.message || 'Failed to generate download link.');
    }
  };

  const filteredMaterials = materials.filter((m) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      m.title.toLowerCase().includes(q) ||
      (m.description && m.description.toLowerCase().includes(q)) ||
      (m.courses && (m.courses.course_code.toLowerCase().includes(q) || m.courses.course_name.toLowerCase().includes(q)));

    const matchesCourse =
      selectedCourseFilter === 'all' || m.course_id === selectedCourseFilter;

    const matchesType =
      selectedTypeFilter === 'all' || m.material_type === selectedTypeFilter;

    return matchesSearch && matchesCourse && matchesType;
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
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <span>Study Materials Management</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Upload lecture notes, past exams, slides, and manuals directly to private Supabase Storage.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Upload Material</span>
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
            placeholder="Search materials by title or course..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={selectedCourseFilter}
            onChange={(e) => setSelectedCourseFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.course_code} - {c.course_name}
              </option>
            ))}
          </select>

          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Resource Types</option>
            {MATERIAL_TYPES.map((t) => (
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
            <p className="text-xs text-slate-500">Loading study materials...</p>
          </div>
        ) : filteredMaterials.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No study materials found</p>
            <p className="text-xs text-slate-500 mt-1">
              Click "+ Upload Material" to upload your first lecture file.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Title & Details</th>
                  <th className="py-3 px-4">Course</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMaterials.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 max-w-sm">
                      <p className="font-bold text-slate-900">{item.title}</p>
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                        {item.description || 'No description provided.'}
                      </p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px]">
                        {item.courses?.course_code || '—'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[10px] capitalize">
                        {item.material_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {item.file_url.startsWith('http') ? (
                        <span className="text-blue-600 flex items-center gap-1 font-medium">
                          <ExternalLink className="w-3 h-3" />
                          <span>External Web</span>
                        </span>
                      ) : (
                        <span className="text-emerald-700 flex items-center gap-1 font-medium">
                          <Paperclip className="w-3 h-3" />
                          <span>Storage (app-files)</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenOrDownload(item)}
                          className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                          title="Open or Download file"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleCopyLink(item)}
                          className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                          title="Copy shareable link"
                        >
                          {copiedId === item.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                          title="Edit material"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            setMaterialToDelete(item);
                            setDeleteModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-white border border-slate-200 text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete material"
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <span>{modalMode === 'create' ? 'Upload Study Material' : 'Edit Study Material'}</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Document Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Chapter 4 - Graph Algorithms & DFS"
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
                        {c.course_code} - {c.course_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Material Type</label>
                  <select
                    value={formData.material_type}
                    onChange={(e) => setFormData({ ...formData, material_type: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-indigo-600"
                  >
                    {MATERIAL_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Additional context or page references..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              {/* Source Switcher */}
              <div className="space-y-2">
                <label className="block font-semibold text-slate-700">File Source</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setUploadSource('file')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                      uploadSource === 'file'
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    Upload File to Supabase
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadSource('url')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                      uploadSource === 'url'
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    External Web URL
                  </button>
                </div>

                {uploadSource === 'file' ? (
                  <div className="pt-1">
                    <input
                      type="file"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Stored in <code className="font-mono">app-files</code> bucket.
                    </p>
                  </div>
                ) : (
                  <div className="pt-1">
                    <input
                      type="url"
                      value={formData.file_url}
                      onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                      placeholder="https://drive.google.com/..."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-600 font-mono"
                    />
                  </div>
                )}
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
                  <span>{modalMode === 'create' ? 'Publish Material' : 'Update Material'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModalOpen && materialToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Delete Material?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Are you sure you want to delete <span className="font-semibold text-slate-700">"{materialToDelete.title}"</span>? This will permanently delete the file from storage.
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
                <span>Delete Material</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
