/**
 * Loading Indicators Components
 * 
 * Provides various loading indicators for chat functionality including
 * message loading, sync progress, offline status, and pull-to-refresh states.
 */

import React from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  text?: string;
  style?: any;
}

/**
 * Basic loading spinner with optional text
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'small',
  color = '#007AFF',
  text,
  style,
}) => {
  return (
    <View style={[styles.loadingContainer, style]}>
      <ActivityIndicator size={size} color={color} />
      {text && <Text style={[styles.loadingText, { color }]}>{text}</Text>}
    </View>
  );
};

interface OfflineIndicatorProps {
  isOnline: boolean;
  pendingMessages?: number;
  onSyncPress?: () => void;
  syncInProgress?: boolean;
}

/**
 * Offline status indicator with sync button
 */
export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  isOnline,
  pendingMessages = 0,
  onSyncPress,
  syncInProgress = false,
}) => {
  if (isOnline && pendingMessages === 0) {
    return null;
  }

  return (
    <View style={[styles.offlineContainer, isOnline ? styles.syncContainer : styles.offlineBackground]}>
      <View style={styles.offlineContent}>
        <Ionicons
          name={isOnline ? 'sync' : 'cloud-offline'}
          size={16}
          color={isOnline ? '#FF9500' : '#FF6B6B'}
          style={syncInProgress ? styles.spinning : undefined}
        />
        <Text style={[styles.offlineText, { color: isOnline ? '#FF9500' : '#FF6B6B' }]}>
          {isOnline
            ? `${pendingMessages} message${pendingMessages !== 1 ? 's' : ''} pending sync`
            : 'You are offline'}
        </Text>
      </View>
      {isOnline && pendingMessages > 0 && onSyncPress && (
        <TouchableOpacity
          onPress={onSyncPress}
          disabled={syncInProgress}
          style={styles.syncButton}
        >
          <Text style={styles.syncButtonText}>
            {syncInProgress ? 'Syncing...' : 'Sync Now'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

interface MessageLoadingProps {
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore?: () => void;
  style?: any;
}

/**
 * Loading indicator for loading more messages
 */
export const MessageLoadingIndicator: React.FC<MessageLoadingProps> = ({
  isLoading,
  hasMore,
  onLoadMore,
  style,
}) => {
  if (!isLoading && !hasMore) {
    return null;
  }

  return (
    <View style={[styles.messageLoadingContainer, style]}>
      {isLoading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.loadingMoreText}>Loading messages...</Text>
        </View>
      ) : hasMore ? (
        <TouchableOpacity onPress={onLoadMore} style={styles.loadMoreButton}>
          <Text style={styles.loadMoreText}>Load More Messages</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

interface ChatListLoadingProps {
  isLoading: boolean;
  isEmpty: boolean;
  isOffline: boolean;
}

/**
 * Loading state for chat list
 */
export const ChatListLoading: React.FC<ChatListLoadingProps> = ({
  isLoading,
  isEmpty,
  isOffline,
}) => {
  if (isLoading) {
    return (
      <View style={styles.chatListLoadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.chatListLoadingText}>
          {isOffline ? 'Loading cached chats...' : 'Loading chats...'}
        </Text>
      </View>
    );
  }

  if (isEmpty) {
    return (
      <View style={styles.emptyStateContainer}>
        <Ionicons name="chatbubbles-outline" size={64} color="#C7C7CC" />
        <Text style={styles.emptyStateTitle}>No Chats Yet</Text>
        <Text style={styles.emptyStateSubtitle}>
          {isOffline
            ? 'No cached chats available. Connect to internet to load chats.'
            : 'Start a conversation to see your chats here.'}
        </Text>
      </View>
    );
  }

  return null;
};

interface SyncProgressProps {
  progress: number; // 0-1
  total: number;
  current: number;
  visible: boolean;
}

/**
 * Sync progress indicator
 */
export const SyncProgress: React.FC<SyncProgressProps> = ({
  progress,
  total,
  current,
  visible,
}) => {
  if (!visible) {
    return null;
  }

  return (
    <View style={styles.syncProgressContainer}>
      <View style={styles.syncProgressHeader}>
        <Ionicons name="sync" size={16} color="#007AFF" style={styles.spinning} />
        <Text style={styles.syncProgressText}>
          Syncing messages ({current}/{total})
        </Text>
      </View>
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
      </View>
    </View>
  );
};

interface PullToRefreshHintProps {
  isRefreshing: boolean;
  isOnline: boolean;
}

/**
 * Pull to refresh hint text
 */
export const PullToRefreshHint: React.FC<PullToRefreshHintProps> = ({
  isRefreshing,
  isOnline,
}) => {
  if (isRefreshing) {
    return null;
  }

  return (
    <View style={styles.pullHintContainer}>
      <Text style={styles.pullHintText}>
        {isOnline ? 'Pull down to refresh' : 'Pull down to load cached data'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  offlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  offlineBackground: {
    backgroundColor: '#FFF2F2',
  },
  syncContainer: {
    backgroundColor: '#FFF8E1',
  },
  offlineContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  offlineText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  syncButton: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  syncButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  spinning: {
    // Add rotation animation if needed
  },
  messageLoadingContainer: {
    padding: 16,
    alignItems: 'center',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingMoreText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#8E8E93',
  },
  loadMoreButton: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  loadMoreText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  chatListLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  chatListLoadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
  syncProgressContainer: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  syncProgressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  syncProgressText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  progressBarContainer: {
    height: 3,
    backgroundColor: '#E5E5EA',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 1.5,
  },
  pullHintContainer: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  pullHintText: {
    fontSize: 12,
    color: '#8E8E93',
  },
});