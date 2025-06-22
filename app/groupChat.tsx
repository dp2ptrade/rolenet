import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform, Animated, TouchableOpacity, Image, TextInput as RNTextInput, Alert, Modal, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, IconButton, Avatar, Appbar, Surface, ActivityIndicator, Divider, Chip } from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import { useUserStore } from '@/stores/useUserStore';
import { useFriendStore } from '@/stores/useFriendStore';
import { supabase } from '../lib/supabase';
import { chatService } from '../lib/supabaseService';
import MediaPicker from '@/components/MediaPicker';
import { ChatService } from '@/lib/supabaseService';

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
  mediaType?: 'image' | 'file'; // Type of media attachment
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
  const [editingMessage, setEditingMessage] = useState<{ id: string, text: string } | null>(null);
  const [messageAnimations, setMessageAnimations] = useState<{ [key: string]: Animated.Value }>({});
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<RNTextInput>(null);
  const currentUser = useUserStore((state: any) => state.user);
  const { friends } = useFriendStore();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const groupParticipants = participants ? JSON.parse(participants as string) : [];

  useEffect(() => {
    if (!currentUser?.id || !chatId) return;

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

  const sendMessage = async () => {
    if (!inputText.trim() || !currentUser?.id || !chatId) return;

    const newMessage: Message = {
      id: `temp-${Date.now()}-${Math.floor(Math.random() * 10000).toString(16)}`,
      text: inputText.trim(),
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
        <TouchableOpacity onLongPress={() => showContextMenu(item.id)}>
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
                    console.log('Opening file:', item.mediaUrl);
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
            icon="emoticon-happy-outline"
            size={20}
            onPress={() => {
              setSelectedMessageId(item.id);
              setReactionMenuVisible(true);
            }}
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
              <IconButton
                icon="trash-can-outline"
                size={20}
                onPress={() => deleteMessage(item.id)}
                style={styles.actionButton}
                iconColor="#EF4444"
              />
            </>
          )}
        </View>
        {reactionMenuVisible && selectedMessageId === item.id && (
          <View style={styles.reactionMenu}>
            {['👍', '❤️', '😂', '😢', '😡'].map(emoji => (
              <TouchableOpacity
                key={emoji}
                style={styles.emojiButton}
                onPress={() => addReaction(item.id, emoji)}
              >
                <Text style={styles.emojiText}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
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

  const showContextMenu = (messageId: string) => {
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
              <View key={msg.id ? `${item.date}-msg-${msg.id}` : `${item.date}-${index}-${msg.timestamp || Date.now()}`}>
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
    <SafeAreaView style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Avatar.Icon
          size={40}
          icon="account-group"
          style={styles.headerAvatar}
        />
        <Appbar.Content
          title={chatName as string}
          subtitle={`${groupParticipants.length} members`}
          titleStyle={styles.headerTitle}
          subtitleStyle={styles.headerSubtitle}
        />
      </Appbar.Header>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
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
        {pinnedMessages.length > 0 && (
          <Surface style={styles.pinnedMessagesBanner} elevation={1}>
            <Text style={styles.pinnedMessagesTitle}>Pinned Messages</Text>
            {pinnedMessages.slice(0, 3).map((msg) => {
              const isMessageVisible = messages.some(m => m.id === msg.id);
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
                  <Text style={styles.pinnedMessageText} numberOfLines={1}>
                    {msg.text}
                  </Text>
                  <Text style={styles.pinnedMessageTime}>
                    {formatTime(msg.timestamp)}
                  </Text>
                  {!isMessageVisible && (
                    <Text style={styles.notVisibleIndicator}>•</Text>
                  )}
                </TouchableOpacity>
              );
            })}
            {pinnedMessages.length > 3 && (
              <Text style={styles.morePinnedText}>
                + {pinnedMessages.length - 3} more pinned messages
              </Text>
            )}
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
              <RNTextInput
                value={editingMessage.text}
                onChangeText={(text) => setEditingMessage({ ...editingMessage, text })}
                placeholder="Edit message..."
                style={styles.textInput}
                multiline
                maxLength={500}
                onSubmitEditing={saveEditedMessage}
                blurOnSubmit={false}
              />
              <IconButton
                icon="check"
                size={24}
                onPress={saveEditedMessage}
                disabled={!editingMessage.text.trim()}
                style={styles.sendButton}
                iconColor={editingMessage.text.trim() ? '#3B82F6' : '#9CA3AF'}
              />
              <IconButton
                icon="close"
                size={24}
                onPress={() => {
                  setEditingMessage(null);
                }}
                style={styles.sendButton}
                iconColor="#6B7280"
              />
            </>
          ) : (
            <>
              {replyToMessageId && (
                <View style={styles.replyPreviewContainer}>
                  <Text style={styles.replyPreviewText}>
                    Replying to: {messages.find(msg => msg.id === replyToMessageId)?.text.slice(0, 30) || 'Message'}
                  </Text>
                  <IconButton
                    icon="close"
                    size={16}
                    onPress={cancelReply}
                    iconColor="#6B7280"
                  />
                </View>
              )}
              <RNTextInput
                ref={inputRef}
                value={inputText}
                onChangeText={handleInputChange}
                placeholder="Type a message..."
                style={[styles.textInput, replyToMessageId && styles.textInputWithReply]}
                multiline
                maxLength={500}
                onSubmitEditing={sendMessage}
                blurOnSubmit={false}
              />
              {isUploadingMedia ? (
                <View style={styles.uploadingContainer}>
                  <ActivityIndicator size="small" color="#3B82F6" />
                </View>
              ) : (
                <MediaPicker
                  onMediaSelected={handleMediaSelected}
                  disabled={isUploadingMedia}
                />
              )}
              <IconButton
                icon="send"
                size={24}
                onPress={sendMessage}
                disabled={!inputText.trim()}
                style={styles.sendButton}
                iconColor={inputText.trim() ? '#3B82F6' : '#9CA3AF'}
              />
            </>
          )}
        </Surface>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerAvatar: {
    marginLeft: 8,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  content: {
    flex: 1,
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
  pinnedMessagesBanner: {
    backgroundColor: '#FFF8E7',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  pinnedMessagesTitle: {
    color: '#B45309',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  pinnedMessageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#FEF2C7',
  },
  pinnedMessageText: {
    flex: 1,
    color: '#78350F',
  },
  pinnedMessageTime: {
    fontSize: 12,
    color: '#B45309',
  },
  morePinnedText: {
    color: '#B45309',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  notVisibleIndicator: {
    color: '#F59E0B',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
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
    padding: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  ownBubble: {
    backgroundColor: '#aeb1b5',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: 'white',
    borderBottomLeftRadius: 4,
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
    color: 'white',
  },
  otherText: {
    color: '#1F2937',
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
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  textInput: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
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
    margin: 0,
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
});
