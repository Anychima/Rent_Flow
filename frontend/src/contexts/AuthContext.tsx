import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { createClient, User, Session } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL!,
  process.env.REACT_APP_SUPABASE_KEY!,
  {
    auth: {
      persistSession: true,
      storageKey: 'rentflow-auth',
      storage: window.localStorage,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'manager' | 'tenant' | 'prospective_tenant' | 'admin' | 'ai_agent';
  user_type: string;
  is_active: boolean;
  wallet_address?: string;
  circle_wallet_id?: string; // Circle wallet ID from signup
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: any }>;
  signUp: (email: string, password: string, fullName: string, role?: string, walletAddress?: string) => Promise<{ error?: any }>;
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
  const hasInitialized = useRef(false);
  
  // Add refs to prevent infinite loops
  const lastFetchedUserId = useRef<string | null>(null);
  const isFetchingProfile = useRef<boolean>(false);

  // Fetch user profile from database with loop prevention
  const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
    // Prevent concurrent fetches for the same user
    if (isFetchingProfile.current && lastFetchedUserId.current === userId) {
      console.log('⏸️ [AuthContext] Already fetching profile for this user, skipping...');
      return null;
    }
    
    try {
      isFetchingProfile.current = true;
      lastFetchedUserId.current = userId;
      
      console.log('🔍 [AuthContext] Fetching user profile for Auth ID:', userId);
      console.log('🌐 [AuthContext] Supabase URL:', process.env.REACT_APP_SUPABASE_URL);
      
      // Try direct ID lookup first - use maybeSingle to avoid throwing on 0 rows
      console.log('📡 [AuthContext] Attempting direct ID lookup...');
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (data) {
        console.log('✅ [AuthContext] User profile loaded directly!');
        console.log('   ID:', data.id);
        console.log('   Email:', data.email);
        console.log('   Role:', data.role);
        return data as UserProfile;
      }

      // If direct lookup returns no data, try email fallback ONCE
      console.warn('⚠️ [AuthContext] Direct ID lookup returned no data');
      if (error) {
        console.warn('   Error:', error.message, '(Code:', error.code + ')');
      }
      console.log('🔄 [AuthContext] Attempting email fallback...');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        console.error('❌ [AuthContext] No auth user or email available');
        return null;
      }

      console.log('📧 [AuthContext] Looking up by email:', user.email);
      const { data: emailData, error: emailError } = await supabase
        .from('users')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();
      
      if (emailError) {
        console.error('❌ [AuthContext] Email lookup failed:', emailError.message);
        console.error('   This means the user exists in Auth but NOT in the users table!');
        return null;
      }
      
      if (!emailData) {
        console.error('❌ [AuthContext] No user found by email in database');
        console.error('   User exists in Auth but not in public.users table');
        console.error('   The auth trigger may have failed during signup');
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
    } finally {
      isFetchingProfile.current = false;
    }
  };

  useEffect(() => {
    let mounted = true;
    let refreshInterval: NodeJS.Timeout | null = null;
    let initializing = false;

    // Clear any stuck sign-out flag on mount
    sessionStorage.removeItem('signing_out');
    sessionStorage.removeItem('signing_out_timestamp');
    console.log('🧹 [AuthContext] Cleared any stuck sign-out flag');
    
    // Clear any stuck sign-in flag on mount
    sessionStorage.removeItem('signing_in');
    sessionStorage.removeItem('signing_in_timestamp');
    console.log('🧹 [AuthContext] Cleared any stuck sign-in flag');

    // Get initial session
    const initializeAuth = async () => {
      // Prevent duplicate initialization using ref (survives React strict mode double mount)
      if (hasInitialized.current) {
        console.log('✅ [AuthContext] Already initialized (ref check), setting loading to false');
        setLoading(false);
        return;
      }
      
      // Prevent duplicate initialization
      if (initializing) {
        console.log('⚠️  [AuthContext] Already initializing, skipping...');
        return;
      }
      
      initializing = true;
      hasInitialized.current = true; // Mark as initialized
      
      try {
        console.log('🔐 [AuthContext] Initializing auth...');
        const { data: { session } } = await supabase.auth.getSession();
        
        console.log('📊 [AuthContext] Session status:', session ? 'Active' : 'None');
        if (session) {
          console.log('   User ID:', session.user.id);
          console.log('   Email:', session.user.email);
          console.log('   Expires:', new Date(session.expires_at! * 1000).toLocaleString());
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
        initializing = false;
        if (mounted) {
          console.log('✅ [AuthContext] Auth initialization complete, setting loading to false');
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Set up periodic session refresh (every 5 minutes)
    refreshInterval = setInterval(async () => {
      if (!mounted) return;
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log('♻️  [AuthContext] Periodic session check - session active');
          // Session is automatically refreshed by Supabase if needed
        } else {
          console.log('⚠️  [AuthContext] Periodic session check - no session');
        }
      } catch (error) {
        console.error('❌ [AuthContext] Error during periodic session check:', error);
      }
    }, 5 * 60 * 1000); // Every 5 minutes

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {  
      console.log('🔄 [AuthContext] Auth state changed:', event);
      console.log('   Session:', session ? 'Active' : 'Expired/None');
      console.log('   Event:', event);
      
      if (!mounted) {
        console.log('⚠️  [AuthContext] Component unmounted, ignoring auth change');
        return;
      }
      
      // IMPORTANT: Don't set loading to false yet - wait for profile
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        console.log('📊 [AuthContext] Auth change - fetching profile...');
        
        try {
          const profile = await fetchUserProfile(session.user.id);
          if (mounted) {
            if (profile) {
              console.log('✅ [AuthContext] Profile loaded after auth change');
              setUserProfile(profile);
            } else {
              console.error('❌ [AuthContext] Profile not found after auth change');
              setUserProfile(null);
            }
          }
        } catch (profileError) {
          console.error('❌ [AuthContext] Error fetching profile:', profileError);
          if (mounted) {
            setUserProfile(null);
          }
        } finally {
          // CRITICAL: Set loading to false ONLY after profile fetch completes
          if (mounted) {
            setLoading(false);
            console.log('✅ [AuthContext] Loading set to false after profile handling');
          }
        }
      } else {
        console.log('🚫 [AuthContext] Auth change - no session, clearing profile');
        if (mounted) {
          setUserProfile(null);
          setLoading(false);
          console.log('✅ [AuthContext] Loading set to false (no session)');
        }
      }
      
      // Handle specific events
      if (event === 'SIGNED_OUT') {
        console.log('🚪 [AuthContext] User signed out - clearing all state');
        if (mounted) {
          setUser(null);
          setUserProfile(null);
          setSession(null);
          setLoading(false);
        }
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('♻️  [AuthContext] Token refreshed successfully');
      } else if (event === 'USER_UPDATED') {
        console.log('🔄 [AuthContext] User updated - refreshing profile');
      }
    });

    return () => {
      console.log('🧹 [AuthContext] Cleaning up subscription and refresh interval');
      mounted = false;
      subscription.unsubscribe();
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    // Check if already signing in
    const signingInFlag = sessionStorage.getItem('signing_in');
    const signingInTimestamp = sessionStorage.getItem('signing_in_timestamp');
    
    // If flag exists and was set less than 30 seconds ago, skip (increased from 10s)
    if (signingInFlag === 'true' && signingInTimestamp) {
      const timeSinceFlag = Date.now() - parseInt(signingInTimestamp, 10);
      if (timeSinceFlag < 30000) {
        console.log('⚠️ [AuthContext] Sign in already in progress, skipping...');
        return { error: new Error('Sign in already in progress') };
      } else {
        // Clear old stuck flag
        console.log('🧹 [AuthContext] Clearing old sign-in flag');
        sessionStorage.removeItem('signing_in');
        sessionStorage.removeItem('signing_in_timestamp');
      }
    }
    
    // Set flags to prevent concurrent calls
    sessionStorage.setItem('signing_in', 'true');
    sessionStorage.setItem('signing_in_timestamp', Date.now().toString());
    console.log('🔐 [AuthContext] Starting sign in process...');
    
    try {
      console.log('🔐 [AuthContext] Signing in...', email);
      console.log('🌐 [AuthContext] Using Supabase URL:', process.env.REACT_APP_SUPABASE_URL);
      console.log('🔑 [AuthContext] API Key present:', !!process.env.REACT_APP_SUPABASE_KEY);
      
      // Increase timeout to 30 seconds for slower networks
      const signInPromise = supabase.auth.signInWithPassword({ email, password });
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Sign in timeout after 30 seconds - please check your connection')), 30000)
      );
      
      console.log('📡 [AuthContext] Calling Supabase signInWithPassword...');
      const { error, data } = await Promise.race([
        signInPromise,
        timeoutPromise
      ]) as any;
      
      if (error) {
        console.error('❌ [AuthContext] Sign in error:', error.message);
        console.error('   Error status:', error.status);
        console.error('   Error name:', error.name);
        
        // Clear flags on error
        sessionStorage.removeItem('signing_in');
        sessionStorage.removeItem('signing_in_timestamp');
        
        return { error };
      }
      
      console.log('✅ [AuthContext] Auth sign in successful');
      console.log('   User ID:', data.user?.id);
      console.log('   Email:', data.user?.email);
      console.log('📊 [AuthContext] Profile will be loaded by onAuthStateChange listener');
      
      // Don't fetch profile here - let onAuthStateChange handle it
      // This prevents duplicate fetches and race conditions
      
      // Clear signing in flag after successful sign in
      sessionStorage.removeItem('signing_in');
      sessionStorage.removeItem('signing_in_timestamp');
      
      return { error: null };
    } catch (err: any) {
      console.error('❌ [AuthContext] Exception during sign in:', err);
      
      // Clear flag on error
      sessionStorage.removeItem('signing_in');
      sessionStorage.removeItem('signing_in_timestamp');
      
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
          // Arc wallet will be created automatically by backend after user is created
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    // Check if already signing out using a more reliable flag
    const signingOutFlag = sessionStorage.getItem('signing_out');
    const signingOutTimestamp = sessionStorage.getItem('signing_out_timestamp');
    
    // If flag exists and was set less than 5 seconds ago, skip
    if (signingOutFlag === 'true' && signingOutTimestamp) {
      const timeSinceFlag = Date.now() - parseInt(signingOutTimestamp, 10);
      if (timeSinceFlag < 5000) {
        console.log('⚠️ [AuthContext] Sign out already in progress, skipping...');
        return;
      } else {
        // Clear old stuck flag
        console.log('🧹 [AuthContext] Clearing old sign-out flag');
        sessionStorage.removeItem('signing_out');
        sessionStorage.removeItem('signing_out_timestamp');
      }
    }
    
    // Set flags to prevent concurrent calls
    sessionStorage.setItem('signing_out', 'true');
    sessionStorage.setItem('signing_out_timestamp', Date.now().toString());
    console.log('🚪 [AuthContext] Starting sign out process...');
    
    try {
      // Sign out from Supabase
      console.log('📡 [AuthContext] Calling Supabase signOut...');
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('❌ [AuthContext] Supabase signOut error:', error);
      } else {
        console.log('✅ [AuthContext] Supabase signOut successful');
      }
      
      // Clear all React state
      console.log('🧹 [AuthContext] Clearing React state...');
      setUser(null);
      setUserProfile(null);
      setSession(null);
      
      // Clear cached data in localStorage
      try {
        console.log('🧹 [AuthContext] Clearing localStorage...');
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('supabase') || key.includes('auth'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        console.log(`✅ [AuthContext] Cleared ${keysToRemove.length} auth-related items from localStorage`);
      } catch (err) {
        console.warn('⚠️ [AuthContext] Could not clear localStorage:', err);
      }
      
      // Clear sessionStorage auth items
      try {
        console.log('🧹 [AuthContext] Clearing sessionStorage...');
        const keysToRemove = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && key.includes('supabase')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => sessionStorage.removeItem(key));
        console.log(`✅ [AuthContext] Cleared ${keysToRemove.length} auth-related items from sessionStorage`);
      } catch (err) {
        console.warn('⚠️ [AuthContext] Could not clear sessionStorage:', err);
      }
      
      console.log('✅ [AuthContext] Sign out complete, preparing redirect...');
      
    } catch (error) {
      console.error('❌ [AuthContext] Exception during sign out:', error);
      
      // Force clear state even if API call fails
      setUser(null);
      setUserProfile(null);
      setSession(null);
    } finally {
      // Clear the signing out flags BEFORE redirect
      console.log('🧹 [AuthContext] Clearing sign-out flags...');
      sessionStorage.removeItem('signing_out');
      sessionStorage.removeItem('signing_out_timestamp');
      
      // Small delay to ensure all cleanup completes
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Force redirect to home page
      console.log('🔄 [AuthContext] Redirecting to home page...');
      window.location.href = '/';
    }
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
