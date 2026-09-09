import React, { useState, useEffect } from 'react';
import {
  Link as LinkIcon,
  Plus,
  Search,
  Edit2,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
  Database,
  Code
} from 'lucide-react';
import { supabase, insertWithCreatedByFallback } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { ALL_MODULES_MIGRATION_SQL, copyToClipboard } from '../../lib/sqlScripts';

interface ImportantLinkItem {
  id: string;
  title: string;
  url: string;
  description: string | null;
  course_id: string | null;
  category: string | null;
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

export const AdminLinks: React.FC = () => {
  const { user } = useAuth();
  const [links, setLinks] = useState<ImportantLinkItem[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    description: '',
    course_id: '',
    category: 'academic',
  });
  const [submitting, setSubmitting] = useState(false);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [linkToDelete, setLinkToDelete] = useState<ImportantLinkItem | null>(null);
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

  const fetchLinksAndCourses = async () => {
    setLoading(true);
    try {
      const [linksRes, coursesRes] = await Promise.all([
        supabase
          .from('important_links')
          .select(`
            id,
            title,
            url,
            description,
            course_id,
            category,
            created_at,
            courses (
              course_code,
              course_name
            )
          `)
          .order('created_at', { ascending: false }),
        supabase.from('courses').select('id, course_code, course_name').order('course_code', { ascending: true }),
      ]);

      if (linksRes.data) setLinks(linksRes.data as any[]);
      if (coursesRes.data) setCourses(coursesRes.data);
    } catch (err: any) {
      console.error('Fetch links error:', err);
      showToast('error', err.message || 'Failed to fetch links.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinksAndCourses();
  }, []);

  const showToast = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedLinkId(null);
    setFormData({
      title: '',
      url: '',
      description: '',
      course_id: '',
      category: 'academic',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: ImportantLinkItem) => {
    setModalMode('edit');
    setSelectedLinkId(item.id);
    setFormData({
      title: item.title,
      url: item.url,
      description: item.description || '',
      course_id: item.course_id || '',
      category: item.category || 'academic',
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.url.trim()) {
      showToast('error', 'Link title and URL are required.');
      return;
    }

    setSubmitting(true);
    try {
      if (modalMode === 'create') {
        const { error, fallbackUsed } = await insertWithCreatedByFallback('important_links', {
          user_id: user?.id,
          created_by: user?.id,
          title: formData.title.trim(),
          url: formData.url.trim(),
          description: formData.description.trim() || null,
          course_id: formData.course_id ? formData.course_id : null,
          category: formData.category || 'academic',
        });

        if (error) throw error;

        if (fallbackUsed) {
          setSchemaMigrationNeeded(true);
          showToast(
            'success',
            'Link created! (Note: Run schema migration in Supabase to link created_by to your admin account)'
          );
        } else {
          showToast('success', 'Important link added successfully!');
        }
      } else if (modalMode === 'edit' && selectedLinkId) {
        const { error } = await supabase
          .from('important_links')
          .update({
            title: formData.title.trim(),
            url: formData.url.trim(),
            description: formData.description.trim() || null,
            course_id: formData.course_id ? formData.course_id : null,
            category: formData.category || 'academic',
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedLinkId);

        if (error) throw error;
        showToast('success', 'Link updated successfully!');
      }

      setIsModalOpen(false);
      await fetchLinksAndCourses();
    } catch (err: any) {
      console.error('Save link error:', err);
      showToast('error', err.message || 'Failed to save link.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!linkToDelete) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('important_links').delete().eq('id', linkToDelete.id);
      if (error) throw error;

      setLinks((prev) => prev.filter((l) => l.id !== linkToDelete.id));
      showToast('success', 'Link removed successfully.');
      setDeleteModalOpen(false);
      setLinkToDelete(null);
    } catch (err: any) {
      console.error('Delete link error:', err);
      showToast('error', err.message || 'Failed to delete link.');
    } finally {
      setDeleting(false);
    }
  };

  const handleCopy = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    showToast('success', 'Link copied to clipboard!');
  };

  const filteredLinks = links.filter((l) => {
    const q = searchQuery.toLowerCase();
    return (
      l.title.toLowerCase().includes(q) ||
      l.url.toLowerCase().includes(q) ||
      (l.description && l.description.toLowerCase().includes(q))
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
            <LinkIcon className="w-5 h-5 text-indigo-600" />
            <span>Academic Links & Resources</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Maintain quick access links for Google Classroom, student portals, Zoom links, and drives.
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
            <span>+ Add Important Link</span>
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

      {/* Search */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search links by title or URL..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
            <p className="text-xs text-slate-500">Loading links...</p>
          </div>
        ) : filteredLinks.length === 0 ? (
          <div className="p-12 text-center">
            <LinkIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No links registered</p>
            <p className="text-xs text-slate-500 mt-1">
              Click "+ Add Important Link" to publish useful academic bookmarks for students.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Link Title & Details</th>
                  <th className="py-3 px-4">Course</th>
                  <th className="py-3 px-4">URL</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLinks.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 max-w-sm">
                      <p className="font-bold text-slate-900">{item.title}</p>
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                        {item.description || 'No description provided.'}
                      </p>
                    </td>
                    <td className="py-3.5 px-4">
                      {item.courses ? (
                        <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px]">
                          {item.courses.course_code}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium text-[11px]">General Section</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-800 font-mono text-[11px] flex items-center gap-1 max-w-xs truncate"
                      >
                        <span className="truncate">{item.url}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleCopy(item.url, item.id)}
                          className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                          title="Copy URL"
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
                          title="Edit link"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setLinkToDelete(item);
                            setDeleteModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-white border border-slate-200 text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete link"
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
                <LinkIcon className="w-4 h-4 text-indigo-600" />
                <span>{modalMode === 'create' ? 'Add Academic Link' : 'Edit Link'}</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Link Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Google Classroom Section A"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-600 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Destination URL *</label>
                <input
                  type="url"
                  required
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-600 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Associated Course (Optional)</label>
                <select
                  value={formData.course_id}
                  onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-indigo-600"
                >
                  <option value="">General Section Bookmark</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.course_code} - {c.course_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Class code: xyz123, meeting password, etc."
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
                  <span>{modalMode === 'create' ? 'Save Link' : 'Update Link'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModalOpen && linkToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Delete Link?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Are you sure you want to remove <span className="font-semibold text-slate-700">"{linkToDelete.title}"</span>?
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
                <span>Delete Link</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
