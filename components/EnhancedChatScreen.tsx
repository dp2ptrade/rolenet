/**
 * Enhanced Chat Screen with Offline Support
 * 
 * This component demonstrates how to integrate the new offline features:
 * - Pull-to-refresh functionality
 * - Loading indicators
 * - Offline status display
 * - Message pagination
 * - Background sync
 */

import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useChatStore } from '../stores/useChatStore';
import { useUserStore } from '../stores/useUserStore';
import { useChatMessagesRefresh, useLoadMoreMessages, useOfflineSync } from '../hooks/usePullToRefresh';
import {
  LoadingSpinner,
  OfflineIndicator,
  MessageLoadingIndicator,
  SyncProgress,
} from './LoadingIndicators';
import { CONFIG } from '@/lib/config/chatConfig';

interface EnhancedChatScreenProps {
  chatId: string;
  onBack?: () => void;
}

const EnhancedChatScreen: React.FC<EnhancedChatScreenProps> = ({ chatId, onBack }) => {
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const { session } = useUserStore();
  const {
    messages,
    currentChat,
    isLoading,
    loadChatMessages,
    sendMessage,
    subscribeToMessages,
    unsubscribeFromMessages,
    initializeOfflineSupport,
    isOnline,
    syncInProgress,
    hasMoreMessages,
    loadingMoreMessages,
  } = useChatStore();
  
  // Pull-to-refresh hook for messages
  const {
    refreshing,
    refreshControl,
    lastSyncTime,
  } = useChatMessagesRefresh(chatId);
  
  // Load more messages hook
  const {
    loadMore,
    loadingMore,
    canLoadMore,
  } = useLoadMoreMessages(chatId);
  
  // Offline sync hook
  const {
    pendingMessages,
    manualSync,
    canSync,
  } = useOfflineSync();
  
  // Initialize chat and offline support
  useEffect(() => {
    const initialize = async () => {
      if (session?.user?.id) {
        await initializeOfflineSupport(session.user.id);
      }
      
      if (chatId) {
        await loadChatMessages(chatId);
        subscribeToMessages(chatId);
      }
    };
    
    initialize();
    
    return () => {
      unsubscribeFromMessages();
    };
  }, [chatId, session?.user?.id]);
  
  // Handle sending messages
  const handleSendMessage = useCallback(async () => {
    if (!messageText.trim() || !session?.user?.id || !chatId) {
      return;
    }
    
    const text = messageText.trim();
    setMessageText('');
    setIsTyping(false);
    
    try {
      await sendMessage({
        chatId,
        senderId: session.user.id,
        text,
        type: 'text',
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      // Message is already queued for offline sync if needed
    }
  }, [messageText, session?.user?.id, chatId, sendMessage]);
  
  // Handle load more messages
  const handleLoadMore = useCallback(() => {
    if (canLoadMore) {
      loadMore();
    }
  }, [canLoadMore, loadMore]);
  
  // Handle manual sync
  const handleManualSync = useCallback(() => {
    if (canSync) {
      manualSync();
    }
  }, [canSync, manualSync]);
  
  // Render message item
  const renderMessage = useCallback(({ item: message }: { item: any }) => {
    const isOwnMessage = message.sender_id === session?.user?.id;
    const messageStatus = message.status || 'sent';
    
    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessage : styles.otherMessage,
      ]}>
        <View style={[
          styles.messageBubble,
          isOwnMessage ? styles.ownBubble : styles.otherBubble,
          messageStatus === 'queued' && styles.queuedMessage,
        ]}>
          <Text style={[
            styles.messageText,
            isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
          ]}>
            {message.text}
          </Text>
          
          {isOwnMessage && (
            <View style={styles.messageStatus}>
              {messageStatus === 'sending' && (
                <Ionicons name="time-outline" size={12} color="#8E8E93" />
              )}
              {messageStatus === 'queued' && (
                <Ionicons name="cloud-upload-outline" size={12} color="#FF9500" />
              )}
              {messageStatus === 'sent' && (
                <Ionicons name="checkmark" size={12} color="#007AFF" />
              )}
            </View>
          )}
        </View>
        
        <Text style={styles.messageTime}>
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    );
  }, [session?.user?.id]);
  
  // Render header
  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#007AFF" />
      </TouchableOpacity>
      
      <View style={styles.headerInfo}>
        <Text style={styles.headerTitle}>
          {currentChat?.name || 'Chat'}
        </Text>
        
        {!isOnline && (
          <Text style={styles.offlineStatus}>Offline</Text>
        )}
        
        {syncInProgress && (
          <Text style={styles.syncStatus}>Syncing...</Text>
        )}
      </View>
      
      {pendingMessages > 0 && (
        <TouchableOpacity onPress={handleManualSync} style={styles.syncButton}>
          <Ionicons name="sync" size={20} color="#FF9500" />
          <Text style={styles.syncButtonText}>{pendingMessages}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
  
  if (isLoading && messages.length === 0) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <LoadingSpinner size="large" text="Loading messages..." />
      </View>
    );
  }
  
  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
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
      
      {/* Messages list */}
      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id || item.tempId || Math.random().toString()}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        refreshControl={refreshControl}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        ListHeaderComponent={
          <MessageLoadingIndicator
            isLoading={loadingMore}
            hasMore={hasMoreMessages}
            onLoadMore={handleLoadMore}
          />
        }
        inverted={false}
      />
      
      {/* Message input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={messageText}
          onChangeText={(text) => {
            setMessageText(text);
            setIsTyping(text.length > 0);
          }}
          placeholder={isOnline ? "Type a message..." : "Message will be sent when online"}
          placeholderTextColor="#8E8E93"
          multiline
          maxLength={CONFIG.UI.BIO_MAX_LENGTH}
        />
        
        <TouchableOpacity
          onPress={handleSendMessage}
          style={[
            styles.sendButton,
            (!messageText.trim() || isTyping) && styles.sendButtonDisabled,
          ]}
          disabled={!messageText.trim()}
        >
          <Ionicons
            name="send"
            size={20}
            color={messageText.trim() ? '#007AFF' : '#C7C7CC'}
          />
        </TouchableOpacity>
      </View>
      
      {/* Last sync time */}
      {lastSyncTime && (
        <Text style={styles.lastSyncText}>
          Last synced: {lastSyncTime.toLocaleTimeString()}
        </Text>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    backgroundColor: '#F8F8F8',
  },
  backButton: {
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  offlineStatus: {
    fontSize: 12,
    color: '#FF6B6B',
    marginTop: 2,
  },
  syncStatus: {
    fontSize: 12,
    color: '#FF9500',
    marginTop: 2,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  syncButtonText: {
    fontSize: 12,
    color: '#FF9500',
    marginLeft: 4,
    fontWeight: '600',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageContainer: {
    marginVertical: 4,
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  ownBubble: {
    backgroundColor: '#007AFF',
  },
  otherBubble: {
    backgroundColor: '#E5E5EA',
  },
  queuedMessage: {
    opacity: 0.7,
    borderWidth: 1,
    borderColor: '#FF9500',
  },
  messageText: {
    fontSize: 16,
    flex: 1,
  },
  ownMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#1C1C1E',
  },
  messageStatus: {
    marginLeft: 6,
  },
  messageTime: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
    marginHorizontal: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    backgroundColor: '#F8F8F8',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    maxHeight: 100,
    backgroundColor: '#FFFFFF',
  },
  sendButton: {
    marginLeft: 8,
    padding: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  lastSyncText: {
    fontSize: 10,
    color: '#8E8E93',
    textAlign: 'center',
    paddingVertical: 4,
    backgroundColor: '#F8F8F8',
  },
});

export default EnhancedChatScreen;
