/**
 * Enhanced Chat List Screen with Offline Support
 * 
 * This component demonstrates how to integrate the new offline features:
 * - Pull-to-refresh functionality
 * - Smart loading (pinned + recent + cached chats)
 * - Loading indicators
 * - Offline status display
 * - Chat pagination with "Load More"
 * - Background sync
 */

import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useChatStore } from '../stores/useChatStore';
import { useUserStore } from '../stores/useUserStore';
import { useChatListRefresh, useOfflineSync } from '../hooks/usePullToRefresh';
import {
  LoadingSpinner,
  OfflineIndicator,
  ChatListLoading,
  SyncProgress,
  PullToRefreshHint,
} from './LoadingIndicators';

interface EnhancedChatListScreenProps {
  onChatSelect?: (chatId: string) => void;
  onNewChat?: () => void;
}

const EnhancedChatListScreen: React.FC<EnhancedChatListScreenProps> = ({
  onChatSelect,
  onNewChat,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  
  const { session } = useUserStore();
  const {
    chats,
    isLoading,
    loadUserChats,
    loadMoreChats,
    togglePinChat,
    initializeOfflineSupport,
    subscribeToAllChats,
    unsubscribeFromAllChats,
    isOnline,
    syncInProgress,
    hasMoreChats,
    loadingMoreChats,
    cachedDataLoaded,
  } = useChatStore();
  
  // Pull-to-refresh hook for chat list
  const {
    refreshing,
    refreshControl,
    lastSyncTime,
  } = useChatListRefresh({
    onRefresh: async () => {
      if (session?.user?.id) {
        await loadUserChats(session.user.id, true);
      }
    }
  });
  
  // Offline sync hook
  const {
    pendingMessages,
    manualSync,
    canSync,
  } = useOfflineSync();
  
  // Initialize chat list and offline support
  useEffect(() => {
    const initialize = async () => {
      if (session?.user?.id) {
        await initializeOfflineSupport(session.user.id);
        await loadUserChats(session.user.id);
        subscribeToAllChats(session.user.id);
      }
    };
    
    initialize();
    
    return () => {
      unsubscribeFromAllChats();
    };
  }, [session?.user?.id]);
  
  // Filter chats based on search and pinned filter
  const filteredChats = React.useMemo(() => {
    let filtered = chats;
    
    if (showPinnedOnly) {
      filtered = filtered.filter(chat => chat.isPinned);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(chat => 
        chat.name?.toLowerCase().includes(query) ||
        chat.last_message?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [chats, searchQuery, showPinnedOnly]);
  
  // Handle chat selection
  const handleChatSelect = useCallback((chatId: string) => {
    onChatSelect?.(chatId);
  }, [onChatSelect]);
  
  // Handle pin toggle
  const handleTogglePin = useCallback(async (chatId: string, currentPinStatus: boolean) => {
    try {
      await togglePinChat(chatId, !currentPinStatus);
    } catch (error) {
      console.error('Failed to toggle pin:', error);
      Alert.alert('Error', 'Failed to update pin status');
    }
  }, [togglePinChat]);
  
  // Handle load more chats
  const handleLoadMore = useCallback(async () => {
    if (hasMoreChats && !loadingMoreChats && session?.user?.id) {
      try {
        await loadMoreChats(session.user.id);
      } catch (error) {
        console.error('Failed to load more chats:', error);
      }
    }
  }, [hasMoreChats, loadingMoreChats, session?.user?.id, loadMoreChats]);
  
  // Handle manual sync
  const handleManualSync = useCallback(() => {
    if (canSync) {
      manualSync();
    }
  }, [canSync, manualSync]);
  
  // Render chat item
  const renderChatItem = useCallback(({ item: chat }: { item: any }) => {
    const lastMessageTime = chat.last_message_time 
      ? new Date(chat.last_message_time)
      : null;
    
    const timeDisplay = lastMessageTime
      ? lastMessageTime.toLocaleDateString() === new Date().toLocaleDateString()
        ? lastMessageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : lastMessageTime.toLocaleDateString([], { month: 'short', day: 'numeric' })
      : '';
    
    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => handleChatSelect(chat.id)}
        activeOpacity={0.7}
      >
        <View style={styles.chatAvatar}>
          <Text style={styles.chatAvatarText}>
            {chat.name?.charAt(0)?.toUpperCase() || '?'}
          </Text>
        </View>
        
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <View style={styles.chatTitleContainer}>
              <Text style={styles.chatName} numberOfLines={1}>
                {chat.name || 'Unknown Chat'}
              </Text>
              {chat.is_pinned && (
                <Ionicons name="pin" size={14} color="#FF9500" style={styles.pinIcon} />
              )}
            </View>
            
            <View style={styles.chatMeta}>
              {timeDisplay && (
                <Text style={styles.chatTime}>{timeDisplay}</Text>
              )}
              
              <TouchableOpacity
                onPress={() => handleTogglePin(chat.id, chat.is_pinned)}
                style={styles.pinButton}
              >
                <Ionicons
                  name={chat.is_pinned ? "pin" : "pin-outline"}
                  size={16}
                  color={chat.is_pinned ? "#FF9500" : "#8E8E93"}
                />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.chatPreview}>
            <Text style={styles.lastMessage} numberOfLines={2}>
              {chat.last_message || 'No messages yet'}
            </Text>
            
            {chat.unread_count > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>
                  {chat.unread_count > 99 ? '99+' : chat.unread_count}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [handleChatSelect, handleTogglePin]);
  
  // Render header
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <Text style={styles.headerTitle}>Chats</Text>
        
        <View style={styles.headerActions}>
          {pendingMessages > 0 && (
            <TouchableOpacity onPress={handleManualSync} style={styles.syncButton}>
              <Ionicons name="sync" size={20} color="#FF9500" />
              <Text style={styles.syncButtonText}>{pendingMessages}</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity onPress={onNewChat} style={styles.newChatButton}>
            <Ionicons name="add" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.headerFilters}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            showPinnedOnly && styles.filterButtonActive,
          ]}
          onPress={() => setShowPinnedOnly(!showPinnedOnly)}
        >
          <Ionicons
            name={showPinnedOnly ? "pin" : "pin-outline"}
            size={16}
            color={showPinnedOnly ? "#FFFFFF" : "#007AFF"}
          />
          <Text style={[
            styles.filterButtonText,
            showPinnedOnly && styles.filterButtonTextActive,
          ]}>
            Pinned
          </Text>
        </TouchableOpacity>
        
        <Text style={styles.chatCount}>
          {filteredChats.length} chat{filteredChats.length !== 1 ? 's' : ''}
        </Text>
      </View>
    </View>
  );
  
  // Render load more footer
  const renderFooter = () => {
    if (!hasMoreChats) return null;
    
    return (
      <TouchableOpacity
        style={styles.loadMoreButton}
        onPress={handleLoadMore}
        disabled={loadingMoreChats}
      >
        {loadingMoreChats ? (
          <LoadingSpinner size="small" />
        ) : (
          <>
            <Ionicons name="chevron-down" size={16} color="#007AFF" />
            <Text style={styles.loadMoreText}>Load More Chats</Text>
          </>
        )}
      </TouchableOpacity>
    );
  };
  
  // Show loading state for initial load
    if (isLoading && chats.length === 0 && !cachedDataLoaded) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <ChatListLoading isLoading={true} isEmpty={false} isOffline={!isOnline} />
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      {renderHeader()}
      
      {/* Offline indicator */}
      <OfflineIndicator
        isOnline={isOnline}
        pendingMessages={pendingMessages}
        onSyncPress={handleManualSync}
        syncInProgress={syncInProgress}
      />
      
      {/* Sync progress */}
      <SyncProgress
        progress={0.5} // You can calculate actual progress
        total={pendingMessages}
        current={0}
        visible={syncInProgress}
      />
      
      {/* Pull to refresh hint */}
      <PullToRefreshHint
        isRefreshing={refreshing}
        isOnline={isOnline}
      />
      
      {/* Chat list */}
      {filteredChats.length === 0 ? (
        <ChatListLoading
          isLoading={false}
          isEmpty={true}
          isOffline={!isOnline}
        />
      ) : (
        <FlatList
          data={filteredChats}
          renderItem={renderChatItem}
          keyExtractor={(item) => item.id}
          style={styles.chatList}
          contentContainerStyle={styles.chatListContent}
          refreshControl={refreshControl}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.1}
          ListFooterComponent={renderFooter}
          showsVerticalScrollIndicator={false}
        />
      )}
      
      {/* Last sync time */}
      {lastSyncTime && (
        <Text style={styles.lastSyncText}>
          Last synced: {lastSyncTime.toLocaleTimeString()}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#F8F8F8',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  syncButtonText: {
    fontSize: 12,
    color: '#FF9500',
    marginLeft: 4,
    fontWeight: '600',
  },
  newChatButton: {
    padding: 4,
  },
  headerFilters: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 4,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  chatCount: {
    fontSize: 14,
    color: '#8E8E93',
  },
  chatList: {
    flex: 1,
  },
  chatListContent: {
    paddingVertical: 8,
  },
  chatItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  chatAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chatAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  chatTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    flex: 1,
  },
  pinIcon: {
    marginLeft: 4,
  },
  chatMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatTime: {
    fontSize: 12,
    color: '#8E8E93',
    marginRight: 8,
  },
  pinButton: {
    padding: 4,
  },
  chatPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  lastMessage: {
    fontSize: 14,
    color: '#8E8E93',
    flex: 1,
    marginRight: 8,
  },
  unreadBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadMoreButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
  },
  loadMoreText: {
    fontSize: 16,
    color: '#007AFF',
    marginLeft: 4,
    fontWeight: '500',
  },
  lastSyncText: {
    fontSize: 10,
    color: '#8E8E93',
    textAlign: 'center',
    paddingVertical: 4,
    backgroundColor: '#F8F8F8',
  },
});

export default EnhancedChatListScreen;
