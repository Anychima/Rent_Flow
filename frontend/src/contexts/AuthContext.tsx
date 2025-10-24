import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient, User, Session } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL!,
  process.env.REACT_APP_SUPABASE_KEY!
);

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'manager' | 'tenant' | 'prospective_tenant' | 'admin' | 'ai_agent';
  user_type: string;
  is_active: boolean;
  wallet_address?: string;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: any }>;
  signUp: (email: string, password: string, fullName: string, role?: string) => Promise<{ error?: any }>;
  signOut: () => Promise<void>;
  refreshUserProfile: () => Promise<void>; // NEW: Force refresh user profile
  supabase: typeof supabase;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile from database
  const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      console.log('🔍 [AuthContext] Fetching user profile for Auth ID:', userId);
      console.log('🌐 [AuthContext] Supabase URL:', process.env.REACT_APP_SUPABASE_URL);
      
      // Try direct ID lookup first
      console.log('📡 [AuthContext] Attempting direct ID lookup...');
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        console.log('✅ [AuthContext] User profile loaded directly!');
        console.log('   ID:', data.id);
        console.log('   Email:', data.email);
        console.log('   Role:', data.role);
        return data as UserProfile;
      }

      // If direct lookup fails, try email fallback
      console.warn('⚠️  [AuthContext] Direct ID lookup failed:', error?.message);
      console.log('   Error code:', error?.code);
      console.log('   Error details:', error?.details);
      console.log('🔄 [AuthContext] Attempting email fallback...');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        console.error('❌ [AuthContext] No auth user or email available');
        console.error('   This means Supabase auth succeeded but getUser() failed');
        return null;
      }

      console.log('📧 [AuthContext] Looking up by email:', user.email);
      const { data: emailData, error: emailError } = await supabase
        .from('users')
        .select('*')
        .eq('email', user.email)
        .single();
      
      if (emailError) {
        console.error('❌ [AuthContext] Email lookup failed:', emailError.message);
        console.error('   Error code:', emailError.code);
        console.error('   Error details:', emailError.details);
        console.error('   This means the user exists in Auth but NOT in the users table!');
        return null;
      }
      
      console.log('✅ [AuthContext] Found user by email!');
      console.log('   🎯 Auth ID:', userId);
      console.log('   💾 DB ID:', emailData.id);
      console.log('   👤 Email:', emailData.email);
      console.log('   🎭 Role:', emailData.role);
      return emailData as UserProfile;
    } catch (err) {
      console.error('❌ [AuthContext] Exception fetching user profile:', err);
      console.error('   Exception type:', err instanceof Error ? err.constructor.name : typeof err);
      console.error('   Exception message:', err instanceof Error ? err.message : String(err));
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    // Get initial session
    const initializeAuth = async () => {
      try {
        console.log('🔐 [AuthContext] Initializing auth...');
        const { data: { session } } = await supabase.auth.getSession();
        
        console.log('📊 [AuthContext] Session status:', session ? 'Active' : 'None');
        if (session) {
          console.log('   User ID:', session.user.id);
          console.log('   Email:', session.user.email);
        }
        
        if (!mounted) {
          console.log('⚠️  [AuthContext] Component unmounted, skipping state update');
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          console.log('📊 [AuthContext] Fetching profile for authenticated user...');
          const profile = await fetchUserProfile(session.user.id);
          if (mounted) {
            if (profile) {
              console.log('✅ [AuthContext] Profile loaded and set');
              setUserProfile(profile);
            } else {
              console.error('❌ [AuthContext] Profile not found - user may need to be created in database');
              setUserProfile(null);
            }
          }
        } else {
          console.log('🚫 [AuthContext] No active session');
        }
      } catch (error) {
        console.error('❌ [AuthContext] Error initializing auth:', error);
      } finally {
        if (mounted) {
          console.log('✅ [AuthContext] Auth initialization complete, setting loading to false');
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 [AuthContext] Auth state changed:', event);
      if (!mounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        console.log('📊 [AuthContext] Auth change - fetching profile...');
        const profile = await fetchUserProfile(session.user.id);
        if (mounted) {
          setUserProfile(profile);
        }
      } else {
        console.log('🚫 [AuthContext] Auth change - no session, clearing profile');
        if (mounted) {
          setUserProfile(null);
        }
      }
    });

    return () => {
      console.log('🧹 [AuthContext] Cleaning up subscription');
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 [AuthContext] Signing in...', email);
      console.log('🌐 [AuthContext] Using Supabase URL:', process.env.REACT_APP_SUPABASE_URL);
      console.log('🔑 [AuthContext] API Key present:', !!process.env.REACT_APP_SUPABASE_KEY);
      
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('❌ [AuthContext] Sign in error:', error.message);
        console.error('   Error status:', error.status);
        console.error('   Error name:', error.name);
        return { error };
      }
      
      console.log('✅ [AuthContext] Auth sign in successful');
      console.log('   User ID:', data.user?.id);
      console.log('   Email:', data.user?.email);
      
      if (data.user) {
        console.log('📊 [AuthContext] Fetching user profile...');
        const profile = await fetchUserProfile(data.user.id);
        if (profile) {
          console.log('✅ [AuthContext] Profile loaded successfully');
          console.log('   Profile role:', profile.role);
          setUserProfile(profile);
        } else {
          console.error('❌ [AuthContext] Failed to load user profile');
          console.error('   This means auth succeeded but profile fetch failed');
          console.error('   User may not exist in public.users table');
          return { error: { message: 'User profile not found in database' } };
        }
      }
      
      return { error: null };
    } catch (err) {
      console.error('❌ [AuthContext] Exception during sign in:', err);
      return { error: err };
    }
  };

  const signUp = async (email: string, password: string, fullName: string, role?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role || 'prospective_tenant', // Pass role to metadata
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUserProfile(null);
  };

  // NEW: Force refresh user profile (useful after role changes)
  const refreshUserProfile = async () => {
    if (!user?.id) {
      console.warn('⚠️ [AuthContext] Cannot refresh profile - no user ID');
      return;
    }
    
    console.log('🔄 [AuthContext] Force refreshing user profile...');
    const profile = await fetchUserProfile(user.id);
    if (profile) {
      console.log('✅ [AuthContext] Profile refreshed successfully');
      console.log('   New role:', profile.role);
      setUserProfile(profile);
    } else {
      console.error('❌ [AuthContext] Failed to refresh profile');
    }
  };

  const value = {
    user,
    userProfile,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    refreshUserProfile,
    supabase,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
