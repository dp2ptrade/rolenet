import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface StatusState {
  userStatuses: { [key: string]: { status: 'online' | 'offline' | 'away'; lastSeen: string | null } };
  isLoading: boolean;
  activeChannels: Map<string, any>;
  setUserStatus: (userId: string, status: 'online' | 'offline' | 'away', lastSeen: string | null) => void;
  subscribeToUserStatuses: (userIds: string[]) => Promise<void>;
  unsubscribeFromUserStatuses: () => void;
  fetchUserStatuses: (userIds: string[]) => Promise<void>;
}

export const useStatusStore = create<StatusState>((set, get) => ({
  userStatuses: {},
  isLoading: false,
  activeChannels: new Map(),
  
  setUserStatus: (userId, status, lastSeen) => set(state => ({
    userStatuses: {
      ...state.userStatuses,
      [userId]: { status, lastSeen }
    }
  })),
  
  fetchUserStatuses: async (userIds) => {
    try {
      set({ isLoading: true });
      if (userIds.length > 0) {
        const { data, error } = await supabase
          .from('users')
          .select('id, online_status, last_seen')
          .in('id', userIds);
        
        if (error) {
          console.error('Error fetching user statuses:', error);
        } else if (data) {
          const statuses = data.reduce((acc: { [key: string]: { status: 'online' | 'offline' | 'away'; lastSeen: string | null } }, user: any) => {
            acc[user.id] = { status: user.online_status, lastSeen: user.last_seen };
            return acc;
          }, {});
          set({ userStatuses: statuses });
        }
      }
    } catch (error) {
      console.error('Error fetching user statuses:', error);
    } finally {
      set({ isLoading: false });
    }
  },
  
  subscribeToUserStatuses: async (userIds) => {
    try {
      set({ isLoading: true });
      
      // Unsubscribe from existing channels first
      get().unsubscribeFromUserStatuses();
      
      // Fetch initial statuses
      await get().fetchUserStatuses(userIds);
      
      // Create a new Map for tracking channels
      const newActiveChannels = new Map();
      
      // Subscribe to status changes for each user
      userIds.forEach(userId => {
        const channelName = `user-status:${userId}`;
        
        const channel = supabase.channel(channelName);
        channel.on('broadcast', { event: 'status-change' }, (payload: any) => {
          if (payload.userId === userId) {
            get().setUserStatus(userId, payload.status, payload.lastSeen);
          }
        }).subscribe();
        
        // Track the channel
        newActiveChannels.set(channelName, channel);
      });
      
      set({ activeChannels: newActiveChannels });
    } catch (error) {
      console.error('Error subscribing to user statuses:', error);
    } finally {
      set({ isLoading: false });
    }
  },
  
  unsubscribeFromUserStatuses: () => {
    const { activeChannels } = get();
    
    // Unsubscribe from all active channels
    activeChannels.forEach((channel, channelName) => {
      try {
        supabase.removeChannel(channel);
      } catch (error) {
        console.error(`Error unsubscribing from channel ${channelName}:`, error);
      }
    });
    
    // Clear the channels map
    set({ activeChannels: new Map() });
    console.log('Unsubscribed from all user status updates');
  },
}));
