import { create } from 'zustand';
import { User } from '@/lib/types';

interface UserState {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setCurrentUser: (user: User | null) => void;
  setAuthenticated: (authenticated: boolean) => void;
  setLoading: (loading: boolean) => void;
  updateUser: (updates: Partial<User>) => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  currentUser: null,
  isAuthenticated: false,
  isLoading: true,
  
  setCurrentUser: (user) => set({ currentUser: user }),
  
  setAuthenticated: (authenticated) => set({ isAuthenticated: authenticated }),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  updateUser: (updates) => {
    const { currentUser } = get();
    if (currentUser) {
      set({ currentUser: { ...currentUser, ...updates } });
    }
  },
}));