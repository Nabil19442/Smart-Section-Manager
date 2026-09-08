import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  Download,
  ExternalLink,
  Search,
  Filter,
  FileText,
  FileCode,
  FileSpreadsheet,
  FileCheck2,
  FolderArchive,
  Loader2,
  AlertTriangle,
  Upload,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import type { Database, MaterialType } from '../types/database.types';
import {
  isTableMissingError,
  getFallbackMaterials,
  saveFallbackMaterials,
  getFallbackCourses,
} from '../lib/fallbackData';
import { SchemaNoticeBanner } from './SchemaNoticeBanner';
import {
  uploadUserFile,
  getSignedFileUrl,
  deleteStorageFile,
} from '../lib/storageService';

type Material = Database['public']['Tables']['materials']['Row'] & {
  courses?: Database['public']['Tables']['courses']['Row'] | null;
};
type Course = Database['public']['Tables']['courses']['Row'];

const MATERIAL_TYPES: { key: MaterialType | 'all'; label: string }[] = [
  { key: 'all', label: 'All Resources' },
  { key: 'lecture_note', label: 'Lecture Notes' },
  { key: 'slide', label: 'Slides' },
  { key: 'pdf', label: 'PDF Documents' },
  { key: 'lab', label: 'Lab Manuals' },
  { key: 'assignment', label: 'Assignments' },
  { key: 'previous_question', label: 'Past Papers' },
  { key: 'suggestion', label: 'Exam Suggestions' },
  { key: 'other', label: 'Other' },
];

export const MaterialsView: React.FC = () => {
  const { user, isAdmin, isConfigured } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSchemaMissing, setIsSchemaMissing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<MaterialType | 'all'>('all');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    course_id: string;
    material_type: MaterialType;
    external_url: string;
    file_url: string;
    file_name: string;
  }>({
    title: '',
    description: '',
    course_id: '',
    material_type: 'lecture_note',
    external_url: '',
    file_url: '',
    file_name: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [matRes, coursesRes] = await Promise.all([
        supabase
          .from('materials')
          .select('*, courses(*)')
          .order('created_at', { ascending: false }),
        supabase.from('courses').select('*').order('course_code', { ascending: true }),
      ]);

      if (matRes.error) {
        if (isTableMissingError(matRes.error)) {
          setIsSchemaMissing(true);
          setMaterials(getFallbackMaterials());
          setCourses(getFallbackCourses());
          return;
        }
        throw new Error(matRes.error.message);
      }

      if (coursesRes.error && isTableMissingError(coursesRes.error)) {
        setCourses(getFallbackCourses());
      } else {
        setCourses(coursesRes.data || []);
      }

      setMaterials(matRes.data || []);
    } catch (err: any) {
      if (isTableMissingError(err)) {
        setIsSchemaMissing(true);
        setMaterials(getFallbackMaterials());
        setCourses(getFallbackCourses());
      } else {
        console.error('Error loading materials:', err);
        setError(err.message || 'Failed to load study materials from Supabase.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    if (!isConfigured) return;

    // Realtime channel for materials
    const channel = supabase
      .channel('realtime:materials')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'materials',
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

  // Generate and cache signed URLs for all materials with files in private storage
  useEffect(() => {
    let isMounted = true;
    const resolveSignedUrls = async () => {
      const urlMap: Record<string, string> = {};
      for (const item of materials) {
        if (item.file_url) {
          try {
            const signed = await getSignedFileUrl(item.file_url);
            if (signed && isMounted) {
              urlMap[item.id] = signed;
            }
          } catch {}
        }
      }
      if (isMounted && Object.keys(urlMap).length > 0) {
        setSignedUrls((prev) => ({ ...prev, ...urlMap }));
      }
    };

    if (materials.length > 0) {
      resolveSignedUrls();
    }

    return () => {
      isMounted = false;
    };
  }, [materials]);

  const openCreateModal = () => {
    setEditingMaterial(null);
    setFormData({
      title: '',
      description: '',
      course_id: courses[0]?.id || '',
      material_type: 'lecture_note',
      external_url: '',
      file_url: '',
      file_name: '',
    });
    setSelectedFile(null);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: Material) => {
    setEditingMaterial(item);
    setFormData({
      title: item.title,
      description: item.description || '',
      course_id: item.course_id,
      material_type: item.material_type,
      external_url: item.external_url || '',
      file_url: item.file_url || '',
      file_name: item.file_name || '',
    });
    setSelectedFile(null);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.course_id) {
      setFormError('Please select a course for this material.');
      return;
    }

    setFormSubmitting(true);
    setFormError(null);

    try {
      let fileUrl = formData.file_url;
      let fileName = formData.file_name;

      // Handle file upload to Supabase Storage 'app-files' bucket (folder: ${auth.uid()}/materials/...)
      if (selectedFile) {
        if (!user) {
          throw new Error('Authentication required: please log in to upload materials.');
        }

        const uploadResult = await uploadUserFile({
          file: selectedFile,
          userId: user.id,
          featureName: 'materials',
          itemId: editingMaterial?.id,
          maxSizeMB: 50,
        });

        // If editing and replacing an existing file in storage, delete previous file
        if (editingMaterial?.file_url && editingMaterial.file_url !== uploadResult.path) {
          await deleteStorageFile(editingMaterial.file_url);
        }

        fileUrl = uploadResult.path;
        fileName = uploadResult.fileName;
      }

      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        course_id: formData.course_id,
        material_type: formData.material_type,
        file_url: fileUrl || null,
        file_name: fileName || null,
        external_url: formData.external_url.trim() || null,
        user_id: user?.id || null,
        created_by: user?.id || null,
        updated_at: new Date().toISOString(),
      };

      if (editingMaterial) {
        const { error: updateErr } = await supabase
          .from('materials')
          .update(payload)
          .eq('id', editingMaterial.id);

        if (updateErr) throw new Error(updateErr.message);

        if (user) {
          await supabase.from('activity_logs').insert({
            user_id: user.id,
            action: 'UPDATE_MATERIAL',
            entity_type: 'materials',
            entity_id: editingMaterial.id,
          });
        }
      } else {
        const { data: insertData, error: insertErr } = await supabase
          .from('materials')
          .insert(payload)
          .select()
          .single();

        if (insertErr) throw new Error(insertErr.message);

        if (user && insertData) {
          await supabase.from('activity_logs').insert({
            user_id: user.id,
            action: 'UPLOAD_MATERIAL',
            entity_type: 'materials',
            entity_id: insertData.id,
          });
        }
      }

      setIsModalOpen(false);
      await fetchData();
    } catch (err: any) {
      console.error('Material upload error:', err);
      setFormError(err.message || 'Error occurred while saving material.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (item: Material) => {
    if (!window.confirm(`Are you sure you want to delete "${item.title}"?`)) return;

    try {
      // 1. Remove file from Supabase Storage 'app-files' if present
      if (item.file_url) {
        await deleteStorageFile(item.file_url);
      }

      // 2. Remove record from database
      const { error: deleteErr } = await supabase.from('materials').delete().eq('id', item.id);
      if (deleteErr) throw new Error(deleteErr.message);

      if (user) {
        await supabase.from('activity_logs').insert({
          user_id: user.id,
          action: 'DELETE_MATERIAL',
          entity_type: 'materials',
          entity_id: item.id,
        });
      }

      await fetchData();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const getTypeIcon = (type: MaterialType) => {
    switch (type) {
      case 'lecture_note':
        return <FileText className="w-4 h-4 text-blue-400" />;
      case 'slide':
        return <FileSpreadsheet className="w-4 h-4 text-emerald-400" />;
      case 'pdf':
        return <FileText className="w-4 h-4 text-rose-400" />;
      case 'lab':
        return <FileCode className="w-4 h-4 text-purple-400" />;
      case 'assignment':
        return <FileCheck2 className="w-4 h-4 text-amber-400" />;
      case 'previous_question':
        return <FolderArchive className="w-4 h-4 text-cyan-400" />;
      default:
        return <BookOpen className="w-4 h-4 text-slate-400" />;
    }
  };

  const filteredMaterials = materials.filter((m) => {
    const matchesSearch =
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.description && m.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.courses?.course_name && m.courses.course_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.courses?.course_code && m.courses.course_code.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = selectedType === 'all' || m.material_type === selectedType;
    const matchesCourse = selectedCourse === 'all' || m.course_id === selectedCourse;

    return matchesSearch && matchesType && matchesCourse;
  });

  return (
    <div className="space-y-6">
      {/* Schema Notice Banner if database table is not yet created in Supabase */}
      {isSchemaMissing && <SchemaNoticeBanner tableName="public.materials" />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <span>Course Study Materials & Archives</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Lecture notes, slides, lab handouts, and previous exam question papers.
          </p>
        </div>

        {isAdmin && (
          <button
            id="btn-upload-material"
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Material</span>
          </button>
        )}
      </div>

      {/* Type Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {MATERIAL_TYPES.map((t) => (
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

      {/* Search & Course Filter */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
        <div className="sm:col-span-8 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="input-search-materials"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search materials by title or course..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
          />
        </div>

        <div className="sm:col-span-4 relative">
          <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select
            id="select-material-course-filter"
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
          <span className="text-xs">Fetching study materials from Supabase Storage & DB...</span>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
          <div>
            <p className="font-semibold">Error loading materials</p>
            <p className="text-rose-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredMaterials.length === 0 && (
        <div className="py-16 text-center rounded-xl bg-white border border-slate-200 shadow-sm p-8">
          <BookOpen className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800">No study materials found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery || selectedType !== 'all' || selectedCourse !== 'all'
              ? 'Try clearing some filters to see available documents.'
              : 'Instructors have not uploaded resources for this category yet.'}
          </p>
          {isAdmin && (
            <button
              onClick={openCreateModal}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm"
            >
              Upload Material
            </button>
          )}
        </div>
      )}

      {/* Grid of Materials */}
      {!loading && !error && filteredMaterials.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMaterials.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-slate-100 border border-slate-200">
                      {getTypeIcon(item.material_type)}
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      {item.material_type.replace('_', ' ')}
                    </span>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <h3 className="text-sm font-bold text-slate-900 mt-2.5 leading-snug">
                  {item.title}
                </h3>

                {item.courses && (
                  <p className="text-xs text-blue-600 font-semibold mt-1">
                    {item.courses.course_code}: {item.courses.course_name}
                  </p>
                )}

                {item.description && (
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400">
                  {new Date(item.created_at).toLocaleDateString()}
                </span>

                <div className="flex items-center gap-2">
                  {item.file_url && (
                    <a
                      href={signedUrls[item.id] || '#'}
                      onClick={async (e) => {
                        if (!signedUrls[item.id]) {
                          e.preventDefault();
                          try {
                            const signed = await getSignedFileUrl(item.file_url);
                            if (signed) {
                              window.open(signed, '_blank', 'noopener,noreferrer');
                            } else {
                              alert('Unable to generate secure download link from storage.');
                            }
                          } catch (err: any) {
                            alert(`Download error: ${err.message}`);
                          }
                        }
                      }}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </a>
                  )}

                  {item.external_url && (
                    <a
                      href={item.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>External Link</span>
                    </a>
                  )}
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
                {editingMaterial ? 'Edit Study Material' : 'Upload Study Material'}
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
                  placeholder="e.g. Chapter 4: Normalized Relational Schemas"
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
                    Material Type *
                  </label>
                  <select
                    value={formData.material_type}
                    onChange={(e) =>
                      setFormData({ ...formData, material_type: e.target.value as MaterialType })
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    <option value="lecture_note">Lecture Note</option>
                    <option value="slide">Slide</option>
                    <option value="pdf">PDF</option>
                    <option value="assignment">Assignment</option>
                    <option value="lab">Lab Manual</option>
                    <option value="previous_question">Previous Question</option>
                    <option value="suggestion">Suggestion</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description / Topic Notes
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Outline key topics, references, or instructions..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                />
              </div>

              {/* Upload to Supabase Storage */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700">
                    Upload File (Supabase Storage: app-files)
                  </label>
                  {formData.file_name && !selectedFile && (
                    <span className="text-[11px] text-blue-600 font-medium truncate max-w-[200px]">
                      Current: {formData.file_name}
                    </span>
                  )}
                </div>
                <input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="block w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                />
                <p className="text-[11px] text-slate-500">
                  Or provide an external web resource / cloud drive link:
                </p>
                <input
                  type="url"
                  value={formData.external_url}
                  onChange={(e) => setFormData({ ...formData, external_url: e.target.value })}
                  placeholder="https://drive.google.com/... or web URL"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
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
                  <span>{editingMaterial ? 'Update Material' : 'Upload Material'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
