# RoleNet Zustand Stores

This directory contains all the Zustand stores for the RoleNet app, fully integrated with Supabase services.

## Store Overview

### 🔐 useUserStore
Manages user authentication, profile data, and user search functionality.

**Key Features:**
- Authentication (sign up, sign in, sign out)
- User profile management
- User search with filters
- Online status management
- Session initialization

**Usage:**
```typescript
import { useUserStore } from '@/stores';

const { 
  currentUser, 
  isAuthenticated, 
  signIn, 
  signOut, 
  updateUserProfile,
  searchUsers 
} = useUserStore();

// Sign in
await signIn('email@example.com', 'password');

// Update profile
await updateUserProfile({ bio: 'New bio' });

// Search users
await searchUsers({ 
  query: 'developer', 
  roles: ['Software Engineer'],
  availability: true 
});
```

### 📡 usePingStore
Handles ping system for user connections and requests.

**Key Features:**
- Send pings to other users
- Load received/sent pings
- Respond to pings (accept/ignore)
- Real-time ping subscriptions

**Usage:**
```typescript
import { usePingStore } from '@/stores';

const { 
  receivedPings, 
  sentPings, 
  sendPing, 
  respondToPing,
  subscribeToPings 
} = usePingStore();

// Send a ping
await sendPing(senderId, receiverId, 'Hello! Let\'s connect');

// Respond to a ping
await respondToPing(pingId, 'responded');

// Subscribe to real-time pings
subscribeToPings(userId);
```

### 👥 useFriendStore
Manages friend relationships and friend requests.

**Key Features:**
- Send friend requests
- Accept/decline friend requests
- Load friends list
- Manage friend relationships

**Usage:**
```typescript
import { useFriendStore } from '@/stores';

const { 
  friends, 
  friendRequests, 
  sendFriendRequest, 
  acceptFriendRequest,
  loadFriends 
} = useFriendStore();

// Send friend request
await sendFriendRequest(userA, userB);

// Accept friend request
await acceptFriendRequest(requestId);

// Load friends
await loadFriends(userId);
```

### 📞 useCallStore
Handles voice calling functionality with WebRTC integration.

**Key Features:**
- Initiate calls
- Manage call state (incoming, outgoing, current)
- Call history
- Real-time call updates
- Call controls (mute, speaker, end)

**Usage:**
```typescript
import { useCallStore } from '@/stores';

const { 
  currentCall, 
  isInCall, 
  isMuted, 
  initiateCall, 
  endCall,
  setMuted,
  subscribeToCall 
} = useCallStore();

// Initiate a call
const call = await initiateCall(callerId, calleeId);

// Subscribe to call updates
subscribeToCall(call.id);

// Toggle mute
setMuted(!isMuted);

// End call
endCall();
```

### 💬 useChatStore
Manages real-time messaging and chat functionality.

**Key Features:**
- Create/get chats
- Send messages
- Load chat history
- Real-time message subscriptions

**Usage:**
```typescript
import { useChatStore } from '@/stores';

const { 
  chats, 
  currentChat, 
  messages, 
  getOrCreateChat, 
  sendMessage,
  subscribeToMessages 
} = useChatStore();

// Create or get existing chat
const chat = await getOrCreateChat([userId1, userId2]);

// Send message
await sendMessage(chat.id, senderId, 'Hello!');

// Subscribe to real-time messages
subscribeToMessages(chat.id);
```

### ⭐ useRatingStore
Handles user ratings and reviews system.

**Key Features:**
- Create ratings
- Load user ratings
- Calculate average ratings

**Usage:**
```typescript
import { useRatingStore } from '@/stores';

const { 
  userRatings, 
  createRating, 
  loadUserRatings,
  calculateAverageRating 
} = useRatingStore();

// Create a rating
await createRating(
  raterId, 
  ratedUserId, 
  5, 
  'Great conversation!', 
  'call'
);

// Load ratings for a user
await loadUserRatings(userId);

// Calculate average
const average = calculateAverageRating();
```

## Integration with Supabase Services

All stores are fully integrated with the corresponding Supabase services:

- **authService** - Authentication operations
- **userService** - User profile management
- **pingService** - Ping system
- **friendService** - Friend relationships
- **callService** - Call management
- **chatService** - Messaging
- **ratingService** - Rating system

## Real-time Subscriptions

Several stores support real-time subscriptions:

- **usePingStore**: Subscribe to new pings
- **useCallStore**: Subscribe to call updates
- **useChatStore**: Subscribe to new messages

**Important**: Always unsubscribe when components unmount:

```typescript
useEffect(() => {
  subscribeToPings(userId);
  
  return () => {
    unsubscribeFromPings();
  };
}, [userId]);
```

## Error Handling

All async actions include error handling and logging. Errors are thrown to be handled by the calling component:

```typescript
try {
  await signIn(email, password);
} catch (error) {
  // Handle authentication error
  console.error('Sign in failed:', error);
}
```

## Loading States

Most stores include loading states for better UX:

```typescript
const { isLoading, searchUsers } = useUserStore();

if (isLoading) {
  return <LoadingSpinner />;
}
```

## Best Practices

1. **Initialize stores early**: Call initialization functions in your app's root component
2. **Handle subscriptions**: Always clean up subscriptions in useEffect cleanup
3. **Error boundaries**: Wrap components using stores in error boundaries
4. **Loading states**: Use loading states for better user experience
5. **Type safety**: All stores are fully typed with TypeScript

## Example App Initialization

```typescript
// App.tsx
import { useUserStore, usePingStore } from '@/stores';

function App() {
  const { initializeAuth } = useUserStore();
  const { subscribeToPings } = usePingStore();
  
  useEffect(() => {
    // Initialize authentication
    initializeAuth();
  }, []);
  
  useEffect(() => {
    // Subscribe to pings when user is authenticated
    if (currentUser) {
      subscribeToPings(currentUser.id);
    }
    
    return () => {
      unsubscribeFromPings();
    };
  }, [currentUser]);
  
  return <YourAppContent />;
}
```