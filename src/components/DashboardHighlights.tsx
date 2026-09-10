import React, { useState, useEffect } from 'react';
import {
  Clock,
  Calendar,
  BookOpen,
  Bell,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  Pin,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import {
  isTableMissingError,
  getFallbackDeadlines,
  getFallbackExams,
  getFallbackMaterials,
  getFallbackNotices,
  Deadline,
  Exam,
  Material,
  Notice,
} from '../lib/fallbackData';
import { TabType } from './Navigation';
import { CRRepresentativeCard } from './CRRepresentativeCard';

interface DashboardHighlightsProps {
  onNavigateTab: (tab: TabType) => void;
}

// Calculate human-friendly countdown
function getRelativeCountdown(targetDateStr: string): { text: string; isUrgent: boolean } {
  try {
    const target = new Date(targetDateStr).getTime();
    const now = Date.now();
    const diffMs = target - now;

    if (diffMs < 0) {
      return { text: 'Past due', isUrgent: true };
    }

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 1) {
      return { text: `Due in ${diffDays} days`, isUrgent: false };
    }
    if (diffDays === 1) {
      return { text: 'Due tomorrow', isUrgent: true };
    }
    if (diffHours > 1) {
      return { text: `Due in ${diffHours} hours`, isUrgent: true };
    }
    return { text: 'Due in less than an hour', isUrgent: true };
  } catch {
    return { text: 'Scheduled', isUrgent: false };
  }
}

function getExamCountdown(targetDateStr: string): string {
  try {
    const target = new Date(targetDateStr).getTime();
    const now = Date.now();
    const diffMs = target - now;

    if (diffMs < 0) return 'Completed';

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays > 1) return `In ${diffDays} days`;
    if (diffDays === 1) return 'Tomorrow';
    return 'Today';
  } catch {
    return 'Upcoming';
  }
}

export const DashboardHighlights: React.FC<DashboardHighlightsProps> = ({ onNavigateTab }) => {
  const [importantNotice, setImportantNotice] = useState<Notice | null>(null);
  const [upcomingDeadline, setUpcomingDeadline] = useState<Deadline | null>(null);
  const [upcomingExam, setUpcomingExam] = useState<Exam | null>(null);
  const [recentMaterial, setRecentMaterial] = useState<Material | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadHighlights = async () => {
      try {
        // 1. Fetch Pinned or Important Notice
        const noticePromise = supabase
          .from('notices')
          .select('*, courses(*)')
          .or('is_pinned.eq.true,is_important.eq.true')
          .order('is_pinned', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(1);

        // 2. Fetch Next Upcoming Deadline
        const todayDate = new Date().toISOString().split('T')[0];
        const deadlinePromise = supabase
          .from('deadlines')
          .select('*, courses(*)')
          .gte('due_date', todayDate)
          .order('due_date', { ascending: true })
          .limit(1);

        // 3. Fetch Next Upcoming Exam
        const examPromise = supabase
          .from('exams')
          .select('*, courses(*)')
          .gte('exam_date', todayDate)
          .order('exam_date', { ascending: true })
          .limit(1);

        // 4. Fetch Most Recent Material
        const materialPromise = supabase
          .from('materials')
          .select('*, courses(*)')
          .order('created_at', { ascending: false })
          .limit(1);

        const [noticeRes, deadlineRes, examRes, materialRes] = await Promise.all([
          noticePromise,
          deadlinePromise,
          examPromise,
          materialPromise,
        ]);

        if (!isMounted) return;

        // Notices
        if (noticeRes.data && noticeRes.data.length > 0) {
          setImportantNotice(noticeRes.data[0]);
        } else if (noticeRes.error && isTableMissingError(noticeRes.error)) {
          const fallbacks = getFallbackNotices();
          const pinned = fallbacks.find((n) => n.is_pinned || n.is_important) || fallbacks[0];
          setImportantNotice(pinned || null);
        } else {
          const fallbacks = getFallbackNotices();
          const pinned = fallbacks.find((n) => n.is_pinned || n.is_important);
          setImportantNotice(pinned || null);
        }

        // Deadlines
        if (deadlineRes.data && deadlineRes.data.length > 0) {
          setUpcomingDeadline(deadlineRes.data[0]);
        } else {
          const fallbacks = getFallbackDeadlines();
          const upcoming = fallbacks
            .filter((d) => new Date(`${d.due_date}T${d.due_time || '23:59'}`).getTime() > Date.now())
            .sort(
              (a, b) =>
                new Date(`${a.due_date}T${a.due_time || '23:59'}`).getTime() -
                new Date(`${b.due_date}T${b.due_time || '23:59'}`).getTime()
            );
          setUpcomingDeadline(upcoming[0] || fallbacks[0] || null);
        }

        // Exams
        if (examRes.data && examRes.data.length > 0) {
          setUpcomingExam(examRes.data[0]);
        } else {
          const fallbacks = getFallbackExams();
          const upcoming = fallbacks
            .filter((e) => new Date(`${e.exam_date}T${e.start_time || '09:00'}`).getTime() > Date.now())
            .sort(
              (a, b) =>
                new Date(`${a.exam_date}T${a.start_time || '09:00'}`).getTime() -
                new Date(`${b.exam_date}T${b.start_time || '09:00'}`).getTime()
            );
          setUpcomingExam(upcoming[0] || fallbacks[0] || null);
        }

        // Materials
        if (materialRes.data && materialRes.data.length > 0) {
          setRecentMaterial(materialRes.data[0]);
        } else {
          const fallbacks = getFallbackMaterials();
          setRecentMaterial(fallbacks[0] || null);
        }
      } catch (err) {
        // Fallback gracefully
        if (!isMounted) return;
        const notices = getFallbackNotices();
        setImportantNotice(notices.find((n) => n.is_pinned || n.is_important) || null);
        const deadlines = getFallbackDeadlines();
        setUpcomingDeadline(deadlines[0] || null);
        const exams = getFallbackExams();
        setUpcomingExam(exams[0] || null);
        const materials = getFallbackMaterials();
        setRecentMaterial(materials[0] || null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadHighlights();

    return () => {
      isMounted = false;
    };
  }, []);

  const deadlineCountdown = upcomingDeadline
    ? getRelativeCountdown(`${upcomingDeadline.due_date}T${upcomingDeadline.due_time || '23:59'}`)
    : null;

  return (
    <section className="space-y-4">
      {/* 1. Important Notice Highlight Banner (if exists) */}
      {importantNotice && (
        <div
          onClick={() => onNavigateTab('notices')}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 p-4 sm:p-5 text-white shadow-sm border border-indigo-800/60 cursor-pointer group transition-all hover:border-indigo-600"
        >
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center shrink-0">
                {importantNotice.is_important ? (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                ) : (
                  <Pin className="w-4 h-4 text-indigo-300" />
                )}
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                    {importantNotice.is_important ? 'Urgent Notice' : 'Pinned Announcement'}
                  </span>
                  {importantNotice.courses && (
                    <span className="text-[11px] font-semibold text-slate-300">
                      {importantNotice.courses.course_code}
                    </span>
                  )}
                </div>
                <h4 className="text-sm sm:text-base font-bold text-white tracking-tight group-hover:text-indigo-200 transition-colors">
                  {importantNotice.title}
                </h4>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300 group-hover:text-white transition-colors self-end sm:self-center shrink-0">
              <span>Read Notice</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      )}

      {/* 2. Structured Quick Insights Cards: Deadlines, Exams, Materials, What's New */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Upcoming Deadline Card */}
        <div
          onClick={() => onNavigateTab('deadlines')}
          className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Upcoming Deadline
                </span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
            </div>

            {upcomingDeadline ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                    {upcomingDeadline.courses?.course_code || 'General'}
                  </span>
                  <span className="text-[11px] font-medium text-slate-400 capitalize">
                    {upcomingDeadline.deadline_type.replace('_', ' ')}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                  {upcomingDeadline.title}
                </h4>
              </div>
            ) : (
              <p className="text-xs text-slate-400">No active pending deadlines</p>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            {deadlineCountdown ? (
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                  deadlineCountdown.isUrgent
                    ? 'bg-rose-50 text-rose-700 border border-rose-200/80'
                    : 'bg-amber-50 text-amber-700 border border-amber-200/80'
                }`}
              >
                <Clock className="w-3.5 h-3.5 shrink-0" />
                {deadlineCountdown.text}
              </span>
            ) : (
              <span className="text-xs text-slate-400 font-medium">All caught up</span>
            )}
            <span className="text-[11px] font-semibold text-slate-500 group-hover:text-indigo-600">
              View all
            </span>
          </div>
        </div>

        {/* Upcoming Exam Card */}
        <div
          onClick={() => onNavigateTab('exams')}
          className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Upcoming Exam
                </span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
            </div>

            {upcomingExam ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                    {upcomingExam.courses?.course_code || 'Academic'}
                  </span>
                  <span className="text-[11px] font-medium text-slate-400 capitalize">
                    {upcomingExam.exam_type}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                  {upcomingExam.courses ? `${upcomingExam.courses.course_name}` : 'Scheduled Assessment'}
                </h4>
                <p className="text-[11px] text-slate-500 font-medium truncate">
                  Room: {upcomingExam.room} • {upcomingExam.start_time} - {upcomingExam.end_time}
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-400">No scheduled exam this week</p>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            {upcomingExam ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200/80">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                {getExamCountdown(`${upcomingExam.exam_date}T${upcomingExam.start_time || '09:00'}`)}
              </span>
            ) : (
              <span className="text-xs text-slate-400 font-medium">Clear schedule</span>
            )}
            <span className="text-[11px] font-semibold text-slate-500 group-hover:text-indigo-600">
              Exam plan
            </span>
          </div>
        </div>

        {/* Recently Added Materials Card */}
        <div
          onClick={() => onNavigateTab('materials')}
          className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Recent Material
                </span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
            </div>

            {recentMaterial ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {recentMaterial.courses?.course_code || 'Study'}
                  </span>
                  <span className="text-[11px] font-medium text-slate-400">
                    {recentMaterial.file_type ? recentMaterial.file_type.toUpperCase() : 'Resource'}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                  {recentMaterial.title}
                </h4>
              </div>
            ) : (
              <p className="text-xs text-slate-400">No recent materials uploaded</p>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              Latest upload
            </span>
            <span className="text-[11px] font-semibold text-slate-500 group-hover:text-indigo-600">
              Browse files
            </span>
          </div>
        </div>

        {/* Section Representative / Our CR Card (Live from Supabase) */}
        <CRRepresentativeCard />
      </div>
    </section>
  );
};
