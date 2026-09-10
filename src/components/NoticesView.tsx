import React, { useState, useEffect } from 'react';
import {
  Bell,
  Pin,
  AlertTriangle,
  Plus,
  Trash2,
  Edit2,
  FileDown,
  Search,
  Filter,
  Loader2,
  CheckCircle2,
  Upload,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import type { Database } from '../types/database.types';
import {
  isTableMissingError,
  getFallbackNotices,
  saveFallbackNotices,
  getFallbackCourses,
} from '../lib/fallbackData';
import { SchemaNoticeBanner } from './SchemaNoticeBanner';
import {
  uploadUserFile,
  getSignedFileUrl,
  deleteStorageFile,
} from '../lib/storageService';

type Notice = Database['public']['Tables']['notices']['Row'] & {
  courses?: Database['public']['Tables']['courses']['Row'] | null;
};
type Course = Database['public']['Tables']['courses']['Row'];

export const NoticesView: React.FC = () => {
  const { user, isAdmin, isConfigured } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSchemaMissing, setIsSchemaMissing] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');

  // Admin Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    course_id: '',
    is_important: false,
    is_pinned: false,
    attachment_url: '',
    attachment_name: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Fetch notices & courses from Supabase
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [noticesRes, coursesRes] = await Promise.all([
        supabase
          .from('notices')
          .select('*, courses(*)')
          .order('is_pinned', { ascending: false })
          .order('created_at', { ascending: false }),
        supabase.from('courses').select('*').order('course_code', { ascending: true }),
      ]);

      if (noticesRes.error) {
        if (isTableMissingError(noticesRes.error)) {
          console.warn('public.notices not found in schema cache. Activating demo fallback data.');
          setIsSchemaMissing(true);
          setNotices(getFallbackNotices());
          setCourses(getFallbackCourses());
          return;
        }
        throw new Error(noticesRes.error.message);
      }

      if (coursesRes.error) {
        if (isTableMissingError(coursesRes.error)) {
          setIsSchemaMissing(true);
          setCourses(getFallbackCourses());
        } else {
          console.warn('Courses fetch error:', coursesRes.error.message);
        }
      }

      setNotices(noticesRes.data || []);
      setCourses(coursesRes.data || []);
    } catch (err: any) {
      if (isTableMissingError(err)) {
        console.warn('Supabase table missing error caught. Using fallback data.');
        setIsSchemaMissing(true);
        setNotices(getFallbackNotices());
        setCourses(getFallbackCourses());
      } else {
        console.error('Error fetching notices:', err);
        setError(err.message || 'Failed to load notices from Supabase.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    if (!isConfigured) return;

    // Supabase Realtime Subscription on notices
    const channel = supabase
      .channel('realtime:notices')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notices',
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

  // Generate and cache signed URLs for all notices with attachments in private storage
  useEffect(() => {
    let isMounted = true;
    const resolveSignedUrls = async () => {
      const urlMap: Record<string, string> = {};
      for (const notice of notices) {
        if (notice.attachment_url) {
          try {
            const signed = await getSignedFileUrl(notice.attachment_url);
            if (signed && isMounted) {
              urlMap[notice.id] = signed;
            }
          } catch {}
        }
      }
      if (isMounted && Object.keys(urlMap).length > 0) {
        setSignedUrls((prev) => ({ ...prev, ...urlMap }));
      }
    };

    if (notices.length > 0) {
      resolveSignedUrls();
    }

    return () => {
      isMounted = false;
    };
  }, [notices]);

  const openCreateModal = () => {
    setEditingNotice(null);
    setFormData({
      title: '',
      description: '',
      course_id: '',
      is_important: false,
      is_pinned: false,
      attachment_url: '',
      attachment_name: '',
    });
    setSelectedFile(null);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (notice: Notice) => {
    setEditingNotice(notice);
    setFormData({
      title: notice.title,
      description: notice.description,
      course_id: notice.course_id || '',
      is_important: notice.is_important,
      is_pinned: notice.is_pinned,
      attachment_url: notice.attachment_url || '',
      attachment_name: notice.attachment_name || '',
    });
    setSelectedFile(null);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);

    try {
      let attachmentUrl = formData.attachment_url;
      let attachmentName = formData.attachment_name;

      // Handle Storage File Upload to 'app-files' bucket (${auth.uid()}/notices/...)
      if (selectedFile) {
        if (!user) {
          throw new Error('Authentication required: please log in to attach files.');
        }

        const uploadResult = await uploadUserFile({
          file: selectedFile,
          userId: user.id,
          featureName: 'notices',
          itemId: editingNotice?.id,
          maxSizeMB: 50,
        });

        // If replacing an existing attachment in storage during edit, clean up old file
        if (editingNotice?.attachment_url && editingNotice.attachment_url !== uploadResult.path) {
          await deleteStorageFile(editingNotice.attachment_url);
        }

        attachmentUrl = uploadResult.path;
        attachmentName = uploadResult.fileName;
      }

      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        course_id: formData.course_id || null,
        is_important: formData.is_important,
        is_pinned: formData.is_pinned,
        attachment_url: attachmentUrl || null,
        attachment_name: attachmentName || null,
        user_id: user?.id || null,
        created_by: user?.id || null,
        updated_at: new Date().toISOString(),
      };

      if (isSchemaMissing) {
        const currentList = getFallbackNotices();
        if (editingNotice) {
          const updated = currentList.map((n) =>
            n.id === editingNotice.id
              ? {
                  ...n,
                  ...payload,
                  id: editingNotice.id,
                  created_at: editingNotice.created_at,
                  courses: courses.find((c) => c.id === payload.course_id) || null,
                }
              : n
          );
          saveFallbackNotices(updated);
          setNotices(updated);
        } else {
          const newNotice: Notice = {
            id: 'not-' + Date.now(),
            ...payload,
            created_at: new Date().toISOString(),
            courses: courses.find((c) => c.id === payload.course_id) || null,
          };
          const updated = [newNotice, ...currentList];
          saveFallbackNotices(updated);
          setNotices(updated);
        }
        setIsModalOpen(false);
        return;
      }

      if (editingNotice) {
        const { error: updateErr } = await supabase
          .from('notices')
          .update(payload)
          .eq('id', editingNotice.id);

        if (updateErr) {
          if (isTableMissingError(updateErr)) {
            setIsSchemaMissing(true);
            const currentList = getFallbackNotices();
            const updated = currentList.map((n) =>
              n.id === editingNotice.id
                ? { ...n, ...payload, id: editingNotice.id, courses: courses.find((c) => c.id === payload.course_id) || null }
                : n
            );
            saveFallbackNotices(updated);
            setNotices(updated);
            setIsModalOpen(false);
            return;
          }
          throw new Error(updateErr.message);
        }

        // Activity log
        if (user) {
          try {
            await supabase.from('activity_logs').insert({
              user_id: user.id,
              action: 'UPDATE_NOTICE',
              entity_type: 'notices',
              entity_id: editingNotice.id,
            });
          } catch {}
        }
      } else {
        const { data: insertData, error: insertErr } = await supabase
          .from('notices')
          .insert(payload)
          .select()
          .single();

        if (insertErr) {
          if (isTableMissingError(insertErr)) {
            setIsSchemaMissing(true);
            const currentList = getFallbackNotices();
            const newNotice: Notice = {
              id: 'not-' + Date.now(),
              ...payload,
              created_at: new Date().toISOString(),
              courses: courses.find((c) => c.id === payload.course_id) || null,
            };
            const updated = [newNotice, ...currentList];
            saveFallbackNotices(updated);
            setNotices(updated);
            setIsModalOpen(false);
            return;
          }
          throw new Error(insertErr.message);
        }

        // Activity log
        if (user && insertData) {
          try {
            await supabase.from('activity_logs').insert({
              user_id: user.id,
              action: 'CREATE_NOTICE',
              entity_type: 'notices',
              entity_id: insertData.id,
            });
          } catch {}
        }
      }

      setIsModalOpen(false);
      await fetchData();
    } catch (err: any) {
      if (isTableMissingError(err)) {
        setIsSchemaMissing(true);
        const currentList = getFallbackNotices();
        const newNotice: Notice = {
          id: 'not-' + Date.now(),
          title: formData.title.trim(),
          description: formData.description.trim(),
          course_id: formData.course_id || null,
          is_important: formData.is_important,
          is_pinned: formData.is_pinned,
          attachment_url: null,
          attachment_name: null,
          created_by: user?.id || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          courses: courses.find((c) => c.id === formData.course_id) || null,
        };
        const updated = [newNotice, ...currentList];
        saveFallbackNotices(updated);
        setNotices(updated);
        setIsModalOpen(false);
      } else {
        console.error('Save notice error:', err);
        setFormError(err.message || 'Error occurred while saving notice.');
      }
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this notice?')) return;

    // Find notice and delete attachment file from storage if present
    const noticeToDelete = notices.find((n) => n.id === id);
    if (noticeToDelete?.attachment_url) {
      await deleteStorageFile(noticeToDelete.attachment_url);
    }

    if (isSchemaMissing) {
      const currentList = getFallbackNotices();
      const updated = currentList.filter((n) => n.id !== id);
      saveFallbackNotices(updated);
      setNotices(updated);
      return;
    }

    try {
      const { error: deleteErr } = await supabase.from('notices').delete().eq('id', id);

      if (deleteErr) {
        if (isTableMissingError(deleteErr)) {
          setIsSchemaMissing(true);
          const currentList = getFallbackNotices();
          const updated = currentList.filter((n) => n.id !== id);
          saveFallbackNotices(updated);
          setNotices(updated);
          return;
        }
        alert(`Failed to delete: ${deleteErr.message}`);
        return;
      }

      if (user) {
        try {
          await supabase.from('activity_logs').insert({
            user_id: user.id,
            action: 'DELETE_NOTICE',
            entity_type: 'notices',
            entity_id: id,
          });
        } catch {}
      }

      await fetchData();
    } catch (err: any) {
      if (isTableMissingError(err)) {
        setIsSchemaMissing(true);
        const currentList = getFallbackNotices();
        const updated = currentList.filter((n) => n.id !== id);
        saveFallbackNotices(updated);
        setNotices(updated);
      } else {
        alert(`Error deleting notice: ${err.message}`);
      }
    }
  };

  // Filtered notices
  const filteredNotices = notices.filter((n) => {
    const matchesSearch =
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.courses?.course_name && n.courses.course_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (n.courses?.course_code && n.courses.course_code.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCourse =
      selectedCourse === 'all'
        ? true
        : selectedCourse === 'general'
        ? !n.course_id
        : n.course_id === selectedCourse;

    return matchesSearch && matchesCourse;
  });

  return (
    <div className="space-y-6">
      {/* Schema Notice Banner if database table is not yet created in Supabase */}
      {isSchemaMissing && <SchemaNoticeBanner tableName="public.notices" />}

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            <span>Academic Notices & Bulletins</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Official department announcements, schedule changes, and real-time updates.
          </p>
        </div>

        {isAdmin && (
          <button
            id="btn-create-notice"
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Publish Notice</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
        <div className="sm:col-span-8 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="input-search-notices"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notices by title, course, or text..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
          />
        </div>

        <div className="sm:col-span-4 relative">
          <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select
            id="select-course-filter"
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-600 appearance-none cursor-pointer"
          >
            <option value="all">All Courses & General</option>
            <option value="general">General Notices Only</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.course_code} - {c.course_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="py-16 text-center text-slate-500 flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-xs">Fetching notices from Supabase...</span>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
          <div>
            <p className="font-semibold">Error loading notices</p>
            <p className="text-rose-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredNotices.length === 0 && (
        <div className="py-16 text-center rounded-xl bg-white border border-slate-200 shadow-sm p-8">
          <Bell className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800">No notices found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery || selectedCourse !== 'all'
              ? 'No notices match your current search criteria or course filter.'
              : 'There are currently no announcements published.'}
          </p>
          {isAdmin && (
            <button
              onClick={openCreateModal}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm"
            >
              Publish First Notice
            </button>
          )}
        </div>
      )}

      {/* Notices List */}
      {!loading && !error && filteredNotices.length > 0 && (
        <div className="space-y-4">
          {filteredNotices.map((notice) => {
            return (
              <article
                key={notice.id}
                className={`p-5 rounded-2xl border shadow-xs transition-all hover:shadow-md hover:border-indigo-200 ${
                  notice.is_pinned
                    ? 'border-indigo-200/90 bg-indigo-50/15'
                    : 'border-slate-200/90 bg-white'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {notice.is_pinned && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                          <Pin className="w-3 h-3" /> Pinned
                        </span>
                      )}
                      {notice.is_important && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                          <AlertTriangle className="w-3 h-3" /> Urgent
                        </span>
                      )}
                      {notice.courses ? (
                        <span className="text-[11px] font-medium text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                          {notice.courses.course_code}: {notice.courses.course_name}
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                          General Campus
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400">
                        {new Date(notice.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 tracking-tight leading-snug">
                      {notice.title}
                    </h3>
                  </div>

                  {/* Admin actions */}
                  {isAdmin && (
                    <div className="flex items-center gap-1 self-end sm:self-start">
                      <button
                        onClick={() => openEditModal(notice)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-md transition-colors"
                        title="Edit Notice"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(notice.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                        title="Delete Notice"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-2.5 whitespace-pre-line">
                  {notice.description}
                </p>

                {/* Attachment if present */}
                {notice.attachment_url && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <a
                      href={signedUrls[notice.id] || '#'}
                      onClick={async (e) => {
                        if (!signedUrls[notice.id]) {
                          e.preventDefault();
                          try {
                            const signed = await getSignedFileUrl(notice.attachment_url);
                            if (signed) {
                              window.open(signed, '_blank', 'noopener,noreferrer');
                            } else {
                              alert('Unable to generate secure download link.');
                            }
                          } catch (err: any) {
                            alert(`Download error: ${err.message}`);
                          }
                        }
                      }}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 hover:underline bg-blue-50 border border-blue-200 px-2.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      <span>{notice.attachment_name || 'Download Notice Attachment'}</span>
                    </a>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Admin Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-base text-slate-900">
                {editingNotice ? 'Edit Notice' : 'Publish Academic Notice'}
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
                  placeholder="e.g. Schedule Change for Midterm Exams"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Course (Leave empty for campus-wide)
                </label>
                <select
                  value={formData.course_id}
                  onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                >
                  <option value="">Campus-Wide / General</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.course_code} - {c.course_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notice Details / Content *
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Provide all relevant details, room numbers, dates, or guidelines..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                />
              </div>

              {/* Upload to Supabase Storage */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700">
                    Attachment (Supabase Storage: app-files)
                  </label>
                  {formData.attachment_name && !selectedFile && (
                    <span className="text-[11px] text-blue-600 font-medium truncate max-w-[200px]">
                      Current: {formData.attachment_name}
                    </span>
                  )}
                </div>
                <input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="block w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                />
                <p className="text-[11px] text-slate-500">
                  Or provide an external document link:
                </p>
                <input
                  type="url"
                  value={formData.attachment_url}
                  onChange={(e) => setFormData({ ...formData, attachment_url: e.target.value })}
                  placeholder="https://drive.google.com/... or storage URL"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex items-center gap-6 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_pinned}
                    onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-0"
                  />
                  <span className="text-xs text-slate-700 font-medium">Pin to top</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_important}
                    onChange={(e) => setFormData({ ...formData, is_important: e.target.checked })}
                    className="rounded border-slate-300 text-red-600 focus:ring-0"
                  />
                  <span className="text-xs text-slate-700 font-medium">Mark as Urgent</span>
                </label>
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
                  <span>{editingNotice ? 'Update Notice' : 'Publish Notice'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
