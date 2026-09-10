import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAdmin = false,
}) => {
  const { user, isAdmin, isLoading } = useAuth();
  const location = useLocation();

  // 1. Wait for Supabase to restore session and load profile/roles before making routing decisions
  if (isLoading) {
    return (
      <div className="h-screen w-full bg-[#0F172A] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-xs font-semibold text-slate-400">Verifying authentication session...</p>
      </div>
    );
  }

  // 2. If unauthenticated, redirect to /login and preserve attempted destination
  if (!user) {
    const fullPath = location.pathname + location.search;
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(fullPath)}`}
        replace
        state={{ from: location }}
      />
    );
  }

  // 3. If admin route requested by non-admin student, redirect to student dashboard with notice
  if (requireAdmin && !isAdmin) {
    return (
      <Navigate
        to="/dashboard"
        replace
        state={{
          accessDenied: 'Access Denied: You do not have Class Representative (Admin) privileges to view the /admin dashboard.',
        }}
      />
    );
  }

  // 4. Authorized user: render protected view
  return <>{children}</>;
};
