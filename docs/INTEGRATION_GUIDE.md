# Offline Support Integration Guide

This guide shows how to integrate the new offline support features into your existing chat screens with minimal changes.

## Quick Start

### 1. Update Your Chat Store Usage

Replace your existing chat store usage with the enhanced version:

```typescript
// Before
const {
  chats,
  messages,
  isLoading,
  loadUserChats,
  loadChatMessages,
  sendMessage,
} = useChatStore();

// After (enhanced with offline support)
const {
  chats,
  messages,
  isLoading,
  loadUserChats,
  loadChatMessages,
  sendMessage,
  // New offline features
  isOnline,
  syncInProgress,
  offlineMessages,
  initializeOfflineSupport,
  loadMoreMessages,
  hasMoreMessages,
  loadingMoreMessages,
} = useChatStore();
```

### 2. Initialize Offline Support

Add initialization to your main chat component:

```typescript
import { useChatStore } from '../stores/useChatStore';
import { useUserStore } from '../stores/useUserStore';

const YourChatComponent = () => {
  const { session } = useUserStore();
  const { initializeOfflineSupport } = useChatStore();
  
  useEffect(() => {
    if (session?.user?.id) {
      initializeOfflineSupport(session.user.id);
    }
  }, [session?.user?.id]);
  
  // ... rest of your component
};
```

### 3. Add Basic Offline Indicators

Import and add offline indicators to your UI:

```typescript
import { OfflineIndicator } from '../components/LoadingIndicators';

const YourChatScreen = () => {
  const { isOnline, syncInProgress, offlineMessages } = useChatStore();
  
  return (
    <View>
      {/* Add this at the top of your chat screen */}
      <OfflineIndicator
        isOnline={isOnline}
        pendingMessages={offlineMessages.length}
        syncInProgress={syncInProgress}
      />
      
      {/* Your existing chat UI */}
    </View>
  );
};
```

### 4. Add Pull-to-Refresh (Optional)

Enhance your FlatList with pull-to-refresh:

```typescript
import { useChatMessagesRefresh } from '../hooks/usePullToRefresh';

const YourChatScreen = ({ chatId }) => {
  const { refreshControl } = useChatMessagesRefresh(chatId, {
    onRefresh: async () => {
      await loadChatMessages(chatId, 50, 0);
    },
  });
  
  return (
    <FlatList
      data={messages}
      refreshControl={refreshControl} // Add this line
      // ... other props
    />
  );
};
```

## Step-by-Step Integration

### For Chat List Screen

1. **Update your existing chat list component:**

```typescript
// YourChatListScreen.tsx
import React, { useEffect } from 'react';
import { FlatList, View } from 'react-native';
import { useChatStore } from '../stores/useChatStore';
import { useUserStore } from '../stores/useUserStore';
import { useChatListRefresh } from '../hooks/usePullToRefresh';
import { OfflineIndicator, ChatListLoading } from '../components/LoadingIndicators';

const YourChatListScreen = () => {
  const { session } = useUserStore();
  const {
    chats,
    isLoading,
    loadUserChats,
    initializeOfflineSupport,
    isOnline,
    syncInProgress,
    offlineMessages,
    hasMoreChats,
    loadMoreChats,
    loadingMoreChats,
  } = useChatStore();
  
  // Add pull-to-refresh
  const { refreshControl } = useChatListRefresh({
    onRefresh: async () => {
      if (session?.user?.id) {
        await loadUserChats(session.user.id, true); // Force refresh
      }
    },
  });
  
  // Initialize offline support
  useEffect(() => {
    const initialize = async () => {
      if (session?.user?.id) {
        await initializeOfflineSupport(session.user.id);
        await loadUserChats(session.user.id);
      }
    };
    initialize();
  }, [session?.user?.id]);
  
  // Handle load more
  const handleLoadMore = () => {
    if (hasMoreChats && !loadingMoreChats && session?.user?.id) {
      loadMoreChats(session.user.id);
    }
  };
  
  if (isLoading && chats.length === 0) {
    return <ChatListLoading />;
  }
  
  return (
    <View style={{ flex: 1 }}>
      {/* Add offline indicator */}
      <OfflineIndicator
        isOnline={isOnline}
        pendingMessages={offlineMessages.length}
        syncInProgress={syncInProgress}
      />
      
      <FlatList
        data={chats}
        refreshControl={refreshControl} // Add this
        onEndReached={handleLoadMore} // Add this
        onEndReachedThreshold={0.1} // Add this
        // ... your existing renderItem and other props
      />
    </View>
  );
};
```

### For Individual Chat Screen

1. **Update your existing chat screen component:**

```typescript
// YourChatScreen.tsx
import React, { useEffect } from 'react';
import { FlatList, View, TextInput, TouchableOpacity } from 'react-native';
import { useChatStore } from '../stores/useChatStore';
import { useUserStore } from '../stores/useUserStore';
import { useChatMessagesRefresh, useLoadMoreMessages } from '../hooks/usePullToRefresh';
import { OfflineIndicator, MessageLoadingIndicator } from '../components/LoadingIndicators';

const YourChatScreen = ({ chatId }) => {
  const { session } = useUserStore();
  const {
    messages,
    isLoading,
    loadChatMessages,
    sendMessage,
    isOnline,
    syncInProgress,
    offlineMessages,
    hasMoreMessages,
    loadingMoreMessages,
  } = useChatStore();
  
  // Add pull-to-refresh for messages
  const { refreshControl } = useChatMessagesRefresh(chatId, {
    onRefresh: async () => {
      await loadChatMessages(chatId, 50, 0);
    },
  });
  
  // Add load more messages
  const { loadMore, canLoadMore } = useLoadMoreMessages(chatId);
  
  // Load messages on mount
  useEffect(() => {
    if (chatId) {
      loadChatMessages(chatId, 50, 0);
    }
  }, [chatId]);
  
  // Your existing send message function (no changes needed)
  const handleSendMessage = async (text) => {
    if (!text.trim() || !session?.user?.id) return;
    
    await sendMessage({
      chatId,
      senderId: session.user.id,
      text: text.trim(),
      type: 'text',
    });
  };
  
  return (
    <View style={{ flex: 1 }}>
      {/* Add offline indicator */}
      <OfflineIndicator
        isOnline={isOnline}
        pendingMessages={offlineMessages.filter(msg => msg.chatId === chatId).length}
        syncInProgress={syncInProgress}
      />
      
      <FlatList
        data={messages}
        refreshControl={refreshControl} // Add this
        onEndReached={canLoadMore ? loadMore : undefined} // Add this
        onEndReachedThreshold={0.1} // Add this
        ListHeaderComponent={ // Add this
          <MessageLoadingIndicator
            isLoading={loadingMoreMessages}
            hasMore={hasMoreMessages}
            onLoadMore={loadMore}
          />
        }
        // ... your existing renderItem and other props
      />
      
      {/* Your existing message input */}
      <View>
        <TextInput
          placeholder={isOnline ? "Type a message..." : "Message will be sent when online"}
          // ... other props
        />
        <TouchableOpacity onPress={() => handleSendMessage(messageText)}>
          {/* Send button */}
        </TouchableOpacity>
      </View>
    </View>
  );
};
```

## Minimal Integration (Just Offline Queuing)

If you only want offline message queuing without UI changes:

```typescript
// Just add this to your main app component
import { useChatStore } from '../stores/useChatStore';
import { useUserStore } from '../stores/useUserStore';

const App = () => {
  const { session } = useUserStore();
  const { initializeOfflineSupport } = useChatStore();
  
  useEffect(() => {
    if (session?.user?.id) {
      initializeOfflineSupport(session.user.id);
    }
  }, [session?.user?.id]);
  
  // ... rest of your app
};
```

That's it! Your existing `sendMessage` calls will automatically queue messages when offline and sync when online.

## Testing Offline Features

### 1. Test Offline Message Queuing

```typescript
// In your development environment
// 1. Turn off WiFi/mobile data
// 2. Send messages - they should appear with a "queued" status
// 3. Turn on connectivity - messages should automatically sync
```

### 2. Test Cached Data Loading

```typescript
// 1. Load chats while online
// 2. Turn off connectivity
// 3. Restart app - cached chats should load
// 4. Pull to refresh - should show cached data
```

### 3. Test Pagination

```typescript
// 1. Load a chat with many messages
// 2. Scroll to top - should load more messages
// 3. Test both online and offline scenarios
```

## Common Integration Issues

### Issue: Messages not queuing offline

**Solution**: Ensure you've called `initializeOfflineSupport`:

```typescript
useEffect(() => {
  if (userId) {
    initializeOfflineSupport(userId);
  }
}, [userId]);
```

### Issue: Pull-to-refresh not working

**Solution**: Make sure you're using the `refreshControl` prop:

```typescript
const { refreshControl } = useChatListRefresh();

<FlatList refreshControl={refreshControl} />
```

### Issue: Load more not triggering

**Solution**: Add the required props to your FlatList:

```typescript
<FlatList
  onEndReached={handleLoadMore}
  onEndReachedThreshold={0.1}
/>
```

## Performance Tips

1. **Initialize early**: Call `initializeOfflineSupport` as soon as you have a user ID
2. **Use pagination**: Don't load all messages at once
3. **Implement virtualization**: Use FlatList's built-in virtualization
4. **Cache strategically**: Only cache recent and important chats

## Next Steps

After basic integration:

1. **Customize loading indicators**: Modify the `LoadingIndicators` components to match your design
2. **Add more offline features**: Implement draft message saving, smart prefetching
3. **Monitor performance**: Use React DevTools to monitor re-renders
4. **Add analytics**: Track offline usage patterns

## Migration Checklist

- [ ] Added `initializeOfflineSupport` call
- [ ] Updated chat store imports (no changes needed, same import)
- [ ] Added offline indicators to UI
- [ ] Implemented pull-to-refresh
- [ ] Added pagination support
- [ ] Tested offline message queuing
- [ ] Tested cached data loading
- [ ] Verified sync functionality

---

*For detailed API documentation, see [OFFLINE_SUPPORT.md](./OFFLINE_SUPPORT.md)*