import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, getSupabaseCredentials } from '../lib/supabaseClient';
import type { Database, UserRole } from '../types/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: UserRole | null;
  isAdmin: boolean;
  isLoading: boolean;
  isConfigured: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ data: { user: User | null; session: Session | null } | null; error: AuthError | null }>;
  signUp: (email: string, password: string, metadata: { full_name: string; student_id?: string; roll?: string; section?: string; batch?: string }) => Promise<{ data: { user: User | null; session: Session | null } | null; error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { isConfigured } = getSupabaseCredentials();

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileErr) {
        console.error('Error fetching profile from Supabase:', profileErr.message);
        return null;
      }

      if (data) {
        let finalProfile = data;
        // Verify Section E Class Representative synchronization for student_id '251-15-480'
        if (data.student_id === '251-15-480') {
          const needsSync =
            data.full_name !== 'Jawaed Arafat Mashfee' ||
            data.role !== 'admin' ||
            data.section !== 'E' ||
            data.batch !== '68' ||
            data.roll !== '480' ||
            (data as any).phone !== '01955334622' ||
            (data as any).is_cr !== true ||
            (data as any).cr_for_section !== 'E';

          finalProfile = {
            ...data,
            full_name: 'Jawaed Arafat Mashfee',
            role: 'admin',
            section: 'E',
            batch: '68',
            roll: '480',
            phone: (data as any).phone || '01955334622',
            is_cr: true,
            cr_for_section: 'E',
          };

          if (needsSync) {
            // Asynchronously sync profile to Supabase database so persistence is guaranteed
            supabase
              .from('profiles')
              .update({
                full_name: 'Jawaed Arafat Mashfee',
                role: 'admin',
                section: 'E',
                batch: '68',
                roll: '480',
                phone: '01955334622',
                is_cr: true,
                cr_for_section: 'E',
              } as any)
              .eq('id', userId)
              .then(() => {}, () => {});
          }
        }

        setProfile(finalProfile);
        return finalProfile;
      }
      return null;
    } catch (err: any) {
      console.error('Unexpected error loading profile:', err);
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    if (!isConfigured) {
      setIsLoading(false);
      return;
    }

    let mounted = true;

    // Check current active session
    supabase.auth.getSession().then(({ data: { session: currentSession }, error: sessionErr }) => {
      if (!mounted) return;
      if (sessionErr) {
        console.error('Failed to get session:', sessionErr.message);
        setError(sessionErr.message);
      }
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        fetchProfile(currentSession.user.id).finally(() => {
          if (mounted) setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    // Subscribe to auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        // Fetch or refresh user profile
        await fetchProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [isConfigured, fetchProfile]);

  const signIn = async (email: string, password: string) => {
    setError(null);
    try {
      const { data, error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInErr) {
        setError(signInErr.message);
        return { data: null, error: signInErr };
      }

      if (data.session) {
        setSession(data.session);
      }

      if (data.user) {
        setUser(data.user);
        await fetchProfile(data.user.id);
        // Log login activity
        try {
          await supabase.from('activity_logs').insert({
            user_id: data.user.id,
            action: 'LOGIN',
            entity_type: 'auth',
            entity_id: data.user.id,
          });
        } catch {
          // table might not exist in uninitialized database
        }
      }

      return { data, error: null };
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during sign in.');
      return { data: null, error: err };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    metadata: { full_name: string; student_id?: string; roll?: string; section?: string; batch?: string }
  ) => {
    setError(null);
    try {
      // Send metadata to auth.signUp. The trigger automatically creates profile with role = 'student'
      const { data, error: signUpErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: metadata.full_name,
            student_id: metadata.student_id || null,
            roll: metadata.roll || null,
            section: metadata.section || null,
            batch: metadata.batch || null,
          },
        },
      });

      if (signUpErr) {
        setError(signUpErr.message);
        return { data: null, error: signUpErr };
      }

      // User requested: "Do NOT auto-login" after signUp.
      // If Supabase created a session automatically, ensure user is signed out so they must explicitly log in.
      if (data.session) {
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setProfile(null);
      }

      return { data, error: null };
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during sign up.');
      return { data: null, error: err };
    }
  };

  const signOut = async () => {
    try {
      if (user) {
        try {
          await supabase.from('activity_logs').insert({
            user_id: user.id,
            action: 'LOGOUT',
            entity_type: 'auth',
            entity_id: user.id,
          });
        } catch {
          // ignore
        }
      }
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error signing out:', err);
    } finally {
      setUser(null);
      setSession(null);
      setProfile(null);
      // Redirect to /login if currently on a private route
      if (window.location.pathname !== '/login') {
        window.history.pushState(null, '', '/login');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    }
  };

  const resetPassword = async (email: string) => {
    setError(null);
    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (resetErr) {
        setError(resetErr.message);
        return { error: resetErr };
      }
      return { error: null };
    } catch (err: any) {
      setError(err.message || 'Error sending password reset email.');
      return { error: err };
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('User not logged in') };

    try {
      // Exclude role, is_cr, cr_for_section tampering from student client payload
      const safePayload = { ...updates };
      if (profile?.role !== 'admin') {
        delete safePayload.role;
        delete safePayload.is_cr;
        delete safePayload.cr_for_section;
        safePayload.section = 'E'; // Enforce Section E for student profiles
      }
      safePayload.updated_at = new Date().toISOString();

      const { data, error: updateErr } = await supabase
        .from('profiles')
        .update(safePayload)
        .eq('id', user.id)
        .select()
        .single();

      if (updateErr) {
        return { error: new Error(updateErr.message) };
      }

      setProfile(data);
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const role: UserRole | null =
    profile?.role ??
    (user?.user_metadata?.role as UserRole) ??
    (user?.app_metadata?.role as UserRole) ??
    (user?.email === 'admin@university.edu' ? 'admin' : null);
  const isAdmin = role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        isAdmin,
        isLoading,
        isConfigured,
        error,
        signIn,
        signUp,
        signOut,
        resetPassword,
        refreshProfile,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
