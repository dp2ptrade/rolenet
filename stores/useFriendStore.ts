import { create } from 'zustand';
import { Friend, User } from '../lib/types';
import { friendService } from '../lib/supabaseService';

interface FriendState {
  friends: User[];
  friendRequests: Friend[];
  sentRequests: Friend[];
  isLoading: boolean;
  friendStatuses: { [key: string]: { status: 'online' | 'offline' | 'away'; lastSeen: string | null } };
  activeChannels: Map<string, any>;
  
  // Basic setters
  setFriends: (friends: User[]) => void;
  setFriendRequests: (requests: Friend[]) => void;
  setSentRequests: (requests: Friend[]) => void;
  addFriend: (friend: User) => void;
  removeFriend: (friendId: string) => void;
  addFriendRequest: (request: Friend) => void;
  updateFriendRequest: (requestId: string, updates: Partial<Friend>) => void;
  setLoading: (loading: boolean) => void;
  setFriendStatus: (userId: string, status: 'online' | 'offline' | 'away', lastSeen: string | null) => void;
  
  // Friend actions
  sendFriendRequest: (userA: string, userB: string) => Promise<void>;
  loadFriends: (userId: string) => Promise<void>;
  loadFriendRequests: (userId: string) => Promise<void>;
  acceptFriendRequest: (requestId: string) => Promise<void>;
  declineFriendRequest: (requestId: string) => Promise<void>;
  unfriend: (userId: string, friendId: string) => Promise<void>;
  subscribeToFriendStatuses: (userId: string) => Promise<void>;
  unsubscribeFromFriendStatuses: () => void;
}

export const useFriendStore = create<FriendState>((set, get) => ({
  friends: [],
  friendRequests: [],
  sentRequests: [],
  isLoading: false,
  friendStatuses: {},
  activeChannels: new Map(),
  
  // Basic setters
  setFriends: (friends) => set({ friends }),
  setFriendRequests: (requests) => set({ friendRequests: requests }),
  setSentRequests: (requests) => set({ sentRequests: requests }),
  setLoading: (loading) => set({ isLoading: loading }),
  setFriendStatus: (userId, status, lastSeen) => set(state => ({
    friendStatuses: {
      ...state.friendStatuses,
      [userId]: { status, lastSeen }
    }
  })),
  
  addFriend: (friend) => {
    const { friends } = get();
    // Check if friend already exists to prevent duplicates
    if (!friends.some(f => f.id === friend.id)) {
      set({ friends: [...friends, friend] });
    }
  },
  
  removeFriend: (friendId) => {
    const { friends } = get();
    set({ friends: friends.filter(friend => friend.id !== friendId) });
  },
  
  addFriendRequest: (request) => {
    const { friendRequests } = get();
    set({ friendRequests: [request, ...friendRequests] });
  },
  
  updateFriendRequest: (requestId, updates) => {
    const state = get();
    
    const updateRequestsArray = (requests: Friend[]) =>
      requests.map(req => req.id === requestId ? { ...req, ...updates } : req);
    
    set({
      friendRequests: updateRequestsArray(state.friendRequests),
      sentRequests: updateRequestsArray(state.sentRequests),
    });
  },
  
  // Friend actions
  sendFriendRequest: async (userA, userB) => {
    try {
      if (userA === userB) {
        throw new Error('Cannot send friend request to yourself');
      }
      set({ isLoading: true });
      const { data: newRequest, error } = await friendService.sendFriendRequest(userA, userB);
      if (error) throw error;
      if (!newRequest) throw new Error('No request data returned');
      
      const { sentRequests } = get();
      set({ sentRequests: [newRequest, ...sentRequests] });
    } catch (error) {
      console.error('Send friend request error:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  
  loadFriends: async (userId) => {
    try {
      set({ isLoading: true });
      const { data: friendsData, error } = await friendService.getUserFriends(userId);
      if (error) throw error;
      
      // Extract actual user data from the friend relationships
      const friends = friendsData ? friendsData.map(friendship => {
        // Return the user that is not the current user
        return friendship.user_a === userId 
          ? friendship.user_b_profile 
          : friendship.user_a_profile;
      }).filter(friend => friend !== undefined && friend !== null) : [];
      
      // Ensure uniqueness by filtering out duplicates based on friend ID
      const uniqueFriends = friends.filter((friend, index, self) =>
        index === self.findIndex(f => f.id === friend.id)
      );
      
      set({ friends: uniqueFriends });
      
      // Subscribe to status updates for friends
      if (uniqueFriends.length > 0) {
        get().subscribeToFriendStatuses(userId);
      }
    } catch (error) {
      console.error('Load friends error:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  
  loadFriendRequests: async (userId) => {
    try {
      set({ isLoading: true });
      const { data: requests, error } = await friendService.getFriendRequests(userId);
      if (error) throw error;
      set({ friendRequests: requests || [] });
    } catch (error) {
      console.error('Load friend requests error:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  
  acceptFriendRequest: async (requestId) => {
    try {
      const { data: updatedRequest, error } = await friendService.respondToFriendRequest(requestId, 'accepted');
      if (error) throw error;
      
      const state = get();
      const { friendRequests } = state;
      
      // Remove from friend requests
      const newFriendRequests = friendRequests.filter(req => req.id !== requestId);
      
      // Add the requester to friends list
      const acceptedRequest = friendRequests.find(req => req.id === requestId);
      if (acceptedRequest) {
        const { friends } = state;
        // If requester data is not attached, we rely on loadFriends to update the list
        set({ friendRequests: newFriendRequests });
      } else {
        set({ friendRequests: newFriendRequests });
      }
    } catch (error) {
      console.error('Accept friend request error:', error);
      throw error;
    }
  },
  
  declineFriendRequest: async (requestId) => {
    try {
      const { error } = await friendService.respondToFriendRequest(requestId, 'declined');
      if (error) throw error;
      
      const { friendRequests } = get();
      const newFriendRequests = friendRequests.filter(req => req.id !== requestId);
      set({ friendRequests: newFriendRequests });
    } catch (error) {
      console.error('Decline friend request error:', error);
      throw error;
    }
  },
  
  unfriend: async (userId: string, friendId: string) => {
    try {
      set({ isLoading: true });
      // TODO: Implement unfriend method in friendService
      // const { error } = await friendService.unfriend(userId, friendId);
      // if (error) throw error;
      
      const { friends } = get();
      const updatedFriends = friends.filter(friend => friend.id !== friendId);
      set({ friends: updatedFriends });
    } catch (error) {
      console.error('Unfriend error:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  subscribeToFriendStatuses: async (userId: string) => {
    try {
      set({ isLoading: true });
      const { friends, activeChannels } = get();
      const { supabase } = require('../lib/supabase');
      
      // Unsubscribe from existing channels first
      get().unsubscribeFromFriendStatuses();
      
      // Fetch initial statuses for all friends
      const friendIds = friends.map(friend => friend.id);
      if (friendIds.length > 0) {
        const { data, error } = await supabase
          .from('users')
          .select('id, online_status, last_seen')
          .in('id', friendIds);
        
        if (error) {
          console.error('Error fetching initial friend statuses:', error);
        } else if (data) {
          const initialStatuses = data.reduce((acc: { [key: string]: { status: 'online' | 'offline' | 'away'; lastSeen: string | null } }, user: any) => {
            acc[user.id] = { status: user.online_status, lastSeen: user.last_seen };
            return acc;
          }, {});
          set({ friendStatuses: initialStatuses });
        }
      }
      
      // Subscribe to status changes for each friend
      friendIds.forEach(friendId => {
        const channelName = `user-status:${friendId}`;
        
        // Skip if already subscribed
        if (activeChannels.has(channelName)) {
          return;
        }
        
        const channel = supabase.channel(channelName);
        channel.on('broadcast', { event: 'status-change' }, (payload: any) => {
          if (payload.userId === friendId) {
            get().setFriendStatus(friendId, payload.status, payload.lastSeen);
          }
        }).subscribe();
        
        // Track the channel
        activeChannels.set(channelName, channel);
      });
      
      set({ activeChannels });
    } catch (error) {
      console.error('Error subscribing to friend statuses:', error);
    } finally {
      set({ isLoading: false });
    }
  },
  unsubscribeFromFriendStatuses: () => {
    const { activeChannels } = get();
    const { supabase } = require('../lib/supabase');
    
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
    console.log('Unsubscribed from all friend status updates');
  },
}));
