/**
 * Pull-to-Refresh Hook
 * 
 * Provides pull-to-refresh functionality with loading indicators
 * for chat lists and message loading.
 */

import React, { useState, useCallback } from 'react';
import { RefreshControl, RefreshControlProps } from 'react-native';
import { useChatStore } from '../stores/useChatStore';
import { useUserStore } from '../stores/useUserStore';
import { offlineStorage } from '../lib/offlineStorage';

interface PullToRefreshOptions {
  onRefresh?: () => Promise<void>;
  showOfflineIndicator?: boolean;
  enableBackgroundSync?: boolean;
}

interface PullToRefreshReturn {
  refreshing: boolean;
  onRefresh: () => Promise<void>;
  refreshControl: React.ReactElement<RefreshControlProps>;
  isOnline: boolean;
  lastSyncTime: Date | null;
  syncInProgress: boolean;
}

/**
 * Hook for chat list pull-to-refresh
 */
export const useChatListRefresh = (options: PullToRefreshOptions = {}): PullToRefreshReturn => {
  const [refreshing, setRefreshing] = useState(false);
  const { 
    loadUserChats, 
    syncOfflineMessages, 
    isOnline, 
    lastSyncTime, 
    syncInProgress,
    setOnlineStatus 
  } = useChatStore();
  const { session } = useUserStore();
  
  const onRefresh = useCallback(async () => {
    if (refreshing) return;
    
    setRefreshing(true);
    
    try {
      // Check network status
      const deviceOnline = offlineStorage.isDeviceOnline();
      setOnlineStatus(deviceOnline);
      
      if (deviceOnline) {
        // Sync offline messages first if enabled
        if (options.enableBackgroundSync) {
          await syncOfflineMessages();
        }
        
        // Reload chats from server
        if (session?.user?.id) {
          await loadUserChats(session.user.id, false); // Don't use cache
        }
      } else {
        // Load from cache when offline
        if (session?.user?.id) {
          await loadUserChats(session.user.id, true); // Use cache
        }
      }
      
      // Execute custom refresh logic if provided
      if (options.onRefresh) {
        await options.onRefresh();
      }
    } catch (error) {
      console.error('Error during chat list refresh:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, options, syncOfflineMessages, loadUserChats, session, setOnlineStatus]);
  
  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={isOnline ? '#007AFF' : '#FF6B6B'}
      title={isOnline ? 'Pull to refresh' : 'Offline - Pull to sync'}
      titleColor={isOnline ? '#007AFF' : '#FF6B6B'}
    />
  );
  
  return {
    refreshing,
    onRefresh,
    refreshControl,
    isOnline,
    lastSyncTime,
    syncInProgress
  };
};

/**
 * Hook for chat messages pull-to-refresh
 */
export const useChatMessagesRefresh = (
  chatId: string | null,
  options: PullToRefreshOptions = {}
): PullToRefreshReturn => {
  const [refreshing, setRefreshing] = useState(false);
  const { 
    loadChatMessages, 
    loadMoreMessages,
    isOnline, 
    lastSyncTime, 
    syncInProgress,
    setOnlineStatus,
    hasMoreMessages
  } = useChatStore();
  
  const onRefresh = useCallback(async () => {
    if (refreshing || !chatId) return;
    
    setRefreshing(true);
    
    try {
      // Check network status
      const deviceOnline = offlineStorage.isDeviceOnline();
      setOnlineStatus(deviceOnline);
      
      if (deviceOnline) {
        // Reload messages from server
        await loadChatMessages(chatId); // Reset to first page
      } else {
        // Load from cache when offline
        await loadChatMessages(chatId);
      }
      
      // Execute custom refresh logic if provided
      if (options.onRefresh) {
        await options.onRefresh();
      }
    } catch (error) {
      console.error('Error during messages refresh:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, chatId, options, loadChatMessages, setOnlineStatus]);
  
  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={isOnline ? '#007AFF' : '#FF6B6B'}
      title={isOnline ? 'Pull to refresh' : 'Offline - Cached messages'}
      titleColor={isOnline ? '#007AFF' : '#FF6B6B'}
    />
  );
  
  return {
    refreshing,
    onRefresh,
    refreshControl,
    isOnline,
    lastSyncTime,
    syncInProgress
  };
};

/**
 * Hook for load more messages functionality
 */
export const useLoadMoreMessages = (chatId: string | null) => {
  const [loadingMore, setLoadingMore] = useState(false);
  const { loadMoreMessages, hasMoreMessages, loadingMoreMessages } = useChatStore();
  
  const loadMore = useCallback(async () => {
    if (loadingMore || loadingMoreMessages || !hasMoreMessages || !chatId) {
      return;
    }
    
    setLoadingMore(true);
    
    try {
      await loadMoreMessages(chatId);
    } catch (error) {
      console.error('Error loading more messages:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, loadingMoreMessages, hasMoreMessages, chatId, loadMoreMessages]);
  
  return {
    loadMore,
    loadingMore: loadingMore || loadingMoreMessages,
    hasMoreMessages,
    canLoadMore: hasMoreMessages && !loadingMore && !loadingMoreMessages
  };
};

/**
 * Hook for offline sync status
 */
export const useOfflineSync = () => {
  const { 
    isOnline, 
    syncInProgress, 
    lastSyncTime, 
    offlineMessages,
    syncOfflineMessages,
    setOnlineStatus
  } = useChatStore();
  
  const manualSync = useCallback(async () => {
    if (syncInProgress) return;
    
    try {
      // Check network status first
      const deviceOnline = offlineStorage.isDeviceOnline();
      setOnlineStatus(deviceOnline);
      
      if (deviceOnline) {
        await syncOfflineMessages();
      }
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
  }, [syncInProgress, syncOfflineMessages, setOnlineStatus]);
  
  return {
    isOnline,
    syncInProgress,
    lastSyncTime,
    pendingMessages: offlineMessages.length,
    manualSync,
    canSync: !syncInProgress && offlineMessages.length > 0
  };
};
