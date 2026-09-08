import React, { useState, useEffect } from 'react';
import {
  Link as LinkIcon,
  ExternalLink,
  Plus,
  Trash2,
  Edit2,
  Search,
  Filter,
  Globe,
  BookOpen,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import type { Database } from '../types/database.types';
import {
  isTableMissingError,
  getFallbackLinks,
  getFallbackCourses,
} from '../lib/fallbackData';
import { SchemaNoticeBanner } from './SchemaNoticeBanner';

type ImportantLink = Database['public']['Tables']['important_links']['Row'] & {
  courses?: Database['public']['Tables']['courses']['Row'] | null;
};
type Course = Database['public']['Tables']['courses']['Row'];

export const LinksView: React.FC = () => {
  const { user, isAdmin, isConfigured } = useAuth();
  const [links, setLinks] = useState<ImportantLink[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSchemaMissing, setIsSchemaMissing] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<ImportantLink | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    url: '',
    course_id: '',
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [linksRes, coursesRes] = await Promise.all([
        supabase
          .from('important_links')
          .select('*, courses(*)')
          .order('created_at', { ascending: false }),
        supabase.from('courses').select('*').order('course_code', { ascending: true }),
      ]);

      if (linksRes.error) {
        if (isTableMissingError(linksRes.error)) {
          setIsSchemaMissing(true);
          setLinks(getFallbackLinks());
          setCourses(getFallbackCourses());
          return;
        }
        throw new Error(linksRes.error.message);
      }

      if (coursesRes.error && isTableMissingError(coursesRes.error)) {
        setCourses(getFallbackCourses());
      } else {
        setCourses(coursesRes.data || []);
      }

      setLinks(linksRes.data || []);
    } catch (err: any) {
      if (isTableMissingError(err)) {
        setIsSchemaMissing(true);
        setLinks(getFallbackLinks());
        setCourses(getFallbackCourses());
      } else {
        console.error('Error fetching links:', err);
        setError(err.message || 'Failed to fetch links.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isConfigured]);

  const openCreateModal = () => {
    setEditingLink(null);
    setFormData({
      title: '',
      description: '',
      url: '',
      course_id: '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (link: ImportantLink) => {
    setEditingLink(link);
    setFormData({
      title: link.title,
      description: link.description || '',
      url: link.url,
      course_id: link.course_id || '',
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
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        url: formData.url.trim(),
        course_id: formData.course_id || null,
        user_id: user?.id || null,
        created_by: user?.id || null,
        updated_at: new Date().toISOString(),
      };

      if (editingLink) {
        const { error: updateErr } = await supabase
          .from('important_links')
          .update(payload)
          .eq('id', editingLink.id);

        if (updateErr) throw new Error(updateErr.message);

        if (user) {
          await supabase.from('activity_logs').insert({
            user_id: user.id,
            action: 'UPDATE_LINK',
            entity_type: 'important_links',
            entity_id: editingLink.id,
          });
        }
      } else {
        const { data: insertData, error: insertErr } = await supabase
          .from('important_links')
          .insert(payload)
          .select()
          .single();

        if (insertErr) throw new Error(insertErr.message);

        if (user && insertData) {
          await supabase.from('activity_logs').insert({
            user_id: user.id,
            action: 'CREATE_LINK',
            entity_type: 'important_links',
            entity_id: insertData.id,
          });
        }
      }

      setIsModalOpen(false);
      await fetchData();
    } catch (err: any) {
      console.error('Save link error:', err);
      setFormError(err.message || 'Error occurred while saving link.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this link?')) return;

    try {
      const { error: deleteErr } = await supabase
        .from('important_links')
        .delete()
        .eq('id', id);

      if (deleteErr) throw new Error(deleteErr.message);

      if (user) {
        await supabase.from('activity_logs').insert({
          user_id: user.id,
          action: 'DELETE_LINK',
          entity_type: 'important_links',
          entity_id: id,
        });
      }

      await fetchData();
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    }
  };

  const filteredLinks = links.filter((l) => {
    const matchesSearch =
      l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.description && l.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      l.url.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCourse =
      selectedCourse === 'all'
        ? true
        : selectedCourse === 'general'
        ? !l.course_id
        : l.course_id === selectedCourse;

    return matchesSearch && matchesCourse;
  });

  return (
    <div className="space-y-6">
      {/* Schema Notice Banner if database table is not yet created in Supabase */}
      {isSchemaMissing && <SchemaNoticeBanner tableName="public.important_links" />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-blue-600" />
            <span>Essential Academic Links & Portals</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Digital libraries, grading systems, code repositories, and university service links.
          </p>
        </div>

        {isAdmin && (
          <button
            id="btn-add-link"
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Link</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
        <div className="sm:col-span-8 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="input-search-links"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search bookmarks by title or URL..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
          />
        </div>

        <div className="sm:col-span-4 relative">
          <Filter className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <select
            id="select-links-course-filter"
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 appearance-none cursor-pointer"
          >
            <option value="all">All Links</option>
            <option value="general">Campus-Wide Links Only</option>
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
          <span className="text-xs">Loading academic links...</span>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
          <div>
            <p className="font-semibold">Error loading links</p>
            <p className="text-rose-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && filteredLinks.length === 0 && (
        <div className="py-16 text-center rounded-xl bg-white border border-slate-200 shadow-sm p-8">
          <LinkIcon className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800">No links found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            No bookmarks matching your search or course criteria.
          </p>
          {isAdmin && (
            <button
              onClick={openCreateModal}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm"
            >
              Add First Link
            </button>
          )}
        </div>
      )}

      {/* Links Grid */}
      {!loading && !error && filteredLinks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLinks.map((link) => (
            <div
              key={link.id}
              className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="p-2 rounded-lg bg-blue-50 border border-blue-100 text-blue-600">
                    <Globe className="w-4 h-4" />
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(link)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(link.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <h3 className="text-sm font-bold text-slate-900 mt-3 leading-snug">
                  {link.title}
                </h3>

                {link.courses ? (
                  <span className="inline-block mt-1 text-[11px] font-semibold text-blue-600">
                    {link.courses.course_code}
                  </span>
                ) : (
                  <span className="inline-block mt-1 text-[11px] font-medium text-slate-400">
                    General Campus
                  </span>
                )}

                {link.description && (
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                    {link.description}
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 truncate max-w-[150px]">
                  {link.url.replace(/^https?:\/\//, '')}
                </span>

                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition-colors"
                >
                  <span>Visit</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
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
                {editingLink ? 'Edit Link' : 'Add Important Link'}
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
                  placeholder="e.g. ACM Digital Library / Course GitHub Organization"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target URL *
                </label>
                <input
                  type="url"
                  required
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Course Association (Optional)
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
                  Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief note on what this resource provides..."
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
                  <span>{editingLink ? 'Update Link' : 'Save Link'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
