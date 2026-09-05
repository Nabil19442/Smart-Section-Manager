import React from 'react';
import {
  Bell,
  BookOpen,
  Calendar,
  Clock,
  FileText,
  Link as LinkIcon,
  Layers,
  ShieldCheck,
  History,
  User,
  LogOut,
  LogIn,
  X,
  Database,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type TabType =
  | 'notices'
  | 'materials'
  | 'deadlines'
  | 'exams'
  | 'courses'
  | 'calendar'
  | 'links'
  | 'test_suite'
  | 'activity_logs'
  | 'profile';

interface NavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  counts?: {
    notices?: number;
    materials?: number;
    deadlines?: number;
    exams?: number;
    courses?: number;
  };
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  onOpenAuth?: () => void;
  onOpenSetupGuide?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  counts,
  isMobileOpen = false,
  onCloseMobile,
  onOpenAuth,
  onOpenSetupGuide,
}) => {
  const { user, profile, isAdmin, signOut } = useAuth();
  const c = counts || {};

  const tabs = [
    {
      id: 'notices' as TabType,
      label: 'Notices',
      icon: Bell,
      count: c.notices,
    },
    {
      id: 'materials' as TabType,
      label: 'Study Materials',
      icon: BookOpen,
      count: c.materials,
    },
    {
      id: 'deadlines' as TabType,
      label: 'Deadlines',
      icon: Clock,
      count: c.deadlines,
    },
    {
      id: 'exams' as TabType,
      label: 'Exams',
      icon: FileText,
      count: c.exams,
    },
    {
      id: 'courses' as TabType,
      label: 'My Courses',
      icon: Layers,
      count: c.courses,
    },
    {
      id: 'calendar' as TabType,
      label: 'Calendar',
      icon: Calendar,
    },
    {
      id: 'links' as TabType,
      label: 'Important Links',
      icon: LinkIcon,
    },
    {
      id: 'test_suite' as TabType,
      label: 'RLS & Backend Tests',
      icon: ShieldCheck,
      badge: '14 Tests',
    },
    ...(isAdmin
      ? [
          {
            id: 'activity_logs' as TabType,
            label: 'Audit Logs',
            icon: History,
          },
        ]
      : []),
    {
      id: 'profile' as TabType,
      label: 'Profile Settings',
      icon: User,
    },
  ];

  const handleSelectTab = (id: TabType) => {
    onTabChange(id);
    if (onCloseMobile) onCloseMobile();
  };

  const content = (
    <div className="flex flex-col h-full bg-[#0F172A] text-white">
      {/* Brand Header */}
      <div className="p-5 flex items-center justify-between border-b border-[#1E293B]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-lg text-white shadow-sm">
            S
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-white">Smart Section</span>
            <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-blue-900/60 text-blue-300 font-mono font-medium">
              Manager
            </span>
          </div>
        </div>

        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden text-slate-400 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3.5 space-y-1 overflow-y-auto">
        <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Menu
        </div>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              onClick={() => handleSelectTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                isActive
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-slate-300 hover:bg-[#1E293B] hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span className="truncate flex-1">{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    isActive
                      ? 'bg-blue-700 text-white'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {tab.count}
                </span>
              )}
              {tab.badge && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                    isActive
                      ? 'bg-blue-800 text-blue-100'
                      : 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* SQL & Setup Quick Action */}
      {onOpenSetupGuide && (
        <div className="px-3.5 py-2">
          <button
            onClick={() => {
              onOpenSetupGuide();
              if (onCloseMobile) onCloseMobile();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-[#1E293B] transition-colors border border-slate-800/80"
          >
            <Database className="w-3.5 h-3.5 text-blue-400" />
            <span>SQL Schema & Config</span>
          </button>
        </div>
      )}

      {/* User Footer Card */}
      <div className="p-4 border-t border-[#1E293B] bg-[#020617]">
        {user ? (
          <div className="flex items-center justify-between gap-3">
            <div
              onClick={() => handleSelectTab('profile')}
              className="flex items-center gap-3 cursor-pointer overflow-hidden flex-1 min-w-0 group"
            >
              <div className="w-10 h-10 rounded-full bg-orange-400 border-2 border-white/20 flex items-center justify-center text-slate-950 font-bold text-sm shrink-0 shadow-sm">
                {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'JD'}
              </div>
              <div className="overflow-hidden min-w-0">
                <p className="text-sm font-semibold truncate text-white group-hover:text-blue-400 transition-colors">
                  {profile?.full_name || user.email?.split('@')[0] || 'Academic User'}
                </p>
                <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">
                  {isAdmin ? 'Admin Access' : 'Student'}
                </p>
              </div>
            </div>

            <button
              onClick={signOut}
              title="Sign Out"
              className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-[#1E293B] transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <div className="overflow-hidden">
              <p className="text-xs font-medium text-slate-400">Not signed in</p>
              <p className="text-[11px] text-slate-500 truncate">Guest session</p>
            </div>
            {onOpenAuth && (
              <button
                onClick={() => {
                  onOpenAuth();
                  if (onCloseMobile) onCloseMobile();
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-[#1E293B]">
        {content}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <aside className="relative w-64 max-w-[80vw] z-10 flex flex-col shadow-2xl">
            {content}
          </aside>
        </div>
      )}
    </>
  );
};
