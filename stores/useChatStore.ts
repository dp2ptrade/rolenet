import { create } from 'zustand';
import { Chat, Message, User } from '../lib/types';
import { chatService, realtimeService } from '../lib/supabaseService';

interface ChatState {
  chats: Chat[];
  currentChat: Chat | null;
  messages: Message[];
  isLoading: boolean;
  subscription: any;
  currentSubscriptionChatId?: string; // Track the current chat ID we're subscribed to
  unreadChatsCount: number;
  
  // Basic setters
  setChats: (chats: Chat[]) => void;
  setCurrentChat: (chat: Chat | null) => void;
  setMessages: (messages: Message[]) => void;
  setLoading: (loading: boolean) => void;
  addMessage: (message: Message) => void;
  updateUnreadCount: () => void;
  
  // Chat actions
  getOrCreateChat: (participants: string[]) => Promise<Chat>;
  loadUserChats: (userId: string) => Promise<void>;
  sendMessage: (chatId: string, senderId: string, text: string, type?: string) => Promise<void>;
  loadChatMessages: (chatId: string, limit?: number) => Promise<void>;
  subscribeToMessages: (chatId: string) => void;
  unsubscribeFromMessages: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  currentChat: null,
  messages: [],
  isLoading: false,
  subscription: null,
  currentSubscriptionChatId: undefined,
  unreadChatsCount: 0,
  
  // Basic setters
  setChats: (chats) => {
    set({ chats });
    get().updateUnreadCount();
  },
  setCurrentChat: (chat) => set({ currentChat: chat }),
  setMessages: (messages) => set({ messages }),
  setLoading: (loading) => set({ isLoading: loading }),
  
  addMessage: (message) => {
    const { messages } = get();
    set({ messages: [...messages, message] });
    get().updateUnreadCount();
  },
  
  updateUnreadCount: () => {
    const { chats } = get();
    const unreadCount = chats.reduce((count, chat) => {
      return count + (chat.unread_count || 0);
    }, 0);
    set({ unreadChatsCount: unreadCount });
  },
  
  // Chat actions
  getOrCreateChat: async (participants) => {
    try {
      set({ isLoading: true });
      const { data: chat, error } = await chatService.getOrCreateChat(participants);
      
      if (error) throw error;
      if (!chat) throw new Error('No chat data returned');
      
      // Update chats list if this is a new chat
      const { chats } = get();
      const existingChatIndex = chats.findIndex(c => c.id === chat.id);
      
      if (existingChatIndex === -1) {
        set({ chats: [chat, ...chats] });
      }
      
      set({ currentChat: chat });
      return chat;
    } catch (error) {
      console.error('Get or create chat error:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  
  loadUserChats: async (userId) => {
    try {
      set({ isLoading: true });
      const { data: chats, error } = await chatService.getUserChats(userId);
      if (error) throw error;
      set({ chats: chats || [] });
    } catch (error) {
      console.error('Load user chats error:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  
  sendMessage: async (chatId, senderId, text, type = 'text') => {
    try {
      const { data: newMessage, error } = await chatService.sendMessage(chatId, senderId, text, undefined, type);
      if (error) throw error;
      if (!newMessage) throw new Error('No message data returned');
      
      // Add message to current messages
      const { messages, chats } = get();
      set({ messages: [...messages, newMessage] });
      
      // Update chat's last message in chats list
      const updatedChats = chats.map(chat => 
        chat.id === chatId 
          ? { 
              ...chat, 
              last_message: text,
              last_message_time: new Date()
            }
          : chat
      );
      
      set({ chats: updatedChats });
    } catch (error) {
      console.error('Send message error:', error);
      throw error;
    }
  },
  
  loadChatMessages: async (chatId, limit = 50) => {
    try {
      set({ isLoading: true });
      const { data: messages, error } = await chatService.getChatMessages(chatId, limit);
      if (error) throw error;
      set({ messages: messages || [] });
    } catch (error) {
      console.error('Load chat messages error:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  
  subscribeToMessages: (chatId) => {
    const { subscription } = get();
    
    // Store the current subscription chat ID to prevent duplicate subscriptions
    const currentSubscriptionChatId = get().currentSubscriptionChatId;
    
    // Guard: If we're already subscribed to this chat ID, don't resubscribe
    if (subscription && currentSubscriptionChatId === chatId) {
      console.log('Already subscribed to messages for chat:', chatId);
      return;
    }
    
    // Unsubscribe from existing subscription
    if (subscription) {
      console.log('Unsubscribing from previous chat subscription');
      subscription.unsubscribe();
    }
    
    console.log('Subscribing to messages for chat:', chatId);
    
    // Subscribe to new messages
    const newSubscription = realtimeService.subscribeToChat(chatId, (payload) => {
      const newMessage = payload.new;
      const { addMessage } = get();
      addMessage(newMessage);
    });
    
    set({ 
      subscription: newSubscription,
      currentSubscriptionChatId: chatId 
    });
  },
  
  unsubscribeFromMessages: () => {
    const { subscription } = get();
    if (subscription) {
      console.log('Unsubscribing from chat messages');
      subscription.unsubscribe();
      set({ 
        subscription: null,
        currentSubscriptionChatId: undefined 
      });
    }
  },
}));