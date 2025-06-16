import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Card, TextInput, IconButton, Avatar, Appbar, Surface } from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import { useUserStore } from '@/stores/useUserStore';
import { useChatStore } from '@/stores/useChatStore';
import { supabase } from '@/lib/supabase';

interface Message {
  id: string;
  text: string;
  sender_id: string;
  chat_id: string;
  timestamp: string;
  isOwn: boolean;
  status: 'sent' | 'delivered' | 'read';
}

export default function ChatScreen() {
  const { userId, userName, userRole, userAvatar, pingId } = useLocalSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const currentUser = useUserStore((state: any) => state.user);
  const chatStore = useChatStore();

  useEffect(() => {
    if (!userId || !currentUser?.id) return;

    // Load chat history
    const fetchMessages = async () => {
      try {
        // First, find or create a chat between the two users
        const { data: chatData, error: chatError } = await supabase
          .from('chats')
          .select('*')
          .contains('participants', [currentUser.id, userId])
          .limit(1);

        if (chatError) {
          console.error('Error finding chat:', chatError);
          return;
        }

        let chatId;
        if (chatData && chatData.length > 0) {
          chatId = chatData[0].id;
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
          chatId = newChat.id;
        }

        // Fetch messages for the chat
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('chat_id', chatId)
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
          }));
          setMessages(formattedMessages);
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    fetchMessages();

    // Subscribe to real-time messages
    const subscription = supabase
      .channel(`chat:${currentUser.id}:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      }, async (payload) => {
        // Check if the message belongs to a chat with the current user
        const { data: chatData, error } = await supabase
          .from('chats')
          .select('*')
          .eq('id', payload.new.chat_id)
          .limit(1);

        if (error || !chatData || chatData.length === 0) return;

        if (chatData[0].participants.includes(currentUser.id)) {
          const newMessage = {
            id: payload.new.id,
            text: payload.new.text,
            sender_id: payload.new.sender_id,
            chat_id: payload.new.chat_id,
            timestamp: payload.new.created_at,
            isOwn: payload.new.sender_id === currentUser.id,
            status: payload.new.status || 'sent',
          };
          setMessages(prev => [...prev, newMessage]);
        }
      })
      .subscribe();

    // Add initial message about the ping if provided
    if (pingId && messages.length === 0) {
      const initialMessage: Message = {
        id: 'ping-context',
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
      subscription.unsubscribe();
    };
  }, [userId, currentUser?.id, pingId]);

  const sendMessage = async () => {
    if (!inputText.trim() || !userId || !currentUser?.id) return;

    // First, find or create a chat between the two users
    let chatId;
    const { data: chatData, error: chatError } = await supabase
      .from('chats')
      .select('*')
      .contains('participants', [currentUser.id, userId])
      .limit(1);

    if (chatError) {
      console.error('Error finding chat for sending message:', chatError);
      return;
    }

    if (chatData && chatData.length > 0) {
      chatId = chatData[0].id;
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
      chatId = newChat.id;
    }

    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender_id: currentUser.id,
      chat_id: chatId,
      timestamp: new Date().toISOString(),
      isOwn: true,
      status: 'sent',
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          sender_id: currentUser.id,
          text: inputText.trim(),
          status: 'sent',
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

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[styles.messageContainer, item.isOwn ? styles.ownMessage : styles.otherMessage]}>
      {!item.isOwn && (
        <Avatar.Image
          size={32}
          source={userAvatar ? { uri: userAvatar as string } : require('@/assets/images/icon.png')}
          style={styles.messageAvatar}
        />
      )}
        <Surface
          style={[
            styles.messageBubble,
            item.isOwn ? styles.ownBubble : styles.otherBubble,
          ]}
          elevation={1}
        >
          <Text style={[styles.messageText, item.isOwn ? styles.ownText : styles.otherText]}>
            {item.text}
          </Text>
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
        </Surface>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Avatar.Image
          size={40}
          source={userAvatar ? { uri: userAvatar as string } : require('@/assets/images/icon.png')}
          style={styles.headerAvatar}
        />
        <Appbar.Content
          title={userName as string}
          subtitle={userRole as string}
          titleStyle={styles.headerTitle}
          subtitleStyle={styles.headerSubtitle}
        />
        <Appbar.Action icon="phone" onPress={() => {
          router.push({
            pathname: '/call',
            params: { userId, userName, userRole, userAvatar, pingId }
          });
        }} />
      </Appbar.Header>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {pingId && (
          <Surface style={styles.pingBanner} elevation={1}>
            <Text variant="bodySmall" style={styles.pingBannerText}>
              💬 Chat started from ping response
            </Text>
          </Surface>
        )}

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        />

        <Surface style={styles.inputContainer} elevation={2}>
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            style={styles.textInput}
            multiline
            maxLength={500}
            onSubmitEditing={sendMessage}
            blurOnSubmit={false}
          />
          <IconButton
            icon="send"
            size={24}
            onPress={sendMessage}
            disabled={!inputText.trim()}
            style={styles.sendButton}
            iconColor={inputText.trim() ? '#3B82F6' : '#9CA3AF'}
          />
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
  },
  pingBannerText: {
    color: '#1E40AF',
    textAlign: 'center',
  },
  messagesList: {
    flex: 1,
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
  },
  ownBubble: {
    backgroundColor: '#3B82F6',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: 'white',
    borderBottomLeftRadius: 4,
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
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
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
    color: '#22c55e',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
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
  sendButton: {
    margin: 0,
  },
});
