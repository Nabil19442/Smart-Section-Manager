import React, { useState, useEffect } from 'react';
import {
  Menu,
  ChevronRight,
  Bell,
  User as UserIcon,
  LogOut,
  Database,
  CheckCircle2,
  AlertCircle,
  X,
  Clock,
  Sparkles,
  Shield,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import type { Database as DBType } from '../types/database.types';

type Notification = DBType['public']['Tables']['notifications']['Row'];

interface NavbarProps {
  onOpenAuth: () => void;
  onOpenProfile: () => void;
  onOpenSetupGuide: () => void;
  onToggleMobileMenu?: () => void;
  activeTabTitle?: string;
  onNewNoticeClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAuth,
  onOpenProfile,
  onOpenSetupGuide,
  onToggleMobileMenu,
  activeTabTitle = 'Dashboard Overview',
  onNewNoticeClick,
}) => {
  const { user, profile, isAdmin, signOut, isConfigured } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  // Fetch notifications and subscribe to realtime for current user
  useEffect(() => {
    if (!user || !isConfigured) return;

    let isMounted = true;

    const fetchNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) {
          console.error('Error fetching notifications:', error.message);
          return;
        }

        if (isMounted && data) {
          setNotifications(data);
          setUnreadCount(data.filter((n: any) => !n.is_read).length);
        }
      } catch (e) {
        console.error(e);
      }
    };

    fetchNotifications();

    // Supabase Realtime channel for notifications
    const channel = supabase
      .channel(`public:notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [user, isConfigured]);

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking notifications as read:', err);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0 z-20">
      {/* Left: Mobile hamburger & Breadcrumbs */}
      <div className="flex items-center gap-3 sm:gap-4">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="Open Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm font-medium text-slate-500">
          <span className="hidden sm:inline text-slate-600">
            {isAdmin ? 'Admin Portal' : 'Student Portal'}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
          <span className="text-slate-900 font-semibold truncate max-w-[160px] sm:max-w-none">
            {activeTabTitle}
          </span>
        </div>
      </div>

      {/* Right: Status badges and user controls */}
      <div className="flex items-center gap-2.5 sm:gap-4">
        {/* Realtime Connected Pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-full border border-green-200 shadow-2xs">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span>Realtime Connected</span>
        </div>

        {/* Supabase backend status pill */}
        <button
          id="btn-backend-status"
          onClick={onOpenSetupGuide}
          className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
            isConfigured
              ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
              : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
          }`}
          title="Supabase PostgreSQL status"
        >
          <Database className="w-3.5 h-3.5" />
          <span>{isConfigured ? 'PostgreSQL RLS' : 'Connect Supabase'}</span>
        </button>

        {/* Quick Action Button for New Notice (Admin) */}
        {isAdmin && onNewNoticeClick && (
          <button
            onClick={onNewNoticeClick}
            className="hidden md:flex bg-blue-600 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm items-center gap-1.5"
          >
            <span>+ New Notice</span>
          </button>
        )}

        {/* Notifications Dropdown */}
        {user && (
          <div className="relative">
            <button
              id="btn-notifications"
              onClick={() => {
                setShowNotifications(!showNotifications);
                setIsDropdownOpen(false);
              }}
              className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-900">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-[11px] text-blue-600 hover:underline font-medium"
                    >
                      Mark read
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-3 text-xs transition-colors ${
                          n.is_read ? 'bg-white hover:bg-slate-50' : 'bg-blue-50/40 hover:bg-blue-50/70'
                        }`}
                      >
                        <p className="font-semibold text-slate-800">{n.title}</p>
                        <p className="text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>
                        <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* User Account / Profile Dropdown */}
        {user ? (
          <div className="relative">
            <button
              id="btn-user-avatar-menu"
              onClick={() => {
                setIsDropdownOpen(!isDropdownOpen);
                setShowNotifications(false);
              }}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-orange-400 text-slate-950 font-bold flex items-center justify-center text-xs shadow-2xs">
                {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'JD'}
              </div>
              <span className="text-xs font-semibold text-slate-700 max-w-[120px] truncate hidden md:inline">
                {profile?.full_name || user.email?.split('@')[0]}
              </span>
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {profile?.full_name || 'Academic User'}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    {isAdmin ? 'Admin' : 'Student'}
                  </span>
                </div>

                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onOpenProfile();
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                >
                  <UserIcon className="w-4 h-4 text-slate-400" />
                  <span>Profile Settings</span>
                </button>

                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onOpenSetupGuide();
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                >
                  <Database className="w-4 h-4 text-blue-500" />
                  <span>Supabase & SQL Config</span>
                </button>

                <div className="border-t border-slate-100 my-1" />

                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    signOut();
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            id="btn-sign-in"
            onClick={onOpenAuth}
            className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-sm"
          >
            Sign In / Register
          </button>
        )}
      </div>
    </header>
  );
};
