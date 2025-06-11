import { create } from 'zustand';
import { Friend, User } from '@/lib/types';

interface FriendState {
  friends: User[];
  friendRequests: Friend[];
  sentRequests: Friend[];
  isLoading: boolean;
  
  setFriends: (friends: User[]) => void;
  setFriendRequests: (requests: Friend[]) => void;
  setSentRequests: (requests: Friend[]) => void;
  addFriend: (friend: User) => void;
  removeFriend: (friendId: string) => void;
  addFriendRequest: (request: Friend) => void;
  updateFriendRequest: (requestId: string, updates: Partial<Friend>) => void;
  setLoading: (loading: boolean) => void;
}

export const useFriendStore = create<FriendState>((set, get) => ({
  friends: [],
  friendRequests: [],
  sentRequests: [],
  isLoading: false,
  
  setFriends: (friends) => set({ friends }),
  setFriendRequests: (requests) => set({ friendRequests: requests }),
  setSentRequests: (requests) => set({ sentRequests: requests }),
  
  addFriend: (friend) => {
    const { friends } = get();
    set({ friends: [...friends, friend] });
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
  
  setLoading: (loading) => set({ isLoading: loading }),
}));