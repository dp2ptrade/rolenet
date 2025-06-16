import { create } from 'zustand';
import { Ping } from '@/lib/types';
import { pingService, realtimeService } from '@/lib/supabaseService';

interface PingState {
  receivedPings: Ping[];
  sentPings: Ping[];
  respondedPings: Ping[];
  isLoading: boolean;
  subscription: any;
  currentSubscriptionUserId?: string; // Track the current user ID we're subscribed to
  
  // Basic setters
  setReceivedPings: (pings: Ping[]) => void;
  setSentPings: (pings: Ping[]) => void;
  setRespondedPings: (pings: Ping[]) => void;
  addReceivedPing: (ping: Ping) => void;
  addSentPing: (ping: Ping) => void;
  updatePing: (pingId: string, updates: Partial<Ping>) => void;
  setLoading: (loading: boolean) => void;
  
  // Ping actions
  sendPing: (senderId: string, receiverId: string, message: string) => Promise<void>;
  loadReceivedPings: (userId: string) => Promise<void>;
  loadSentPings: (userId: string) => Promise<void>;
  respondToPing: (pingId: string, status: 'responded' | 'ignored') => Promise<void>;
  subscribeToPings: (userId: string) => void;
  unsubscribeFromPings: () => void;
  getPingStats: () => {
    totalReceived: number;
    totalSent: number;
    totalResponded: number;
    pendingReceived: number;
    pendingSent: number;
  };
  clearAllPings: () => void;
}

export const usePingStore = create<PingState>((set, get) => ({
  receivedPings: [],
  sentPings: [],
  respondedPings: [],
  isLoading: false,
  subscription: null,
  currentSubscriptionUserId: undefined,
  
  // Basic setters
  setReceivedPings: (pings) => set({ receivedPings: pings }),
  setSentPings: (pings) => set({ sentPings: pings }),
  setRespondedPings: (pings) => set({ respondedPings: pings }),
  setLoading: (loading) => set({ isLoading: loading }),
  
  addReceivedPing: (ping) => {
    const { receivedPings } = get();
    set({ receivedPings: [ping, ...receivedPings] });
  },
  
  addSentPing: (ping) => {
    const { sentPings } = get();
    set({ sentPings: [ping, ...sentPings] });
  },
  
  updatePing: (pingId, updates) => {
    const state = get();
    
    const updatePingsArray = (pings: Ping[]) =>
      pings.map(ping => ping.id === pingId ? { ...ping, ...updates } : ping);
    
    set({
      receivedPings: updatePingsArray(state.receivedPings),
      sentPings: updatePingsArray(state.sentPings),
      respondedPings: updatePingsArray(state.respondedPings),
    });
  },
  
  // Ping actions
  sendPing: async (senderId, receiverId, message) => {
    try {
      set({ isLoading: true });
      const { data: newPing, error } = await pingService.sendPing(senderId, receiverId, message);
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (newPing) {
        const { sentPings } = get();
        set({ sentPings: [newPing, ...sentPings] });
      }
    } catch (error) {
      console.error('Send ping error:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  loadReceivedPings: async (userId) => {
    try {
      set({ isLoading: true });
      const { data: pings, error } = await pingService.getUserPings(userId, 'received');
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (pings) {
        // Separate pings by status
        const pending = pings.filter(ping => ping.status === 'pending');
        const responded = pings.filter(ping => ping.status === 'responded');
        
        set({ 
          receivedPings: pending,
          respondedPings: responded 
        });
      }
    } catch (error) {
      console.error('Load received pings error:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  
  loadSentPings: async (userId) => {
    try {
      set({ isLoading: true });
      const { data: pings, error } = await pingService.getUserPings(userId, 'sent');
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (pings) {
        set({ sentPings: pings });
      }
    } catch (error) {
      console.error('Load sent pings error:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  
  respondToPing: async (pingId, status) => {
    try {
      const { data: updatedPing, error } = await pingService.updatePingStatus(pingId, status);
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (updatedPing) {
        const state = get();
        const { receivedPings, respondedPings } = state;
        
        // Remove from received pings
        const newReceivedPings = receivedPings.filter(ping => ping.id !== pingId);
        
        // Add to responded pings if responded
        const newRespondedPings = status === 'responded' 
          ? [updatedPing, ...respondedPings]
          : respondedPings;
        
        set({ 
          receivedPings: newReceivedPings,
          respondedPings: newRespondedPings 
        });
      }
    } catch (error) {
      console.error('Respond to ping error:', error);
      throw error;
    }
  },
  
  subscribeToPings: (userId) => {
    const { subscription } = get();
    
    // Store the current subscription user ID to prevent duplicate subscriptions
    const currentSubscriptionUserId = get().currentSubscriptionUserId;
    
    // Guard: If we're already subscribed to this user ID, don't resubscribe
    if (subscription && currentSubscriptionUserId === userId) {
      console.log('Already subscribed to pings for user:', userId);
      return;
    }
    
    // Unsubscribe from existing subscription
    if (subscription) {
      console.log('Unsubscribing from previous ping subscription');
      subscription.unsubscribe();
    }
    
    console.log('Subscribing to pings for user:', userId);
    
    // Subscribe to new pings
    const newSubscription = realtimeService.subscribeToPings(userId, (payload) => {
      console.log('Real-time ping received:', payload);
      const newPing = payload.new;
      const { addReceivedPing } = get();
      addReceivedPing(newPing);
      
      // Show notification badge or alert
      // This could trigger a local notification
    });
    
    set({ 
      subscription: newSubscription,
      currentSubscriptionUserId: userId 
    });
  },
  
  unsubscribeFromPings: () => {
    const { subscription } = get();
    if (subscription) {
      console.log('Unsubscribing from ping subscription');
      subscription.unsubscribe();
      set({ 
        subscription: null,
        currentSubscriptionUserId: undefined 
      });
    }
  },

  // Get ping statistics
  getPingStats: () => {
    const { receivedPings, sentPings, respondedPings } = get();
    return {
      totalReceived: receivedPings.length,
      totalSent: sentPings.length,
      totalResponded: respondedPings.length,
      pendingReceived: receivedPings.filter(p => p.status === 'pending').length,
      pendingSent: sentPings.filter(p => p.status === 'pending').length,
    };
  },

  // Clear all pings (useful for logout)
  clearAllPings: () => {
    // Unsubscribe from any active subscription first
    const { subscription } = get();
    if (subscription) {
      console.log('Unsubscribing from ping subscription during clearAllPings');
      subscription.unsubscribe();
    }
    
    set({
      receivedPings: [],
      sentPings: [],
      respondedPings: [],
      isLoading: false,
      subscription: null,
      currentSubscriptionUserId: undefined,
    });
  },
}));