import React, { useState, useEffect } from 'react';
import {
  Users,
  BookOpen,
  Bell,
  FileText,
  Clock,
  Calendar,
  Plus,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Activity,
  Layers,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { AdminTabType } from './AdminDashboard';

interface AdminOverviewProps {
  onNavigateTab: (tab: AdminTabType) => void;
  onOpenQuickAction: (action: 'notice' | 'material' | 'deadline' | 'exam' | 'course' | 'event') => void;
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({
  onNavigateTab,
  onOpenQuickAction,
}) => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    students: 0,
    courses: 0,
    notices: 0,
    materials: 0,
    deadlines: 0,
    exams: 0,
  });
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch exact counts from each table
      const [
        studentsRes,
        coursesRes,
        noticesRes,
        materialsRes,
        deadlinesRes,
        examsRes,
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('courses').select('id', { count: 'exact', head: true }),
        supabase.from('notices').select('id', { count: 'exact', head: true }),
        supabase.from('materials').select('id', { count: 'exact', head: true }),
        supabase.from('deadlines').select('id', { count: 'exact', head: true }),
        supabase.from('exams').select('id', { count: 'exact', head: true }),
      ]);

      setStats({
        students: studentsRes.count ?? 0,
        courses: coursesRes.count ?? 0,
        notices: noticesRes.count ?? 0,
        materials: materialsRes.count ?? 0,
        deadlines: deadlinesRes.count ?? 0,
        exams: examsRes.count ?? 0,
      });

      // 2. Fetch recent activity logs or recent notices/materials
      const { data: logs } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(6);

      if (logs && logs.length > 0) {
        setRecentActivities(logs);
      } else {
        // Fallback to recent notices & materials for activity stream
        const [recentNotices, recentMaterials] = await Promise.all([
          supabase.from('notices').select('id, title, created_at').order('created_at', { ascending: false }).limit(3),
          supabase.from('materials').select('id, title, created_at').order('created_at', { ascending: false }).limit(3),
        ]);

        const combined = [
          ...(recentNotices.data || []).map((n) => ({
            id: n.id,
            action_type: 'NOTICE_PUBLISHED',
            entity_type: 'notice',
            description: `Notice published: "${n.title}"`,
            created_at: n.created_at,
          })),
          ...(recentMaterials.data || []).map((m) => ({
            id: m.id,
            action_type: 'MATERIAL_UPLOADED',
            entity_type: 'material',
            description: `Study material added: "${m.title}"`,
            created_at: m.created_at,
          })),
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 6);

        setRecentActivities(combined);
      }
    } catch (err) {
      console.error('Error fetching admin overview data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const statCards = [
    {
      title: 'Total Students',
      value: stats.students,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      tab: 'students' as AdminTabType,
    },
    {
      title: 'Active Courses',
      value: stats.courses,
      icon: Layers,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
      tab: 'courses' as AdminTabType,
    },
    {
      title: 'Published Notices',
      value: stats.notices,
      icon: Bell,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      tab: 'notices' as AdminTabType,
    },
    {
      title: 'Study Materials',
      value: stats.materials,
      icon: BookOpen,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      tab: 'materials' as AdminTabType,
    },
    {
      title: 'Active Deadlines',
      value: stats.deadlines,
      icon: Clock,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      tab: 'deadlines' as AdminTabType,
    },
    {
      title: 'Scheduled Exams',
      value: stats.exams,
      icon: Calendar,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      tab: 'exams' as AdminTabType,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-slate-800 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold tracking-wide">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>Class Representative Control Center</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Welcome back, {profile?.full_name || user?.email || 'Admin'}
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Manage academic notices, courses, study materials, exam schedules, and student rosters for Section {profile?.section || 'A'}.
              All updates sync instantaneously to the student portal.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => onOpenQuickAction('notice')}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Notice</span>
            </button>
            <button
              onClick={() => onOpenQuickAction('material')}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/10 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Upload Material</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-600" />
            <span>Academic Management Metrics</span>
          </h3>
          <span className="text-xs text-slate-500">Live Supabase Database Counts</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                onClick={() => onNavigateTab(card.tab)}
                className="p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer group relative overflow-hidden"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center ${card.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all" />
                </div>
                <div className="text-2xl font-bold text-slate-900 tracking-tight">
                  {loading ? '—' : card.value}
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                  {card.title}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Class Representative Quick Actions</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <button
            onClick={() => onOpenQuickAction('notice')}
            className="p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition-all flex flex-col items-center text-center gap-2 group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Bell className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-700 group-hover:text-indigo-600">
              + Add Notice
            </span>
          </button>

          <button
            onClick={() => onOpenQuickAction('material')}
            className="p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition-all flex flex-col items-center text-center gap-2 group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-700 group-hover:text-indigo-600">
              + Upload Material
            </span>
          </button>

          <button
            onClick={() => onOpenQuickAction('deadline')}
            className="p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition-all flex flex-col items-center text-center gap-2 group"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-700 group-hover:text-indigo-600">
              + Add Deadline
            </span>
          </button>

          <button
            onClick={() => onOpenQuickAction('exam')}
            className="p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition-all flex flex-col items-center text-center gap-2 group"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Calendar className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-700 group-hover:text-indigo-600">
              + Add Exam
            </span>
          </button>

          <button
            onClick={() => onOpenQuickAction('course')}
            className="p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition-all flex flex-col items-center text-center gap-2 group"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-700 group-hover:text-indigo-600">
              + Add Course
            </span>
          </button>

          <button
            onClick={() => onOpenQuickAction('event')}
            className="p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition-all flex flex-col items-center text-center gap-2 group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Calendar className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-700 group-hover:text-indigo-600">
              + Add Event
            </span>
          </button>
        </div>
      </div>

      {/* Two Column Layout: Recent Activity & System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity Stream */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-600" />
              <span>Recent Academic Modifications</span>
            </h3>
            <button
              onClick={() => onNavigateTab('notices')}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1"
            >
              <span>View All Content</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {recentActivities.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl">
                <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-medium">No recent modifications recorded.</p>
                <p className="text-[11px] text-slate-400">Use the quick actions above to publish academic updates.</p>
              </div>
            ) : (
              recentActivities.map((act) => (
                <div
                  key={act.id}
                  className="p-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-indigo-600" />
                    <div>
                      <p className="font-semibold text-slate-800">
                        {act.description || act.action_type || 'Academic update registered'}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {new Date(act.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-semibold text-slate-600 uppercase">
                    {act.entity_type || 'Record'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Security & RLS Status */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>PostgreSQL Security Status</span>
            </h3>

            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs text-emerald-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>RLS Authorization Enforced</span>
              </div>
              <p className="text-emerald-700/90 leading-relaxed text-[11px]">
                Students possess read-only permissions on notices, study materials, courses, deadlines, and exams. All modifications are guarded server-side by <code className="font-mono bg-white/60 px-1 py-0.5 rounded text-emerald-900">public.is_admin()</code>.
              </p>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="font-medium text-slate-500">Storage Bucket:</span>
                <span className="font-mono font-semibold text-slate-800">app-files (Private)</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="font-medium text-slate-500">CR Admin Role:</span>
                <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  {profile?.role || 'admin'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="font-medium text-slate-500">Section Assignment:</span>
                <span className="font-semibold text-slate-800">Section {profile?.section || 'A'}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('settings')}
            className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
          >
            <span>View DB Promotion Instructions</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>
    </div>
  );
};
