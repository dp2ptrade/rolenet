import { create } from 'zustand';
import { Friend, User } from '../lib/types';
import { friendService } from '../lib/supabaseService';

interface FriendState {
  friends: User[];
  friendRequests: Friend[];
  sentRequests: Friend[];
  isLoading: boolean;
  
  // Basic setters
  setFriends: (friends: User[]) => void;
  setFriendRequests: (requests: Friend[]) => void;
  setSentRequests: (requests: Friend[]) => void;
  addFriend: (friend: User) => void;
  removeFriend: (friendId: string) => void;
  addFriendRequest: (request: Friend) => void;
  updateFriendRequest: (requestId: string, updates: Partial<Friend>) => void;
  setLoading: (loading: boolean) => void;
  
  // Friend actions
  sendFriendRequest: (userA: string, userB: string) => Promise<void>;
  loadFriends: (userId: string) => Promise<void>;
  loadFriendRequests: (userId: string) => Promise<void>;
  acceptFriendRequest: (requestId: string) => Promise<void>;
  declineFriendRequest: (requestId: string) => Promise<void>;
  unfriend: (userId: string, friendId: string) => Promise<void>;
}

export const useFriendStore = create<FriendState>((set, get) => ({
  friends: [],
  friendRequests: [],
  sentRequests: [],
  isLoading: false,
  
  // Basic setters
  setFriends: (friends) => set({ friends }),
  setFriendRequests: (requests) => set({ friendRequests: requests }),
  setSentRequests: (requests) => set({ sentRequests: requests }),
  setLoading: (loading) => set({ isLoading: loading }),
  
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
}));
