import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform, Animated, TouchableOpacity, Image, TextInput as RNTextInput, Alert, Modal, Dimensions, StatusBar, Linking, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, IconButton, Avatar, Appbar, Surface, ActivityIndicator, Divider, Chip, Menu, Button, Portal } from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import { useUserStore } from '@/stores/useUserStore';
import { useChatStore } from '@/stores/useChatStore';
import { useFriendStore } from '@/stores/useFriendStore';
import { supabase } from '../lib/supabase';
import { chatService } from '../lib/supabaseService';
import { ASSETS } from '@/constants/assets';
import MediaPicker from '@/components/MediaPicker';
import { ChatService } from '@/lib/supabaseService';
import { VoiceSearchService } from '@/lib/voiceSearch';
import * as Audio from 'expo-audio';
import { ScrollView, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAppStateStore } from '@/stores/useAppStateStore';
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
  mediaType?: 'image' | 'file' | 'audio'; // Type of media attachment
  isPinned?: boolean; // Whether the message is pinned
}

export default function ChatScreen() {
  const { userId, userName, userRole, userAvatar, pingId, chatId, chatName, isGroup, participants } = useLocalSearchParams();
  const isGroupChat = isGroup === 'true';

  // All hooks must be called before any conditional returns
  const [messages, setMessages] = useState<Message[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [pinnedExpanded, setPinnedExpanded] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [replyToMessageId, setReplyToMessageId] = useState<string | null>(null);
  const [reactionMenuVisible, setReactionMenuVisible] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuMessageId, setContextMenuMessageId] = useState<string | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [editingMessage, setEditingMessage] = useState<{ id: string, text: string } | null>(null);
  const [messageAnimations, setMessageAnimations] = useState<{ [key: string]: Animated.Value }>({});
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState<string | null>(null);
  const [headerMenuVisible, setHeaderMenuVisible] = useState(false);
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const [userOnlineStatus, setUserOnlineStatus] = useState<'online' | 'offline' | 'away'>('offline');
  const [lastSeenTime, setLastSeenTime] = useState<string | null>(null);
  const [forwardMenuVisible, setForwardMenuVisible] = useState(false);
  const [selectedForwardMessage, setSelectedForwardMessage] = useState<Message | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<RNTextInput>(null);
  const currentUser = useUserStore((state: any) => state.user);
  const chatStore = useChatStore();
  const { friends } = useFriendStore();
  const { updateActivity } = useAppStateStore();
  const typingTimeoutRef = useRef<number | NodeJS.Timeout | null>(null);
  let chatData: any[] = []; // Temporary variable to store chat data for typing broadcast
  const groupParticipants = participants ? JSON.parse(participants as string) : [];

  // Set user as online when component mounts
  useEffect(() => {
    const updateUserStatus = async (status: 'online' | 'offline' | 'away') => {
      if (!currentUser?.id) return;
      try {
        const { error } = await supabase
          .from('users')
          .update({ 
            online_status: status,
            last_seen: status === 'offline' ? new Date().toISOString() : null
          })
          .eq('id', currentUser.id);

        if (error) {
          console.error('Error updating user status:', error);
        }

        // Broadcast status change to relevant channels
        const channel = supabase.channel(`user-status:${currentUser.id}`);
        await channel.send({
          type: 'broadcast',
          event: 'status-change',
          payload: { 
            userId: currentUser.id, 
            status, 
            lastSeen: status === 'offline' ? new Date().toISOString() : null 
          },
        });
      } catch (error) {
        console.error('Error updating user status:', error);
      }
    };

    updateUserStatus('online');
    return () => {
      updateUserStatus('offline');
    };
  }, [currentUser?.id]);

  // Redirect to group chat screen if it's a group chat after all hooks are called
  if (isGroupChat && chatId) {
    router.replace({
      pathname: '/groupChat',
      params: { chatId, chatName, participants }
    });
    return null; // Return early to prevent rendering
  }

    useEffect(() => {
    if (!currentUser?.id) return;
    let targetChatId = chatId as string | undefined;

    // Load chat history
    const fetchMessages = async () => {
      try {
        let chatIds: string[] = [];
        if (!targetChatId && userId) {
          // For one-on-one chat, find chats strictly between the two users
          const { data: chatDataResult, error: chatError } = await supabase
            .from('chats')
            .select('*')
            .eq('participants', `{${[currentUser.id, userId].sort().join(',')}}`);

          if (chatError) {
            console.error('Error finding chats for one-on-one chat:', chatError);
            return;
          }

          chatData = chatDataResult; // Store for later use in typing broadcast
          // console.log('Found chats for one-on-one:', chatDataResult);

          if (chatDataResult && chatDataResult.length > 0) {
            chatIds = chatDataResult.map(chat => chat.id);
            targetChatId = chatIds[0]; // Use the first chat ID as the primary for new messages
            // console.log('Using chat IDs for one-on-one chat:', chatIds);
          } else {
            // Create a new chat if none exists
            // console.log('No existing chat found, creating a new one for one-on-one chat');
            const { data: newChat, error: newChatError } = await supabase
              .from('chats')
              .insert({
                participants: [currentUser.id, userId],
              })
              .select()
              .single();

            if (newChatError) {
              console.error('Error creating chat for one-on-one:', newChatError);
              return;
            }
            targetChatId = newChat.id;
            chatIds = [newChat.id];
            chatData = [newChat];
            // console.log('Created new chat for one-on-one with ID:', newChat.id);
          }
        } else if (targetChatId) {
          chatIds = [targetChatId];
          // console.log('Using provided chat ID:', targetChatId);
        }

        // Fetch messages for all relevant chats
        let allMessages: any[] = [];
        for (const id of chatIds) {
          // console.log('Fetching messages for chat ID:', id);
          const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('chat_id', id)
            .order('created_at', { ascending: true });

          if (error) {
            console.error(`Error loading messages for chat ${id}:`, error);
            continue;
          }

          // console.log(`Fetched ${data?.length || 0} messages for chat ${id}`);
          if (data) {
            allMessages = allMessages.concat(data);
          }
        }

        if (allMessages.length > 0) {
          const formattedMessages = allMessages.map(msg => ({
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
          // Ensure no duplicates by filtering based on ID
          const uniqueMessages = formattedMessages.filter((msg, index, self) =>
            index === self.findIndex((m) => m.id === msg.id)
          );
          // Sort by timestamp to show messages in chronological order
          const sortedMessages = uniqueMessages.sort((a, b) => 
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
        console.error('Error fetching messages:', error);
      }
    };

    fetchMessages();

    // Subscribe to real-time messages and typing status
    let subscriptions: any[] = [];
    const setupSubscription = async () => {
      try {
        let chatIds: string[] = [];
        if (!targetChatId && userId) {
          // For one-on-one chat, find only direct chats strictly between the two users
          const { data: chatDataResult, error: chatError } = await supabase
            .from('chats')
            .select('*')
            .eq('participants', `{${[currentUser.id, userId].sort().join(',')}}`);

          if (chatError) {
            console.error('Error finding chats for subscription:', chatError);
            return;
          }

          if (chatDataResult && chatDataResult.length > 0) {
            chatIds = chatDataResult.map(chat => chat.id);
            targetChatId = chatIds[0]; // Use the first chat ID as the primary for new messages
          } else {
            // Create a new chat if none exists
            const { data: newChat, error: newChatError } = await supabase
              .from('chats')
              .insert({
                participants: [currentUser.id, userId],
              })
              .select()
              .single();

            if (newChatError) {
              console.error('Error creating chat for subscription:', newChatError);
              return;
            }
            targetChatId = newChat.id;
            chatIds = [newChat.id];
          }
        } else if (targetChatId) {
          chatIds = [targetChatId];
        }

        // Subscribe to each chat ID for real-time updates
        subscriptions = chatIds.map(chatId => {
          return supabase
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
              // Check if message with this ID already exists or if it's a replacement for a temporary ID
              const existingIndex = prev.findIndex(msg => 
                msg.id === newMessage.id || (msg.isOwn && msg.id.startsWith('temp-') && newMessage.isOwn && Math.abs(new Date(msg.timestamp).getTime() - new Date(newMessage.timestamp).getTime()) < 5000)
              );
              let updatedMessages;
              if (existingIndex !== -1) {
                // Update existing message if it's a match (likely replacing a temp ID)
                updatedMessages = [...prev];
                updatedMessages[existingIndex] = newMessage;
              } else {
                updatedMessages = [...prev, newMessage].sort((a, b) => 
                  new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                );
              }
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
              // console.log('🔧 UPDATE event received:', payload);
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
              // console.log('🔧 Processed updated message:', updatedMessage);
              
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
              if (isGroupChat) {
                // For group chats, handle typing from any participant
                if (groupParticipants.includes(payload.userId)) {
                  setOtherUserTyping(payload.isTyping);
                }
              } else if (payload.userId === userId) {
                setOtherUserTyping(payload.isTyping);
              }
            })
            .subscribe();
        });

         // Subscribe to user status updates for one-to-one chat
        if (!isGroupChat && userId) {
          const userStatusSubscription = supabase
            .channel(`user-status:${userId}`)
            .on('broadcast', { event: 'status-change' }, (payload) => {
              if (payload.userId === userId) {
                setUserOnlineStatus(payload.status);
                if (payload.status === 'offline' && payload.lastSeen) {
              setLastSeenTime(payload.lastSeen);
            }
              }
            })
            .subscribe();

          subscriptions.push(userStatusSubscription);

          // Fetch initial user status
          const fetchUserStatus = async () => {
            try {
              const { data, error } = await supabase
                .from('users')
                .select('online_status, last_seen')
                .eq('id', userId)
                .single();

              if (error) {
                console.error('Error fetching user status:', error);
                return;
              }

              if (data) {
                setUserOnlineStatus(data.online_status);
                if (data.online_status === 'offline' && data.last_seen) {
                setLastSeenTime(data.last_seen);
              }
              }
            } catch (error) {
              console.error('Error fetching user status:', error);
            }
          };

          fetchUserStatus();
        }
      } catch (error) {
        console.error('Error setting up chat subscription:', error);
      }
    };

    setupSubscription();

    // Add initial message about the ping if provided
    if (pingId && messages.length === 0 && !isGroupChat) {
      const initialMessage: Message = {
        id: `ping-context-${Date.now()}`,
        text: `This chat was started in response to your ping. How can I help you?`,
        sender_id: userId as string,
        chat_id: '',
        timestamp: new Date().toISOString(),
        isOwn: false,
        status: 'sent',
      };
      setMessages([initialMessage]);
    }



    return () => {
      subscriptions.forEach(sub => sub.unsubscribe());
      subscriptions = [];
    };
  }, [userId, currentUser?.id, pingId, chatId, isGroup, participants]);

  const sendMessage = async () => {
    updateActivity(); // Track user activity
    if (!inputText.trim() || !currentUser?.id) return;
    let targetChatId = chatId as string | undefined;

    if (!targetChatId && userId) {
      // For one-on-one chat, find or create a direct chat strictly between the two users
      const { data: chatDataResult, error: chatError } = await supabase
        .from('chats')
        .select('*')
        .eq('participants', `{${[currentUser.id, userId].sort().join(',')}}`)
        .limit(1);

      if (chatError) {
        console.error('Error finding chat for sending message:', chatError);
        return;
      }

      if (chatDataResult && chatDataResult.length > 0) {
        targetChatId = chatDataResult[0].id;
      } else {
        // Create a new chat if none exists
        const { data: newChat, error: newChatError } = await supabase
          .from('chats')
          .insert({
            participants: [currentUser.id, userId],
          })
          .select()
          .single();

        if (newChatError) {
          console.error('Error creating chat for sending message:', newChatError);
          return;
        }
        targetChatId = newChat.id;
      }
    }

    if (!targetChatId) return;

    const newMessage: Message = {
      id: `temp-${Date.now()}-${Math.floor(Math.random() * 10000).toString(16)}`,
      text: inputText.trim(),
      sender_id: currentUser.id,
      chat_id: targetChatId,
      timestamp: new Date().toISOString(),
      isOwn: true,
      status: 'sent',
      replyTo: replyToMessageId || undefined,
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');
    setIsTyping(false);
    setReplyToMessageId(null); // Reset reply after sending
    broadcastTypingStatus(targetChatId, false);

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          chat_id: targetChatId,
          sender_id: currentUser.id,
          text: inputText.trim(),
          status: 'sent',
          reply_to: replyToMessageId || null,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        // Update the message ID with the actual ID from the database
        setMessages(prev => prev.map(msg => 
          msg.id === newMessage.id ? { ...msg, id: data.id } : msg
        ));
      }
    } catch (error) {
      console.error('Error sending message:', error);
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
      console.error('Error broadcasting typing status:', error);
    }
  };

  const handleInputChange = (text: string) => {
    setInputText(text);
    if (!isTyping && text.length > 0) {
      setIsTyping(true);
      if (chatData && chatData.length > 0) {
        broadcastTypingStatus(chatData[0].id, true);
      } else if (chatId) {
        broadcastTypingStatus(chatId as string, true);
      }
    } else if (isTyping && text.length === 0) {
      setIsTyping(false);
      if (chatData && chatData.length > 0) {
        broadcastTypingStatus(chatData[0].id, false);
      } else if (chatId) {
        broadcastTypingStatus(chatId as string, false);
      }
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (text.length > 0) {
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        if (chatData && chatData.length > 0) {
          broadcastTypingStatus(chatData[0].id, false);
        } else if (chatId) {
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

  const formatLastSeen = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return 'just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days}d ago`;
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

  const renderMessage = ({ item }: { item: Message }) => {
    const sender = isGroupChat ? friends.find(f => f.id === item.sender_id) : null;
    const repliedMessage = item.replyTo ? messages.find(msg => msg.id === item.replyTo) : null;
    
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
              isGroupChat 
                ? { uri: sender?.avatar || 'https://via.placeholder.com/150?text=No+Image' } 
                : userAvatar 
                  ? { uri: userAvatar as string } 
                  : ASSETS.IMAGES.LOGO
            }
            style={styles.messageAvatar}
          />
        )}
        <View style={styles.messageContent}>
          <TouchableOpacity 
            onLongPress={() => showContextMenu(item.id)}
            onPress={() => {
              if (reactionMenuVisible && selectedMessageId === item.id) {
                setReactionMenuVisible(false);
                setSelectedMessageId(null);
              }
            }}
          >
            <Surface
              style={[
                styles.messageBubble,
                item.isOwn ? styles.ownBubble : styles.otherBubble,
                item.replyTo ? styles.replyBubble : {},
                item.isPinned ? styles.pinnedBubble : {},
              ]}
              elevation={1}
            >
              {isGroupChat && !item.isOwn && sender && (
                <Text style={styles.senderName}>{sender.name}</Text>
              )}
              {item.replyTo && repliedMessage && (
                <TouchableOpacity 
                  style={styles.replyIndicator}
                  onPress={() => scrollToMessage(item.replyTo!)}
                >
                  <View style={styles.replyLine} />
                  <View style={styles.replyContent}>
                    <Text style={styles.replyText}>
                      {repliedMessage.sender_id === currentUser?.id ? 'You' : 
                       isGroupChat ? (friends.find(f => f.id === repliedMessage.sender_id)?.name || 'Unknown') : 
                       (userName as string)}
                    </Text>
                    <Text style={styles.replyPreview} numberOfLines={2}>
                      {repliedMessage.mediaType === 'image' ? '📷 Image' :
                       repliedMessage.mediaType === 'audio' ? '🎤 Voice message' :
                       repliedMessage.mediaType === 'file' ? '📎 File' :
                       repliedMessage.text || 'Message'}
                    </Text>
                  </View>
                </TouchableOpacity>
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
                  <Text style={[styles.messageText, item.isOwn ? styles.ownText : styles.otherText]}>
                    {item.text}
                  </Text>
                )}
              </View>
            ) : item.mediaType === 'file' ? (
              <TouchableOpacity 
                style={styles.fileContainer}
                onPress={() => {
                  if (item.mediaUrl) {
                    // Open file in browser or external app
                    // You can use Linking.openURL(item.mediaUrl) here
                    // console.log('Opening file:', item.mediaUrl);
                  }
                }}
              >
                <IconButton icon="file-document-outline" size={24} iconColor="#6B7280" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.messageText, item.isOwn ? styles.ownText : styles.otherText]}>
                    {item.text.replace('📎 ', '') || 'File Attachment'}
                  </Text>
                  <Text style={[styles.fileSubtext, item.isOwn ? styles.ownText : styles.otherText]}>
                    Tap to open
                  </Text>
                </View>
              </TouchableOpacity>
            ) : item.mediaType === 'audio' ? (
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
              {item.status === 'edited' && (
                <Text style={styles.editedLabel}>edited</Text>
              )}
              {item.isOwn && (
                <Text style={[styles.statusText, item.status === 'read' && styles.readStatus]}>
                  {item.status === 'sent' ? '✓' : item.status === 'delivered' ? '✓✓' : '✓✓'}
                </Text>
              )}
            </View>
            {item.reactions && Object.keys(item.reactions).length > 0 && (
              <View style={styles.reactionsContainer}>
                {Object.entries(item.reactions).map(([emoji, users]) => (
                  <TouchableOpacity
                    key={emoji}
                    style={[
                      styles.reactionBubble,
                      users.includes(currentUser?.id || '') && styles.reactionBubbleActive
                    ]}
                    onPress={() => addReaction(item.id, emoji)}
                  >
                    <Text style={styles.reactionEmoji}>{emoji}</Text>
                    <Text style={styles.reactionCount}>{users.length}</Text>
                  </TouchableOpacity>
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
            <IconButton
              icon="pencil"
              size={20}
              onPress={() => startEditingMessage(item.id, item.text)}
              style={styles.actionButton}
              iconColor="#6B7280"
            />
          )}
        </View>
        {/* Context menu moved to Portal for better positioning */}
        </View>
      </Animated.View>
    );
  }

  const renderTypingIndicator = () => (
    <View style={[styles.messageContainer, styles.otherMessage]}>
      <Avatar.Image
        size={32}
        source={
          userAvatar 
            ? { uri: userAvatar as string } 
            : { uri: 'https://via.placeholder.com/150?text=No+Image' }
        }
        style={styles.messageAvatar}
      />
      <Surface style={[styles.messageBubble, styles.otherBubble, styles.typingBubble]} elevation={1}>
        <ActivityIndicator size="small" color="#6B7280" />
        <Text style={[styles.messageText, styles.otherText, styles.typingText]}>
          {isGroupChat ? 'Someone is typing...' : 'Typing...'}
        </Text>
      </Surface>
    </View>
  );

  const showContextMenu = (messageId: string, event?: any) => {
    if (event && event.nativeEvent) {
      const { pageX, pageY } = event.nativeEvent;
      const screenWidth = Dimensions.get('window').width;
      const screenHeight = Dimensions.get('window').height;
      
      let x = pageX;
      let y = pageY;
      
      if (x + 200 > screenWidth) {
        x = screenWidth - 220;
      }
      
      if (y + 300 > screenHeight) {
        y = y - 320;
      }
      
      setContextMenuPosition({ x: Math.max(10, x), y: Math.max(50, y) });
    }
    
    setContextMenuMessageId(messageId);
    setSelectedMessageId(messageId);
    setContextMenuVisible(true);
    setReactionMenuVisible(true);
  };

  const togglePinMessage = async (messageId: string, pin: boolean) => {
    // console.log('🔧 togglePinMessage called:', { messageId, pin });
    try {
      const { data, error } = await supabase
        .from('messages')
        .update({ is_pinned: pin })
        .eq('id', messageId)
        .select();

      // console.log('🔧 Database update result:', { data, error });

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
        // Check if index is within valid range
        if (index < messages.length) {
          flatListRef.current.scrollToIndex({ index, animated: true });
        }
      } catch (error) {
        console.warn('Failed to scroll to message, using scrollToEnd instead:', error);
        // Fallback to scrolling to end if index is out of range
        flatListRef.current.scrollToEnd({ animated: true });
      }
    }
  };

  const addReaction = async (messageId: string, emoji: string) => {
    if (!currentUser?.id) return;
    // console.log('🔧 addReaction called:', { messageId, emoji, userId: currentUser.id });

    try {
      // Fetch current reactions for the message
      const { data: messageData, error } = await supabase
        .from('messages')
        .select('reactions')
        .eq('id', messageId)
        .single();

      // console.log('🔧 Current reactions fetch result:', { messageData, error });

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

      // console.log('🔧 Updated reactions:', updatedReactions);

      const { data: updateData, error: updateError } = await supabase
        .from('messages')
        .update({ reactions: updatedReactions })
        .eq('id', messageId)
        .select();

      // console.log('🔧 Reactions update result:', { updateData, updateError });

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

  // Test function to verify pin/reaction functionality
  const testPinAndReaction = async () => {
    // console.log('🧪 Testing pin and reaction functionality...');
    if (messages.length > 0) {
      const testMessage = messages[0];
      // console.log('🧪 Testing with message:', testMessage.id);
      
      // Test pin functionality
      await togglePinMessage(testMessage.id, !testMessage.isPinned);
      
      // Test reaction functionality
      await addReaction(testMessage.id, '👍');
    } else {
      // console.log('🧪 No messages available for testing');
    }
  };

  const startEditingMessage = (messageId: string, currentText: string) => {
    setEditingMessage({ id: messageId, text: currentText });
    setContextMenuVisible(false);
    // Note: In a real implementation, a text input modal would be shown for editing.
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
      // console.log('Chat component: Deleting message with ID:', messageId);
      const { error } = await chatService.deleteMessage(messageId);

      if (error) {
        console.error('Error deleting message:', error);
        return;
      }

      // Let the Realtime subscription handle the state update
      // If Realtime is not working, we'll still update the local state as a fallback
      // console.log('Chat component: Message deleted successfully, waiting for Realtime event');
      
      // Set a timeout to update the local state if the Realtime event doesn't arrive
      const timeoutId = setTimeout(() => {
        // console.log('Chat component: Realtime event not received, updating local state as fallback');
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
        setPinnedMessages(prev => prev.filter(msg => msg.id !== messageId));
      }, 2000); // Wait 2 seconds for Realtime event
      
      // Store the timeout ID to clear it if the component unmounts or if Realtime event is received
      // @ts-ignore - Adding a custom property to the window object
      window._deleteMessageTimeouts = window._deleteMessageTimeouts || {};
      // @ts-ignore
      window._deleteMessageTimeouts[messageId] = timeoutId;
      
      setContextMenuVisible(false);
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const handleMediaSelected = async (media: { uri: string; type: string; name?: string; size?: number }) => {
    // console.log('💬 Media selected in chat:', {
    //   uri: media.uri,
    //   type: media.type,
    //   name: media.name,
    //   size: media.size,
    //   currentUserId: currentUser?.id,
    //   chatId: chatId,
    //   userId: userId
    // });
    
    if (!currentUser?.id) {
      console.error('❌ No current user found for media upload');
      Alert.alert('Error', 'Please log in to send media');
      return;
    }
    
    setIsUploadingMedia(true);
    // console.log('💬 Starting media upload process...');
    
    try {
      // Validate media before upload
      if (!media.uri) {
        throw new Error('Invalid media: No URI provided');
      }
      
      if (media.size && media.size > 10 * 1024 * 1024) {
        throw new Error('File size exceeds 10MB limit');
      }
      
      // console.log('💬 Calling ChatService.uploadMedia...');
      const uploadStartTime = Date.now();
      
      // Upload media to Supabase Storage using the updated method
      const publicUrl = await ChatService.uploadMedia(media.uri, 'chat-media');
      
      const uploadDuration = Date.now() - uploadStartTime;
      // console.log(`💬 Media upload completed in ${uploadDuration}ms:`, publicUrl);

      if (publicUrl) {
        // console.log('💬 Sending media message...');
        await sendMediaMessage(publicUrl, media.type as 'image' | 'file', media.name);
        // console.log('💬 Media message sent successfully');
      } else {
        throw new Error('Upload succeeded but no public URL returned');
      }
    } catch (error) {
      console.error('💥 Media upload failed in chat:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        media,
        currentUserId: currentUser?.id,
        chatId,
        userId
      });
      
      // Show user-friendly error message based on error type
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
      // console.log('💬 Media upload process completed');
    }
  };

  const sendMediaMessage = async (mediaUrl: string, mediaType: 'image' | 'file', fileName?: string) => {
    if (!currentUser?.id) return;
    let targetChatId = chatId as string | undefined;

    if (!targetChatId && userId) {
      // For one-on-one chat, find or create a chat strictly between the two users
      const { data: chatDataResult, error: chatError } = await supabase
        .from('chats')
        .select('*')
        .eq('participants', `{${[currentUser.id, userId].sort().join(',')}}`)
        .limit(1);

      if (chatError) {
        console.error('Error finding chat for sending media:', chatError);
        return;
      }

      if (chatDataResult && chatDataResult.length > 0) {
        targetChatId = chatDataResult[0].id;
      } else {
        // Create a new chat if none exists
        const { data: newChat, error: newChatError } = await supabase
          .from('chats')
          .insert({
            participants: [currentUser.id, userId],
          })
          .select()
          .single();

        if (newChatError) {
          console.error('Error creating chat for sending media:', newChatError);
          return;
        }
        targetChatId = newChat.id;
      }
    }

    if (!targetChatId) return;

    // Generate a unique temporary ID for media messages
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
      chat_id: targetChatId,
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
    broadcastTypingStatus(targetChatId, false);

    try {
      const { data, error } = await ChatService.sendMessage(
        targetChatId,
        currentUser.id,
        messageText,
        mediaUrl,
        mediaType
      );

      if (error) {
        throw error;
      }

      if (data) {
        // Update the message ID with the actual ID from the database
        setMessages(prev => prev.map(msg => 
          msg.id === newMessage.id ? { ...msg, id: data.id } : msg
        ));
      }
    } catch (error) {
      console.error('Error sending media message:', error);
      setMessages(prev => prev.map(msg => 
        msg.id === newMessage.id ? { ...msg, status: 'sent' } : msg
      ));
    }
  };

  const setReplyToMessage = (messageId: string) => {
    setReplyToMessageId(messageId);
    // Highlight the message being replied to or show a preview in the input area
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const cancelReply = () => {
    setReplyToMessageId(null);
  };

  const startVoiceToText = async () => {
    try {
      if (isRecording) {
        const transcript = await VoiceSearchService.stopRecording();
        setIsRecording(false);
        if (transcript) {
          setInputText(transcript);
        }
      } else {
        await VoiceSearchService.startRecording();
        setIsRecording(true);
      }
    } catch (error) {
      console.error('Error with voice-to-text:', error);
      Alert.alert('Error', 'Failed to process voice input. Please try again.');
      setIsRecording(false);
    }
  };

  const startVoiceMessageRecording = async () => {
    try {
      if (isRecording) {
        const transcript = await VoiceSearchService.stopRecording();
        setIsRecording(false);
        const audioUri = VoiceSearchService.getLastAudioUri();
        if (audioUri) {
          await sendVoiceMessage(audioUri);
        } else {
          Alert.alert('Error', 'No audio recorded. Please try again.');
        }
      } else {
        await VoiceSearchService.startRecording();
        setIsRecording(true);
      }
    } catch (error) {
      console.error('Error with voice message recording:', error);
      Alert.alert('Error', 'Failed to record voice message. Please try again.');
      setIsRecording(false);
    }
  };

  const sendVoiceMessage = async (audioUri: string) => {
    if (!currentUser?.id) return;
    let targetChatId = chatId as string | undefined;

    if (!targetChatId && userId) {
      const { data: chatDataResult, error: chatError } = await supabase
        .from('chats')
        .select('*')
        .eq('participants', `{${[currentUser.id, userId].sort().join(',')}}`)
        .limit(1);

      if (chatError) {
        console.error('Error finding chat for sending voice message:', chatError);
        return;
      }

      if (chatDataResult && chatDataResult.length > 0) {
        targetChatId = chatDataResult[0].id;
      } else {
        const { data: newChat, error: newChatError } = await supabase
          .from('chats')
          .insert({
            participants: [currentUser.id, userId],
          })
          .select()
          .single();

        if (newChatError) {
          console.error('Error creating chat for sending voice message:', newChatError);
          return;
        }
        targetChatId = newChat.id;
      }
    }

    if (!targetChatId) return;

    setIsUploadingMedia(true);
    try {
      const publicUrl = await ChatService.uploadMedia(audioUri, 'chat-media');
      if (publicUrl) {
        const newMessage: Message = {
          id: `temp-${Date.now()}-${Math.floor(Math.random() * 10000).toString(16)}`,
          text: '🎤 Voice Message',
          sender_id: currentUser.id,
          chat_id: targetChatId,
          timestamp: new Date().toISOString(),
          isOwn: true,
          status: 'sent',
          mediaUrl: publicUrl,
          mediaType: 'audio',
        };

        setMessages(prev => [...prev, newMessage]);

        const { data, error } = await ChatService.sendMessage(
          targetChatId,
          currentUser.id,
          '🎤 Voice Message',
          publicUrl,
          'audio'
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

  const renderDateHeader = (date: string) => (
    <View style={styles.dateHeaderContainer}>
      <Divider style={styles.dateDivider} />
      <Text style={styles.dateHeaderText}>{formatDate(date)}</Text>
      <Divider style={styles.dateDivider} />
    </View>
  );

  const renderGroupedMessages = () => {
    const groupedMessages = groupMessagesByDate(messages);
    const sections = Object.entries(groupedMessages).map(([date, msgs]) => ({ date, data: msgs }));
    
    return (
      <FlatList
        ref={flatListRef}
        data={sections}
        renderItem={({ item }) => (
          <View key={item.date}>
            {renderDateHeader(item.date)}
            {item.data.map((msg: Message, index: number) => (
              <View key={msg.id ? `msg-${msg.id}-${msg.chat_id}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}` : `${item.date}-${index}-${msg.timestamp || Date.now()}-${Math.random().toString(36).substring(2, 7)}`}>
                {renderMessage({ item: msg })}
              </View>
            ))}
          </View>
        )}
        keyExtractor={(item) => item.date}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        ListFooterComponent={otherUserTyping ? renderTypingIndicator : null}
      />
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => router.back()} />
        <TouchableOpacity 
          style={styles.headerUserInfo}
          onPress={() => {
            if (!isGroupChat) {
              router.push({
                pathname: '/public-profile',
                params: { userId, userName, userRole, userAvatar }
              });
            }
          }}
        >
          {isGroupChat ? (
            <Avatar.Icon
              size={40}
              icon="account-group"
              style={styles.headerAvatar}
            />
          ) : (
            <View style={styles.avatarContainer}>
              <Avatar.Image
                size={40}
                source={
                  userAvatar 
                    ? { uri: userAvatar as string } 
                    : { uri: 'https://via.placeholder.com/150?text=No+Image' }
                }
                style={styles.headerAvatar}
              />
              {!isGroupChat && userOnlineStatus === 'online' && (
                <View style={styles.onlineIndicator} />
              )}
            </View>
          )}
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>
              {isGroupChat ? (chatName as string) : (userName as string)}
            </Text>
            <Text style={styles.headerSubtitle}>
              {isGroupChat 
                ? `${groupParticipants.length} members` 
                : userOnlineStatus === 'online' 
                  ? 'Online' 
                  : userOnlineStatus === 'offline' && lastSeenTime
                    ? `Last seen ${formatLastSeen(lastSeenTime)}`
                    : (userRole as string)
              }
            </Text>
            {otherUserTyping && !isGroupChat && (
              <Text style={styles.typingIndicatorHeader}>Typing...</Text>
            )}
          </View>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          {!isGroupChat && (
            <>
              <IconButton
                icon="video"
                size={24}
                onPress={() => {
                  router.push({
                    pathname: '/call',
                    params: { userId, userName, userRole, userAvatar, pingId, callType: 'video' }
                  });
                }}
                iconColor="#3B82F6"
              />
              <IconButton
                icon="phone"
                size={24}
                onPress={() => {
                  router.push({
                    pathname: '/call',
                    params: { userId, userName, userRole, userAvatar, pingId, callType: 'audio' }
                  });
                }}
                iconColor="#3B82F6"
              />
            </>
          )}
          <Menu
            visible={headerMenuVisible}
            onDismiss={() => setHeaderMenuVisible(false)}
            anchor={
              <IconButton
                icon="dots-vertical"
                size={24}
                onPress={() => setHeaderMenuVisible(true)}
                iconColor="#6B7280"
              />
            }
            contentStyle={styles.menuContent}
          >
            {!isGroupChat && (
              <>
                <Menu.Item
                  onPress={() => {
                    setHeaderMenuVisible(false);
                    router.push({
                      pathname: '/public-profile',
                      params: { userId, userName, userRole, userAvatar }
                    });
                  }}
                  title="View Profile"
                  leadingIcon="account"
                />
                <Menu.Item
                  onPress={() => {
                    setHeaderMenuVisible(false);
                    // TODO: Implement mute functionality
                  }}
                  title="Mute Notifications"
                  leadingIcon="bell-off"
                />
                <Menu.Item
                  onPress={() => {
                    setHeaderMenuVisible(false);
                    // TODO: Implement block functionality
                  }}
                  title="Block User"
                  leadingIcon="block-helper"
                />
              </>
            )}
            <Menu.Item
              onPress={() => {
                setHeaderMenuVisible(false);
                Alert.alert(
                  'Delete Chat',
                  'Are you sure you want to delete this chat? This action cannot be undone.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => {
                      // TODO: Implement delete chat functionality
                    }}
                  ]
                );
              }}
              title="Delete Chat"
              leadingIcon="delete"
            />
          </Menu>
        </View>
      </Appbar.Header>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {pingId && !isGroupChat && (
          <Surface style={styles.pingBanner} elevation={1}>
            <Text style={styles.pingBannerText}>
              💬 Chat started from ping response
            </Text>
          </Surface>
        )}
        {isGroupChat && (
          <Surface style={styles.groupInfoBanner} elevation={1}>
            <Text style={styles.groupInfoText}>
              Group Chat • {groupParticipants.length} Members
            </Text>
            <View style={styles.participantsChips}>
              {groupParticipants.map((participantId: string) => {
                const participant = participantId === currentUser.id ? currentUser : friends.find(f => f.id === participantId);
                return participant ? (
                  <Chip
                    key={participantId}
                    mode="outlined"
                    style={styles.participantChip}
                  >
                    {participant.name}
                  </Chip>
                ) : null;
              }).filter(Boolean)}
            </View>
          </Surface>
        )}
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

        <Surface style={styles.inputContainer} elevation={2}>
          {editingMessage ? (
            <>
              <View style={styles.editingHeader}>
                <Text style={styles.editingLabel}>✏️ Editing message</Text>
                <TouchableOpacity onPress={() => setEditingMessage(null)}>
                  <Text style={styles.cancelEdit}>Cancel</Text>
                </TouchableOpacity>
              </View>
              <RNTextInput
                value={editingMessage.text}
                onChangeText={(text) => setEditingMessage({ ...editingMessage, text })}
                placeholder="Edit message..."
                style={styles.textInput}
                multiline
                maxLength={CONFIG.UI.MESSAGE_MAX_LENGTH}
                onSubmitEditing={saveEditedMessage}
                blurOnSubmit={false}
              />
              <View style={styles.editingActions}>
                <TouchableOpacity
                  style={[styles.editActionButton, styles.saveButton]}
                  onPress={saveEditedMessage}
                  disabled={!editingMessage.text.trim()}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              {replyToMessageId && (
                <View style={styles.replyPreviewContainer}>
                  <View style={styles.replyLine} />
                  <View style={styles.replyContent}>
                    <Text style={styles.replyLabel}>Replying to</Text>
                    <Text style={styles.replyPreviewText} numberOfLines={2}>
                      {messages.find(msg => msg.id === replyToMessageId)?.text || 'Message'}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={cancelReply} style={styles.replyCloseButton}>
                    <Text style={styles.replyCloseIcon}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}
              
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
                          onPressIn={() => startVoiceMessageRecording()}
                          onPressOut={() => startVoiceToText()}
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
              
              {isRecording && (
                <View style={styles.recordingIndicator}>
                  <View style={styles.recordingDot} />
                  <Text style={styles.recordingText}>Recording...</Text>
                  <Text style={styles.recordingHint}>Release to send, slide to cancel</Text>
                </View>
              )}
            </>
          )}
        </Surface>
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
                  
                  {!isGroupChat && (
                    <TouchableOpacity
                      style={styles.actionMenuItem}
                      onPress={() => {
                        if (contextMenuMessageId) {
                          const message = messages.find(m => m.id === contextMenuMessageId);
                          if (message) {
                            setSelectedForwardMessage(message);
                            setForwardMenuVisible(true);
                          }
                        }
                        setContextMenuVisible(false);
                        setReactionMenuVisible(false);
                      }}
                    >
                      <IconButton icon="share" size={16} iconColor="#007AFF" />
                      <Text style={styles.actionMenuText}>Forward</Text>
                    </TouchableOpacity>
                  )}
                  
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
    </KeyboardAvoidingView>
  </SafeAreaView>
</GestureHandlerRootView>
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
  headerAvatar: {
    marginRight: 12,
    backgroundColor: '#007AFF',
    width: 40,
    height: 40,
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
  content: {
    flex: 1,
  },
  pingBanner: {
    backgroundColor: '#EBF8FF',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
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
    color: '#007AFF',
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
  pingBannerText: {
    color: '#1E40AF',
    textAlign: 'center',
  },
  groupInfoBanner: {
    backgroundColor: '#F0FDF4',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#22C55E',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  groupInfoText: {
    color: '#15803D',
    marginBottom: 8,
  },
  participantsChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  participantChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  messagesList: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
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
    lineHeight: 20,
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
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 12,
    padding: 4,
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
  },
  reactionBadge: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 4,
    marginBottom: 2,
    elevation: 1,
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
    fontSize: 12,
  },
  ownTimeText: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherTimeText: {
    color: '#6B7280',
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
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
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#374151',
  },
  // Header styles
  headerUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
    marginLeft: 4,
  },
  typingIndicator: {
    color: '#22C55E',
    fontSize: 12,
    fontStyle: 'italic',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  callButton: {
    marginHorizontal: 4,
  },
  // Message content styles
  messageContent: {
    flex: 1,
  },
  replyLine: {
    width: 3,
    backgroundColor: '#3B82F6',
    borderRadius: 2,
    marginRight: 8,
  },
  replyContent: {
    flex: 1,
  },
  editedLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontStyle: 'italic',
    marginHorizontal: 4,
  },
  // Quick actions styles
  quickActions: {
    flexDirection: 'row',
    marginTop: 4,
    marginLeft: 8,
  },
  quickActionButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  quickActionIcon: {
    fontSize: 14,
  },
  // Enhanced reactions styles
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  reactionBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 4,
    marginBottom: 2,
  },
  reactionBubbleActive: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  reactionEmoji: {
    fontSize: 14,
    marginRight: 2,
  },
  reactionCount: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  // Context menu styles
  contextMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
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
  // Enhanced input styles
  editingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 8,
  },
  editingLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  cancelEdit: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '500',
  },
  editingActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  editActionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  saveButton: {
    backgroundColor: '#3B82F6',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  replyLabel: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500',
  },
  replyCloseButton: {
    padding: 4,
  },
  replyCloseIcon: {
    fontSize: 16,
    color: '#6B7280',
  },
  emojiPicker: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
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
  inputActionButton: {
    marginHorizontal: 4,
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
  emojiIcon: {
    fontSize: 20,
  },
  sendIcon: {
    fontSize: 18,
    color: 'white',
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
  uploadingText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#6B7280',
  },
  menuContent: {
    backgroundColor: 'white',
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingIndicatorHeader: {
    color: '#22C55E',
    fontSize: 12,
    fontStyle: 'italic',
  }
});
