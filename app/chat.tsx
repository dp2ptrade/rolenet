import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform, Animated, TouchableOpacity, Image, TextInput as RNTextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, IconButton, Avatar, Appbar, Surface, ActivityIndicator, Divider, Chip } from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import { useUserStore } from '@/stores/useUserStore';
import { useChatStore } from '@/stores/useChatStore';
import { useFriendStore } from '@/stores/useFriendStore';
import { supabase } from '@/lib/supabase';
import { ASSETS } from '@/constants/assets';

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
}

export default function ChatScreen() {
  const { userId, userName, userRole, userAvatar, pingId, chatId, chatName, isGroup, participants } = useLocalSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
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
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<RNTextInput>(null);
  const currentUser = useUserStore((state: any) => state.user);
  const chatStore = useChatStore();
  const { friends } = useFriendStore();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  let chatData: any[] = []; // Temporary variable to store chat data for typing broadcast
  const isGroupChat = isGroup === 'true';
  const groupParticipants = participants ? JSON.parse(participants as string) : [];

  useEffect(() => {
    if (!currentUser?.id) return;
    let targetChatId = chatId as string | undefined;

    // Load chat history
    const fetchMessages = async () => {
      try {
        if (!targetChatId) {
          // For one-on-one chat, find or create a chat between the two users
          if (!userId) return;
          const { data: chatDataResult, error: chatError } = await supabase
            .from('chats')
            .select('*')
            .contains('participants', [currentUser.id, userId])
            .limit(1);

          if (chatError) {
            console.error('Error finding chat:', chatError);
            return;
          }

          chatData = chatDataResult; // Store for later use in typing broadcast

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
              console.error('Error creating chat:', newChatError);
              return;
            }
            targetChatId = newChat.id;
            chatData = [newChat];
          }
        }

        // Fetch messages for the chat
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('chat_id', targetChatId)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error loading messages:', error);
          return;
        }

        if (data) {
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
          }));
          // Ensure no duplicates by filtering based on ID
          const uniqueMessages = formattedMessages.filter((msg, index, self) =>
            index === self.findIndex((m) => m.id === msg.id)
          );
          setMessages(uniqueMessages);
          // Initialize animations for existing messages
          const animations = uniqueMessages.reduce((acc: { [key: string]: Animated.Value }, msg) => {
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
    let subscription: any = null;
    const setupSubscription = async () => {
      try {
        if (!targetChatId) {
          // For one-on-one chat, find or create a chat to get the chat ID
          if (!userId) return;
          const { data: chatDataResult, error: chatError } = await supabase
            .from('chats')
            .select('*')
            .contains('participants', [currentUser.id, userId])
            .limit(1);

          if (chatError) {
            console.error('Error finding chat for subscription:', chatError);
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
              console.error('Error creating chat for subscription:', newChatError);
              return;
            }
            targetChatId = newChat.id;
          }
        }

        // Subscribe using chat ID for consistency with other features
        subscription = supabase
          .channel(`chat:${targetChatId}`)
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `chat_id=eq.${targetChatId}`
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
            };
            setMessages(prev => {
              // Check if message with this ID already exists
              if (prev.some(msg => msg.id === newMessage.id)) {
                return prev;
              }
              const updatedMessages = [...prev, newMessage];
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
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [userId, currentUser?.id, pingId, chatId, isGroup, participants]);

  const sendMessage = async () => {
    if (!inputText.trim() || !currentUser?.id) return;
    let targetChatId = chatId as string | undefined;

    if (!targetChatId && userId) {
      // For one-on-one chat, find or create a chat between the two users
      const { data: chatDataResult, error: chatError } = await supabase
        .from('chats')
        .select('*')
        .contains('participants', [currentUser.id, userId])
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
      id: `temp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
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
        <TouchableOpacity onLongPress={() => showContextMenu(item.id)}>
          <Surface
            style={[
              styles.messageBubble,
              item.isOwn ? styles.ownBubble : styles.otherBubble,
              item.replyTo ? styles.replyBubble : {},
            ]}
            elevation={2}
          >
            {isGroupChat && !item.isOwn && sender && (
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
                  <Image
                    source={{ uri: item.mediaUrl }}
                    style={styles.mediaImage}
                    resizeMode="cover"
                  />
                )}
                {item.text && (
                  <Text style={[styles.messageText, item.isOwn ? styles.ownText : styles.otherText]}>
                    {item.text}
                  </Text>
                )}
              </View>
            ) : item.mediaType === 'file' ? (
              <View style={styles.fileContainer}>
                <IconButton icon="file-document-outline" size={24} iconColor="#6B7280" />
                <Text style={[styles.messageText, item.isOwn ? styles.ownText : styles.otherText]}>
                  File Attachment
                </Text>
              </View>
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

  const showContextMenu = (messageId: string) => {
    setContextMenuMessageId(messageId);
    setSelectedMessageId(messageId);
    setContextMenuVisible(true);
    setReactionMenuVisible(true);
  };

  const addReaction = async (messageId: string, emoji: string) => {
    if (!currentUser?.id) return;

    try {
      // Fetch current reactions for the message
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
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) {
        console.error('Error deleting message:', error);
        return;
      }

      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      setContextMenuVisible(false);
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const sendMediaMessage = async (mediaUri: string, mediaType: 'image' | 'file') => {
    if (!currentUser?.id) return;
    let targetChatId = chatId as string | undefined;

    if (!targetChatId && userId) {
      // For one-on-one chat, find or create a chat between the two users
      const { data: chatDataResult, error: chatError } = await supabase
        .from('chats')
        .select('*')
        .contains('participants', [currentUser.id, userId])
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

    // Simulate uploading media to Supabase storage (placeholder for actual upload logic)
    // In a real implementation, you would upload the file to Supabase Storage and get the URL
    const mediaUrl = mediaUri; // Placeholder: assuming the URI is directly usable for now

    // Generate a proper UUID for temporary media messages
    const generateUUID = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };
    
    const newMessage: Message = {
      id: generateUUID(), // Use proper UUID format
      text: inputText.trim() || '',
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
    setReplyToMessageId(null); // Reset reply after sending
    broadcastTypingStatus(targetChatId, false);

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          chat_id: targetChatId,
          sender_id: currentUser.id,
          text: inputText.trim() || '',
          status: 'sent',
          reply_to: replyToMessageId || null,
          media_url: mediaUrl,
          media_type: mediaType,
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
              <View key={msg.id || `${item.date}-${index}`}>
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
        {isGroupChat ? (
          <Avatar.Icon
            size={40}
            icon="account-group"
            style={styles.headerAvatar}
          />
        ) : (
          <Avatar.Image
            size={40}
            source={
              userAvatar 
                ? { uri: userAvatar as string } 
                : { uri: 'https://via.placeholder.com/150?text=No+Image' }
            }
            style={styles.headerAvatar}
          />
        )}
        <Appbar.Content
          title={isGroupChat ? (chatName as string) : (userName as string)}
          subtitle={isGroupChat ? `${groupParticipants.length} members` : (userRole as string)}
          titleStyle={styles.headerTitle}
          subtitleStyle={styles.headerSubtitle}
        />
        {!isGroupChat && (
          <Appbar.Action icon="phone" onPress={() => {
            router.push({
              pathname: '/call',
              params: { userId, userName, userRole, userAvatar, pingId }
            });
          }} />
        )}
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

        {renderGroupedMessages()}

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
                    Replying to: {messages.find(msg => msg.id === replyToMessageId)?.text.slice(0, 30) || 'Message'}...
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
              <IconButton
                icon="image"
                size={24}
                onPress={() => {
                  // Placeholder for selecting and sending an image
                  sendMediaMessage('https://via.placeholder.com/300x200?text=Sample+Image', 'image');
                }}
                style={styles.sendButton}
                iconColor="#6B7280"
              />
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
    padding: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  ownBubble: {
    backgroundColor: '#3B82F6',
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
    color: '#6B7280',
    fontStyle: 'italic',
  },
  replyPreview: {
    fontSize: 12,
    color: '#6B7280',
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
    color: '#1E40AF',
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
  },
  mediaImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: 4,
  },
  fileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  senderName: {
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#374151',
  },
});
