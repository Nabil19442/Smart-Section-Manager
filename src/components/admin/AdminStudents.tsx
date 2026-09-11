import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Edit2,
  Shield,
  GraduationCap,
  Mail,
  Hash,
  AlertCircle,
  CheckCircle2,
  XCircle,
  X,
  Loader2,
  Lock,
  Eye,
  Calendar,
  Layers,
  Power,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { StudentProfileModal, StudentProfileData } from '../StudentProfileModal';

export const AdminStudents: React.FC = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentProfileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sectionFilter, setSectionFilter] = useState('E');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Total enrolled count from Supabase
  const [totalEnrolled, setTotalEnrolled] = useState<number>(0);

  // View modal
  const [viewStudent, setViewStudent] = useState<StudentProfileData | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Edit modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentProfileData | null>(null);
  const [editFormData, setEditFormData] = useState({
    full_name: '',
    student_id: '',
    roll: '',
    section: 'E',
    batch: '',
    is_active: true,
  });
  const [saving, setSaving] = useState(false);

  // Toast
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('roll', { ascending: true, nullsFirst: false });

      if (error) throw error;
      const rawList = (data as StudentProfileData[]) || [];
      const loaded = rawList.map((s) => {
        if (s.student_id === '251-15-480') {
          return {
            ...s,
            full_name: s.full_name && s.full_name.includes('Jawaed') ? s.full_name : 'Jawaed Arafat Mashfee',
            role: 'admin',
            is_cr: true,
            cr_for_section: 'E',
            section: 'E',
            batch: s.batch || '68',
            roll: s.roll || '480',
          };
        }
        return s;
      });
      setStudents(loaded);

      // Dynamically calculate Section E enrolled students (students who belong to section E and are not admins)
      const sectionEEnrolled = loaded.filter((s) => {
        const isStudent = s.role !== 'admin';
        const isSecE =
          !s.section ||
          s.section.toUpperCase() === 'E' ||
          s.section.toUpperCase() === 'SEC E' ||
          s.section.toUpperCase() === 'SECTION E';
        return isStudent && isSecE && s.is_active !== false;
      });

      setTotalEnrolled(sectionEEnrolled.length);
    } catch (err: any) {
      console.error('Fetch students error:', err);
      showToast('error', err.message || 'Failed to fetch student profiles from Supabase.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();

    // Subscribe to Supabase Realtime so that when a new student enrolls or updates, directory refreshes immediately!
    const channel = supabase
      .channel('public:profiles:admin_students')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          fetchStudents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const showToast = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const openViewModal = (student: StudentProfileData) => {
    setViewStudent(student);
    setIsViewModalOpen(true);
  };

  const openEditModal = (student: StudentProfileData) => {
    setSelectedStudent(student);
    setEditFormData({
      full_name: student.full_name || '',
      student_id: student.student_id || '',
      roll: student.roll || '',
      section: student.section || 'E',
      batch: student.batch || '',
      is_active: student.is_active !== false,
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    setSaving(true);
    try {
      // Build safe update payload
      const updates: any = {
        full_name: editFormData.full_name.trim() || null,
        student_id: editFormData.student_id.trim() || null,
        roll: editFormData.roll.trim() || null,
        section: editFormData.section.trim() || 'E',
        batch: editFormData.batch.trim() || null,
        updated_at: new Date().toISOString(),
      };

      // Attempt updating is_active
      updates.is_active = editFormData.is_active;

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', selectedStudent.id);

      if (error) {
        // Fallback without is_active if column pending migration
        if (error.code === '42703') {
          delete updates.is_active;
          const { error: fallbackErr } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', selectedStudent.id);
          if (fallbackErr) throw fallbackErr;
        } else {
          throw error;
        }
      }

      showToast('success', `Student profile for "${editFormData.full_name || 'Student'}" updated.`);
      setIsEditModalOpen(false);
      await fetchStudents();
    } catch (err: any) {
      console.error('Update student error:', err);
      showToast('error', err.message || 'Failed to update student profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (student: StudentProfileData) => {
    const currentActive = student.is_active !== false;
    const nextActive = !currentActive;
    const actionLabel = nextActive ? 'Activate' : 'Deactivate';

    if (!window.confirm(`Are you sure you want to ${actionLabel.toLowerCase()} Section E access for "${student.full_name || student.email}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_active: nextActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', student.id);

      if (error) {
        if (error.code === '42703') {
          showToast('error', 'Status toggle requires applying the latest database migration in Admin Settings.');
          return;
        }
        throw error;
      }

      showToast('success', `Student status set to ${nextActive ? 'Active' : 'Inactive'}.`);
      await fetchStudents();
    } catch (err: any) {
      console.error('Toggle status error:', err);
      showToast('error', err.message || 'Failed to toggle student status.');
    }
  };

  const filteredStudents = students.filter((s) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (s.full_name && s.full_name.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q)) ||
      (s.student_id && s.student_id.toLowerCase().includes(q)) ||
      (s.roll && s.roll.toLowerCase().includes(q));

    const matchesSection =
      sectionFilter === 'all' ||
      (sectionFilter === 'E'
        ? (!s.section || s.section.toUpperCase() === 'E' || s.section.toUpperCase() === 'SEC E' || s.section.toUpperCase() === 'SECTION E')
        : s.section?.toLowerCase() === sectionFilter.toLowerCase());

    const matchesRole =
      roleFilter === 'all' || s.role?.toLowerCase() === roleFilter.toLowerCase();

    const isActive = s.is_active !== false;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && isActive) ||
      (statusFilter === 'inactive' && !isActive);

    return matchesSearch && matchesSection && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
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

      {/* Header & Dynamic Enrolled Metric */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <span>Section E Student Directory</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            View registered Section E students, verified rolls, and maintain roster accuracy.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Dynamic Enrolled Count Card */}
          <div className="text-xs text-slate-600 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <GraduationCap className="w-3.5 h-3.5" />
            </div>
            <span>Total Enrolled:</span>
            <strong className="text-indigo-600 font-bold text-sm">
              {totalEnrolled}
            </strong>
          </div>

          <button
            onClick={() => fetchStudents()}
            disabled={loading}
            className="p-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl transition-colors shadow-xs"
            title="Refresh student roster"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Security & Privacy Banner */}
      <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 flex items-start gap-3 text-xs text-blue-900">
        <Lock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-blue-900">Security & Privacy Protocol</p>
          <p className="text-blue-800/90 text-[11px] leading-relaxed">
            All students authenticate directly via Supabase Auth. Passwords and credentials remain strictly confidential. As Class Representative, you can audit student IDs and rolls for academic synchronization. Role elevations to <code className="font-mono bg-blue-100/70 px-1 py-0.5 rounded text-blue-950 font-semibold">admin</code> are guarded by PostgreSQL RLS trigger policies.
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by student name, roll number, student ID, or email..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          <select
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="E">Section E</option>
            <option value="all">All Sections</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Roles</option>
            <option value="student">Student</option>
            <option value="admin">CR / Admin</option>
          </select>
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
            <p className="text-xs text-slate-500">Loading student directory...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No students found</p>
            <p className="text-xs text-slate-500 mt-1">
              Adjust search filters or share registration link with Section E students.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Roll</th>
                  <th className="py-3 px-4">Student ID</th>
                  <th className="py-3 px-4">Section</th>
                  <th className="py-3 px-4">Batch</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Enrolled</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((s) => {
                  const isActive = s.is_active !== false;
                  const enrolledDate = s.created_at
                    ? new Date(s.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : '—';

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs shrink-0">
                            {s.full_name ? s.full_name.charAt(0).toUpperCase() : 'S'}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-bold text-slate-900 truncate">
                                {s.full_name || 'Unnamed Student'}
                              </p>
                              {s.role === 'admin' ? (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold">
                                  <Shield className="w-2.5 h-2.5 text-amber-700" />
                                  <span>CR / Admin</span>
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium">
                                  Student
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                              <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{s.email || '—'}</span>
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {s.roll ? (
                          <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800">
                            {s.roll}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-700">
                        {s.student_id || '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-[10px]">
                          Sec {s.section && s.section !== 'A' ? s.section : 'E'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {s.batch ? (
                          <span className="text-slate-600 font-medium">
                            {s.batch}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isActive
                              ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                              : 'bg-rose-50 border border-rose-200 text-rose-700'
                          }`}
                        >
                          {isActive ? (
                            <>
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                              <span>Active</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-2.5 h-2.5 text-rose-600" />
                              <span>Inactive</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                        {enrolledDate}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Profile */}
                          <button
                            onClick={() => openViewModal(s)}
                            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors shadow-2xs"
                            title="View student profile"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Academic Details */}
                          <button
                            onClick={() => openEditModal(s)}
                            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors shadow-2xs"
                            title="Edit student record"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Quick Toggle Status */}
                          <button
                            onClick={() => handleToggleStatus(s)}
                            className={`p-1.5 rounded-lg border transition-colors shadow-2xs ${
                              isActive
                                ? 'bg-white border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600'
                                : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'
                            }`}
                            title={isActive ? 'Deactivate access' : 'Activate access'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Student Profile Modal */}
      <StudentProfileModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        student={viewStudent}
      />

      {/* Edit Student Modal */}
      {isEditModalOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Update Student Academic Details</span>
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={editFormData.full_name}
                  onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                  placeholder="Student's official name"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-600 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Class Roll Number</label>
                  <input
                    type="text"
                    value={editFormData.roll}
                    onChange={(e) => setEditFormData({ ...editFormData, roll: e.target.value })}
                    placeholder="e.g. 21"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-600 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Student ID</label>
                  <input
                    type="text"
                    value={editFormData.student_id}
                    onChange={(e) => setEditFormData({ ...editFormData, student_id: e.target.value })}
                    placeholder="e.g. 2021-1-60-042"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-600 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Section</label>
                  <input
                    type="text"
                    value={editFormData.section}
                    onChange={(e) => setEditFormData({ ...editFormData, section: e.target.value })}
                    placeholder="E"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Batch</label>
                  <input
                    type="text"
                    value={editFormData.batch}
                    onChange={(e) => setEditFormData({ ...editFormData, batch: e.target.value })}
                    placeholder="e.g. 52nd"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              {/* Status Toggle */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <label className="block font-semibold text-slate-800 text-xs">
                    Enrollment Access Status
                  </label>
                  <p className="text-[11px] text-slate-500">
                    {editFormData.is_active ? 'Active Section E Student' : 'Temporarily Inactive / Suspended'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditFormData({ ...editFormData, is_active: !editFormData.is_active })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    editFormData.is_active ? 'bg-indigo-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                      editFormData.is_active ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Security explanation */}
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-start gap-2 text-[11px] text-blue-800">
                <Lock className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                <span>Supabase passwords and authentication credentials are strictly protected by auth encryption and cannot be viewed or altered.</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors font-bold flex items-center gap-1.5 shadow-sm"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{saving ? 'Saving...' : 'Save Academic Details'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
