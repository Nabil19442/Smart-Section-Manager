import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navbar } from './components/Navbar';
import { Navigation, TabType } from './components/Navigation';
import { NoticesView } from './components/NoticesView';
import { MaterialsView } from './components/MaterialsView';
import { DeadlinesView } from './components/DeadlinesView';
import { ExamsView } from './components/ExamsView';
import { CoursesView } from './components/CoursesView';
import { CalendarView } from './components/CalendarView';
import { LinksView } from './components/LinksView';
import { BackendVerificationSuite } from './components/BackendVerificationSuite';
import { ActivityLogsView } from './components/ActivityLogsView';
import { ProfileView } from './components/ProfileView';
import { AuthModal } from './components/AuthModal';
import { SetupGuideModal } from './components/SetupGuideModal';
import { LoginPage } from './components/LoginPage';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { Footer } from './components/Footer';
import { DashboardHighlights } from './components/DashboardHighlights';
import { supabase } from './lib/supabaseClient';
import { getFallbackCounts } from './lib/fallbackData';
import { AlertTriangle, Layers, BookOpen, Clock, Bell, Loader2, X } from 'lucide-react';

const TAB_TITLES: Record<TabType, string> = {
  notices: 'Notices & Announcements',
  materials: 'Course Study Materials',
  deadlines: 'Deadlines & Submissions',
  exams: 'Exam Schedule & Hall Allocation',
  courses: 'Course Curriculum & Faculty',
  calendar: 'Academic Calendar',
  links: 'Important Portals & Links',
  test_suite: 'Backend Security & RLS Test Suite',
  activity_logs: 'System Audit Logs',
  profile: 'Student Profile & Settings',
};

interface StudentPortalLayoutProps {
  defaultTab?: TabType;
}

export const StudentPortalLayout: React.FC<StudentPortalLayoutProps> = ({ defaultTab }) => {
  const { isConfigured, isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Tab resolution: priority goes to prop, then URL path inspection, then default 'notices'
  const activeTab: TabType = useMemo(() => {
    if (defaultTab) return defaultTab;
    const path = location.pathname.replace(/^\//, '').toLowerCase();
    if (path === 'dashboard' || path === '') return 'notices';
    if (path === 'materials') return 'materials';
    if (path === 'deadlines') return 'deadlines';
    if (path === 'exams') return 'exams';
    if (path.startsWith('courses')) return 'courses';
    if (path === 'calendar') return 'calendar';
    if (path === 'links') return 'links';
    if (path === 'test-suite' || path === 'test_suite') return 'test_suite';
    if (path === 'activity-logs' || path === 'activity_logs') return 'activity_logs';
    if (path === 'profile') return 'profile';
    return 'notices';
  }, [defaultTab, location.pathname]);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Check for access denied banner passed via location state or query params
  const [accessDeniedNotice, setAccessDeniedNotice] = useState<string | null>(() => {
    if ((location.state as any)?.accessDenied) {
      return (location.state as any).accessDenied;
    }
    if (searchParams.get('denied') === 'admin') {
      return 'Access Denied: You do not have Class Representative (Admin) privileges to view the /admin dashboard.';
    }
    return null;
  });

  const [counts, setCounts] = useState<{
    notices?: number;
    materials?: number;
    deadlines?: number;
    exams?: number;
    courses?: number;
  }>({});

  // Fetch count metrics for top stat cards
  const fetchCounts = async () => {
    const fallback = getFallbackCounts();
    try {
      const [noticesRes, materialsRes, deadlinesRes, examsRes, coursesRes] = await Promise.all([
        supabase.from('notices').select('id', { count: 'exact', head: true }),
        supabase.from('materials').select('id', { count: 'exact', head: true }),
        supabase.from('deadlines').select('id', { count: 'exact', head: true }),
        supabase.from('exams').select('id', { count: 'exact', head: true }),
        supabase.from('courses').select('id', { count: 'exact', head: true }),
      ]);

      setCounts({
        notices: noticesRes.count !== null && noticesRes.count !== undefined ? noticesRes.count : fallback.notices,
        materials: materialsRes.count !== null && materialsRes.count !== undefined ? materialsRes.count : fallback.materials,
        deadlines: deadlinesRes.count !== null && deadlinesRes.count !== undefined ? deadlinesRes.count : fallback.deadlines,
        exams: examsRes.count !== null && examsRes.count !== undefined ? examsRes.count : fallback.exams,
        courses: coursesRes.count !== null && coursesRes.count !== undefined ? coursesRes.count : fallback.courses,
      });
    } catch (err) {
      console.warn('Error fetching tab counts from Supabase; using fallback counts:', err);
      setCounts(fallback);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCounts();
    }
  }, [isConfigured, activeTab, user]);

  const handleTabChange = (tab: TabType) => {
    setIsMobileMenuOpen(false);
    switch (tab) {
      case 'notices':
        navigate('/notices');
        break;
      case 'materials':
        navigate('/materials');
        break;
      case 'deadlines':
        navigate('/deadlines');
        break;
      case 'exams':
        navigate('/exams');
        break;
      case 'courses':
        navigate('/courses');
        break;
      case 'calendar':
        navigate('/calendar');
        break;
      case 'links':
        navigate('/links');
        break;
      case 'test_suite':
        navigate('/test-suite');
        break;
      case 'activity_logs':
        navigate('/activity-logs');
        break;
      case 'profile':
        navigate('/profile');
        break;
      default:
        navigate('/dashboard');
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#F1F5F9] font-sans text-[#1E293B] overflow-hidden">
      {/* Left Persistent Dark Sidebar */}
      <Navigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
        counts={counts}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenSetupGuide={() => setIsSetupModalOpen(true)}
        onNavigateAdmin={() => navigate('/admin')}
      />

      {/* Main App Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Navbar / Header */}
        <Navbar
          activeTabTitle={TAB_TITLES[activeTab]}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onOpenProfile={() => handleTabChange('profile')}
          onOpenSetupGuide={() => setIsSetupModalOpen(true)}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          onNavigateAdmin={() => navigate('/admin')}
        />

        {/* Scrollable Main Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Access Denied Alert for non-admin students attempting to visit /admin */}
          {accessDeniedNotice && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-3 text-xs text-rose-900 shadow-sm animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-semibold">{accessDeniedNotice}</span>
              </div>
              <button
                onClick={() => setAccessDeniedNotice(null)}
                className="p-1 text-rose-400 hover:text-rose-600 rounded-md transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Top Metric Cards Row matching Professional Polish design */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div
              onClick={() => handleTabChange('courses')}
              className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Active Courses
                </p>
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2 tracking-tight">
                {counts.courses ?? '—'}
              </h3>
              <div className="mt-3 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="bg-indigo-600 h-full w-3/4 rounded-full" />
              </div>
            </div>

            <div
              onClick={() => handleTabChange('notices')}
              className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Recent Notices
                </p>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Bell className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-amber-600 mt-2 tracking-tight">
                {counts.notices !== undefined ? String(counts.notices).padStart(2, '0') : '—'}
              </h3>
              <p className="text-[11px] text-slate-400 mt-2 font-medium truncate">
                Realtime announcements
              </p>
            </div>

            <div
              onClick={() => handleTabChange('deadlines')}
              className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  New Deadlines
                </p>
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-rose-600 mt-2 tracking-tight">
                {counts.deadlines !== undefined ? String(counts.deadlines).padStart(2, '0') : '—'}
              </h3>
              <p className="text-[11px] text-slate-400 mt-2 font-medium truncate">
                Assignments & tasks
              </p>
            </div>

            <div
              onClick={() => handleTabChange('materials')}
              className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Study Materials
                </p>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <BookOpen className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-emerald-600 mt-2 tracking-tight">
                {counts.materials ?? '—'}
              </h3>
              <p className="text-[11px] text-slate-400 mt-2 font-medium truncate">
                Cloud documents active
              </p>
            </div>
          </div>

          {/* Student Dashboard Highlights (Notices, Deadlines, Exams, Materials, What's New) */}
          {activeTab === 'notices' && (
            <DashboardHighlights onNavigateTab={handleTabChange} />
          )}

          {/* Active View */}
          <div className="min-w-0 flex-1">
            {activeTab === 'notices' && <NoticesView />}
            {activeTab === 'materials' && <MaterialsView />}
            {activeTab === 'deadlines' && <DeadlinesView />}
            {activeTab === 'exams' && <ExamsView />}
            {activeTab === 'courses' && <CoursesView />}
            {activeTab === 'calendar' && <CalendarView />}
            {activeTab === 'links' && <LinksView />}
            {activeTab === 'test_suite' && <BackendVerificationSuite />}
            {activeTab === 'activity_logs' && <ActivityLogsView />}
            {activeTab === 'profile' && <ProfileView />}
          </div>

          {/* Student Portal Modern Footer */}
          <Footer variant="student" />
        </main>
      </div>

      {/* Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
      <SetupGuideModal
        isOpen={isSetupModalOpen}
        onClose={() => setIsSetupModalOpen(false)}
      />
    </div>
  );
};

// Catch-all route component to cleanly redirect based on authentication and role
const CatchAllRoute: React.FC = () => {
  const { user, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-full bg-[#0F172A] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-xs font-semibold text-slate-400">Verifying session...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Login Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/:tab"
            element={
              <ProtectedRoute requireAdmin>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Protected Student Portal Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <StudentPortalLayout defaultTab="notices" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <StudentPortalLayout defaultTab="notices" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notices"
            element={
              <ProtectedRoute>
                <StudentPortalLayout defaultTab="notices" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/materials"
            element={
              <ProtectedRoute>
                <StudentPortalLayout defaultTab="materials" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/deadlines"
            element={
              <ProtectedRoute>
                <StudentPortalLayout defaultTab="deadlines" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/exams"
            element={
              <ProtectedRoute>
                <StudentPortalLayout defaultTab="exams" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/courses"
            element={
              <ProtectedRoute>
                <StudentPortalLayout defaultTab="courses" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/courses/:id"
            element={
              <ProtectedRoute>
                <StudentPortalLayout defaultTab="courses" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/calendar"
            element={
              <ProtectedRoute>
                <StudentPortalLayout defaultTab="calendar" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/links"
            element={
              <ProtectedRoute>
                <StudentPortalLayout defaultTab="links" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/test-suite"
            element={
              <ProtectedRoute>
                <StudentPortalLayout defaultTab="test_suite" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/test_suite"
            element={
              <ProtectedRoute>
                <StudentPortalLayout defaultTab="test_suite" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/activity-logs"
            element={
              <ProtectedRoute>
                <StudentPortalLayout defaultTab="activity_logs" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/activity_logs"
            element={
              <ProtectedRoute>
                <StudentPortalLayout defaultTab="activity_logs" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <StudentPortalLayout defaultTab="profile" />
              </ProtectedRoute>
            }
          />

          {/* Catch-all fallback */}
          <Route path="*" element={<CatchAllRoute />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
