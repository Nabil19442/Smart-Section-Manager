import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { SignIn } from './SignIn';
import { SignUp } from './SignUp';

interface LoginPageProps {
  onLoginSuccess?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  // Read initial query params if user was redirected from signup or bookmarked
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState<string>(() => {
    return searchParams.get('email') || '';
  });
  const [successNotice, setSuccessNotice] = useState<string | null>(() => {
    if (searchParams.get('signup') === 'success') {
      return 'Your account has been created. Please check your email and verify your address before logging in.';
    }
    return null;
  });

  const [checkingSession, setCheckingSession] = useState(true);

  // Check if session already exists on mount — if so, redirect immediately
  useEffect(() => {
    let mounted = true;
    const checkActiveSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (mounted && data.session?.user) {
          // Real session already exists; redirect to /admin or /dashboard based on role
          const { data: prof } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.session.user.id)
            .maybeSingle();

          const role = prof?.role || (data.session.user.user_metadata?.role as string) || 'student';
          const redirectParam = searchParams.get('redirect') || (location.state as any)?.from?.pathname;
          let targetUrl = redirectParam || (role === 'admin' ? '/admin' : '/dashboard');

          if (role !== 'admin' && targetUrl.startsWith('/admin')) {
            targetUrl = '/dashboard';
          }

          if (onLoginSuccess) {
            onLoginSuccess();
          }
          navigate(targetUrl, { replace: true });
        }
      } catch (e) {
        console.error('Session check error on login page:', e);
      } finally {
        if (mounted) setCheckingSession(false);
      }
    };

    checkActiveSession();
    return () => {
      mounted = false;
    };
  }, [onLoginSuccess, navigate, searchParams, location.state]);

  // Handler called when user completes Sign Up successfully
  const handleSignUpSuccess = (registeredEmail: string) => {
    // 1) Do NOT auto-login (already ensured)
    // 2) Pre-fill the email they just used for signup in the Sign In form
    setEmail(registeredEmail);
    // 3) Show the clear success message above the form
    setSuccessNotice(
      'Your account has been created. Please check your email and verify your address before logging in.'
    );
    // 4) Redirect / switch to the Sign In page
    setMode('signin');

    // Update query params in the URL for bookmark/refresh persistence
    const currentRedirect = searchParams.get('redirect');
    const newParams = new URLSearchParams();
    newParams.set('signup', 'success');
    newParams.set('email', registeredEmail);
    if (currentRedirect) {
      newParams.set('redirect', currentRedirect);
    }
    navigate(`/login?${newParams.toString()}`, { replace: true });
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-xs font-medium text-slate-400">Verifying authentication session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
      {/* Brand Header */}
      <div className="w-full max-w-md mb-6 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 shadow-lg shadow-blue-500/20 text-white font-bold text-2xl mb-3">
          S
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Smart Section Manager</h1>
        <p className="text-xs text-slate-400 mt-1">
          University Academic Portal & Course Management System
        </p>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
        {/* Mode Switcher Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50/70 p-1">
          <button
            type="button"
            id="tab-signin"
            onClick={() => setMode('signin')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
              mode === 'signin'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            id="tab-signup"
            onClick={() => setMode('signup')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
              mode === 'signup'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Create Account
          </button>
        </div>

        <div className="p-6">
          {mode === 'signin' ? (
            <SignIn
              initialEmail={email}
              successMessage={successNotice}
              onLoginSuccess={onLoginSuccess}
              onSwitchToSignUp={() => setMode('signup')}
            />
          ) : (
            <SignUp
              initialEmail={email}
              onSignUpSuccess={handleSignUpSuccess}
              onSwitchToSignIn={() => setMode('signin')}
            />
          )}
        </div>
      </div>
    </div>
  );
};
