import React, { useState, useEffect } from 'react';
import {
  Mail,
  Lock,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  KeyRound,
  Chrome,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { signInWithGoogle } from '../supabaseClient';

interface SignInProps {
  initialEmail?: string;
  successMessage?: string | null;
  onLoginSuccess?: () => void;
  onSwitchToSignUp?: () => void;
}

export const SignIn: React.FC<SignInProps> = ({
  initialEmail = '',
  successMessage,
  onLoginSuccess,
  onSwitchToSignUp,
}) => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Forgot Password state
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccessMsg, setForgotSuccessMsg] = useState<string | null>(null);
  const [forgotErrorMsg, setForgotErrorMsg] = useState<string | null>(null);

  // Google OAuth state
  const [googleLoading, setGoogleLoading] = useState(false);

  // Pre-fill / sync email whenever initialEmail updates from signup redirect
  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await signIn(email.trim(), password);

      if (res.error) {
        setErrorMsg(res.error.message);
        return;
      }

      // Only redirect when a real session exists after login
      if (res.data?.session) {
        if (onLoginSuccess) {
          onLoginSuccess();
        } else {
          window.history.pushState(null, '', '/');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
      } else {
        setErrorMsg('Unable to establish an authenticated session. Please verify your account and try again.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An authentication error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handler for Forgot Password using supabase.auth.resetPasswordForEmail()
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = email.trim();

    if (!targetEmail) {
      setForgotErrorMsg('Please enter your email address to receive a recovery link.');
      return;
    }

    setForgotLoading(true);
    setForgotErrorMsg(null);
    setForgotSuccessMsg(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: `${window.location.origin}/login?type=recovery`,
      });

      if (error) {
        setForgotErrorMsg(error.message);
      } else {
        setForgotSuccessMsg(
          `Password recovery link has been sent to ${targetEmail}. Please check your inbox (and spam folder) to reset your password.`
        );
      }
    } catch (err: any) {
      setForgotErrorMsg(err.message || 'Failed to send recovery email. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Google OAuth Login function connected to "Continue with Google" button
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setErrorMsg(null);

    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setErrorMsg(error.message);
        setGoogleLoading(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to connect to Google. Please check your Supabase OAuth settings.');
      setGoogleLoading(false);
    }
  };

  // =========================================================================
  // VIEW: Forgot Password Mode
  // =========================================================================
  if (isForgotMode) {
    return (
      <div>
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Reset Password</h2>
              <p className="text-[11px] text-slate-500">
                Send a password recovery link to your registered email
              </p>
            </div>
          </div>
        </div>

        {/* Clear UI Feedback: Success Alert */}
        {forgotSuccessMsg && (
          <div
            id="forgot-success-alert"
            className="mb-5 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-3 shadow-xs"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-emerald-900">Recovery Link Sent</p>
              <p className="text-[11px] text-emerald-700 leading-relaxed">
                {forgotSuccessMsg}
              </p>
            </div>
          </div>
        )}

        {/* Clear UI Feedback: Error Alert */}
        {forgotErrorMsg && (
          <div
            id="forgot-error-alert"
            className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{forgotErrorMsg}</span>
          </div>
        )}

        <form onSubmit={handleForgotPassword} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Registered Email Address *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@university.edu"
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={forgotLoading}
            id="forgot-submit-button"
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors"
          >
            {forgotLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <KeyRound className="w-4 h-4" />
            )}
            <span>{forgotLoading ? 'Sending Recovery Link...' : 'Send Recovery Link'}</span>
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-center">
          <button
            type="button"
            onClick={() => {
              setIsForgotMode(false);
              setForgotErrorMsg(null);
            }}
            className="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Sign In</span>
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW: Standard Sign In Mode
  // =========================================================================
  return (
    <div>
      {/* Clear success notice above the form after successful signup */}
      {successMessage && (
        <div
          id="signin-success-notice"
          className="mb-5 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-3 shadow-xs"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Error alert */}
      {errorMsg && (
        <div
          id="signin-error-alert"
          className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5"
        >
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Email Address *
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@university.edu"
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-700">
              Password *
            </label>
            <button
              type="button"
              id="forgot-password-button"
              onClick={() => {
                setIsForgotMode(true);
                setForgotSuccessMsg(null);
                setForgotErrorMsg(null);
              }}
              className="text-[11px] font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || googleLoading}
          id="signin-submit-button"
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors mt-3"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ArrowRight className="w-4 h-4" />
          )}
          <span>Sign In to Portal</span>
        </button>
      </form>

      {/* Divider */}
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center text-[11px]">
          <span className="bg-white px-2 text-slate-400 font-medium">or</span>
        </div>
      </div>

      {/* Continue with Google Button */}
      <button
        type="button"
        id="continue-with-google-button"
        onClick={handleGoogleSignIn}
        disabled={googleLoading || loading}
        className="w-full py-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors disabled:opacity-50"
      >
        {googleLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
        ) : (
          <Chrome className="w-4 h-4 text-slate-600" />
        )}
        <span>Continue with Google</span>
      </button>

      {/* Demo helper */}
      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
          Protected by Supabase Auth
        </span>
        <button
          type="button"
          onClick={() => {
            setEmail('admin@university.edu');
            setPassword('Admin@123456');
          }}
          className="text-blue-600 hover:underline font-medium"
        >
          Fill Sample Admin
        </button>
      </div>

      {onSwitchToSignUp && (
        <div className="mt-4 text-center text-xs text-slate-600">
          Don&apos;t have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToSignUp}
            className="text-blue-600 hover:underline font-semibold"
          >
            Create Account
          </button>
        </div>
      )}
    </div>
  );
};
