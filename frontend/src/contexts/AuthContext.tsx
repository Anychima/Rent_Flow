import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
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
      detectSessionInUrl: true,
      // Reduce token lifetime to force more frequent refreshes (in seconds)
      // Default is 3600s (1 hour), we'll keep it but add better handling
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

  // Fetch user profile from database with loop prevention, retry logic, and timeout
  const fetchUserProfile = async (userId: string, retryCount = 0): Promise<UserProfile | null> => {
    // Prevent concurrent fetches for the same user
    if (isFetchingProfile.current && lastFetchedUserId.current === userId) {
      console.log('[AuthContext] Fetch already in progress for this user');
      return null;
    }
    
    try {
      isFetchingProfile.current = true;
      lastFetchedUserId.current = userId;
      
      console.log(`[AuthContext] Fetching profile for user: ${userId} (attempt ${retryCount + 1})`);
      
      // Add 10-second timeout to prevent indefinite hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.error('[AuthContext] Profile fetch timed out after 10 seconds');
      }, 10000);
      
      try {
        // Try direct ID lookup first - use maybeSingle to avoid throwing on 0 rows
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .abortSignal(controller.signal)
          .maybeSingle();
        
        clearTimeout(timeoutId);

        if (error) {
          console.error('[AuthContext] Profile fetch error:', error.message);
          // Retry up to 2 times with exponential backoff
          if (retryCount < 2) {
            const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s
            console.log(`[AuthContext] Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            isFetchingProfile.current = false;
            return fetchUserProfile(userId, retryCount + 1);
          }
          throw error;
        }

        if (data) {
          console.log('[AuthContext] Profile loaded successfully:', data.email, 'Role:', data.role);
          return data as UserProfile;
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          console.error('[AuthContext] Profile fetch aborted due to timeout');
          // Don't retry on timeout, return null
          return null;
        }
        throw fetchError;
      }

      // If direct lookup returns no data, try email fallback ONCE
      console.log('[AuthContext] No profile found by ID, trying email lookup...');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        console.error('[AuthContext] No auth user or email available');
        return null;
      }

      const { data: emailData, error: emailError } = await supabase
        .from('users')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();
      
      if (emailError) {
        console.error('[AuthContext] Email lookup error:', emailError.message);
        return null;
      }
      
      if (!emailData) {
        console.error('[AuthContext] User not found in database by email:', user.email);
        return null;
      }
      
      console.log('[AuthContext] Profile found by email:', emailData.email, 'Role:', emailData.role, 'Wallet:', emailData.wallet_address || 'NULL');
      
      // Sync wallet from user_wallets table if wallet_address is null
      if (!emailData.wallet_address) {
        console.log('🔄 [AuthContext] User has no wallet_address, checking user_wallets table...');
        try {
          // Add 5 second timeout to prevent login from hanging
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          const walletResponse = await fetch(
            `${process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001'}/api/users/${emailData.id}/primary-wallet`,
            { signal: controller.signal }
          );
          clearTimeout(timeoutId);
          console.log('🔄 [AuthContext] Wallet sync response status:', walletResponse.status);
          
          if (walletResponse.ok) {
            const walletData = await walletResponse.json();
            console.log('🔄 [AuthContext] Wallet sync response:', walletData);
            
            if (walletData.success && walletData.data) {
              console.log('✅ [AuthContext] Found primary wallet, syncing to profile:', walletData.data.wallet_address);
              emailData.wallet_address = walletData.data.wallet_address;
              emailData.circle_wallet_id = walletData.data.circle_wallet_id;
            } else {
              console.log('⚠️ [AuthContext] No primary wallet found in user_wallets table');
            }
          } else {
            console.error('❌ [AuthContext] Wallet sync request failed:', walletResponse.status, await walletResponse.text());
          }
        } catch (err: any) {
          if (err.name === 'AbortError') {
            console.error('❌ [AuthContext] Wallet sync timed out after 5 seconds - continuing login anyway');
          } else {
            console.error('❌ [AuthContext] Error syncing wallet:', err);
          }
        }
      } else {
        console.log('✅ [AuthContext] User already has wallet_address:', emailData.wallet_address);
      }
      
      return emailData as UserProfile;
    } catch (err) {
      console.error('[AuthContext] Error fetching profile:', err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      isFetchingProfile.current = false;
    }
  };

  useEffect(() => {
    let mounted = true;
    let refreshInterval: NodeJS.Timeout | null = null;
    let initializing = false;

    // Clear any stuck flags on mount
    sessionStorage.removeItem('signing_out');
    sessionStorage.removeItem('signing_out_timestamp');
    sessionStorage.removeItem('signing_in');
    sessionStorage.removeItem('signing_in_timestamp');

    // Get initial session
    const initializeAuth = async () => {
      // Prevent duplicate initialization using ref (survives React strict mode double mount)
      if (hasInitialized.current) {
        setLoading(false);
        return;
      }
      
      // Prevent duplicate initialization
      if (initializing) {
        return;
      }
      
      initializing = true;
      hasInitialized.current = true; // Mark as initialized
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          const profile = await fetchUserProfile(session.user.id);
          if (mounted) {
            setUserProfile(profile);
          }
        }
      } catch (error) {
        console.error('[AuthContext] Initialization error:', error);
      } finally {
        initializing = false;
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Set up periodic session refresh and validation (every 2 minutes)
    refreshInterval = setInterval(async () => {
      if (!mounted) return;
      
      try {
        console.log('[AuthContext] Checking session validity...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[AuthContext] Session check error:', error);
          // If session is invalid, clear everything and redirect to home
          if (mounted) {
            console.warn('[AuthContext] Invalid session detected, signing out...');
            setUser(null);
            setUserProfile(null);
            setSession(null);
            // Don't call signOut() to avoid recursion
            await supabase.auth.signOut({ scope: 'local' });
          }
          return;
        }
        
        if (!session) {
          console.warn('[AuthContext] No active session found');
          if (mounted && user) {
            // Session expired, clear state
            setUser(null);
            setUserProfile(null);
            setSession(null);
          }
          return;
        }
        
        // Check if session is about to expire (within 5 minutes)
        const expiresAt = session.expires_at;
        if (expiresAt) {
          const expiresIn = expiresAt - Math.floor(Date.now() / 1000);
          
          if (expiresIn < 300) { // Less than 5 minutes
            console.log('[AuthContext] Session expiring soon, refreshing...');
            const { data, error: refreshError } = await supabase.auth.refreshSession();
            
            if (refreshError) {
              console.error('[AuthContext] Session refresh failed:', refreshError);
              // Sign out on refresh failure
              if (mounted) {
                setUser(null);
                setUserProfile(null);
                setSession(null);
                await supabase.auth.signOut({ scope: 'local' });
              }
            } else {
              console.log('[AuthContext] Session refreshed successfully');
              if (mounted && data.session) {
                setSession(data.session);
              }
            }
          }
        }
      } catch (error) {
        console.error('[AuthContext] Session refresh error:', error);
      }
    }, 2 * 60 * 1000); // Every 2 minutes

    // Listen for auth changes with better error handling
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {  
      if (!mounted) return;
      
      console.log(`[AuthContext] Auth state changed: ${event}`);
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        try {
          const profile = await fetchUserProfile(session.user.id);
          if (mounted) {
            setUserProfile(profile);
          }
        } catch (profileError) {
          console.error('[AuthContext] Profile fetch failed:', profileError);
          if (mounted) {
            setUserProfile(null);
          }
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      } else {
        if (mounted) {
          setUserProfile(null);
          setLoading(false);
        }
      }
      
      // Handle specific events
      if (event === 'SIGNED_OUT') {
        console.log('[AuthContext] User signed out');
        if (mounted) {
          setUser(null);
          setUserProfile(null);
          setSession(null);
          setLoading(false);
        }
      }
      
      if (event === 'TOKEN_REFRESHED') {
        console.log('[AuthContext] Token refreshed successfully');
      }
      
      if (event === 'USER_UPDATED') {
        console.log('[AuthContext] User updated');
        // Refresh profile when user is updated
        if (session?.user && mounted) {
          const profile = await fetchUserProfile(session.user.id);
          if (mounted) {
            setUserProfile(profile);
          }
        }
      }
    });

    return () => {
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
    
    // If flag exists and was set less than 30 seconds ago, skip
    if (signingInFlag === 'true' && signingInTimestamp) {
      const timeSinceFlag = Date.now() - parseInt(signingInTimestamp, 10);
      if (timeSinceFlag < 30000) {
        console.warn('[AuthContext] Sign in already in progress');
        return { error: new Error('Sign in already in progress') };
      } else {
        sessionStorage.removeItem('signing_in');
        sessionStorage.removeItem('signing_in_timestamp');
      }
    }
    
    // Set flags to prevent concurrent calls
    sessionStorage.setItem('signing_in', 'true');
    sessionStorage.setItem('signing_in_timestamp', Date.now().toString());
    
    try {
      console.log('[AuthContext] Starting sign in for:', email);
      
      // Direct call without timeout - let AuthWall handle the timeout
      const { error, data } = await supabase.auth.signInWithPassword({ email, password });
      
      console.log('[AuthContext] Sign in response:', error ? `Error: ${error.message}` : 'Success');
      
      // Clear flags
      sessionStorage.removeItem('signing_in');
      sessionStorage.removeItem('signing_in_timestamp');
      
      if (error) {
        console.error('[AuthContext] Sign in error:', error.message || error);
        return { error };
      }
      
      console.log('[AuthContext] Sign in successful, session:', data.session ? 'exists' : 'null');
      return { error: null };
    } catch (err: any) {
      console.error('[AuthContext] Sign in exception:', err.message || err);
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
    // Check if already signing out
    const signingOutFlag = sessionStorage.getItem('signing_out');
    const signingOutTimestamp = sessionStorage.getItem('signing_out_timestamp');
    
    // If flag exists and was set less than 5 seconds ago, skip
    if (signingOutFlag === 'true' && signingOutTimestamp) {
      const timeSinceFlag = Date.now() - parseInt(signingOutTimestamp, 10);
      if (timeSinceFlag < 5000) {
        return;
      } else {
        sessionStorage.removeItem('signing_out');
        sessionStorage.removeItem('signing_out_timestamp');
      }
    }
    
    // Set flags to prevent concurrent calls
    sessionStorage.setItem('signing_out', 'true');
    sessionStorage.setItem('signing_out_timestamp', Date.now().toString());
    
    try {
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('[AuthContext] Sign out error:', error);
      }
      
      // Clear all React state
      setUser(null);
      setUserProfile(null);
      setSession(null);
      
      // Clear cached data in localStorage
      try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('supabase') || key.includes('auth'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
      } catch (err) {
        console.warn('[AuthContext] Could not clear localStorage:', err);
      }
      
      // Clear sessionStorage auth items
      try {
        const keysToRemove = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && key.includes('supabase')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => sessionStorage.removeItem(key));
      } catch (err) {
        console.warn('[AuthContext] Could not clear sessionStorage:', err);
      }
      
    } catch (error) {
      console.error('[AuthContext] Sign out exception:', error);
      
      // Force clear state even if API call fails
      setUser(null);
      setUserProfile(null);
      setSession(null);
    } finally {
      // Clear the signing out flags BEFORE redirect
      sessionStorage.removeItem('signing_out');
      sessionStorage.removeItem('signing_out_timestamp');
      
      // Small delay to ensure all cleanup completes
      setTimeout(() => {
        window.location.href = '/';
      }, 100);
    }
  };

  // Force refresh user profile (useful after role changes)
  const refreshUserProfile = async () => {
    if (!user?.id) return;
    
    const profile = await fetchUserProfile(user.id);
    if (profile) {
      setUserProfile(profile);
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
