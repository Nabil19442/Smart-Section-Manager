import React, { useState } from 'react';
import {
  LayoutDashboard,
  Bell,
  BookOpen,
  Clock,
  Calendar,
  Layers,
  Link as LinkIcon,
  Users,
  Radio,
  Settings,
  ExternalLink,
  LogOut,
  Shield,
  Menu,
  X,
  ChevronRight,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AdminOverview } from './AdminOverview';
import { AdminNotices } from './AdminNotices';
import { AdminCourses } from './AdminCourses';
import { AdminMaterials } from './AdminMaterials';
import { AdminDeadlines } from './AdminDeadlines';
import { AdminExams } from './AdminExams';
import { AdminCalendar } from './AdminCalendar';
import { AdminLinks } from './AdminLinks';
import { AdminStudents } from './AdminStudents';
import { AdminNotifications } from './AdminNotifications';
import { AdminSettings } from './AdminSettings';

export type AdminTabType =
  | 'overview'
  | 'notices'
  | 'courses'
  | 'materials'
  | 'deadlines'
  | 'exams'
  | 'calendar'
  | 'links'
  | 'students'
  | 'notifications'
  | 'settings';

interface AdminDashboardProps {
  onViewStudentPortal: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onViewStudentPortal }) => {
  const { user, profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTabType>('overview');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Quick Action trigger helper
  const handleQuickAction = (action: 'notice' | 'material' | 'deadline' | 'exam' | 'course' | 'event') => {
    switch (action) {
      case 'notice':
        setActiveTab('notices');
        break;
      case 'material':
        setActiveTab('materials');
        break;
      case 'deadline':
        setActiveTab('deadlines');
        break;
      case 'exam':
        setActiveTab('exams');
        break;
      case 'course':
        setActiveTab('courses');
        break;
      case 'event':
        setActiveTab('calendar');
        break;
    }
  };

  const navItems = [
    { id: 'overview' as AdminTabType, label: 'Overview', icon: LayoutDashboard },
    { id: 'notices' as AdminTabType, label: 'Notices', icon: Bell },
    { id: 'courses' as AdminTabType, label: 'Courses', icon: Layers },
    { id: 'materials' as AdminTabType, label: 'Study Materials', icon: BookOpen },
    { id: 'deadlines' as AdminTabType, label: 'Deadlines', icon: Clock },
    { id: 'exams' as AdminTabType, label: 'Exams & Routine', icon: Calendar },
    { id: 'calendar' as AdminTabType, label: 'Academic Calendar', icon: Calendar },
    { id: 'links' as AdminTabType, label: 'Important Links', icon: LinkIcon },
    { id: 'students' as AdminTabType, label: 'Student Directory', icon: Users },
    { id: 'notifications' as AdminTabType, label: 'Broadcast Alerts', icon: Radio },
    { id: 'settings' as AdminTabType, label: 'Settings & Security', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased text-slate-900">
      {/* Top Admin Navigation Header */}
      <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand & Mobile Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              className="lg:hidden p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
            >
              {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-600/30">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold tracking-tight text-white">CR Admin Portal</h1>
                  <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-[10px] font-bold uppercase tracking-wider">
                    Sec {profile?.section || 'A'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 hidden sm:block">
                  Class Representative Academic Management System
                </p>
              </div>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2.5">
            {/* View Student Portal Button */}
            <button
              onClick={onViewStudentPortal}
              className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/10 transition-all flex items-center gap-1.5"
              title="Open Student Portal"
            >
              <ExternalLink className="w-3.5 h-3.5 text-indigo-300" />
              <span className="hidden sm:inline">View Student Portal</span>
              <span className="sm:hidden">Student Portal</span>
            </button>

            {/* Profile Pill & Signout */}
            <div className="h-6 w-px bg-slate-800 hidden sm:block" />

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-950 border border-indigo-500/30 flex items-center justify-center text-indigo-300 text-xs font-bold">
                {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'A'}
              </div>
              <div className="hidden md:block text-left text-xs">
                <p className="font-semibold text-white truncate max-w-[120px]">
                  {profile?.full_name || 'Admin User'}
                </p>
                <p className="text-[10px] text-slate-400 truncate max-w-[120px]">
                  {user?.email}
                </p>
              </div>

              <button
                onClick={() => signOut()}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors ml-1"
                title="Sign out of Admin Dashboard"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main App Body */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex-1 flex gap-6">
        {/* Desktop Sidebar */}
        <aside className="w-60 shrink-0 hidden lg:block">
          <div className="sticky top-24 bg-white rounded-2xl border border-slate-200 shadow-sm p-3 space-y-1">
            <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Management Modules
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/70" />}
                </button>
              );
            })}

            <div className="pt-3 mt-3 border-t border-slate-100">
              <button
                onClick={onViewStudentPortal}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-indigo-700 bg-indigo-50/60 hover:bg-indigo-50 transition-colors"
              >
                <ArrowUpRight className="w-4 h-4 text-indigo-600" />
                <span>Switch to Student View</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden bg-black/50 backdrop-blur-xs flex">
            <div className="bg-white w-64 max-w-xs h-full p-4 shadow-xl flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-indigo-600" />
                    <span className="font-bold text-slate-900 text-sm">CR Admin Menu</span>
                  </div>
                  <button
                    onClick={() => setMobileSidebarOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          setMobileSidebarOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-2">
                <button
                  onClick={() => {
                    setMobileSidebarOpen(false);
                    onViewStudentPortal();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-semibold"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>View Student Portal</span>
                </button>
                <button
                  onClick={() => signOut()}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 text-xs font-semibold"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Content Pane */}
        <main className="flex-1 min-w-0">
          {activeTab === 'overview' && (
            <AdminOverview
              onNavigateTab={(tab) => setActiveTab(tab)}
              onOpenQuickAction={handleQuickAction}
            />
          )}
          {activeTab === 'notices' && <AdminNotices />}
          {activeTab === 'courses' && <AdminCourses />}
          {activeTab === 'materials' && <AdminMaterials />}
          {activeTab === 'deadlines' && <AdminDeadlines />}
          {activeTab === 'exams' && <AdminExams />}
          {activeTab === 'calendar' && <AdminCalendar />}
          {activeTab === 'links' && <AdminLinks />}
          {activeTab === 'students' && <AdminStudents />}
          {activeTab === 'notifications' && <AdminNotifications />}
          {activeTab === 'settings' && <AdminSettings />}
        </main>
      </div>
    </div>
  );
};
