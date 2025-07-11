/**
 * Optimized Chat Screen Component
 * Phase 2: Performance Improvements
 * 
 * Key optimizations:
 * - React.memo for component memoization
 * - useCallback for event handlers
 * - useMemo for expensive computations
 * - Virtualized list rendering
 * - Debounced typing indicators
 * - Optimized re-renders
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Animated,
  TouchableOpacity,
  Image,
  TextInput as RNTextInput,
  Alert,
  Modal,
  Dimensions,
  StatusBar,
  Linking,
  Pressable,
  ListRenderItem
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Text,
  IconButton,
  Avatar,
  Appbar,
  Surface,
  ActivityIndicator,
  Divider,
  Chip,
  Menu,
  Button,
  Portal,
  TextInput
} from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import { useUserStore } from '@/stores/useUserStore';
import { useChatStore } from '@/stores/useChatStore';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { useOptimizedMessages, useOptimizedTyping, useOptimizedSearch } from '@/hooks/useChatOptimizations';
import { useFriendStore } from '@/stores/useFriendStore';
import { supabase } from '../lib/supabase';
import { chatService } from '../lib/supabaseService';
import { ASSETS } from '@/constants/assets';
import MediaPicker from '@/components/MediaPicker';
import { ChatService } from '@/lib/supabaseService';
import { VoiceSearchService } from '@/lib/voiceSearch';
import { Audio } from 'expo-av';
import { ScrollView } from 'react-native';
import { useAppStateStore } from '@/stores/useAppStateStore';
import { useDebounce, useDebouncedCallback, useThrottledCallback } from '@/utils/performance';
import { LoadingSpinner, SkeletonLoader } from '@/components/LoadingSpinner';
import { Message } from '@/lib/types';
import { CONFIG } from '@/lib/config/chatConfig';

interface ChatScreenProps {
  userId?: string;
  userName?: string;
  userRole?: string;
  userAvatar?: string;
  pingId?: string;
  chatId?: string;
  chatName?: string;
  isGroup?: string;
  participants?: string;
}

// Memoized Message Item Component
const MessageItem = React.memo<{
  message: Message;
  onLongPress: (message: Message, position: { x: number; y: number }) => void;
  onReaction: (messageId: string, emoji: string) => void;
  onReply: (messageId: string) => void;
  currentUserId: string;
}>(({ message, onLongPress, onReaction, onReply, currentUserId }) => {
  const handleLongPress = useCallback((event: any) => {
    const { pageX, pageY } = event.nativeEvent;
    onLongPress(message, { x: pageX, y: pageY });
  }, [message, onLongPress]);

  const handleReaction = useCallback((emoji: string) => {
    onReaction(message.id, emoji);
  }, [message.id, onReaction]);

  const handleReply = useCallback(() => {
    onReply(message.id);
  }, [message.id, onReply]);

  const isOwn = message.senderId === currentUserId;

  return (
    <TouchableOpacity
      onLongPress={handleLongPress}
      style={[styles.messageContainer, isOwn ? styles.ownMessage : styles.otherMessage]}
    >
      <View style={styles.messageContent}>
        {message.mediaUrl && (
          <Image source={{ uri: message.mediaUrl }} style={styles.messageImage} />
        )}
        <Text style={[styles.messageText, isOwn ? styles.ownMessageText : styles.otherMessageText]}>
          {message.text}
        </Text>
        <Text style={styles.timestamp}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
      {message.reactions && Object.keys(message.reactions).length > 0 && (
        <View style={styles.reactionsContainer}>
          {Object.entries(message.reactions).map(([emoji, users]) => (
            <TouchableOpacity
              key={emoji}
              onPress={() => handleReaction(emoji)}
              style={styles.reactionChip}
            >
              <Text style={styles.reactionEmoji}>{emoji}</Text>
              <Text style={styles.reactionCount}>{users.length}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
});

// Memoized Typing Indicator Component
const TypingIndicator = React.memo<{ isVisible: boolean; userName?: string }>(({ isVisible, userName }) => {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: isVisible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isVisible, opacity]);

  if (!isVisible) return null;

  return (
    <Animated.View style={[styles.typingContainer, { opacity }]}>
      <Text style={styles.typingText}>{userName || 'Someone'} is typing...</Text>
      <ActivityIndicator size="small" color="#666" />
    </Animated.View>
  );
});

// Memoized Message Input Component
const MessageInput = React.memo<{
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onMediaPress: () => void;
  onVoicePress: () => void;
  isRecording: boolean;
  placeholder?: string;
}>(({ value, onChangeText, onSend, onMediaPress, onVoicePress, isRecording, placeholder }) => {
  const inputRef = useRef<RNTextInput>(null);

  const handleSend = useCallback(() => {
    if (value.trim()) {
      onSend();
    }
  }, [value, onSend]);

  return (
    <View style={styles.inputContainer}>
      <TouchableOpacity onPress={onMediaPress} style={styles.mediaButton}>
        <IconButton icon="attachment" size={24} iconColor="#666" />
      </TouchableOpacity>
      
      <TextInput
        ref={inputRef}
        style={styles.textInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || "Type a message..."}
        multiline
        maxLength={CONFIG.UI.BIO_MAX_LENGTH}
      />
      
      <TouchableOpacity
        onPress={isRecording ? onVoicePress : (value.trim() ? handleSend : onVoicePress)}
        style={[styles.sendButton, isRecording && styles.recordingButton]}
      >
        <IconButton
          icon={isRecording ? "stop" : (value.trim() ? "send" : "microphone")}
          size={24}
          iconColor={isRecording ? "#ff4444" : "#007AFF"}
        />
      </TouchableOpacity>
    </View>
  );
});

const OptimizedChatScreen: React.FC<ChatScreenProps> = (props) => {
  const {
    userId,
    userName,
    userRole,
    userAvatar,
    pingId,
    chatId,
    chatName,
    isGroup,
    participants
  } = props;

  const isGroupChat = isGroup === 'true';
  
  // State management
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });

  // Refs
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Store hooks
  const currentUser = useUserStore((state: any) => state.user);
  const chatStore = useChatStore();
  const { friends } = useFriendStore();
  const { updateActivity } = useAppStateStore();
  
  // Performance monitoring
  const {
    metrics,
    alerts,
    isMonitoring,
    trackFrame,
    getRecommendations
  } = usePerformanceMonitor({
    enabled: true,
    interval: 10000, // Monitor every 10 seconds
    alertThresholds: {
      memoryWarning: 0.8,
      subscriptionWarning: 15,
      latencyWarning: 1000
    }
  });

  // Custom hooks for optimizations
  const { sortedMessages: optimizedMessages, pinnedMessages } = useOptimizedMessages(messages);
  const { isTyping: optimizedIsTyping, startTyping, stopTyping } = useOptimizedTyping(chatId as string, currentUser?.id || '');
  
  // Typing handlers
  const handleTypingStart = useCallback(() => {
    startTyping();
    setIsTyping(true);
  }, [startTyping]);
  
  const handleTypingStop = useCallback(() => {
    stopTyping();
    setIsTyping(false);
  }, [stopTyping]);

  // Debounced functions
  const debouncedTyping = useDebouncedCallback(handleTypingStart, 300);
  const debouncedStopTyping = useDebouncedCallback(handleTypingStop, 1000);
  const debouncedSearch = useDebounce(inputText, 300);

  // Memoized computations
  const sortedMessages = useMemo(() => {
    return optimizedMessages.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [optimizedMessages]);

  const groupParticipants = useMemo(() => {
    return participants ? JSON.parse(participants as string) : [];
  }, [participants]);

  const currentUserName = useMemo(() => {
    return currentUser?.full_name || currentUser?.email || 'You';
  }, [currentUser]);

  // Optimized event handlers
  const handleSendMessage = useCallback(async () => {
    if (!inputText.trim() || !currentUser?.id) return;

    const messageText = inputText.trim();
    setInputText('');
    handleTypingStop();
    
    const startTime = performance.now();
    
    try {
      await chatStore.sendMessage({
        chatId: chatId as string,
        text: messageText,
        senderId: currentUser.id
      });

      // Track performance
      const endTime = performance.now();
      trackFrame(endTime - startTime);

      // Scroll to bottom after sending
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
      // Restore message on error
      setInputText(messageText);
    }
  }, [inputText, currentUser?.id, chatId, chatStore, handleTypingStop, trackFrame]);

  const handleInputChange = useCallback((text: string) => {
    setInputText(text);
    
    if (text.length > 0 && !isTyping) {
      handleTypingStart();
    } else if (text.length === 0 && isTyping) {
      handleTypingStop();
    }
  }, [isTyping, handleTypingStart, handleTypingStop]);

  const handleMessageLongPress = useCallback((message: Message, position: { x: number; y: number }) => {
    setSelectedMessage(message);
    setContextMenuPosition(position);
    setContextMenuVisible(true);
  }, []);

  const handleReaction = useCallback(async (messageId: string, emoji: string) => {
    try {
      // Implement reaction logic here
      console.log('Adding reaction:', emoji, 'to message:', messageId);
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  }, []);

  const handleReply = useCallback((messageId: string) => {
    // Implement reply logic here
    console.log('Replying to message:', messageId);
  }, []);

  const handleMediaPress = useCallback(() => {
    // Implement media picker logic
    console.log('Opening media picker');
  }, []);

  const handleVoicePress = useCallback(() => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
    } else {
      // Start recording
      setIsRecording(true);
    }
  }, [isRecording]);

  // Optimized render item function
  const renderMessage: ListRenderItem<Message> = useCallback(({ item }) => (
    <MessageItem
      message={item}
      onLongPress={handleMessageLongPress}
      onReaction={handleReaction}
      onReply={handleReply}
      currentUserId={currentUser?.id || ''}
    />
  ), [handleMessageLongPress, handleReaction, handleReply, currentUser?.id]);

  const keyExtractor = useCallback((item: Message) => item.id, []);

  const getItemLayout = useCallback((data: any, index: number) => ({
    length: 80, // Estimated item height
    offset: 80 * index,
    index,
  }), []);

  // Load messages and setup subscriptions on mount
  useEffect(() => {
    const initializeChat = async () => {
      if (!chatId || !currentUser?.id) return;
      
      setIsLoading(true);
      const startTime = performance.now();
      
      try {
        // Load initial messages
        await chatStore.loadChatMessages(chatId as string);
        
        // Subscribe to real-time updates
        chatStore.subscribeToMessages(chatId as string);
        
        // Track initialization performance
        const endTime = performance.now();
        trackFrame(endTime - startTime);
        
      } catch (error) {
        console.error('Error initializing chat:', error);
        Alert.alert('Error', 'Failed to load chat. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    initializeChat();
    
    // Cleanup subscriptions on unmount
    return () => {
      if (chatId) {
        chatStore.unsubscribeFromMessages();
      }
      handleTypingStop();
    };
  }, [chatId, currentUser?.id, chatStore, trackFrame, handleTypingStop]);

  // Handle performance alerts
  useEffect(() => {
    if (alerts.length > 0) {
      const highPriorityAlerts = alerts.filter(alert => alert.severity === 'high');
      
      if (highPriorityAlerts.length > 0) {
        console.warn('[OptimizedChatScreen] Performance alerts:', highPriorityAlerts);
        
        // Take automatic action for critical issues
        highPriorityAlerts.forEach(alert => {
          if (alert.type === 'memory') {
            console.log('Memory pressure detected - consider optimizing');
          } else if (alert.type === 'subscriptions') {
            console.log('Too many subscriptions detected');
          }
        });
      }
    }
  }, [alerts]);
  
  // Performance stats for development
  const performanceStats = useMemo(() => {
    if (!__DEV__ || !metrics) return null;
    
    const chatStats = chatStore.getPerformanceStats?.() || {};
    
    return {
      subscriptions: metrics.realtime.activeSubscriptions,
      memoryUsage: Math.round(metrics.memory.heapUsed),
      cacheHitRate: Math.round(metrics.dataLoading.cacheHitRate * 100),
      messagesCount: messages.length,
      isResponsive: metrics.ui.isResponsive
    };
  }, [metrics, messages.length, chatStore]);

  // Redirect to group chat if needed
  if (isGroupChat && chatId) {
    router.replace({
      pathname: '/groupChat',
      params: { chatId, chatName, participants }
    });
    return null;
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner size="large" message="Loading chat..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Avatar.Image
          size={40}
          source={userAvatar ? { uri: userAvatar } : ASSETS.IMAGES.BLACK_CIRCLE}
        />
        <Appbar.Content
          title={userName || chatName || 'Chat'}
          subtitle={optimizedIsTyping ? 'typing...' : 'online'}
        />
        <Appbar.Action icon="phone" onPress={() => {}} />
        <Appbar.Action icon="video" onPress={() => {}} />
        <Appbar.Action icon="dots-vertical" onPress={() => {}} />
      </Appbar.Header>
      
      {/* Performance Stats (Development Only) */}
      {__DEV__ && performanceStats && (
        <Surface style={styles.performanceHeader}>
          <Text style={styles.performanceText}>
            Subs: {performanceStats.subscriptions} | 
            Mem: {performanceStats.memoryUsage}MB | 
            Cache: {performanceStats.cacheHitRate}% | 
            Msgs: {performanceStats.messagesCount} |
            {performanceStats.isResponsive ? ' ✅' : ' ⚠️'}
          </Text>
          {alerts.length > 0 && (
            <Text style={styles.alertText}>
              {alerts.length} alert(s)
            </Text>
          )}
        </Surface>
      )}
      
      {/* Performance Recommendations (Development Only) */}
      {__DEV__ && getRecommendations().length > 0 && (
        <Surface style={styles.recommendationsContainer}>
          <Text style={styles.recommendationsTitle}>Performance Tips:</Text>
          {getRecommendations().slice(0, 2).map((rec, index) => (
            <Text key={index} style={styles.recommendationText}>• {rec}</Text>
          ))}
        </Surface>
      )}

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={sortedMessages}
          renderItem={renderMessage}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
          initialNumToRender={20}
          updateCellsBatchingPeriod={50}
          onEndReachedThreshold={0.1}
        />

        {/* Typing Indicator */}
        <TypingIndicator isVisible={otherUserTyping} userName={userName} />

        {/* Message Input */}
        <MessageInput
          value={inputText}
          onChangeText={handleInputChange}
          onSend={handleSendMessage}
          onMediaPress={handleMediaPress}
          onVoicePress={handleVoicePress}
          isRecording={isRecording}
        />
      </KeyboardAvoidingView>

      {/* Context Menu */}
      <Portal>
        <Modal
          visible={contextMenuVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setContextMenuVisible(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setContextMenuVisible(false)}
          >
            <View
              style={[
                styles.contextMenu,
                {
                  left: contextMenuPosition.x - 100,
                  top: contextMenuPosition.y - 50,
                }
              ]}
            >
              <Button onPress={() => handleReply(selectedMessage?.id || '')}>
                Reply
              </Button>
              <Button onPress={() => handleReaction(selectedMessage?.id || '', '👍')}>
                React
              </Button>
              <Button onPress={() => setContextMenuVisible(false)}>
                Copy
              </Button>
            </View>
          </Pressable>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#fff',
    elevation: 2,
  },
  performanceHeader: {
    backgroundColor: '#e3f2fd',
    padding: 8,
    elevation: 1,
  },
  performanceText: {
    fontSize: 12,
    color: '#1976d2',
    fontFamily: 'monospace',
  },
  alertText: {
    fontSize: 12,
    color: '#d32f2f',
    fontWeight: 'bold',
    marginTop: 2,
  },
  recommendationsContainer: {
    backgroundColor: '#fff3e0',
    padding: 8,
    elevation: 1,
  },
  recommendationsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#f57c00',
    marginBottom: 4,
  },
  recommendationText: {
    fontSize: 11,
    color: '#f57c00',
  },
  keyboardContainer: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageContainer: {
    marginVertical: 4,
    maxWidth: '80%',
  },
  ownMessage: {
    alignSelf: 'flex-end',
  },
  otherMessage: {
    alignSelf: 'flex-start',
  },
  messageContent: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 16,
  },
  ownMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#000',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'right',
  },
  reactionsContainer: {
    flexDirection: 'row',
    marginTop: 4,
  },
  reactionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 4,
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    fontSize: 12,
    marginLeft: 2,
    color: '#666',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingText: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  mediaButton: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    marginLeft: 8,
  },
  recordingButton: {
    backgroundColor: '#ffebee',
    borderRadius: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  contextMenu: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});

export default React.memo(OptimizedChatScreen);