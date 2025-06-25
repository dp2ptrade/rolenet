/**
 * Optimized Group Chat Screen Component
 * Phase 2: Performance Improvements
 * 
 * Key optimizations:
 * - React.memo for component memoization
 * - useCallback for event handlers
 * - useMemo for expensive computations
 * - Virtualized list rendering
 * - Debounced typing indicators
 * - Optimized participant management
 * - Smart re-rendering strategies
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
  ScrollView,
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
  Button,
  Menu,
  Switch,
  Portal,
  Dialog,
  List,
  Searchbar,
  TextInput
} from 'react-native-paper';
import Clipboard from '@react-native-clipboard/clipboard';
import { useLocalSearchParams, router } from 'expo-router';
import { useUserStore } from '../stores/useUserStore';
import { useFriendStore } from '../stores/useFriendStore';
import { useStatusStore } from '../stores/useStatusStore';
import { supabase } from '../lib/supabase';
import { chatService } from '../lib/supabaseService';
import MediaPicker from '../components/MediaPicker';
import { ChatService } from '@/lib/supabaseService';
import * as ImagePicker from 'expo-image-picker';
import { VoiceSearchService } from '@/lib/voiceSearch';
import { Audio } from 'expo-av';
import AnimatedStatusDot from '../components/AnimatedStatusDot';
import { useAppStateStore } from '../stores/useAppStateStore';
import { useOptimizedMessages, useOptimizedSearch } from '@/hooks/useChatOptimizations';
import { useDebounce, useDebouncedCallback, useThrottledCallback } from '@/utils/performance';
import { LoadingSpinner, SkeletonLoader } from '@/components/LoadingSpinner';
import { Message } from '@/lib/types';
import { CONFIG } from '@/lib/config/chatConfig';

interface Participant {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  online_status?: 'online' | 'offline' | 'away';
  role?: 'admin' | 'member';
}

interface GroupChatScreenProps {
  chatId?: string;
  chatName?: string;
  participants?: string;
}

// Memoized Group Message Item Component
const GroupMessageItem = React.memo<{
  message: Message;
  participants: Participant[];
  onLongPress: (message: Message, position: { x: number; y: number }) => void;
  onReaction: (messageId: string, emoji: string) => void;
  onReply: (messageId: string) => void;
  currentUserId: string;
}>(({ message, participants, onLongPress, onReaction, onReply, currentUserId }) => {
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

  const sender = useMemo(() => {
    return participants.find(p => p.id === message.senderId);
  }, [participants, message.senderId]);

  const isOwn = message.senderId === currentUserId;
  const senderName = sender?.full_name || sender?.email || 'Unknown';
  const senderAvatar = sender?.avatar_url;

  return (
    <TouchableOpacity
      onLongPress={handleLongPress}
      style={[styles.messageContainer, isOwn ? styles.ownMessage : styles.otherMessage]}
    >
      {!isOwn && (
        <Avatar.Image
          size={32}
          source={senderAvatar ? { uri: senderAvatar } : { uri: 'https://via.placeholder.com/32' }}
          style={styles.senderAvatar}
        />
      )}
      
      <View style={[styles.messageContent, isOwn ? styles.ownMessageContent : styles.otherMessageContent]}>
        {!isOwn && (
          <Text style={styles.senderName}>{senderName}</Text>
        )}
        
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
              <Text style={styles.reactionCount}>{(users as string[]).length}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
});

// Memoized Participant List Item
const ParticipantItem = React.memo<{
  participant: Participant;
  isAdmin: boolean;
  currentUserId: string;
  onRemove?: (participantId: string) => void;
  onMakeAdmin?: (participantId: string) => void;
}>(({ participant, isAdmin, currentUserId, onRemove, onMakeAdmin }) => {
  const handleRemove = useCallback(() => {
    if (onRemove) {
      onRemove(participant.id);
    }
  }, [participant.id, onRemove]);

  const handleMakeAdmin = useCallback(() => {
    if (onMakeAdmin) {
      onMakeAdmin(participant.id);
    }
  }, [participant.id, onMakeAdmin]);

  const isCurrentUser = participant.id === currentUserId;
  const isParticipantAdmin = participant.role === 'admin';

  return (
    <List.Item
      title={participant.full_name || participant.email}
      description={isParticipantAdmin ? 'Admin' : 'Member'}
      left={(props) => (
        <View style={styles.participantAvatarContainer}>
          <Avatar.Image
            {...props}
            size={40}
            source={participant.avatar_url ? { uri: participant.avatar_url } : { uri: 'https://via.placeholder.com/40' }}
          />
          <AnimatedStatusDot status={participant.online_status || 'offline'} />
        </View>
      )}
      right={(props) => (
        isAdmin && !isCurrentUser ? (
          <Menu
            visible={false}
            onDismiss={() => {}}
            anchor={
              <IconButton {...props} icon="dots-vertical" onPress={() => {}} />
            }
          >
            {!isParticipantAdmin && (
              <Menu.Item onPress={handleMakeAdmin} title="Make Admin" />
            )}
            <Menu.Item onPress={handleRemove} title="Remove" />
          </Menu>
        ) : null
      )}
    />
  );
});

// Memoized Group Typing Indicator
const GroupTypingIndicator = React.memo<{
  typingUsers: string[];
  participants: Participant[];
}>(({ typingUsers, participants }) => {
  const typingNames = useMemo(() => {
    return typingUsers
      .map(userId => {
        const participant = participants.find(p => p.id === userId);
        return participant?.full_name || participant?.email || 'Someone';
      })
      .slice(0, 3); // Show max 3 names
  }, [typingUsers, participants]);

  if (typingNames.length === 0) return null;

  const typingText = useMemo(() => {
    if (typingNames.length === 1) {
      return `${typingNames[0]} is typing...`;
    } else if (typingNames.length === 2) {
      return `${typingNames[0]} and ${typingNames[1]} are typing...`;
    } else {
      return `${typingNames[0]}, ${typingNames[1]} and ${typingNames.length - 2} others are typing...`;
    }
  }, [typingNames]);

  return (
    <View style={styles.typingContainer}>
      <Text style={styles.typingText}>{typingText}</Text>
      <ActivityIndicator size="small" color="#666" />
    </View>
  );
});

const OptimizedGroupChatScreen: React.FC<GroupChatScreenProps> = (props) => {
  const { chatId, chatName, participants: participantsParam } = props;
  
  // State management
  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [groupSettings, setGroupSettings] = useState({
    notifications: true,
    mediaAutoDownload: true,
  });

  // Refs
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Store hooks
  const currentUser = useUserStore((state: any) => state.user);
  const { friends } = useFriendStore();
  const { userStatuses, subscribeToUserStatuses, unsubscribeFromUserStatuses } = useStatusStore();
  const { updateActivity } = useAppStateStore();

  // Custom hooks for optimizations
  const { sortedMessages: optimizedMessages, pinnedMessages } = useOptimizedMessages(messages);
  const { searchResults: searchMessages, updateSearchQuery, clearSearch } = useOptimizedSearch(messages);
  
  // Typing handlers
  const handleTypingStart = useCallback(() => {
    // Add typing start logic here
  }, []);
  
  const handleTypingStop = useCallback(() => {
    // Add typing stop logic here
  }, []);

  // Debounced functions
  const debouncedTyping = useDebouncedCallback(handleTypingStart, 300);
  const debouncedStopTyping = useDebouncedCallback(handleTypingStop, 1000);
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Memoized computations
  const sortedMessages = useMemo(() => {
    const filtered = searchQuery 
      ? optimizedMessages.filter(msg => 
          msg.text?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : optimizedMessages;
    
    return filtered.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [optimizedMessages, searchQuery]);

  const groupParticipants = useMemo(() => {
    return participantsParam ? JSON.parse(participantsParam as string) : [];
  }, [participantsParam]);

  const currentUserRole = useMemo(() => {
    const currentParticipant = participants.find(p => p.id === currentUser?.id);
    return currentParticipant?.role || 'member';
  }, [participants, currentUser?.id]);

  const isAdmin = currentUserRole === 'admin';

  const onlineParticipants = useMemo(() => {
    return participants.filter(p => p.online_status === 'online').length;
  }, [participants]);

  // Optimized event handlers
  const handleSendMessage = useCallback(async () => {
    if (!inputText.trim() || !currentUser?.id || !chatId) return;

    const messageText = inputText.trim();
    setInputText('');
    
    try {
      // Create optimistic message
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        text: messageText,
        senderId: currentUser.id,
        chat_id: chatId,
        timestamp: new Date(),
        type: 'text',
        status: 'sent'
      };

      // Add optimistic message immediately
      setMessages(prev => [...prev, optimisticMessage]);

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

      // Send actual message
      const { data, error } = await supabase
        .from('messages')
        .insert({
          text: messageText,
          senderId: currentUser.id,
          chat_id: chatId,
          timestamp: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        // Remove optimistic message on error
        setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
        Alert.alert('Error', 'Failed to send message. Please try again.');
      } else {
        // Replace optimistic message with real one
        setMessages(prev => 
          prev.map(msg => 
            msg.id === optimisticMessage.id 
              ? { ...data }
              : msg
          )
        );
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  }, [inputText, currentUser?.id, chatId]);

  const handleInputChange = useCallback((text: string) => {
    setInputText(text);
    
    // Handle typing indicators
    if (text.length > 0 && !isTyping) {
      setIsTyping(true);
      debouncedTyping();
    }
    
    // Clear typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      debouncedStopTyping();
    }, 1000);
  }, [isTyping, debouncedTyping, debouncedStopTyping]);

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

  const handleRemoveParticipant = useCallback(async (participantId: string) => {
    if (!isAdmin) return;
    
    try {
      // Implement remove participant logic
      console.log('Removing participant:', participantId);
    } catch (error) {
      console.error('Error removing participant:', error);
    }
  }, [isAdmin]);

  const handleMakeAdmin = useCallback(async (participantId: string) => {
    if (!isAdmin) return;
    
    try {
      // Implement make admin logic
      console.log('Making admin:', participantId);
    } catch (error) {
      console.error('Error making admin:', error);
    }
  }, [isAdmin]);

  // Optimized render functions
  const renderMessage: ListRenderItem<Message> = useCallback(({ item }) => (
    <GroupMessageItem
      message={item}
      participants={participants}
      onLongPress={handleMessageLongPress}
      onReaction={handleReaction}
      onReply={handleReply}
      currentUserId={currentUser?.id || ''}
    />
  ), [participants, handleMessageLongPress, handleReaction, handleReply, currentUser?.id]);

  const renderParticipant: ListRenderItem<Participant> = useCallback(({ item }) => (
    <ParticipantItem
      participant={item}
      isAdmin={isAdmin}
      currentUserId={currentUser?.id || ''}
      onRemove={handleRemoveParticipant}
      onMakeAdmin={handleMakeAdmin}
    />
  ), [isAdmin, currentUser?.id, handleRemoveParticipant, handleMakeAdmin]);

  const keyExtractor = useCallback((item: Message | Participant) => item.id, []);

  const getItemLayout = useCallback((data: any, index: number) => ({
    length: 80, // Estimated item height
    offset: 80 * index,
    index,
  }), []);

  // Load data effects
  useEffect(() => {
    const loadGroupData = async () => {
      if (!chatId || !currentUser?.id) return;
      
      setIsLoading(true);
      try {
        // Load messages
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .eq('chat_id', chatId)
          .order('timestamp', { ascending: true });

        if (messagesError) {
          console.error('Error loading messages:', messagesError);
        } else {
          setMessages(messagesData?.map(msg => ({
            ...msg,
            // isOwn will be calculated based on senderId
          })) || []);
        }

        // Load participants
        const { data: chatData, error: chatError } = await supabase
          .from('chats')
          .select('participants')
          .eq('id', chatId)
          .single();

        if (chatError) {
          console.error('Error loading chat data:', chatError);
        } else if (chatData?.participants) {
          const participantIds = Array.isArray(chatData.participants) 
            ? chatData.participants 
            : JSON.parse(chatData.participants);
          
          const { data: participantsData, error: participantsError } = await supabase
            .from('users')
            .select('id, full_name, email, avatar_url, online_status')
            .in('id', participantIds);

          if (participantsError) {
            console.error('Error loading participants:', participantsError);
          } else {
            setParticipants(participantsData || []);
          }
        }
      } catch (error) {
        console.error('Error loading group data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadGroupData();
  }, [chatId, currentUser?.id]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!chatId) return;

    const channel = supabase
      .channel(`group-chat:${chatId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`
      }, (payload) => {
        const newMessage = payload.new as Message;
        setMessages(prev => [...prev, {
          ...newMessage,
          // isOwn will be calculated based on senderId
        }]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, currentUser?.id]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner size="large" message="Loading group chat..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Avatar.Text size={40} label={chatName?.charAt(0) || 'G'} />
        <Appbar.Content
          title={chatName || 'Group Chat'}
          subtitle={`${onlineParticipants} online • ${participants.length} members`}
        />
        <Appbar.Action 
          icon="magnify" 
          onPress={() => setSearchVisible(!searchVisible)} 
        />
        <Appbar.Action 
          icon="account-group" 
          onPress={() => setSidebarVisible(true)} 
        />
        <Appbar.Action icon="dots-vertical" onPress={() => {}} />
      </Appbar.Header>

      {/* Search Bar */}
      {searchVisible && (
        <Searchbar
          placeholder="Search messages..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
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
        <GroupTypingIndicator typingUsers={typingUsers} participants={participants} />

        {/* Message Input */}
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.mediaButton}>
            <IconButton icon="attachment" size={24} iconColor="#666" />
          </TouchableOpacity>
          
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={handleInputChange}
            placeholder="Type a message..."
            multiline
            maxLength={CONFIG.UI.BIO_MAX_LENGTH}
          />
          
          <TouchableOpacity
            onPress={inputText.trim() ? handleSendMessage : () => setIsRecording(!isRecording)}
            style={[styles.sendButton, isRecording && styles.recordingButton]}
          >
            <IconButton
              icon={isRecording ? "stop" : (inputText.trim() ? "send" : "microphone")}
              size={24}
              iconColor={isRecording ? "#ff4444" : "#007AFF"}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Participants Sidebar */}
      <Portal>
        <Modal
          visible={sidebarVisible}
          animationType="slide"
          onRequestClose={() => setSidebarVisible(false)}
        >
          <SafeAreaView style={styles.sidebarContainer}>
            <Appbar.Header>
              <Appbar.BackAction onPress={() => setSidebarVisible(false)} />
              <Appbar.Content title="Group Members" />
              {isAdmin && (
                <Appbar.Action icon="account-plus" onPress={() => {}} />
              )}
            </Appbar.Header>
            
            <FlatList
              data={participants}
              renderItem={renderParticipant}
              keyExtractor={keyExtractor}
              style={styles.participantsList}
            />
          </SafeAreaView>
        </Modal>
      </Portal>

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
              <Button onPress={() => {
                if (selectedMessage?.text) {
                  Clipboard.setString(selectedMessage.text);
                }
                setContextMenuVisible(false);
              }}>
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
  searchBar: {
    margin: 8,
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
    flexDirection: 'row',
    marginVertical: 4,
    maxWidth: '80%',
  },
  ownMessage: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  otherMessage: {
    alignSelf: 'flex-start',
  },
  senderAvatar: {
    marginRight: 8,
    marginTop: 4,
  },
  messageContent: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 16,
    flex: 1,
  },
  ownMessageContent: {
    backgroundColor: '#007AFF',
    marginLeft: 8,
  },
  otherMessageContent: {
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  senderName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#000',
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
  sidebarContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  participantsList: {
    flex: 1,
  },
  participantAvatarContainer: {
    position: 'relative',
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

export default React.memo(OptimizedGroupChatScreen);