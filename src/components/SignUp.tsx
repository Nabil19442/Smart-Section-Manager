import React, { useState } from 'react';
import {
  Mail,
  Lock,
  User,
  Hash,
  Layers,
  ArrowRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SignUpProps {
  onSignUpSuccess: (email: string) => void;
  onSwitchToSignIn?: () => void;
  initialEmail?: string;
}

export const SignUp: React.FC<SignUpProps> = ({
  onSignUpSuccess,
  onSwitchToSignIn,
  initialEmail = '',
}) => {
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [batch, setBatch] = useState('');
  const [section, setSection] = useState('E');
  const [roll, setRoll] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const trimmedEmail = email.trim();

    try {
      const metadata = {
        full_name: fullName.trim(),
        student_id: studentId.trim() || undefined,
        batch: batch.trim() || undefined,
        section: section.trim() || undefined,
        roll: roll.trim() || undefined,
      };

      const res = await signUp(trimmedEmail, password, metadata);

      // Basic error handling
      if (res.error) {
        setErrorMsg(res.error.message);
        return;
      }

      // Successful signup:
      // 1) Do NOT auto-login (guaranteed by auth context).
      // 2) Keep / pre-fill the email used for signup.
      // 3) Redirect user to the Sign In page with success message.
      setPassword('');
      onSignUpSuccess(trimmedEmail);
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred during signup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Error Message Alert */}
      {errorMsg && (
        <div
          id="signup-error-alert"
          className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5"
        >
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Full Name *
          </label>
          <div className="relative">
            <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Student ID
            </label>
            <div className="relative">
              <Hash className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="2022-1-60-001"
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Batch
            </label>
            <div className="relative">
              <Layers className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                placeholder="52nd"
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Section (Default: Section E)
            </label>
            <input
              type="text"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              placeholder="E"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Roll No
            </label>
            <input
              type="text"
              value={roll}
              onChange={(e) => setRoll(e.target.value)}
              placeholder="042"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>

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
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Password *
          </label>
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
          <span className="text-[10px] text-slate-500 mt-1 block">
            Minimum 6 characters. Passwords are securely hashed by Supabase Auth.
          </span>
        </div>

        <button
          type="submit"
          disabled={loading}
          id="signup-submit-button"
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors mt-3"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ArrowRight className="w-4 h-4" />
          )}
          <span>Create Student Account</span>
        </button>
      </form>

      {onSwitchToSignIn && (
        <div className="mt-6 pt-4 border-t border-slate-100 text-center text-xs text-slate-600">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToSignIn}
            className="text-blue-600 hover:underline font-semibold"
          >
            Sign In
          </button>
        </div>
      )}
    </div>
  );
};
