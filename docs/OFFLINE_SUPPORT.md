# Offline Support System Documentation

This document provides comprehensive documentation for the offline support system implemented in the RoleNet chat application.

## Overview

The offline support system provides:
- **Message Queuing**: Messages sent while offline are queued and automatically sent when connection is restored
- **Local Caching**: Chat lists and messages are cached locally using AsyncStorage
- **Smart Loading**: Prioritizes pinned chats, recent chats, and cached data
- **Background Sync**: Automatic synchronization when network connectivity is restored
- **Pull-to-Refresh**: Manual refresh functionality with loading indicators
- **Pagination**: "Load More" functionality for both chats and messages
- **Network Status**: Real-time network connectivity monitoring

## Architecture

### Core Components

1. **offlineStorage.ts** - Core storage and sync utilities
2. **useChatStore.ts** - Enhanced chat store with offline support
3. **useOfflineChatStore.ts** - Dedicated offline chat store
4. **usePullToRefresh.ts** - Pull-to-refresh hooks
5. **LoadingIndicators.tsx** - UI components for loading states
6. **chatPagination.ts** - Smart chat loading and pagination

### Data Flow

```
User Action → Store → Offline Storage → Network (if online) → UI Update
                ↓
            Cache Data ← Background Sync ← Network Status Change
```

## Installation

### Dependencies

The system requires the following dependencies:

```bash
npm install @react-native-community/netinfo
```

Other dependencies (already included in most React Native projects):
- `@react-native-async-storage/async-storage`
- `zustand`
- `expo-constants`

### Setup

1. **Initialize the offline support system in your main chat component:**

```typescript
import { useChatStore } from '../stores/useChatStore';

const ChatApp = () => {
  const { initializeOfflineSupport } = useChatStore();
  const { session } = useUserStore();
  
  useEffect(() => {
    if (session?.user?.id) {
      initializeOfflineSupport(session.user.id);
    }
  }, [session?.user?.id]);
  
  // ... rest of your component
};
```

2. **Use the enhanced chat store in your components:**

```typescript
import { useChatStore } from '../stores/useChatStore';

const ChatScreen = () => {
  const {
    messages,
    isOnline,
    syncInProgress,
    loadChatMessages,
    sendMessage,
    loadMoreMessages,
  } = useChatStore();
  
  // ... component implementation
};
```

## API Reference

### offlineStorage

#### Message Queue Management

```typescript
// Queue a message for offline sending
await offlineStorage.queueOfflineMessage(userId, message);

// Get all queued messages
const queuedMessages = await offlineStorage.getOfflineMessages(userId);

// Remove a message from queue (after successful send)
await offlineStorage.removeOfflineMessage(userId, messageId);

// Update message status
await offlineStorage.updateOfflineMessage(userId, messageId, { status: 'sent' });
```

#### Chat Caching

```typescript
// Cache a chat
await offlineStorage.cacheChat(userId, chat);

// Get cached chats
const cachedChats = await offlineStorage.getCachedChats(userId);

// Cache messages for a chat
await offlineStorage.cacheMessages(userId, chatId, messages);

// Get cached messages
const cachedMessages = await offlineStorage.getCachedMessages(userId, chatId, limit, offset);
```

#### Pinned Chats

```typescript
// Save pinned chats
await offlineStorage.savePinnedChats(userId, pinnedChatIds);

// Get pinned chats
const pinnedChats = await offlineStorage.getPinnedChats(userId);
```

#### Draft Messages

```typescript
// Save draft message
await offlineStorage.saveDraft(userId, chatId, draftText);

// Get draft message
const draft = await offlineStorage.getDraft(userId, chatId);

// Clear draft
await offlineStorage.clearDraft(userId, chatId);
```

#### Background Sync

```typescript
// Initialize background sync (automatically called)
offlineStorage.initializeBackgroundSync(userId, syncCallback);

// Manual sync
await offlineStorage.syncOfflineMessages(userId, sendMessageCallback);
```

### useChatStore (Enhanced)

#### New State Properties

```typescript
interface ChatState {
  // ... existing properties
  
  // Offline support
  isOnline: boolean;
  offlineMessages: OfflineMessage[];
  syncInProgress: boolean;
  lastSyncTime: Date | null;
  
  // Pagination
  hasMoreMessages: boolean;
  loadingMoreMessages: boolean;
  hasMoreChats: boolean;
  loadingMoreChats: boolean;
  currentPage: number;
  
  // Caching
  cachedDataLoaded: boolean;
}
```

#### New Actions

```typescript
// Network status
setOnlineStatus: (isOnline: boolean) => void;

// Initialization
initializeOfflineSupport: (userId: string) => Promise<void>;

// Offline message management
syncOfflineMessages: () => Promise<void>;
queueOfflineMessage: (message: OfflineMessage) => Promise<void>;

// Data loading
loadCachedData: () => Promise<void>;
loadMoreMessages: (chatId: string) => Promise<void>;
loadMoreChats: (userId: string) => Promise<void>;

// Draft management
saveDraft: (chatId: string, text: string) => Promise<void>;
getDraft: (chatId: string) => Promise<string | null>;
clearDraft: (chatId: string) => Promise<void>;
```

### Pull-to-Refresh Hooks

#### useChatListRefresh

```typescript
const {
  refreshing,
  refreshControl,
  lastSyncTime,
} = useChatListRefresh({
  onRefresh: async () => {
    // Custom refresh logic
  },
  enableBackgroundSync: true,
});
```

#### useChatMessagesRefresh

```typescript
const {
  refreshing,
  refreshControl,
  lastSyncTime,
} = useChatMessagesRefresh(chatId, {
  onRefresh: async () => {
    // Custom refresh logic
  },
  enableBackgroundSync: true,
});
```

#### useLoadMoreMessages

```typescript
const {
  loadMore,
  loadingMore,
  canLoadMore,
} = useLoadMoreMessages(chatId);
```

#### useOfflineSync

```typescript
const {
  pendingMessages,
  manualSync,
  canSync,
} = useOfflineSync();
```

### Loading Indicators

#### LoadingSpinner

```typescript
<LoadingSpinner 
  size="large" 
  text="Loading messages..." 
  color="#007AFF" 
/>
```

#### OfflineIndicator

```typescript
<OfflineIndicator
  isOnline={isOnline}
  pendingMessages={pendingMessages}
  onSyncPress={handleManualSync}
  syncInProgress={syncInProgress}
/>
```

#### MessageLoadingIndicator

```typescript
<MessageLoadingIndicator
  isLoading={loadingMore}
  hasMore={hasMoreMessages}
  onLoadMore={handleLoadMore}
/>
```

#### ChatListLoading

```typescript
<ChatListLoading
  isEmpty={chats.length === 0}
  emptyMessage="No chats yet"
  emptyAction={onNewChat}
  emptyActionText="Start a new chat"
/>
```

#### SyncProgress

```typescript
<SyncProgress
  progress={0.5}
  total={pendingMessages}
  current={syncedMessages}
  visible={syncInProgress}
/>
```

## Usage Examples

### Basic Chat Screen with Offline Support

```typescript
import React, { useEffect } from 'react';
import { useChatStore } from '../stores/useChatStore';
import { useChatMessagesRefresh, useLoadMoreMessages } from '../hooks/usePullToRefresh';
import { OfflineIndicator, MessageLoadingIndicator } from '../components/LoadingIndicators';

const ChatScreen = ({ chatId }) => {
  const {
    messages,
    isOnline,
    syncInProgress,
    loadChatMessages,
    sendMessage,
    hasMoreMessages,
    loadingMoreMessages,
  } = useChatStore();
  
  const { refreshControl } = useChatMessagesRefresh(chatId);
  const { loadMore, canLoadMore } = useLoadMoreMessages(chatId);
  
  useEffect(() => {
    loadChatMessages(chatId, 50, 0);
  }, [chatId]);
  
  const handleSendMessage = async (text) => {
    await sendMessage({
      chatId,
      senderId: userId,
      text,
      type: 'text',
    });
  };
  
  return (
    <View>
      <OfflineIndicator
        isOnline={isOnline}
        syncInProgress={syncInProgress}
      />
      
      <FlatList
        data={messages}
        refreshControl={refreshControl}
        onEndReached={canLoadMore ? loadMore : undefined}
        ListHeaderComponent={
          <MessageLoadingIndicator
            isLoading={loadingMoreMessages}
            hasMore={hasMoreMessages}
            onLoadMore={loadMore}
          />
        }
      />
      
      {/* Message input */}
    </View>
  );
};
```

### Chat List with Smart Loading

```typescript
import React, { useEffect } from 'react';
import { useChatStore } from '../stores/useChatStore';
import { useChatListRefresh } from '../hooks/usePullToRefresh';
import { ChatListLoading } from '../components/LoadingIndicators';

const ChatListScreen = () => {
  const {
    chats,
    isLoading,
    loadUserChats,
    loadMoreChats,
    hasMoreChats,
    loadingMoreChats,
  } = useChatStore();
  
  const { refreshControl } = useChatListRefresh();
  
  useEffect(() => {
    loadUserChats(userId);
  }, [userId]);
  
  const handleLoadMore = () => {
    if (hasMoreChats && !loadingMoreChats) {
      loadMoreChats(userId);
    }
  };
  
  if (isLoading && chats.length === 0) {
    return <ChatListLoading />;
  }
  
  return (
    <FlatList
      data={chats}
      refreshControl={refreshControl}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.1}
    />
  );
};
```

## Performance Considerations

### Memory Management

- **Message Pagination**: Load messages in chunks (default: 50 messages)
- **Chat Pagination**: Load chats incrementally (default: 20 chats)
- **Cache Cleanup**: Automatically clean old cached data
- **Background Sync**: Throttled to prevent excessive network requests

### Storage Optimization

- **Compression**: Large message content is compressed before storage
- **TTL (Time To Live)**: Cached data expires after 7 days
- **Size Limits**: Maximum cache size per user (default: 50MB)
- **Selective Caching**: Only cache recent and important chats

### Network Optimization

- **Batch Operations**: Multiple messages are sent in batches when possible
- **Retry Logic**: Failed requests are retried with exponential backoff
- **Connection Pooling**: Reuse connections for multiple requests
- **Compression**: API responses are compressed

## Troubleshooting

### Common Issues

#### Messages Not Syncing

1. Check network connectivity
2. Verify user authentication
3. Check console for sync errors
4. Try manual sync

```typescript
const { manualSync } = useOfflineSync();
manualSync(); // Force sync
```

#### Cache Not Loading

1. Check AsyncStorage permissions
2. Verify cache data exists
3. Clear cache and reload

```typescript
// Clear cache
await offlineStorage.clearCache(userId);
```

#### Performance Issues

1. Reduce pagination size
2. Clear old cached data
3. Optimize message rendering

```typescript
// Reduce pagination size
loadChatMessages(chatId, 25, 0); // Load 25 instead of 50
```

### Debug Mode

Enable debug logging:

```typescript
// In your app initialization
if (__DEV__) {
  // Enable debug logging
  console.log('Offline support debug mode enabled');
}
```

## Migration Guide

### From Basic Chat Store

If you're migrating from a basic chat store:

1. **Update imports**:
```typescript
// Old
import { useChatStore } from '../stores/useChatStore';

// New (same import, enhanced functionality)
import { useChatStore } from '../stores/useChatStore';
```

2. **Initialize offline support**:
```typescript
const { initializeOfflineSupport } = useChatStore();

useEffect(() => {
  initializeOfflineSupport(userId);
}, [userId]);
```

3. **Update method calls**:
```typescript
// Old
loadUserChats(userId);
loadChatMessages(chatId);

// New (same methods, enhanced with caching)
loadUserChats(userId); // Now supports caching
loadChatMessages(chatId, 50, 0); // Now supports pagination
```

4. **Add loading indicators**:
```typescript
import { OfflineIndicator, LoadingSpinner } from '../components/LoadingIndicators';

// Add to your components
<OfflineIndicator isOnline={isOnline} />
```

## Best Practices

### 1. Initialize Early

Initialize offline support as early as possible in your app lifecycle:

```typescript
// In your main App component
useEffect(() => {
  if (user) {
    initializeOfflineSupport(user.id);
  }
}, [user]);
```

### 2. Handle Loading States

Always provide feedback for loading states:

```typescript
{isLoading && <LoadingSpinner />}
{syncInProgress && <SyncProgress />}
{!isOnline && <OfflineIndicator />}
```

### 3. Implement Pull-to-Refresh

Provide manual refresh capability:

```typescript
const { refreshControl } = useChatListRefresh();

<FlatList refreshControl={refreshControl} />
```

### 4. Optimize Pagination

Use appropriate page sizes:

```typescript
// For messages (smaller, more frequent)
loadChatMessages(chatId, 25, offset);

// For chats (larger, less frequent)
loadUserChats(userId, 50, offset);
```

### 5. Handle Errors Gracefully

```typescript
try {
  await sendMessage(message);
} catch (error) {
  // Message is automatically queued for offline sync
  console.log('Message queued for when online');
}
```

## Future Enhancements

- **Conflict Resolution**: Handle message conflicts when multiple devices sync
- **Selective Sync**: Allow users to choose what to sync
- **Compression**: Implement message compression for storage
- **Encryption**: Add end-to-end encryption for cached data
- **Analytics**: Track offline usage patterns
- **Smart Prefetching**: Predict and prefetch likely-to-be-accessed data

## Support

For issues or questions about the offline support system:

1. Check this documentation
2. Review the example implementations
3. Check the console for error messages
4. Enable debug mode for detailed logging

---

*Last updated: December 2024*