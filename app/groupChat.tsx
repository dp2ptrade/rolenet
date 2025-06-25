import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform, Animated, TouchableOpacity, Image, TextInput as RNTextInput, Alert, Modal, Dimensions, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, IconButton, Avatar, Appbar, Surface, ActivityIndicator, Divider, Chip, Button, Menu, Switch, Portal, Dialog, List, Searchbar } from 'react-native-paper';
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
import * as Audio from 'expo-audio';
import AnimatedStatusDot from '../components/AnimatedStatusDot';
import { useAppStateStore } from '../stores/useAppStateStore';
import { CONFIG } from '@/lib/config/chatConfig';

interface Message {
  id: string;
  text: string;
  sender_id: string;
  chat_id: string;
  timestamp: string;
  isOwn: boolean;
  status: 'sent' | 'delivered' | 'read' | 'edited';
  reactions?: { [key: string]: string[] }; // Emoji reactions by user IDs
  replyTo?: string; // ID of the message being replied to
  mediaUrl?: string; // URL for media or file attachment
  mediaType?: 'image' | 'file' | 'voice' | 'document' | 'poll' | 'link'; // Type of media attachment
  isPinned?: boolean; // Whether the message is pinned
  _isLocalMessage?: boolean; // Flag to prevent duplicate from real-time subscription
}

export default function GroupChatScreen() {
  const { chatId, chatName, participants } = useLocalSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [replyToMessageId, setReplyToMessageId] = useState<string | null>(null);
  const [reactionMenuVisible, setReactionMenuVisible] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuMessageId, setContextMenuMessageId] = useState<string | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [contextMenuLayout, setContextMenuLayout] = useState({ width: 0, height: 0 });
  const [editingMessage, setEditingMessage] = useState<{ id: string, text: string } | null>(null);
  const [messageAnimations, setMessageAnimations] = useState<{ [key: string]: Animated.Value }>({});
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  
  // New state for enhanced UI features
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPlayingAudio, setIsPlayingAudio] = useState<string | null>(null);
  const [searchVisible, setSearchVisible] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [groupSettings, setGroupSettings] = useState({
    notifications: true,
    mediaAutoDownload: true,
  });
  const [inviteDialogVisible, setInviteDialogVisible] = useState(false);
  const [leaveGroupDialogVisible, setLeaveGroupDialogVisible] = useState(false);
  const [forwardDialogVisible, setForwardDialogVisible] = useState(false);
  const [messageToForward, setMessageToForward] = useState<Message | null>(null);
  const [selectedChats, setSelectedChats] = useState<string[]>([]);
  const [pinnedExpanded, setPinnedExpanded] = useState(false);
  const [chatAvatar, setChatAvatar] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [groupUniqueLink, setGroupUniqueLink] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<RNTextInput>(null);
  const currentUser = useUserStore((state: any) => state.user);
  const { friends } = useFriendStore();
  const { userStatuses, subscribeToUserStatuses, unsubscribeFromUserStatuses } = useStatusStore();
  const { updateActivity } = useAppStateStore();
  const typingTimeoutRef = useRef<number | null>(null);
  const groupParticipants = participants ? JSON.parse(participants as string) : [];

  useEffect(() => {
    if (!currentUser?.id || !chatId) return;

    // Load chat details including avatar
    const fetchChatDetails = async () => {
      try {
        const { data, error } = await supabase
          .from('chats')
          .select('avatar_url, unique_link')
          .eq('id', chatId)
          .single();

        if (error) {
          console.error('Error fetching chat details:', error);
          return;
        }

        if (data) {
          if (data.avatar_url) {
            setChatAvatar(data.avatar_url);
          }
          if (data.unique_link) {
            setGroupUniqueLink(data.unique_link);
          }
        }
      } catch (error) {
        console.error('Error fetching chat avatar:', error);
      }
    };

    // Load chat history for group chat
    const fetchMessages = async () => {
      try {
        console.log('Fetching messages for group chat ID:', chatId);
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('chat_id', chatId)
          .order('created_at', { ascending: true });

        if (error) {
          console.error(`Error loading messages for group chat ${chatId}:`, error);
          return;
        }

        console.log(`Fetched ${data?.length || 0} messages for group chat ${chatId}`);
        if (data && data.length > 0) {
          const formattedMessages = data.map(msg => ({
            id: msg.id,
            text: msg.text,
            sender_id: msg.sender_id,
            chat_id: msg.chat_id,
            timestamp: msg.created_at,
            isOwn: msg.sender_id === currentUser.id,
            status: msg.status || 'sent',
            reactions: msg.reactions || {},
            replyTo: msg.reply_to || undefined,
            mediaUrl: msg.media_url === '' ? undefined : msg.media_url || undefined,
            mediaType: msg.media_type || undefined,
            isPinned: msg.is_pinned || false,
          }));
          // Sort by timestamp to show messages in chronological order
          const sortedMessages = formattedMessages.sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          setMessages(sortedMessages);
          // Set pinned messages
          const pinned = sortedMessages.filter(msg => msg.isPinned);
          setPinnedMessages(pinned);
          // Initialize animations for existing messages
          const animations = sortedMessages.reduce((acc: { [key: string]: Animated.Value }, msg) => {
            acc[msg.id] = new Animated.Value(1);
            return acc;
          }, {});
          setMessageAnimations(animations);
        }
      } catch (error) {
        console.error('Error fetching messages for group chat:', error);
      }
    };

    fetchMessages();
    fetchChatDetails();

    // Subscribe to real-time messages and typing status for group chat
    let subscription: any = null;
    const setupSubscription = async () => {
      try {
        subscription = supabase
          .channel(`chat:${chatId}`)
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `chat_id=eq.${chatId}`
          }, (payload) => {
            const newMessage = {
              id: payload.new.id,
              text: payload.new.text,
              sender_id: payload.new.sender_id,
              chat_id: payload.new.chat_id,
              timestamp: payload.new.created_at,
              isOwn: payload.new.sender_id === currentUser.id,
              status: payload.new.status || 'sent',
              reactions: payload.new.reactions || {},
              replyTo: payload.new.reply_to || undefined,
              mediaUrl: payload.new.media_url || undefined,
              mediaType: payload.new.media_type || undefined,
              isPinned: payload.new.is_pinned || false,
            };
            if (newMessage.isPinned) {
              setPinnedMessages(prev => {
                if (prev.some(msg => msg.id === newMessage.id)) {
                  return prev;
                }
                return [...prev, newMessage].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
              });
            }
            setMessages(prev => {
              // Check if message with this ID already exists or if it's a duplicate from the current user
              if (prev.some(msg => msg.id === newMessage.id) || 
                  (newMessage.isOwn && prev.some(msg => 
                    msg.text === newMessage.text && 
                    msg.sender_id === newMessage.sender_id && 
                    Math.abs(new Date(msg.timestamp).getTime() - new Date(newMessage.timestamp).getTime()) < 5000
                  ))) {
                return prev;
              }
              const updatedMessages = [...prev, newMessage].sort((a, b) => 
                new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
              );
              // Add animation for the new message
              setMessageAnimations(animations => {
                const newAnimation = new Animated.Value(0);
                const updatedAnimations = {
                  ...animations,
                  [newMessage.id]: newAnimation,
                };
                // Start animation for the new message
                Animated.spring(newAnimation, {
                  toValue: 1,
                  friction: 5,
                  useNativeDriver: Platform.OS !== 'web',
                }).start();
                return updatedAnimations;
              });
              return updatedMessages;
            });
          })
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
            filter: `chat_id=eq.${chatId}`
          }, (payload) => {
            // Handle message updates (pin status, reactions, edits)
            const updatedMessage = {
              id: payload.new.id,
              text: payload.new.text,
              sender_id: payload.new.sender_id,
              chat_id: payload.new.chat_id,
              timestamp: payload.new.created_at,
              isOwn: payload.new.sender_id === currentUser.id,
              status: payload.new.status || 'sent',
              reactions: payload.new.reactions || {},
              replyTo: payload.new.reply_to || undefined,
              mediaUrl: payload.new.media_url || undefined,
              mediaType: payload.new.media_type || undefined,
              isPinned: payload.new.is_pinned || false,
            };
            
            // Update the message in the main messages array
            setMessages(prev => prev.map(msg => 
              msg.id === updatedMessage.id ? updatedMessage : msg
            ));
            
            // Handle pinned messages updates
            if (updatedMessage.isPinned) {
              setPinnedMessages(prev => {
                const existingIndex = prev.findIndex(msg => msg.id === updatedMessage.id);
                if (existingIndex !== -1) {
                  // Update existing pinned message
                  const updated = [...prev];
                  updated[existingIndex] = updatedMessage;
                  return updated.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                } else {
                  // Add new pinned message
                  return [...prev, updatedMessage].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                }
              });
            } else {
              // Remove from pinned messages if unpinned
              setPinnedMessages(prev => prev.filter(msg => msg.id !== updatedMessage.id));
            }
          })
          .on('postgres_changes', {
            event: 'DELETE',
            schema: 'public',
            table: 'messages',
            filter: `chat_id=eq.${chatId}`
          }, (payload) => {
            // Remove the deleted message from state
            setMessages(prev => prev.filter(msg => msg.id !== payload.old.id));
            // Also remove from pinned messages if it was pinned
            setPinnedMessages(prev => prev.filter(msg => msg.id !== payload.old.id));
          })
          .on('broadcast', { event: 'typing' }, (payload) => {
            // For group chats, handle typing from any participant
            if (groupParticipants.includes(payload.userId)) {
              setOtherUserTyping(payload.isTyping);
            }
          })
          .subscribe();
      } catch (error) {
        console.error('Error setting up group chat subscription:', error);
      }
    };

    setupSubscription();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [currentUser?.id, chatId, participants]);

  // Separate useEffect for user status subscriptions to prevent multiple subscription issues
  useEffect(() => {
    if (!currentUser?.id || groupParticipants.length === 0) return;

    // Subscribe to status updates for group participants
    subscribeToUserStatuses(groupParticipants);

    return () => {
      unsubscribeFromUserStatuses();
    };
  }, [currentUser?.id, JSON.stringify(groupParticipants)]);

  // Recording timer effect
  useEffect(() => {
    let interval: number | undefined;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      setRecordingDuration(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  // Voice recording functions
  const startVoiceRecording = async () => {
    try {
      // Check if already recording
      if (VoiceSearchService.isCurrentlyRecording()) {
        console.log('Recording already in progress');
        return;
      }

      // Request audio permissions
      const { status } = await Audio.requestRecordingPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant microphone permission to record voice messages.');
        return;
      }

      await VoiceSearchService.startRecording();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting voice recording:', error);
      setIsRecording(false);
      Alert.alert('Recording Error', 'Failed to start voice recording. Please try again.');
    }
  };

  const stopVoiceRecording = async () => {
    try {
      if (!VoiceSearchService.isCurrentlyRecording()) {
        setIsRecording(false);
        return;
      }

      const transcript = await VoiceSearchService.stopRecording();
      setIsRecording(false);
      
      const audioUri = VoiceSearchService.getLastAudioUri();
      if (audioUri) {
        await sendVoiceMessage(audioUri);
      } else if (transcript && transcript.trim() && 
                 !transcript.includes('Speech-to-text not implemented') &&
                 !transcript.includes('No speech detected') &&
                 !transcript.includes('No active recording')) {
        setInputText(transcript);
      } else if (transcript && transcript.includes('No speech detected')) {
        // Show a brief message to user but don't set as input
        console.log('Voice recording: No speech detected');
      }
    } catch (error) {
      console.error('Error stopping voice recording:', error);
      setIsRecording(false);
      Alert.alert('Recording Error', 'Failed to process voice recording.');
    }
  };

  const sendVoiceMessage = async (audioUri: string) => {
    if (!currentUser?.id || !chatId) return;

    setIsUploadingMedia(true);
    try {
      const publicUrl = await ChatService.uploadMedia(audioUri, 'chat-media');
      if (publicUrl) {
        const newMessage: Message = {
          id: `temp-${Date.now()}-${Math.floor(Math.random() * 10000).toString(16)}`,
          text: '🎤 Voice Message',
          sender_id: currentUser.id,
          chat_id: chatId as string,
          timestamp: new Date().toISOString(),
          isOwn: true,
          status: 'sent',
          mediaUrl: publicUrl,
          mediaType: 'voice',
        };

        setMessages(prev => [...prev, newMessage]);

        const { data, error } = await ChatService.sendMessage(
          chatId as string,
          currentUser.id,
          '🎤 Voice Message',
          publicUrl,
          'voice'
        );

        if (error) {
          throw error;
        }

        if (data) {
          setMessages(prev => prev.map(msg => 
            msg.id === newMessage.id ? { ...msg, id: data.id } : msg
          ));
        }
      }
    } catch (error) {
      console.error('Error sending voice message:', error);
      Alert.alert('Error', 'Failed to send voice message. Please try again.');
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const playAudioMessage = async (messageId: string, audioUrl: string) => {
    try {
      if (isPlayingAudio === messageId) {
        return;
      }
      setIsPlayingAudio(messageId);

      // TODO: Implement audio playback with expo-audio API
      // The following is a placeholder and needs to be updated with the correct API
      console.log('Audio playback not implemented with expo-audio yet:', audioUrl);
      setTimeout(() => {
        setIsPlayingAudio(null);
      }, 2000); // Simulate playback completion for now
    } catch (error) {
      console.error('Error playing audio message:', error);
      Alert.alert('Error', 'Failed to play audio message. Please try again.');
      setIsPlayingAudio(null);
    }
  };

  const sendMessage = async () => {
    updateActivity(); // Track user activity
    if (!inputText.trim() || !currentUser?.id || !chatId) return;

    const messageText = inputText.trim(); // Store the text before clearing
    const newMessage: Message = {
      id: `temp-${Date.now()}-${Math.floor(Math.random() * 10000).toString(16)}`,
      text: messageText,
      sender_id: currentUser.id,
      chat_id: chatId as string,
      timestamp: new Date().toISOString(),
      isOwn: true,
      status: 'sent',
      replyTo: replyToMessageId || undefined,
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');
    setIsTyping(false);
    setReplyToMessageId(null); // Reset reply after sending
    broadcastTypingStatus(chatId as string, false);

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          sender_id: currentUser.id,
          text: messageText, // Use stored text instead of cleared inputText
          status: 'sent',
          reply_to: replyToMessageId || null,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        // Update the message ID with the actual ID from the database and mark it to prevent duplicate from real-time subscription
        setMessages(prev => prev.map(msg => 
          msg.id === newMessage.id ? { ...msg, id: data.id, _isLocalMessage: true } : msg
        ));
        
        // Clean up the _isLocalMessage flag after a short delay to prevent duplicates from real-time subscription
        setTimeout(() => {
          setMessages(prev => prev.map(msg => 
            msg.id === data.id ? { ...msg, _isLocalMessage: undefined } : msg
          ));
        }, 2000);
      }
    } catch (error) {
      console.error('Error sending message in group chat:', error);
      setMessages(prev => prev.map(msg => 
        msg.id === newMessage.id ? { ...msg, status: 'sent' } : msg
      ));
    }
  };

  const broadcastTypingStatus = async (chatId: string, isTyping: boolean) => {
    try {
      const channel = supabase.channel(`chat:${chatId}`);
      await channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: currentUser.id, isTyping },
      });
    } catch (error) {
      console.error('Error broadcasting typing status in group chat:', error);
    }
  };

  const handleInputChange = (text: string) => {
    setInputText(text);
    if (!isTyping && text.length > 0) {
      setIsTyping(true);
      if (chatId) {
        broadcastTypingStatus(chatId as string, true);
      }
    } else if (isTyping && text.length === 0) {
      setIsTyping(false);
      if (chatId) {
        broadcastTypingStatus(chatId as string, false);
      }
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (text.length > 0) {
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        if (chatId) {
          broadcastTypingStatus(chatId as string, false);
        }
      }, 2000);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
  };

  const groupMessagesByDate = (messages: Message[]) => {
    const grouped: { [key: string]: Message[] } = {};
    messages.forEach((msg) => {
      const date = new Date(msg.timestamp).toDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(msg);
    });
    return grouped;
  };

  const highlightSearchText = (text: string, searchTerm: string) => {
    if (!searchTerm.trim()) return text;
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return (
      <Text>
        {parts.map((part, index) => 
          regex.test(part) ? (
            <Text key={index} style={styles.highlightedText}>{part}</Text>
          ) : (
            <Text key={index}>{part}</Text>
          )
        )}
      </Text>
    );
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const sender = friends.find(f => f.id === item.sender_id);
    return (
      <Animated.View 
        style={[
          styles.messageContainer, 
          item.isOwn ? styles.ownMessage : styles.otherMessage,
          { transform: [{ scale: messageAnimations[item.id] ? messageAnimations[item.id] : 1 }] }
        ]}
      >
        {!item.isOwn && (
          <Avatar.Image
            size={32}
            source={
              sender?.avatar 
                ? { uri: sender.avatar } 
                : { uri: 'https://via.placeholder.com/150?text=No+Image' }
            }
            style={styles.messageAvatar}
          />
        )}
        <TouchableOpacity 
          onLongPress={(event) => showContextMenu(item.id, event)}
          delayLongPress={500}
        >
          <Surface
            style={[
              styles.messageBubble,
              item.isOwn ? styles.ownBubble : styles.otherBubble,
              item.replyTo ? styles.replyBubble : {},
              item.isPinned ? styles.pinnedBubble : {},
            ]}
            elevation={2}
          >
            {!item.isOwn && sender && (
              <Text style={styles.senderName}>{sender.name}</Text>
            )}
            {item.replyTo && (
              <View style={styles.replyIndicator}>
                <Text style={styles.replyText}>Replying to...</Text>
                {messages.find(msg => msg.id === item.replyTo) && (
                  <Text style={styles.replyPreview} numberOfLines={1}>
                    {messages.find(msg => msg.id === item.replyTo)?.text || 'Original message not found'}
                  </Text>
                )}
              </View>
            )}
            {item.mediaUrl && item.mediaUrl !== '' && item.mediaType === 'image' ? (
              <View style={styles.mediaContainer}>
                {item.mediaUrl && (
                  <TouchableOpacity onPress={() => item.mediaUrl && setPreviewImage(item.mediaUrl)}>
                    <Image
                      source={{ uri: item.mediaUrl }}
                      style={styles.mediaImage}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                )}
                {item.text && (
                  <>
                    {item.text.startsWith('🔄 Forwarded:') && (
                      <View style={styles.forwardedIndicator}>
                        <IconButton icon="share" size={14} iconColor="#8E8E93" />
                        <Text style={styles.forwardedText}>Forwarded</Text>
                      </View>
                    )}
                    <Text style={[styles.messageText, item.isOwn ? styles.ownText : styles.otherText]}>
                      {searchQuery.trim() ? (
                        highlightSearchText(
                          item.text.startsWith('🔄 Forwarded:') ? item.text.replace('🔄 Forwarded: ', '') : item.text,
                          searchQuery
                        )
                      ) : (
                        item.text.startsWith('🔄 Forwarded:') ? item.text.replace('🔄 Forwarded: ', '') : item.text
                      )}
                    </Text>
                  </>
                )}
              </View>
            ) : item.mediaType === 'file' ? (
              <TouchableOpacity 
                style={styles.fileContainer}
                onPress={() => {
                  if (item.mediaUrl) {
                    console.log('Opening file:', item.mediaUrl);
                  }
                }}
              >
                <IconButton icon="file-document-outline" size={24} iconColor="#6B7280" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.messageText, item.isOwn ? styles.ownText : styles.otherText]}>
                    {searchQuery.trim() ? (
                      highlightSearchText(
                        item.text.replace('📎 ', '') || 'File Attachment',
                        searchQuery
                      )
                    ) : (
                      item.text.replace('📎 ', '') || 'File Attachment'
                    )}
                  </Text>
                  <Text style={[styles.fileSubtext, item.isOwn ? styles.ownText : styles.otherText]}>
                    Tap to open
                  </Text>
                </View>
              </TouchableOpacity>
            ) : item.mediaType === 'voice' ? (
              <TouchableOpacity 
                style={styles.audioContainer}
                onPress={() => item.mediaUrl && playAudioMessage(item.id, item.mediaUrl)}
                disabled={isPlayingAudio === item.id}
              >
                <IconButton 
                  icon={isPlayingAudio === item.id ? "volume-high" : "play-circle-outline"} 
                  size={24} 
                  iconColor={isPlayingAudio === item.id ? "#22C55E" : "#6B7280"} 
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.messageText, item.isOwn ? styles.ownText : styles.otherText]}>
                    {item.text || 'Voice Message'}
                  </Text>
                  <Text style={[styles.fileSubtext, item.isOwn ? styles.ownText : styles.otherText]}>
                    {isPlayingAudio === item.id ? 'Playing...' : 'Tap to play'}
                  </Text>
                </View>
              </TouchableOpacity>
            ) : (
              <Text style={[styles.messageText, item.isOwn ? styles.ownText : styles.otherText]}>
                {item.text}
                {item.status === 'edited' && (
                  <Text style={[styles.timeText, item.isOwn ? styles.ownTimeText : styles.otherTimeText]}>
                    {' (Edited)'}
                  </Text>
                )}
              </Text>
            )}
            <View style={styles.messageFooter}>
              <Text style={[styles.timeText, item.isOwn ? styles.ownTimeText : styles.otherTimeText]}>
                {formatTime(item.timestamp)}
              </Text>
              {item.isOwn && (
                <Text style={[styles.statusText, item.status === 'read' && styles.readStatus]}>
                  {item.status === 'sent' ? '✓' : item.status === 'delivered' ? '✓✓' : '✓✓'}
                </Text>
              )}
            </View>
            {item.reactions && Object.keys(item.reactions).length > 0 && (
              <View style={styles.reactionContainer}>
                {Object.entries(item.reactions).map(([emoji, users]) => (
                  <Surface key={emoji} style={styles.reactionBadge} elevation={1}>
                    <Text style={styles.reactionText}>
                      {emoji} {users.length}
                    </Text>
                  </Surface>
                ))}
              </View>
            )}
          </Surface>
        </TouchableOpacity>
        <View style={styles.actionButtons}>
          <IconButton
            icon="reply"
            size={20}
            onPress={() => setReplyToMessage(item.id)}
            style={styles.actionButton}
            iconColor="#6B7280"
          />
          <IconButton
            icon={item.isPinned ? "pin-off" : "pin"}
            size={20}
            onPress={() => togglePinMessage(item.id, !item.isPinned)}
            style={styles.actionButton}
            iconColor={item.isPinned ? "#F59E0B" : "#6B7280"}
          />
          {item.isOwn && (
            <>
              <IconButton
                icon="pencil"
                size={20}
                onPress={() => startEditingMessage(item.id, item.text)}
                style={styles.actionButton}
                iconColor="#6B7280"
              />
            </>
          )}
        </View>
        {/* Context menu moved to Portal for better positioning */}
      </Animated.View>
    );
  }

  const renderTypingIndicator = () => (
    <View style={[styles.messageContainer, styles.otherMessage]}>
      <Avatar.Image
        size={32}
        source={{ uri: 'https://via.placeholder.com/150?text=No+Image' }}
        style={styles.messageAvatar}
      />
      <Surface style={[styles.messageBubble, styles.otherBubble, styles.typingBubble]} elevation={1}>
        <ActivityIndicator size="small" color="#6B7280" />
        <Text style={[styles.messageText, styles.otherText, styles.typingText]}>
          Someone is typing...
        </Text>
      </Surface>
    </View>
  );

  const showContextMenu = (messageId: string, event?: any) => {
    if (event && event.nativeEvent) {
      const { pageX, pageY } = event.nativeEvent;
      const screenWidth = Dimensions.get('window').width;
      const screenHeight = Dimensions.get('window').height;
      
      // Calculate position to ensure menu stays within screen bounds
      let x = pageX;
      let y = pageY;
      
      // Adjust x position if menu would go off right edge
      if (x + 200 > screenWidth) {
        x = screenWidth - 220; // 200 (menu width) + 20 (margin)
      }
      
      // Adjust y position if menu would go off bottom edge
      if (y + 300 > screenHeight) {
        y = y - 320; // Move above the touch point
      }
      
      setContextMenuPosition({ x: Math.max(10, x), y: Math.max(50, y) });
    }
    
    setContextMenuMessageId(messageId);
    setSelectedMessageId(messageId);
    setContextMenuVisible(true);
    setReactionMenuVisible(true);
  };

  const togglePinMessage = async (messageId: string, pin: boolean) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_pinned: pin })
        .eq('id', messageId);

      if (error) {
        console.error('Error toggling pin on message:', error);
        return;
      }

      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, isPinned: pin } : msg
      ));

      if (pin) {
        const pinnedMsg = messages.find(msg => msg.id === messageId);
        if (pinnedMsg) {
          setPinnedMessages(prev => [...prev, { ...pinnedMsg, isPinned: true }].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        }
      } else {
        setPinnedMessages(prev => prev.filter(msg => msg.id !== messageId));
      }
    } catch (error) {
      console.error('Error toggling pin on message:', error);
    }
  };

  const scrollToMessage = (messageId: string) => {
    const index = messages.findIndex(msg => msg.id === messageId);
    if (index !== -1 && flatListRef.current) {
      try {
        if (index < messages.length) {
          flatListRef.current.scrollToIndex({ index, animated: true });
        }
      } catch (error) {
        console.warn('Failed to scroll to message, using scrollToEnd instead:', error);
        flatListRef.current.scrollToEnd({ animated: true });
      }
    }
  };

  const addReaction = async (messageId: string, emoji: string) => {
    if (!currentUser?.id) return;

    try {
      const { data: messageData, error } = await supabase
        .from('messages')
        .select('reactions')
        .eq('id', messageId)
        .single();

      if (error) {
        console.error('Error fetching message reactions:', error);
        return;
      }

      const currentReactions = messageData?.reactions || {};
      const updatedReactions = { ...currentReactions };

      if (!updatedReactions[emoji]) {
        updatedReactions[emoji] = [];
      }

      if (!updatedReactions[emoji].includes(currentUser.id)) {
        updatedReactions[emoji].push(currentUser.id);
      }

      const { error: updateError } = await supabase
        .from('messages')
        .update({ reactions: updatedReactions })
        .eq('id', messageId);

      if (updateError) {
        console.error('Error updating reactions:', updateError);
        return;
      }

      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, reactions: updatedReactions } : msg
      ));
      setReactionMenuVisible(false);
      setSelectedMessageId(null);
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  const startEditingMessage = (messageId: string, currentText: string) => {
    setEditingMessage({ id: messageId, text: currentText });
    setContextMenuVisible(false);
  };

  const saveEditedMessage = async () => {
    if (!editingMessage || !editingMessage.text.trim()) return;

    try {
      const { error } = await supabase
        .from('messages')
        .update({ text: editingMessage.text.trim(), status: 'edited' })
        .eq('id', editingMessage.id);

      if (error) {
        console.error('Error editing message:', error);
        return;
      }

      setMessages(prev => prev.map(msg => 
        msg.id === editingMessage.id ? { ...msg, text: editingMessage.text.trim(), status: 'edited' } : msg
      ));
      setEditingMessage(null);
    } catch (error) {
      console.error('Error saving edited message:', error);
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      console.log('GroupChat component: Deleting message with ID:', messageId);
      const { error } = await chatService.deleteMessage(messageId);

      if (error) {
        console.error('Error deleting message:', error);
        return;
      }

      console.log('GroupChat component: Message deleted successfully, waiting for Realtime event');
      
      const timeoutId = setTimeout(() => {
        console.log('GroupChat component: Realtime event not received, updating local state as fallback');
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
        setPinnedMessages(prev => prev.filter(msg => msg.id !== messageId));
      }, 2000);
      
      // @ts-ignore
      window._deleteMessageTimeouts = window._deleteMessageTimeouts || {};
      // @ts-ignore
      window._deleteMessageTimeouts[messageId] = timeoutId;
      
      setContextMenuVisible(false);
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const forwardMessage = (messageId: string) => {
    const message = messages.find(msg => msg.id === messageId);
    if (message) {
      setMessageToForward(message);
      setForwardDialogVisible(true);
      setContextMenuVisible(false);
      setReactionMenuVisible(false);
    }
  };

  const sendForwardedMessage = async () => {
    if (!messageToForward || selectedChats.length === 0 || !currentUser?.id) return;

    try {
      for (const chatId of selectedChats) {
        const forwardedText = `🔄 Forwarded: ${messageToForward.text}`;
        
        const { error } = await supabase
          .from('messages')
          .insert({
            text: forwardedText,
            sender_id: currentUser.id,
            chat_id: chatId,
            media_url: messageToForward.mediaUrl || null,
            media_type: messageToForward.mediaType || null,
            status: 'sent',
            created_at: new Date().toISOString(),
          });

        if (error) {
          console.error('Error forwarding message:', error);
          Alert.alert('Error', 'Failed to forward message');
          return;
        }
      }

      Alert.alert('Success', `Message forwarded to ${selectedChats.length} chat(s)`);
      setForwardDialogVisible(false);
      setMessageToForward(null);
      setSelectedChats([]);
    } catch (error) {
      console.error('Error forwarding message:', error);
      Alert.alert('Error', 'Failed to forward message');
    }
  };

  const handleMediaSelected = async (media: { uri: string; type: string; name?: string; size?: number }) => {
    console.log('💬 Media selected in group chat:', {
      uri: media.uri,
      type: media.type,
      name: media.name,
      size: media.size,
      currentUserId: currentUser?.id,
      chatId: chatId
    });
    
    if (!currentUser?.id) {
      console.error('❌ No current user found for media upload');
      Alert.alert('Error', 'Please log in to send media');
      return;
    }
    
    setIsUploadingMedia(true);
    console.log('💬 Starting media upload process...');
    
    try {
      if (!media.uri) {
        throw new Error('Invalid media: No URI provided');
      }
      
      if (media.size && media.size > 10 * 1024 * 1024) {
        throw new Error('File size exceeds 10MB limit');
      }
      
      console.log('💬 Calling ChatService.uploadMedia...');
      const uploadStartTime = Date.now();
      
      const publicUrl = await ChatService.uploadMedia(media.uri, 'chat-media');
      
      const uploadDuration = Date.now() - uploadStartTime;
      console.log(`💬 Media upload completed in ${uploadDuration}ms:`, publicUrl);

      if (publicUrl) {
        console.log('💬 Sending media message...');
        await sendMediaMessage(publicUrl, media.type as 'image' | 'file', media.name);
        console.log('💬 Media message sent successfully');
      } else {
        throw new Error('Upload succeeded but no public URL returned');
      }
    } catch (error) {
      console.error('💥 Media upload failed in group chat:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        media,
        currentUserId: currentUser?.id,
        chatId
      });
      
      let errorMessage = 'Failed to upload media. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('size exceeds')) {
          errorMessage = 'File is too large. Please choose a smaller file (max 10MB).';
        } else if (error.message.includes('not authenticated')) {
          errorMessage = 'Please log in again to upload media.';
        } else if (error.message.includes('network') || error.message.includes('connection')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        }
      }
      
      Alert.alert('Upload Error', errorMessage);
    } finally {
      setIsUploadingMedia(false);
      console.log('💬 Media upload process completed');
    }
  };

  const sendMediaMessage = async (mediaUrl: string, mediaType: 'image' | 'file', fileName?: string) => {
    if (!currentUser?.id || !chatId) return;

    const generateUUID = () => {
      const timestamp = Date.now();
      const randomPart = Math.floor(Math.random() * 10000).toString(16);
      return `temp-${timestamp}-${randomPart}`;
    };
    
    const messageText = inputText.trim() || (mediaType === 'image' ? '📷 Image' : `📎 ${fileName || 'File'}`);
    
    const newMessage: Message = {
      id: generateUUID(),
      text: messageText,
      sender_id: currentUser.id,
      chat_id: chatId as string,
      timestamp: new Date().toISOString(),
      isOwn: true,
      status: 'sent',
      replyTo: replyToMessageId || undefined,
      mediaUrl,
      mediaType,
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');
    setIsTyping(false);
    setReplyToMessageId(null);
    broadcastTypingStatus(chatId as string, false);

    try {
      const { data, error } = await ChatService.sendMessage(
        chatId as string,
        currentUser.id,
        messageText,
        mediaUrl,
        mediaType
      );

      if (error) {
        throw error;
      }

      if (data) {
        setMessages(prev => prev.map(msg => 
          msg.id === newMessage.id ? { ...msg, id: data.id } : msg
        ));
      }
    } catch (error) {
      console.error('Error sending media message in group chat:', error);
      setMessages(prev => prev.map(msg => 
        msg.id === newMessage.id ? { ...msg, status: 'sent' } : msg
      ));
    }
  };

  const setReplyToMessage = (messageId: string) => {
    setReplyToMessageId(messageId);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const cancelReply = () => {
    setReplyToMessageId(null);
  };

  const renderDateHeader = (date: string) => (
    <View style={styles.dateHeaderContainer}>
      <Divider style={styles.dateDivider} />
      <Text style={styles.dateHeaderText}>{formatDate(date)}</Text>
      <Divider style={styles.dateDivider} />
    </View>
  );

  const renderGroupedMessages = () => {
    // Filter messages based on search query
    const filteredMessages = searchQuery.trim() 
      ? messages.filter(msg => 
          msg.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (friends.find(f => f.id === msg.sender_id)?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
        )
      : messages;
    
    const groupedMessages = groupMessagesByDate(filteredMessages);
    const sections = Object.entries(groupedMessages).map(([date, msgs]) => ({ date, data: msgs }));
    
    // Show empty search results message
    if (searchQuery.trim() && sections.length === 0) {
      return (
        <View style={styles.emptySearchContainer}>
          <IconButton icon="magnify" size={48} iconColor="#8E8E93" />
          <Text style={styles.emptySearchText}>No messages found</Text>
          <Text style={styles.emptySearchSubtext}>Try searching with different keywords</Text>
        </View>
      );
    }

    return (
      <FlatList
        ref={flatListRef}
        data={sections}
        renderItem={({ item }) => (
          <View key={item.date}>
            {renderDateHeader(item.date)}
            {item.data.map((msg: Message, index: number) => (
              <View key={msg.id ? `${item.date}-msg-${msg.id}` : `${item.date}-${index}-${msg.timestamp || Date.now()}`}>
                {renderMessage({ item: msg })}
              </View>
            ))}
          </View>
        )}
        keyExtractor={(item) => item.date}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => !searchQuery.trim() && flatListRef.current?.scrollToEnd()}
        ListFooterComponent={otherUserTyping ? renderTypingIndicator : null}
        ListHeaderComponent={searchQuery.trim() && filteredMessages.length > 0 ? (
          <View style={styles.searchResultsHeader}>
            <Text style={styles.searchResultsText}>
              Found {filteredMessages.length} message{filteredMessages.length !== 1 ? 's' : ''} matching "{searchQuery}"
            </Text>
          </View>
        ) : null}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => router.back()} />
          <TouchableOpacity 
            style={styles.headerInfo}
            onPress={() => setSidebarVisible(true)}
          >
                {chatAvatar ? (
                  <Avatar.Image
                    size={40}
                    source={{ uri: chatAvatar }}
                    style={styles.headerAvatar}
                  />
                ) : (
                  <Avatar.Icon
                    size={40}
                    icon="account-group"
                    style={styles.headerAvatar}
                  />
                )}
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>{chatName as string}</Text>
              <Text style={styles.headerSubtitle}>
                {typingUsers.length > 0 
                  ? `${typingUsers.length} ${typingUsers.length === 1 ? 'person' : 'people'} typing...`
                  : `${groupParticipants.length} members, ${groupParticipants.filter((id: string) => userStatuses[id]?.status === 'online').length} online`
                }
              </Text>
            </View>
          </TouchableOpacity>
        <Appbar.Action 
          icon="magnify" 
          onPress={() => setSearchVisible(!searchVisible)} 
        />
        <Appbar.Action 
          icon="dots-vertical" 
          onPress={() => setMenuVisible(true)} 
        />
      </Appbar.Header>
      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={{ x: Dimensions.get('window').width - 10, y: 50 }}
      >
        <Menu.Item 
          onPress={() => { setSidebarVisible(true); setMenuVisible(false); }} 
          title="Group Info" 
          leadingIcon="information-outline"
        />
        <Menu.Item 
          onPress={() => { setInviteDialogVisible(true); setMenuVisible(false); }} 
          title="Add Members" 
          leadingIcon="account-plus"
        />
        <Menu.Item 
          onPress={() => { setSearchVisible(true); setMenuVisible(false); }} 
          title="Search Messages" 
          leadingIcon="magnify"
        />
        <Menu.Item 
          onPress={() => { 
            setGroupSettings(prev => ({ ...prev, notifications: !prev.notifications })); 
            setMenuVisible(false); 
          }} 
          title={groupSettings.notifications ? "Mute Notifications" : "Unmute Notifications"} 
          leadingIcon={groupSettings.notifications ? "bell-off" : "bell"}
        />
        <Divider />
        <Menu.Item 
          onPress={() => { setLeaveGroupDialogVisible(true); setMenuVisible(false); }} 
          title="Leave Group" 
          leadingIcon="exit-to-app"
          titleStyle={{ color: '#EF4444' }}
        />
      </Menu>

      {searchVisible && (
        <Surface style={styles.searchContainer} elevation={2}>
          <Searchbar
            placeholder="Search messages..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
            onClearIconPress={() => {
              setSearchQuery('');
              setSearchVisible(false);
            }}
            right={() => (
              <IconButton
                icon="close"
                size={20}
                onPress={() => {
                  setSearchQuery('');
                  setSearchVisible(false);
                }}
              />
            )}
          />
        </Surface>
      )}

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {pinnedMessages.length > 0 && (
          <Surface style={styles.pinnedMessagesBanner} elevation={2}>
            <TouchableOpacity 
              style={styles.pinnedMessagesHeader}
              onPress={() => setPinnedExpanded(!pinnedExpanded)}
            >
              <View style={styles.pinnedTitleContainer}>
                <IconButton 
                  icon="pin" 
                  size={16} 
                  iconColor="#F59E0B" 
                  style={styles.pinnedIcon}
                />
                <Text style={styles.pinnedMessagesTitle}>
                  Pinned Messages ({pinnedMessages.length})
                </Text>
              </View>
              <IconButton 
                icon={pinnedExpanded ? "chevron-up" : "chevron-down"} 
                size={20} 
                iconColor="#007AFF"
              />
            </TouchableOpacity>
            
            {pinnedExpanded && pinnedMessages.map((msg) => {
              const isMessageVisible = messages.some(m => m.id === msg.id);
              const sender = friends.find(f => f.id === msg.sender_id) || 
                           (msg.sender_id === currentUser?.id ? currentUser : null);
              
              return (
                <TouchableOpacity 
                  key={msg.id} 
                  style={[
                    styles.pinnedMessageItem,
                    !isMessageVisible && { opacity: 0.6 }
                  ]}
                  onPress={() => {
                    if (isMessageVisible) {
                      scrollToMessage(msg.id);
                    } else {
                      console.log('Pinned message not in current chat view');
                    }
                  }}
                >
                  <View style={styles.pinnedMessageContent}>
                    <View style={styles.pinnedMessageHeader}>
                      <Text style={styles.pinnedSenderName}>
                        {sender?.name || 'Unknown'}
                      </Text>
                      <Text style={styles.pinnedMessageTime}>
                        {formatTime(msg.timestamp)}
                      </Text>
                    </View>
                    <Text style={styles.pinnedMessageText} numberOfLines={2}>
                      {msg.text}
                    </Text>
                  </View>
                  {!isMessageVisible && (
                    <IconButton 
                      icon="alert-circle" 
                      size={16} 
                      iconColor="#F59E0B"
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </Surface>
        )}

        {renderGroupedMessages()}

        <Modal
          animationType="fade"
          transparent={false}
          visible={!!previewImage}
          onRequestClose={() => setPreviewImage(null)}
        >
          <View style={styles.fullScreenContainer}>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={() => setPreviewImage(null)}
            >
              <IconButton icon="close" size={30} iconColor="#FFFFFF" />
            </TouchableOpacity>
            {previewImage && (
              <Image
                source={{ uri: previewImage }}
                style={styles.fullScreenImage}
                resizeMode="contain"
              />
            )}
          </View>
        </Modal>

        <Surface style={styles.inputContainer} elevation={3}>
          {editingMessage ? (
            <View style={styles.editingContainer}>
              <View style={styles.editingHeader}>
                <IconButton icon="pencil" size={16} iconColor="#3B82F6" />
                <Text style={styles.editingLabel}>Editing message</Text>
                <IconButton
                  icon="close"
                  size={16}
                  onPress={() => setEditingMessage(null)}
                  iconColor="#6B7280"
                />
              </View>
              <View style={styles.editingInputRow}>
                <RNTextInput
                  value={editingMessage.text}
                  onChangeText={(text) => setEditingMessage({ ...editingMessage, text })}
                  placeholder="Edit message..."
                  style={styles.editingInput}
                  multiline
                  maxLength={CONFIG.UI.MESSAGE_MAX_LENGTH}
                  autoFocus
                />
                <IconButton
                  icon="check"
                  size={24}
                  onPress={saveEditedMessage}
                  disabled={!editingMessage.text.trim()}
                  style={styles.actionButton}
                  iconColor={editingMessage.text.trim() ? '#22C55E' : '#9CA3AF'}
                />
              </View>
            </View>
          ) : (
            <>
              {replyToMessageId && (
                <View style={styles.replyPreviewContainer}>
                  <View style={styles.replyIndicatorLine} />
                  <View style={styles.replyContent}>
                    <Text style={styles.replyLabel}>Replying to</Text>
                    <Text style={styles.replyPreviewText} numberOfLines={1}>
                      {messages.find(msg => msg.id === replyToMessageId)?.text || 'Message'}
                    </Text>
                  </View>
                  <IconButton
                    icon="close"
                    size={18}
                    onPress={cancelReply}
                    iconColor="#6B7280"
                  />
                </View>
              )}
              
              <View style={styles.inputRow}>
                <View style={styles.inputWrapper}>
                  <RNTextInput
                    ref={inputRef}
                    value={inputText}
                    onChangeText={handleInputChange}
                    placeholder="Message..."
                    style={styles.textInput}
                    multiline
                    maxLength={CONFIG.UI.MESSAGE_MAX_LENGTH}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                
                <View style={styles.rightActions}>
                  {isUploadingMedia ? (
                    <View style={styles.uploadingContainer}>
                      <ActivityIndicator size="small" color="#3B82F6" />
                    </View>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={[styles.inputActionButton, { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', marginRight: 4, backgroundColor: '#F2F2F7', borderRadius: 20 }]}
                        onPress={() => setEmojiPickerVisible(!emojiPickerVisible)}
                      >
                        <Text style={[styles.emojiIcon, { fontSize: 20 }]}>😊</Text>
                      </TouchableOpacity>
                      <MediaPicker
                        onMediaSelected={handleMediaSelected}
                        disabled={isUploadingMedia}
                      />
                      
                      {inputText.trim() ? (
                        <TouchableOpacity
                          style={styles.sendButton}
                          onPress={sendMessage}
                        >
                          <IconButton
                            icon="send"
                            size={20}
                            iconColor="white"
                          />
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={[styles.voiceButton, isRecording && styles.voiceButtonRecording]}
                          onPressIn={startVoiceRecording}
                          onPressOut={stopVoiceRecording}
                        >
                          <IconButton
                            icon={isRecording ? "stop" : "microphone"}
                            size={20}
                            iconColor={isRecording ? "#EF4444" : "#6B7280"}
                          />
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                </View>
              </View>
              
              {emojiPickerVisible && (
                <View style={styles.emojiPicker}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {['😀', '😂', '😍', '🥰', '😊', '😎', '🤔', '😮', '😢', '😡', '👍', '👎', '❤️', '🔥', '💯', '🎉', '👏', '🙏'].map((emoji) => (
                      <TouchableOpacity
                        key={emoji}
                        style={styles.emojiButton}
                        onPress={() => {
                          setInputText(prev => prev + emoji);
                          setEmojiPickerVisible(false);
                        }}
                      >
                        <Text style={styles.emojiText}>{emoji}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
              
              {isRecording && (
                <View style={styles.recordingIndicator}>
                  <View style={styles.recordingDot} />
                  <Text style={styles.recordingText}>Recording... {recordingDuration}s</Text>
                  <Text style={styles.recordingHint}>Release to send, slide to cancel</Text>
                </View>
              )}
            </>
          )}
        </Surface>
      </KeyboardAvoidingView>
      
      {/* Group Info Sidebar */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={sidebarVisible}
        onRequestClose={() => setSidebarVisible(false)}
      >
        <SafeAreaView style={styles.sidebarContainer}>
          <Appbar.Header style={styles.sidebarHeader}>
            <Appbar.BackAction onPress={() => setSidebarVisible(false)} />
            <Appbar.Content title="Group Info" />
          </Appbar.Header>
          
          <ScrollView style={styles.sidebarContent}>
            {/* Group Details */}
            <Surface style={styles.groupDetailsCard} elevation={2}>
              <View style={styles.groupAvatarContainer}>
                {chatAvatar ? (
                  <Avatar.Image
                    size={80}
                    source={{ uri: chatAvatar }}
                    style={styles.largeGroupAvatar}
                  />
                ) : (
                  <Avatar.Icon
                    size={80}
                    icon="account-group"
                    style={styles.largeGroupAvatar}
                  />
                )}
                <Text style={styles.groupNameLarge}>{chatName as string}</Text>
                <Text style={styles.groupMemberCount}>{groupParticipants.length} members</Text>
                {isUploadingAvatar ? (
                  <ActivityIndicator size="small" color="#007AFF" style={{ marginTop: 10 }} />
                ) : (
                  <Button
                    mode="outlined"
                    onPress={async () => {
                      setIsUploadingAvatar(true);
                      try {
                        // Check if ImagePicker is available
                        if (!ImagePicker.launchImageLibraryAsync) {
                          Alert.alert('Error', 'Image picker is not available on this device.');
                          return;
                        }

                        // Request media library permissions
                        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                        if (status !== 'granted') {
                          Alert.alert(
                            'Permission Required', 
                            'Please grant permission to access your photo library to change the group avatar.',
                            [
                              { text: 'Cancel', style: 'cancel' },
                              { text: 'Open Settings', onPress: () => ImagePicker.requestMediaLibraryPermissionsAsync() }
                            ]
                          );
                          return;
                        }

                        // Launch image picker with error handling
                        const result = await ImagePicker.launchImageLibraryAsync({
                          mediaTypes: ImagePicker.MediaTypeOptions.Images,
                          allowsEditing: true,
                          aspect: [1, 1],
                          quality: 0.8,
                          base64: false,
                          exif: false,
                        });

                        if (!result.canceled && result.assets[0]) {
                          const imageUri = result.assets[0].uri;
                          console.log('📸 Selected image URI:', imageUri);
                          
                          // Upload the selected image
                          const { data, error } = await ChatService.updateChatAvatar(chatId as string, imageUri);
                          if (error) {
                            throw error;
                          }
                          
                          // Update local state with the new avatar URL
                          if (data && data.avatar_url) {
                            setChatAvatar(data.avatar_url);
                          }
                          Alert.alert('Success', 'Group avatar updated successfully');
                        }
                      } catch (error) {
                        console.error('Error updating group avatar:', error);
                        const errorMessage = error instanceof Error ? error.message : 'Failed to update group avatar';
                        Alert.alert('Error', errorMessage);
                      } finally {
                        setIsUploadingAvatar(false);
                      }
                    }}
                    style={{ marginTop: 10 }}
                    loading={isUploadingAvatar}
                    disabled={isUploadingAvatar}
                  >
                    {isUploadingAvatar ? 'Uploading...' : 'Change Group Avatar'}
                  </Button>
                )}
              </View>
            </Surface>
            
            {/* Group Invite Link */}
            {groupUniqueLink && (
              <Surface style={styles.groupLinkCard} elevation={1}>
                <View style={styles.groupLinkContainer}>
                  <Text variant="titleMedium" style={styles.groupLinkTitle}>Group Invite Link</Text>
                  <View style={styles.linkDisplayContainer}>
                    <Text variant="bodyMedium" style={styles.linkText} numberOfLines={1}>
                      {`https://rolenet.app/join/${groupUniqueLink}`}
                    </Text>
                    <IconButton
                      icon="content-copy"
                      size={20}
                      onPress={() => {
                        const linkToCopy = `https://rolenet.app/join/${groupUniqueLink}`;
                        Clipboard.setString(linkToCopy);
                        Alert.alert('Copied!', 'Group invite link copied to clipboard');
                      }}
                    />
                  </View>
                  <Text variant="bodySmall" style={styles.linkHint}>
                    Share this link to invite new members to the group
                  </Text>
                </View>
              </Surface>
            )}
            
            {/* Group Actions */}
            <Surface style={styles.groupActionsCard} elevation={1}>
              <List.Item
                title="Invite Members"
                description="Share invite link or add contacts"
                left={(props) => <List.Icon {...props} icon="account-plus" />}
                right={(props) => <List.Icon {...props} icon="chevron-right" />}
                onPress={() => setInviteDialogVisible(true)}
              />
              <Divider />
              <List.Item
                title="Shared Media"
                description="Photos, videos, and files"
                left={(props) => <List.Icon {...props} icon="image-multiple" />}
                right={(props) => <List.Icon {...props} icon="chevron-right" />}
                onPress={() => {/* Navigate to shared media */}}
              />
              <Divider />
              <List.Item
                title="Search Messages"
                description="Find messages in this group"
                left={(props) => <List.Icon {...props} icon="magnify" />}
                right={(props) => <List.Icon {...props} icon="chevron-right" />}
                onPress={() => {
                  setSidebarVisible(false);
                  setSearchVisible(true);
                }}
              />
            </Surface>
            
            {/* Members List */}
            <Surface style={styles.membersCard} elevation={1}>
              <Text style={styles.sectionTitle}>Members ({groupParticipants.length})</Text>
              {groupParticipants.map((participantId: string) => {
                const participant = participantId === currentUser?.id ? currentUser : friends.find(f => f.id === participantId);
                if (!participant) return null;
                
                const status = userStatuses[participantId]?.status || 'offline';
                return (
                  <List.Item
                    key={participantId}
                    title={participant.name}
                    description={participantId === currentUser?.id ? "You" : status === 'online' ? "Online" : "Offline"}
                    left={() => (
                      <View style={styles.memberAvatarContainer}>
                        <Avatar.Image
                          size={40}
                          source={participant.avatar ? { uri: participant.avatar } : { uri: 'https://via.placeholder.com/150?text=No+Image' }}
                        />
                        <AnimatedStatusDot
                          status={status}
                          size={12}
                          style={styles.memberStatusDot}
                        />
                      </View>
                    )}
                    right={() => participantId === currentUser?.id ? (
                      <Chip mode="outlined" compact>Admin</Chip>
                    ) : null}
                  />
                );
              })}
            </Surface>
            
            {/* Group Settings */}
            <Surface style={styles.settingsCard} elevation={1}>
              <Text style={styles.sectionTitle}>Settings</Text>
              <List.Item
                title="Notifications"
                description={groupSettings.notifications ? "On" : "Off"}
                left={(props) => <List.Icon {...props} icon={groupSettings.notifications ? "bell" : "bell-off"} />}
                right={() => (
                  <Switch
                    value={groupSettings.notifications}
                    onValueChange={(value) => setGroupSettings(prev => ({ ...prev, notifications: value }))}
                  />
                )}
              />
              <Divider />
              <List.Item
                title="Media Auto-Download"
                description={groupSettings.mediaAutoDownload ? "On" : "Off"}
                left={(props) => <List.Icon {...props} icon="download" />}
                right={() => (
                  <Switch
                    value={groupSettings.mediaAutoDownload}
                    onValueChange={(value) => setGroupSettings(prev => ({ ...prev, mediaAutoDownload: value }))}
                  />
                )}
              />
            </Surface>
            
            {/* Danger Zone */}
            <Surface style={styles.dangerCard} elevation={1}>
              <List.Item
                title="Leave Group"
                description="You will no longer receive messages"
                left={(props) => <List.Icon {...props} icon="exit-to-app" color="#EF4444" />}
                titleStyle={{ color: '#EF4444' }}
                onPress={() => setLeaveGroupDialogVisible(true)}
              />
            </Surface>
          </ScrollView>
        </SafeAreaView>
      </Modal>
      
      {/* Invite Dialog */}
      <Portal>
        <Dialog visible={inviteDialogVisible} onDismiss={() => setInviteDialogVisible(false)}>
          <Dialog.Title>Invite Members</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>Share this invite link with others:</Text>
            <Surface style={styles.inviteLinkContainer} elevation={1}>
              <Text style={styles.inviteLink}>https://app.example.com/invite/group123</Text>
              <IconButton icon="content-copy" onPress={() => {
                Clipboard.setString('https://app.example.com/invite/group123');
                Alert.alert('Copied', 'Invite link copied to clipboard');
              }} />
            </Surface>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setInviteDialogVisible(false)}>Close</Button>
            <Button mode="contained" onPress={() => {
              // Share logic
              setInviteDialogVisible(false);
            }}>Share</Button>
          </Dialog.Actions>
        </Dialog>
        
        <Dialog visible={leaveGroupDialogVisible} onDismiss={() => setLeaveGroupDialogVisible(false)}>
          <Dialog.Title>Leave Group?</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>
              Are you sure you want to leave this group? You will no longer receive messages and won't be able to see the chat history.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setLeaveGroupDialogVisible(false)}>Cancel</Button>
            <Button 
              mode="contained" 
              buttonColor="#EF4444"
              onPress={() => {
                // Leave group logic
                setLeaveGroupDialogVisible(false);
                router.back();
              }}
            >
              Leave
            </Button>
          </Dialog.Actions>
        </Dialog>
        
        {/* Forward Message Dialog */}
        <Dialog visible={forwardDialogVisible} onDismiss={() => setForwardDialogVisible(false)}>
          <Dialog.Title>Forward Message</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>Select chats to forward this message to:</Text>
            <ScrollView style={styles.chatSelectionList}>
              {/* Mock chat list - in real app, fetch from user's chats */}
              {[
                { id: '1', name: 'John Doe', avatar: 'https://via.placeholder.com/150?text=JD' },
                { id: '2', name: 'Team Alpha', avatar: 'https://via.placeholder.com/150?text=TA' },
                { id: '3', name: 'Family Group', avatar: 'https://via.placeholder.com/150?text=FG' },
                { id: '4', name: 'Work Chat', avatar: 'https://via.placeholder.com/150?text=WC' },
              ].map(chat => (
                <TouchableOpacity
                  key={chat.id}
                  style={[
                    styles.chatSelectionItem,
                    selectedChats.includes(chat.id) && styles.chatSelectionItemSelected
                  ]}
                  onPress={() => {
                    if (selectedChats.includes(chat.id)) {
                      setSelectedChats(selectedChats.filter(id => id !== chat.id));
                    } else {
                      setSelectedChats([...selectedChats, chat.id]);
                    }
                  }}
                >
                  <Avatar.Image size={40} source={{ uri: chat.avatar }} />
                  <Text style={styles.chatSelectionName}>{chat.name}</Text>
                  {selectedChats.includes(chat.id) && (
                    <IconButton icon="check" size={20} iconColor="#007AFF" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => {
              setForwardDialogVisible(false);
              setSelectedChats([]);
              setMessageToForward(null);
            }}>Cancel</Button>
            <Button 
              mode="contained" 
              disabled={selectedChats.length === 0}
              onPress={() => sendForwardedMessage()}
            >
              Forward ({selectedChats.length})
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      
      {/* Context Menu Portal */}
       <Portal>
         <Modal
           visible={contextMenuVisible}
           transparent={true}
           animationType="fade"
           onRequestClose={() => {
             setContextMenuVisible(false);
             setReactionMenuVisible(false);
             setSelectedMessageId(null);
             setContextMenuMessageId(null);
           }}
         >
           <Pressable 
             style={styles.contextMenuOverlay}
             onPress={() => {
               setContextMenuVisible(false);
               setReactionMenuVisible(false);
               setSelectedMessageId(null);
               setContextMenuMessageId(null);
             }}
           >
             <View 
               style={[
                 styles.contextMenuModal,
                 {
                   left: contextMenuPosition.x,
                   top: contextMenuPosition.y,
                 }
               ]}
             >
               <View style={styles.contextMenuContainer}>
            {/* Quick Reactions */}
            <View style={styles.reactionMenu}>
              {['👍', '❤️', '😂', '😢', '😡'].map(emoji => (
                <TouchableOpacity
                  key={emoji}
                  style={styles.emojiButton}
                  onPress={() => {
                    if (contextMenuMessageId) {
                      addReaction(contextMenuMessageId, emoji);
                    }
                    setContextMenuVisible(false);
                    setReactionMenuVisible(false);
                  }}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Action Menu */}
            <View style={styles.actionMenu}>
              <TouchableOpacity
                style={styles.actionMenuItem}
                onPress={() => {
                  if (contextMenuMessageId) {
                    setReplyToMessageId(contextMenuMessageId);
                    inputRef.current?.focus();
                  }
                  setContextMenuVisible(false);
                  setReactionMenuVisible(false);
                }}
              >
                <IconButton icon="reply" size={16} iconColor="#007AFF" />
                <Text style={styles.actionMenuText}>Reply</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.actionMenuItem}
                onPress={() => {
                  if (contextMenuMessageId) {
                    forwardMessage(contextMenuMessageId);
                  }
                  setContextMenuVisible(false);
                  setReactionMenuVisible(false);
                }}
              >
                <IconButton icon="share" size={16} iconColor="#007AFF" />
                <Text style={styles.actionMenuText}>Forward</Text>
              </TouchableOpacity>
              
              {contextMenuMessageId && messages.find(m => m.id === contextMenuMessageId)?.isPinned ? (
                <TouchableOpacity
                  style={styles.actionMenuItem}
                  onPress={() => {
                    if (contextMenuMessageId) {
                      togglePinMessage(contextMenuMessageId, false);
                    }
                    setContextMenuVisible(false);
                    setReactionMenuVisible(false);
                  }}
                >
                  <IconButton icon="pin-off" size={16} iconColor="#007AFF" />
                  <Text style={styles.actionMenuText}>Unpin</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.actionMenuItem}
                  onPress={() => {
                    if (contextMenuMessageId) {
                      togglePinMessage(contextMenuMessageId, true);
                    }
                    setContextMenuVisible(false);
                    setReactionMenuVisible(false);
                  }}
                >
                  <IconButton icon="pin" size={16} iconColor="#007AFF" />
                  <Text style={styles.actionMenuText}>Pin</Text>
                </TouchableOpacity>
              )}
              
              {contextMenuMessageId && messages.find(m => m.id === contextMenuMessageId)?.isOwn && (
                <>
                  <TouchableOpacity
                    style={styles.actionMenuItem}
                    onPress={() => {
                      const message = messages.find(m => m.id === contextMenuMessageId);
                      if (message) {
                        startEditingMessage(message.id, message.text);
                      }
                      setContextMenuVisible(false);
                      setReactionMenuVisible(false);
                    }}
                  >
                    <IconButton icon="pencil" size={16} iconColor="#F59E0B" />
                    <Text style={styles.actionMenuText}>Edit</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.actionMenuItem}
                    onPress={() => {
                      if (contextMenuMessageId) {
                        deleteMessage(contextMenuMessageId);
                      }
                      setContextMenuVisible(false);
                      setReactionMenuVisible(false);
                    }}
                  >
                    <IconButton icon="delete" size={16} iconColor="#EF4444" />
                    <Text style={styles.actionMenuText}>Delete</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
               </View>
             </View>
           </Pressable>
         </Modal>
       </Portal>
     </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderBottomWidth: 0,
    paddingHorizontal: 4,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 8,
  },
  headerAvatar: {
    marginRight: 12,
    backgroundColor: '#007AFF',
    width: 40,
    height: 40,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    fontFamily: 'System',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 1,
    fontWeight: '400',
  },
  searchContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchBar: {
    backgroundColor: '#F9FAFB',
    elevation: 0,
  },
  content: {
    flex: 1,
  },

  pinnedMessagesBanner: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    marginHorizontal: 0,
    marginVertical: 0,
    borderRadius: 0,
    borderLeftWidth: 0,
    elevation: 0,
    shadowColor: 'transparent',
  },
  pinnedMessagesTitle: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 4,
  },
  pinnedMessageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  pinnedMessageText: {
    flex: 1,
    color: '#1C1C1E',
    fontSize: 13,
    lineHeight: 16,
  },
  pinnedMessageTime: {
    fontSize: 11,
    color: '#8E8E93',
  },
  morePinnedText: {
    color: '#B45309',
    textAlign: 'center',
    marginTop: 6,
    fontStyle: 'italic',
    fontSize: 12,
  },
  notVisibleIndicator: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  messagesList: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
    paddingHorizontal: 4,
  },
  ownMessage: {
    justifyContent: 'flex-end',
  },
  otherMessage: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  ownBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#E9E9EB',
    borderBottomLeftRadius: 4,
    borderWidth: 0,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  replyBubble: {
    borderLeftWidth: 2,
    borderLeftColor: '#A5B4FC',
  },
  pinnedBubble: {
    borderTopWidth: 2,
    borderTopColor: '#F59E0B',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  ownText: {
    color: '#FFFFFF',
  },
  otherText: {
    color: '#1C1C1E',
  },
  typingText: {
    marginLeft: 8,
    fontSize: 14,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  reactionContainer: {
    flexDirection: 'row',
    marginTop: 6,
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 0,
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
  },
  reactionBadge: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 4,
    marginBottom: 2,
    borderWidth: 0.5,
    borderColor: '#C6C6C8',
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  reactionText: {
    fontSize: 12,
  },
  reactionMenu: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 8,
    marginTop: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  emojiButton: {
    padding: 4,
    marginRight: 8,
  },
  emojiText: {
    fontSize: 20,
  },
  replyIndicator: {
    marginBottom: 4,
  },
  replyText: {
    fontSize: 12,
    color: '#737578',
    fontStyle: 'italic',
  },
  replyPreview: {
    fontSize: 12,
    color: '#0043e1',
    marginTop: 2,
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    marginLeft: 8,
    marginRight: 8,
  },
  actionButton: {
    margin: 0,
    padding: 0,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '400',
  },
  ownTimeText: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  otherTimeText: {
    color: '#8E8E93',
  },
  statusText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginLeft: 4,
  },
  readStatus: {
    color: '#22C55E',
  },
  inputContainer: {
    flexDirection: 'column',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0.5,
    borderTopColor: '#C6C6C8',
    elevation: 0,
    shadowColor: 'transparent',
  },
  textInput: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    borderWidth: 0,
    fontSize: 17,
    fontFamily: 'System',
    color: '#000000',
  },
  textInputWithReply: {
    marginTop: 8,
  },
  replyPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 8,
    justifyContent: 'space-between',
  },
  replyPreviewText: {
    color: '#169df1',
    fontSize: 12,
    flex: 1,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 0,
    elevation: 0,
    shadowColor: 'transparent',
  },
  dateHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  dateDivider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dateHeaderText: {
    marginHorizontal: 8,
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  mediaContainer: {
    marginBottom: 8,
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    backgroundColor: '#fff',
  },
  mediaImage: {
    width: 220,
    height: 160,
    borderRadius: 10,
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
    resizeMode: 'contain',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 10,
    zIndex: 10,
  },
  fileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
  fileSubtext: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 2,
  },
  audioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
  uploadingContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  senderName: {
    fontWeight: '600',
    marginBottom: 2,
    color: '#1C1C1E',
    fontSize: 13,
  },
  // New styles for enhanced UI
  editingContainer: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F59E0B',
  },
  editingText: {
    fontSize: 14,
    color: '#92400E',
    fontWeight: '500',
  },
  voiceRecorderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    marginRight: 8,
  },
  recordingDuration: {
    fontSize: 16,
    color: '#DC2626',
    fontWeight: '600',
    marginLeft: 8,
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '85%',
    height: '100%',
    backgroundColor: 'white',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    zIndex: 1000,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  sidebarTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 16,
    color: '#1F2937',
  },
  sidebarContent: {
    flex: 1,
    padding: 16,
  },
  groupInfoSection: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  groupAvatarLarge: {
    marginBottom: 12,
  },
  groupNameLarge: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  groupMembersCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  actionsList: {
    marginTop: 16,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  actionItemText: {
    fontSize: 16,
    marginLeft: 16,
    color: '#1F2937',
  },
  membersList: {
    marginTop: 16,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  memberRole: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  memberAvatarContainer: {
    position: 'relative',
  },
  memberStatusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: 'white',
  },
  settingsSection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
  },
  settingText: {
    fontSize: 16,
    color: '#1F2937',
  },
  leaveGroupButton: {
    backgroundColor: '#FEE2E2',
    marginTop: 24,
    borderRadius: 12,
  },
  leaveGroupText: {
    color: '#DC2626',
    fontWeight: '600',
  },
  dialogContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  dialogMessage: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
    marginBottom: 24,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 8,
  },
  typingDot: {
     width: 6,
     height: 6,
     borderRadius: 3,
     backgroundColor: '#9CA3AF',
     marginHorizontal: 2,
   },
   // Missing styles for UI components
   pinnedMessagesHeader: {
     flexDirection: 'row',
     alignItems: 'center',
     justifyContent: 'space-between',
     marginBottom: 8,
   },
   pinnedTitleContainer: {
     flexDirection: 'row',
     alignItems: 'center',
   },
   pinnedIcon: {
     marginRight: 8,
   },
   pinnedMessageContent: {
     flex: 1,
   },
   pinnedMessageHeader: {
     flexDirection: 'row',
     alignItems: 'center',
     marginBottom: 4,
   },
   pinnedSenderName: {
     fontSize: 12,
     fontWeight: '600',
     color: '#92400E',
     marginLeft: 8,
   },
   showMorePinned: {
     color: '#B45309',
     textAlign: 'center',
     marginTop: 8,
     fontStyle: 'italic',
   },
   editingHeader: {
     flexDirection: 'row',
     alignItems: 'center',
     justifyContent: 'space-between',
   },
   editingLabel: {
     fontSize: 14,
     color: '#92400E',
     fontWeight: '500',
   },
   editingInputRow: {
     flexDirection: 'row',
     alignItems: 'flex-end',
     marginTop: 8,
   },
   editingInput: {
     flex: 1,
     backgroundColor: '#FEF3C7',
     borderRadius: 20,
     paddingHorizontal: 16,
     paddingVertical: 8,
     marginRight: 8,
     borderWidth: 1,
     borderColor: '#F59E0B',
   },
   replyIndicatorLine: {
     width: 3,
     backgroundColor: '#3B82F6',
     marginRight: 12,
   },
   replyContent: {
     flex: 1,
   },
   replyLabel: {
     fontSize: 12,
     color: '#6B7280',
     fontWeight: '500',
   },
   inputRow: {
     flexDirection: 'row',
     alignItems: 'center',
   },
   inputWrapper: {
     flex: 1,
     flexDirection: 'row',
     alignItems: 'flex-end',
   },
   inputActions: {
     flexDirection: 'row',
     alignItems: 'center',
     marginRight: 8,
   },
   leftActions: {
     flexDirection: 'row',
     alignItems: 'center',
     marginRight: 8,
   },
   inputActionButton: {
     marginHorizontal: 4,
   },
   emojiIcon: {
     fontSize: 20,
   },
   rightActions: {
     flexDirection: 'row',
     alignItems: 'center',
   },
   voiceButton: {
     backgroundColor: '#F2F2F7',
     borderRadius: 20,
     width: 40,
     height: 40,
     justifyContent: 'center',
     alignItems: 'center',
     elevation: 0,
     shadowColor: 'transparent',
   },
   voiceButtonRecording: {
     backgroundColor: '#FF3B30',
   },
   emojiPicker: {
     position: 'absolute',
     bottom: 80,
     left: 16,
     right: 16,
     backgroundColor: 'white',
     borderRadius: 16,
     padding: 16,
     elevation: 5,
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 2 },
     shadowOpacity: 0.2,
     shadowRadius: 4,
   },
   recordingIndicator: {
     flexDirection: 'row',
     alignItems: 'center',
     backgroundColor: '#FEE2E2',
     paddingHorizontal: 16,
     paddingVertical: 8,
     borderRadius: 20,
   },
   recordingDot: {
     width: 8,
     height: 8,
     borderRadius: 4,
     backgroundColor: '#DC2626',
     marginRight: 8,
   },
   recordingText: {
     fontSize: 14,
     color: '#DC2626',
     fontWeight: '500',
   },
   recordingHint: {
     fontSize: 12,
     color: '#6B7280',
     marginTop: 4,
   },
   emptySearchContainer: {
     flex: 1,
     justifyContent: 'center',
     alignItems: 'center',
     paddingVertical: 40,
   },
   emptySearchText: {
     fontSize: 18,
     fontWeight: '600',
     color: '#8E8E93',
     marginTop: 16,
   },
   emptySearchSubtext: {
     fontSize: 14,
     color: '#8E8E93',
     marginTop: 8,
     textAlign: 'center',
   },
   searchResultsHeader: {
     backgroundColor: '#F8F9FA',
     paddingHorizontal: 16,
     paddingVertical: 8,
     borderBottomWidth: 1,
     borderBottomColor: '#E5E5EA',
   },
   searchResultsText: {
      fontSize: 14,
      color: '#007AFF',
      fontWeight: '500',
      textAlign: 'center',
    },
    highlightedText: {
      backgroundColor: '#FFEB3B',
      color: '#000000',
      fontWeight: '600',
    },
   sidebarContainer: {
     position: 'absolute',
     top: 0,
     right: 0,
     width: '85%',
     height: '100%',
     backgroundColor: 'white',
     elevation: 10,
     shadowColor: '#000',
     shadowOffset: { width: -2, height: 0 },
     shadowOpacity: 0.3,
     shadowRadius: 5,
     zIndex: 1000,
   },
   groupDetailsCard: {
     backgroundColor: 'white',
     borderRadius: 12,
     padding: 16,
     marginBottom: 16,
     elevation: 2,
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 1 },
     shadowOpacity: 0.1,
     shadowRadius: 2,
   },
   groupLinkCard: {
     backgroundColor: 'white',
     borderRadius: 12,
     padding: 16,
     marginBottom: 16,
     elevation: 1,
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 1 },
     shadowOpacity: 0.05,
     shadowRadius: 2,
   },
   groupLinkContainer: {
     flex: 1,
   },
   groupLinkTitle: {
     fontSize: 16,
     fontWeight: '600',
     color: '#1F2937',
     marginBottom: 12,
   },
   linkDisplayContainer: {
     flexDirection: 'row',
     alignItems: 'center',
     backgroundColor: '#F8F9FA',
     borderRadius: 8,
     paddingLeft: 12,
     marginBottom: 8,
   },
   linkText: {
     flex: 1,
     fontSize: 14,
     color: '#007AFF',
     fontFamily: 'monospace',
   },
   linkHint: {
     fontSize: 12,
     color: '#8E8E93',
     fontStyle: 'italic',
   },
   groupAvatarContainer: {
     alignItems: 'center',
     marginBottom: 12,
   },
   largeGroupAvatar: {
     width: 80,
     height: 80,
     borderRadius: 40,
   },
   groupMemberCount: {
     fontSize: 14,
     color: '#6B7280',
   },
   groupActionsCard: {
     backgroundColor: 'white',
     borderRadius: 12,
     padding: 16,
     marginBottom: 16,
     elevation: 2,
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 1 },
     shadowOpacity: 0.1,
     shadowRadius: 2,
   },
   contextMenuModal: {
     position: 'absolute',
     backgroundColor: 'white',
     borderRadius: 12,
     padding: 8,
     elevation: 8,
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 4 },
     shadowOpacity: 0.3,
     shadowRadius: 8,
     minWidth: 200,
     maxWidth: 250,
   },
   contextMenuContainer: {
      backgroundColor: 'white',
      borderRadius: 12,
    },
    contextMenuOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.1)',
    },
   actionMenu: {
     borderTopWidth: 1,
     borderTopColor: '#F2F2F7',
     paddingTop: 8,
     marginTop: 8,
   },
   actionMenuItem: {
     flexDirection: 'row',
     alignItems: 'center',
     paddingVertical: 8,
     paddingHorizontal: 12,
     borderRadius: 8,
   },
   actionMenuText: {
     fontSize: 16,
     color: '#000000',
     marginLeft: 8,
     fontWeight: '400',
   },
   chatSelectionList: {
     maxHeight: 300,
     marginTop: 16,
   },
   chatSelectionItem: {
     flexDirection: 'row',
     alignItems: 'center',
     paddingVertical: 12,
     paddingHorizontal: 16,
     borderRadius: 12,
     marginBottom: 8,
     backgroundColor: '#F8F9FA',
   },
   chatSelectionItemSelected: {
     backgroundColor: '#E3F2FD',
     borderWidth: 1,
     borderColor: '#007AFF',
   },
   chatSelectionName: {
      fontSize: 16,
      fontWeight: '500',
      color: '#000000',
      marginLeft: 12,
      flex: 1,
    },
    forwardedIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
      opacity: 0.7,
    },
    forwardedText: {
      fontSize: 12,
      color: '#8E8E93',
      fontStyle: 'italic',
      marginLeft: -4,
    },
   membersCard: {
     backgroundColor: 'white',
     borderRadius: 12,
     padding: 16,
     marginBottom: 16,
     elevation: 2,
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 1 },
     shadowOpacity: 0.1,
     shadowRadius: 2,
   },
   sectionTitle: {
     fontSize: 16,
     fontWeight: '600',
     color: '#1F2937',
     marginBottom: 12,
   },
   settingsCard: {
     backgroundColor: 'white',
     borderRadius: 12,
     padding: 16,
     marginBottom: 16,
     elevation: 2,
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 1 },
     shadowOpacity: 0.1,
     shadowRadius: 2,
   },
   dangerCard: {
     backgroundColor: '#FEF2F2',
     borderRadius: 12,
     padding: 16,
     marginTop: 16,
     borderWidth: 1,
     borderColor: '#FECACA',
   },
   dialogText: {
     fontSize: 16,
     color: '#374151',
     lineHeight: 24,
     marginBottom: 16,
   },
   inviteLinkContainer: {
     backgroundColor: '#F3F4F6',
     borderRadius: 8,
     padding: 12,
     marginVertical: 16,
   },
   inviteLink: {
     fontSize: 14,
     color: '#3B82F6',
     fontFamily: 'monospace',
   },
 });
