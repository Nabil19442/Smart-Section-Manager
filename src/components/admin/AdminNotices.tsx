import React, { useState, useEffect } from 'react';
import {
  Bell,
  Plus,
  Search,
  Filter,
  Pin,
  PinOff,
  Edit2,
  Trash2,
  ExternalLink,
  AlertCircle,
  Loader2,
  Check,
  X,
  Upload,
  Paperclip,
  CheckCircle2,
  Database,
  Code,
  Copy
} from 'lucide-react';
import { supabase, insertWithCreatedByFallback } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { uploadUserFile, deleteStorageFile } from '../../lib/storageService';
import { ALL_MODULES_MIGRATION_SQL, copyToClipboard } from '../../lib/sqlScripts';

interface NoticeItem {
  id: string;
  title: string;
  description: string;
  course_id: string | null;
  is_important: boolean;
  is_pinned: boolean;
  attachment_url: string | null;
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

export const AdminNotices: React.FC = () => {
  const { user } = useAuth();
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');
  const [pinnedFilter, setPinnedFilter] = useState<'all' | 'pinned' | 'unpinned'>('all');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedNoticeId, setSelectedNoticeId] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    course_id: '',
    is_important: false,
    is_pinned: false,
    attachment_url: '',
  });
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [noticeToDelete, setNoticeToDelete] = useState<NoticeItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Status message & schema migration
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [schemaMigrationNeeded, setSchemaMigrationNeeded] = useState(false);
  const [copiedMigration, setCopiedMigration] = useState(false);

  const handleCopyMigration = async () => {
    const ok = await copyToClipboard(ALL_MODULES_MIGRATION_SQL);
    if (ok) {
      setCopiedMigration(true);
      showToast('success', 'Migration SQL copied! Paste and run in Supabase SQL Editor.');
      setTimeout(() => setCopiedMigration(false), 3000);
    } else {
      showToast('error', 'Failed to copy SQL to clipboard.');
    }
  };

  const fetchNoticesAndCourses = async () => {
    setLoading(true);
    try {
      const [noticesRes, coursesRes] = await Promise.all([
        supabase
          .from('notices')
          .select(`
            id,
            title,
            description,
            course_id,
            is_important,
            is_pinned,
            attachment_url,
            created_at,
            courses (
              course_code,
              course_name
            )
          `)
          .order('is_pinned', { ascending: false })
          .order('created_at', { ascending: false }),
        supabase.from('courses').select('id, course_code, course_name').order('course_code', { ascending: true }),
      ]);

      if (noticesRes.data) {
        setNotices(noticesRes.data as any[]);
      }
      if (coursesRes.data) {
        setCourses(coursesRes.data);
      }
    } catch (err: any) {
      console.error('Error loading notices:', err);
      showToast('error', err.message || 'Failed to load notices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNoticesAndCourses();
  }, []);

  const showToast = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedNoticeId(null);
    setFormData({
      title: '',
      description: '',
      course_id: '',
      is_important: false,
      is_pinned: false,
      attachment_url: '',
    });
    setAttachmentFile(null);
    setIsModalOpen(true);
  };

  const openEditModal = (notice: NoticeItem) => {
    setModalMode('edit');
    setSelectedNoticeId(notice.id);
    setFormData({
      title: notice.title,
      description: notice.description || '',
      course_id: notice.course_id || '',
      is_important: notice.is_important || false,
      is_pinned: notice.is_pinned || false,
      attachment_url: notice.attachment_url || '',
    });
    setAttachmentFile(null);
    setIsModalOpen(true);
  };

  const handleTogglePin = async (notice: NoticeItem) => {
    const newPinStatus = !notice.is_pinned;
    try {
      const { error } = await supabase
        .from('notices')
        .update({ is_pinned: newPinStatus, updated_at: new Date().toISOString() })
        .eq('id', notice.id);

      if (error) throw error;

      setNotices((prev) =>
        prev.map((n) => (n.id === notice.id ? { ...n, is_pinned: newPinStatus } : n))
      );
      showToast('success', `Notice ${newPinStatus ? 'pinned to top' : 'unpinned'} successfully.`);
    } catch (err: any) {
      console.error('Toggle pin error:', err);
      showToast('error', err.message || 'Failed to update pin status.');
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showToast('error', 'Notice title is required.');
      return;
    }

    setSubmitting(true);
    try {
      let finalAttachmentUrl = formData.attachment_url.trim() || null;

      // Handle file upload to app-files bucket if selected
      if (attachmentFile && user) {
        const uploadRes = await uploadUserFile({
          file: attachmentFile,
          userId: user.id,
          featureName: 'notices',
        });
        finalAttachmentUrl = uploadRes.path;
      }

      if (modalMode === 'create') {
        const { data, error, fallbackUsed } = await insertWithCreatedByFallback(
          'notices',
          {
            user_id: user?.id,
            created_by: user?.id,
            title: formData.title.trim(),
            description: formData.description.trim(),
            course_id: formData.course_id ? formData.course_id : null,
            is_important: formData.is_important,
            is_pinned: formData.is_pinned,
            attachment_url: finalAttachmentUrl,
          }
        );

        if (error) throw error;

        if (fallbackUsed) {
          setSchemaMigrationNeeded(true);
          showToast(
            'success',
            'Notice published! (Note: Run schema migration in Supabase to enable created_by column)'
          );
        } else {
          showToast('success', 'Notice published successfully!');
        }
      } else if (modalMode === 'edit' && selectedNoticeId) {
        const { error } = await supabase
          .from('notices')
          .update({
            title: formData.title.trim(),
            description: formData.description.trim(),
            course_id: formData.course_id ? formData.course_id : null,
            is_important: formData.is_important,
            is_pinned: formData.is_pinned,
            attachment_url: finalAttachmentUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedNoticeId);

        if (error) throw error;

        showToast('success', 'Notice updated successfully!');
      }

      setIsModalOpen(false);
      await fetchNoticesAndCourses();
    } catch (err: any) {
      console.error('Submit notice error:', err);
      showToast('error', err.message || 'Failed to save notice.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!noticeToDelete) return;
    setDeleting(true);
    try {
      // Clean up attachment if in app-files storage
      if (noticeToDelete.attachment_url && !noticeToDelete.attachment_url.startsWith('http')) {
        await deleteStorageFile(noticeToDelete.attachment_url).catch((e) => console.warn('File delete warn:', e));
      }

      const { error } = await supabase.from('notices').delete().eq('id', noticeToDelete.id);
      if (error) throw error;

      setNotices((prev) => prev.filter((n) => n.id !== noticeToDelete.id));
      showToast('success', 'Notice deleted successfully.');
      setDeleteModalOpen(false);
      setNoticeToDelete(null);
    } catch (err: any) {
      console.error('Delete notice error:', err);
      showToast('error', err.message || 'Failed to delete notice.');
    } finally {
      setDeleting(false);
    }
  };

  // Filter notices
  const filteredNotices = notices.filter((item) => {
    const matchesQuery =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.courses && item.courses.course_code.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.courses && item.courses.course_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCourse =
      selectedCourseFilter === 'all' || item.course_id === selectedCourseFilter;

    const matchesPin =
      pinnedFilter === 'all' ||
      (pinnedFilter === 'pinned' && item.is_pinned) ||
      (pinnedFilter === 'unpinned' && !item.is_pinned);

    return matchesQuery && matchesCourse && matchesPin;
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

      {/* Header with Title and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Bell className="w-5 h-5 text-indigo-600" />
            <span>Notice Management</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Create, edit, pin, and manage announcements broadcast to the student portal.
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
            <span>+ Add New Notice</span>
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

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notices by title, details, or course..."
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
            value={pinnedFilter}
            onChange={(e) => setPinnedFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="pinned">Pinned Only</option>
            <option value="unpinned">Unpinned Only</option>
          </select>
        </div>
      </div>

      {/* Notices Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
            <p className="text-xs text-slate-500">Loading notices from database...</p>
          </div>
        ) : filteredNotices.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No notices found</p>
            <p className="text-xs text-slate-500 mt-1">
              {searchQuery || selectedCourseFilter !== 'all'
                ? 'Try clearing your filters or search terms.'
                : 'Click "+ Add New Notice" to create your first announcement.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Notice Title & Details</th>
                  <th className="py-3 px-4">Course</th>
                  <th className="py-3 px-4">Status & Flags</th>
                  <th className="py-3 px-4">Date Posted</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredNotices.map((notice) => (
                  <tr
                    key={notice.id}
                    className={`hover:bg-slate-50/70 transition-colors ${
                      notice.is_pinned ? 'bg-amber-50/30' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 max-w-sm">
                      <div className="flex items-start gap-2">
                        {notice.is_pinned && (
                          <span className="p-1 rounded bg-amber-100 text-amber-800 mt-0.5" title="Pinned Notice">
                            <Pin className="w-3 h-3 fill-amber-700" />
                          </span>
                        )}
                        <div>
                          <p className="font-bold text-slate-900 line-clamp-1">{notice.title}</p>
                          <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                            {notice.description || 'No additional description.'}
                          </p>
                          {notice.attachment_url && (
                            <div className="mt-1 flex items-center gap-1 text-[10px] text-indigo-600 font-medium">
                              <Paperclip className="w-3 h-3" />
                              <span>Attachment attached</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {notice.courses ? (
                        <span className="px-2 py-1 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold text-[10px]">
                          {notice.courses.course_code}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium text-[11px]">General</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {notice.is_important && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 font-semibold text-[10px]">
                            Urgent
                          </span>
                        )}
                        {notice.is_pinned ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-semibold text-[10px]">
                            Pinned
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px]">
                            Standard
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {new Date(notice.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleTogglePin(notice)}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            notice.is_pinned
                              ? 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                              : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                          }`}
                          title={notice.is_pinned ? 'Unpin notice' : 'Pin to top'}
                        >
                          {notice.is_pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          onClick={() => openEditModal(notice)}
                          className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
                          title="Edit notice"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            setNoticeToDelete(notice);
                            setDeleteModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-white border border-slate-200 text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors"
                          title="Delete notice"
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
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Bell className="w-4 h-4 text-indigo-600" />
                <span>{modalMode === 'create' ? 'Create New Notice' : 'Edit Academic Notice'}</span>
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
                <label className="block font-semibold text-slate-700 mb-1">Notice Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Midterm exam hall allocation revised"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-600 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Associated Course (Optional)</label>
                <select
                  value={formData.course_id}
                  onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-indigo-600"
                >
                  <option value="">General Section Announcement</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.course_code} - {c.course_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notice Content & Details</label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Provide all essential details, room numbers, or instructions for students..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              {/* Checkboxes */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_important}
                    onChange={(e) => setFormData({ ...formData, is_important: e.target.checked })}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-0"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 block">Mark Urgent</span>
                    <span className="text-[10px] text-slate-400">High priority notice</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_pinned}
                    onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-0"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 block">Pin to Top</span>
                    <span className="text-[10px] text-slate-400">Keep at top of portal</span>
                  </div>
                </label>
              </div>

              {/* Attachment File / Link */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Attach Document or File (Supabase Storage: app-files)
                </label>
                <input
                  type="file"
                  onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Uploads securely to the private <code className="font-mono">app-files</code> bucket.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{modalMode === 'create' ? 'Publish Notice' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && noticeToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Delete Notice?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Are you sure you want to delete <span className="font-semibold text-slate-700">"{noticeToDelete.title}"</span>? This will immediately remove it from all student feeds and clean up attached storage.
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
                <span>Delete Permanently</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
