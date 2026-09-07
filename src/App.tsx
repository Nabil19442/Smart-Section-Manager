import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
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
import { supabase } from './lib/supabaseClient';
import { getFallbackCounts } from './lib/fallbackData';
import { Database, Shield, CheckCircle2, AlertTriangle, Layers, BookOpen, Clock, Bell, Loader2 } from 'lucide-react';

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

const AppContent: React.FC = () => {
  const { isConfigured, isAdmin } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname || '/');
  const [isVerifyingSession, setIsVerifyingSession] = useState<boolean>(true);
  const [hasValidSession, setHasValidSession] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<TabType>('notices');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Protect private pages with supabase.auth.getSession() — if no session, redirect to /login
  useEffect(() => {
    let isMounted = true;

    const verifySession = async (path: string) => {
      try {
        const { data } = await supabase.auth.getSession();
        const active = Boolean(data?.session);
        if (!isMounted) return;

        setHasValidSession(active);

        // If no session exists, protect private pages by redirecting to /login
        if (!active) {
          if (path !== '/login') {
            window.history.replaceState(null, '', '/login');
            setCurrentPath('/login');
          }
        } else {
          // If a real session already exists and user visits /login, redirect to dashboard /
          if (path === '/login') {
            window.history.replaceState(null, '', '/');
            setCurrentPath('/');
          }
        }
      } catch (err) {
        console.error('Error verifying session with supabase.auth.getSession():', err);
        if (!isMounted) return;
        setHasValidSession(false);
        if (path !== '/login') {
          window.history.replaceState(null, '', '/login');
          setCurrentPath('/login');
        }
      } finally {
        if (isMounted) setIsVerifyingSession(false);
      }
    };

    const initialPath = window.location.pathname || '/';
    verifySession(initialPath);

    const handlePopState = () => {
      const path = window.location.pathname || '/';
      setCurrentPath(path);
      verifySession(path);
    };

    window.addEventListener('popstate', handlePopState);

    // Synchronize on auth changes (logout, login, session expiry)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      const active = Boolean(session);
      setHasValidSession(active);
      const path = window.location.pathname || '/';

      if (!active && path !== '/login') {
        window.history.replaceState(null, '', '/login');
        setCurrentPath('/login');
      } else if (active && path === '/login') {
        window.history.replaceState(null, '', '/');
        setCurrentPath('/');
      }
    });

    return () => {
      isMounted = false;
      window.removeEventListener('popstate', handlePopState);
      authListener.subscription.unsubscribe();
    };
  }, []);

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
    if (hasValidSession) {
      fetchCounts();
    }
  }, [isConfigured, activeTab, hasValidSession]);

  // Loading state while verifying auth session with supabase.auth.getSession()
  if (isVerifyingSession) {
    return (
      <div className="h-screen w-full bg-[#0F172A] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-xs font-semibold text-slate-400">Verifying authentication session...</p>
      </div>
    );
  }

  // If no session exists or user navigated to /login, show LoginPage
  if (!hasValidSession || currentPath === '/login') {
    return (
      <LoginPage
        onLoginSuccess={() => {
          setHasValidSession(true);
          window.history.pushState(null, '', '/');
          setCurrentPath('/');
        }}
      />
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#F1F5F9] font-sans text-[#1E293B] overflow-hidden">
      {/* Left Persistent Dark Sidebar */}
      <Navigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        counts={counts}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenSetupGuide={() => setIsSetupModalOpen(true)}
      />

      {/* Main App Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Navbar / Header */}
        <Navbar
          activeTabTitle={TAB_TITLES[activeTab]}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onOpenProfile={() => setActiveTab('profile')}
          onOpenSetupGuide={() => setIsSetupModalOpen(true)}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />

        {/* Scrollable Main Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Top Metric Cards Row matching Professional Polish design */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              onClick={() => setActiveTab('courses')}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Active Courses
                </p>
                <Layers className="w-4 h-4 text-blue-500" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {counts.courses ?? '—'}
              </h3>
              <div className="mt-3 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full w-3/4" />
              </div>
            </div>

            <div
              onClick={() => setActiveTab('notices')}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Recent Notices
                </p>
                <Bell className="w-4 h-4 text-orange-500" />
              </div>
              <h3 className="text-2xl font-bold text-orange-600 mt-1">
                {counts.notices !== undefined ? String(counts.notices).padStart(2, '0') : '—'}
              </h3>
              <p className="text-[11px] text-slate-400 mt-2 font-medium flex items-center gap-1">
                <span>Realtime announcements</span>
              </p>
            </div>

            <div
              onClick={() => setActiveTab('deadlines')}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  New Deadlines
                </p>
                <Clock className="w-4 h-4 text-red-500" />
              </div>
              <h3 className="text-2xl font-bold text-red-600 mt-1">
                {counts.deadlines !== undefined ? String(counts.deadlines).padStart(2, '0') : '—'}
              </h3>
              <p className="text-[11px] text-slate-400 mt-2 font-medium">
                Assignments & submissions
              </p>
            </div>

            <div
              onClick={() => setActiveTab('materials')}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Materials Uploaded
                </p>
                <BookOpen className="w-4 h-4 text-emerald-500" />
              </div>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">
                {counts.materials ?? '—'}
              </h3>
              <p className="text-[11px] text-slate-400 mt-2 font-medium">
                Supabase Storage: Active
              </p>
            </div>
          </div>

          {/* Active View */}
          <div className="min-w-0">
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

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
