import { create } from 'zustand';
import { User } from '../lib/types';
import { AuthService, UserService } from '../lib/supabaseService';
import { Session } from '@supabase/supabase-js';

interface UserStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  session: Session | null;
  setUser: (user: User | null) => void;
  setCurrentUser: (user: User | null) => void;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  setAuthenticated: (isAuthenticated: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setSession: (session: Session | null) => void;
  clearUser: () => void;
  initializeAuth: () => Promise<void>;
  signOut: () => Promise<void>;
  loadUserProfile: (userId: string) => Promise<void>;
}

export const useUserStore = create<UserStore>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  session: null,
  
  setUser: (user) => set({ user }),
  setCurrentUser: (user) => set({ user }),
  setIsAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setSession: (session) => set({ session }),
  
  clearUser: () => set({ 
    user: null, 
    isAuthenticated: false, 
    error: null, 
    session: null 
  }),
  
  initializeAuth: async () => {
    try {
      console.log('🔐 UserStore: Starting auth initialization');
      set({ isLoading: true, error: null });
      
      // Get current session
      console.log('🔐 UserStore: Getting current session');
      const { session, error: sessionError } = await AuthService.getCurrentSession();
      console.log('🔐 UserStore: Session result:', { hasSession: !!session, error: sessionError });
      
      if (sessionError) {
        console.error('🔐 UserStore: Session error:', sessionError);
        set({ isAuthenticated: false, session: null, isLoading: false });
        return;
      }
      
      if (session?.user) {
        console.log('🔐 UserStore: Session found, setting authenticated and loading profile');
        set({ session, isAuthenticated: true });
        
        // Load user profile
        console.log('🔐 UserStore: Loading user profile for:', session.user.id);
        await get().loadUserProfile(session.user.id);
      } else {
        console.log('🔐 UserStore: No session found, setting unauthenticated');
        set({ isAuthenticated: false, session: null });
      }
      
      // Set up auth state listener
      AuthService.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        
        if (session?.user) {
          set({ session, isAuthenticated: true });
          await get().loadUserProfile(session.user.id);
        } else {
          get().clearUser();
        }
      });
      
    } catch (error) {
      console.error('🔐 UserStore: Auth initialization error:', error);
      set({ error: 'Failed to initialize authentication' });
    } finally {
      console.log('🔐 UserStore: Auth initialization completed, setting isLoading to false');
      set({ isLoading: false });
    }
  },
  
  loadUserProfile: async (userId: string) => {
    try {
      const { data: userProfile, error } = await UserService.getUserProfile(userId);
      
      if (error) {
        console.error('Error loading user profile:', error);
        // If profile doesn't exist, user needs to complete onboarding
        if (error.code === 'PGRST116') {
          set({ user: null });
        } else {
          set({ error: 'Failed to load user profile' });
        }
        return;
      }
      
      if (userProfile) {
        set({ user: userProfile, error: null });
        
        // Update online status
        await UserService.updateOnlineStatus(userId, 'online');
      }
    } catch (error) {
      console.error('Load user profile error:', error);
      set({ error: 'Failed to load user profile' });
    }
  },
  
  signOut: async () => {
    try {
      set({ isLoading: true });
      
      // Update offline status before signing out
      const { session } = get();
      if (session?.user) {
        await UserService.updateOnlineStatus(session.user.id, 'offline');
      }
      
      const { error } = await AuthService.signOut();
      
      if (error) {
        console.error('Sign out error:', error);
        set({ error: 'Failed to sign out' });
        return;
      }
      
      get().clearUser();
    } catch (error) {
      console.error('Sign out error:', error);
      set({ error: 'Failed to sign out' });
    } finally {
      set({ isLoading: false });
    }
  },
}));