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
  X,
  Loader2,
  Lock
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';

interface StudentProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  student_id: string | null;
  roll: string | null;
  section: string | null;
  batch: string | null;
  role: string | null;
  created_at: string;
}

export const AdminStudents: React.FC = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');

  // Edit modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [editFormData, setEditFormData] = useState({
    full_name: '',
    student_id: '',
    roll: '',
    section: '',
    batch: '',
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
      setStudents(data || []);
    } catch (err: any) {
      console.error('Fetch students error:', err);
      showToast('error', err.message || 'Failed to fetch student profiles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const showToast = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const openEditModal = (student: StudentProfile) => {
    setSelectedStudent(student);
    setEditFormData({
      full_name: student.full_name || '',
      student_id: student.student_id || '',
      roll: student.roll || '',
      section: student.section || '',
      batch: student.batch || '',
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editFormData.full_name.trim() || null,
          student_id: editFormData.student_id.trim() || null,
          roll: editFormData.roll.trim() || null,
          section: editFormData.section.trim() || null,
          batch: editFormData.batch.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedStudent.id);

      if (error) throw error;

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

  const filteredStudents = students.filter((s) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (s.full_name && s.full_name.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q)) ||
      (s.student_id && s.student_id.toLowerCase().includes(q)) ||
      (s.roll && s.roll.toLowerCase().includes(q));

    const matchesSection =
      sectionFilter === 'all' || s.section?.toLowerCase() === sectionFilter.toLowerCase();

    const matchesRole =
      roleFilter === 'all' || s.role?.toLowerCase() === roleFilter.toLowerCase();

    return matchesSearch && matchesSection && matchesRole;
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
            <Users className="w-5 h-5 text-indigo-600" />
            <span>Student Roster & Directory</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            View registered students, verified rolls, sections, and maintain directory accuracy.
          </p>
        </div>

        <div className="text-xs text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-1.5">
          <GraduationCap className="w-4 h-4 text-indigo-600" />
          <span>Total Enrolled: </span>
          <strong className="text-slate-900 font-bold">{students.length}</strong>
        </div>
      </div>

      {/* Privacy Notice Banner */}
      <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 flex items-start gap-3 text-xs text-blue-900">
        <Lock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-blue-900">Security & Privacy Protocol</p>
          <p className="text-blue-800/90 text-[11px] leading-relaxed">
            All students authenticate directly via Supabase Auth with bcrypt hashing. Passwords and credentials remain strictly confidential. As Class Representative, you can audit student IDs and rolls for academic synchronization. Role elevations to <code className="font-mono bg-blue-100/70 px-1 py-0.5 rounded text-blue-950 font-semibold">admin</code> are guarded by PostgreSQL RLS trigger policies.
          </p>
        </div>
      </div>

      {/* Filters */}
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

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Sections</option>
            <option value="A">Section A</option>
            <option value="B">Section B</option>
            <option value="C">Section C</option>
          </select>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Roles</option>
            <option value="student">Student</option>
            <option value="admin">Admin / CR</option>
          </select>
        </div>
      </div>

      {/* Table */}
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
              Adjust search filters or check your database connection.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Student Name & Contact</th>
                  <th className="py-3 px-4">Roll Number</th>
                  <th className="py-3 px-4">Student ID</th>
                  <th className="py-3 px-4">Section / Batch</th>
                  <th className="py-3 px-4">System Role</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div>
                        <p className="font-bold text-slate-900">{s.full_name || 'Unnamed Student'}</p>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{s.email || '—'}</span>
                        </p>
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
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold text-[10px]">
                          Sec {s.section || 'A'}
                        </span>
                        {s.batch && (
                          <span className="text-slate-500 text-[11px]">
                            Batch {s.batch}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {s.role === 'admin' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-[10px]">
                          <Shield className="w-3 h-3" />
                          <span>CR / Admin</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium text-[10px]">
                          Student
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => openEditModal(s)}
                        className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                        title="Edit student record"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">University Student ID</label>
                  <input
                    type="text"
                    value={editFormData.student_id}
                    onChange={(e) => setEditFormData({ ...editFormData, student_id: e.target.value })}
                    placeholder="e.g. 2102041"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-600 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assigned Section</label>
                  <input
                    type="text"
                    value={editFormData.section}
                    onChange={(e) => setEditFormData({ ...editFormData, section: e.target.value })}
                    placeholder="e.g. A"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-600 uppercase"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Academic Batch</label>
                  <input
                    type="text"
                    value={editFormData.batch}
                    onChange={(e) => setEditFormData({ ...editFormData, batch: e.target.value })}
                    placeholder="e.g. 2021-22"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-[11px]">
                <p><strong>Email:</strong> {selectedStudent.email || 'N/A'}</p>
                <p><strong>Role:</strong> {selectedStudent.role}</p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Update Details</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
