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
  globalChatSubscription: any; // Global subscription for all chat updates
  unreadChatsCount: number;
  
  // Basic setters
  setChats: (chats: Chat[]) => void;
  setCurrentChat: (chat: Chat | null) => void;
  setMessages: (messages: Message[]) => void;
  setLoading: (loading: boolean) => void;
  addMessage: (message: Message) => void;
  updateUnreadCount: () => void;
  togglePinChat: (chatId: string, pin: boolean) => Promise<void>;
  
  // Chat actions
  getOrCreateChat: (participants: string[]) => Promise<Chat>;
  loadUserChats: (userId: string, limit?: number) => Promise<void>;
  sendMessage: (chatId: string, senderId: string, text: string, type?: string) => Promise<void>;
  loadChatMessages: (chatId: string, limit?: number) => Promise<void>;
  subscribeToMessages: (chatId: string) => void;
  unsubscribeFromMessages: () => void;
  subscribeToAllChats: (userId: string) => void;
  unsubscribeFromAllChats: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  currentChat: null,
  messages: [],
  isLoading: false,
  subscription: null,
  currentSubscriptionChatId: undefined,
  globalChatSubscription: null,
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
    const { messages, chats, currentChat } = get();
    set({ messages: [...messages, message] });
    
    // Update the corresponding chat's last message and timestamp
    const updatedChats = chats.map(chat => {
      if (chat.id === message.chat_id || 
          (currentChat && chat.id === currentChat.id)) {
        return {
          ...chat,
          last_message: message.text || 'Media message',
          last_message_time: new Date(message.timestamp),
          updated_at: new Date(message.timestamp),
          unread_count: chat.id === currentChat?.id ? chat.unread_count : (chat.unread_count || 0) + 1
        };
      }
      return chat;
    });
    
    // Sort chats by most recent activity
    const sortedChats = updatedChats.sort((a, b) => {
      const timeA = a.last_message_time || a.updated_at;
      const timeB = b.last_message_time || b.updated_at;
      return new Date(timeB).getTime() - new Date(timeA).getTime();
    });
    
    set({ chats: sortedChats });
    get().updateUnreadCount();
  },
  
  updateUnreadCount: () => {
    const { chats } = get();
    const unreadCount = chats.reduce((count, chat) => {
      return count + (chat.unread_count || 0);
    }, 0);
    set({ unreadChatsCount: unreadCount });
  },
  
  togglePinChat: async (chatId, pin) => {
    try {
      const { data, error } = await chatService.togglePinChat(chatId, pin);
      if (error) throw error;
      
      const { chats } = get();
      const updatedChats = chats.map(chat => 
        chat.id === chatId ? { ...chat, isPinned: pin } : chat
      );
      set({ chats: updatedChats });
    } catch (error) {
      console.error('Toggle pin chat error:', error);
      throw error;
    }
  },
  
  // Chat actions
  getOrCreateChat: async (participants) => {
    try {
      set({ isLoading: true });
      const { data: chat, error } = await chatService.getOrCreateChat(participants);
      
      if (error) throw error;
      if (!chat) throw new Error('No chat data returned');
      
      // Map database column names to TypeScript interface
      const mappedChat = {
        ...chat,
        isPinned: chat.is_pinned || false
      };
      
      // Update chats list if this is a new chat
      const { chats } = get();
      const existingChatIndex = chats.findIndex(c => c.id === mappedChat.id);
      
      if (existingChatIndex === -1) {
        set({ chats: [mappedChat, ...chats] });
      }
      
      set({ currentChat: mappedChat });
      return mappedChat;
    } catch (error) {
      console.error('Get or create chat error:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  
  loadUserChats: async (userId, limit = 20) => {
    try {
      set({ isLoading: true });
      const { data: chats, error } = await chatService.getUserChats(userId, limit);
      if (error) throw error;
      
      // Map database column names to TypeScript interface
      const mappedChats = (chats || []).map(chat => ({
        ...chat,
        isPinned: chat.is_pinned || false
      }));
      
      set({ chats: mappedChats });
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
      
      // Update chat's last message and move it to the top of the list
      const now = new Date();
      const updatedChats = chats.map(chat => 
        chat.id === chatId 
          ? { 
              ...chat, 
              last_message: text,
              last_message_time: now,
              updated_at: now
            }
          : chat
      );
      
      // Sort chats by most recent activity (last_message_time or updated_at)
      const sortedChats = updatedChats.sort((a, b) => {
        const timeA = a.last_message_time || a.updated_at;
        const timeB = b.last_message_time || b.updated_at;
        return new Date(timeB).getTime() - new Date(timeA).getTime();
      });
      
      set({ chats: sortedChats });
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
    
    // Subscribe to new messages and deleted messages
    const newSubscription = realtimeService.subscribeToChat(chatId, (payload) => {
      console.log('useChatStore: Received payload:', payload.eventType);
      
      // Handle INSERT events
      if (payload.eventType === 'INSERT' && payload.new) {
        const newMessage = payload.new;
        console.log('useChatStore: Adding new message:', newMessage.id);
        const { addMessage } = get();
        addMessage(newMessage);
      }
      
      // Handle DELETE events
      if (payload.eventType === 'DELETE' && payload.old) {
        const deletedMessage = payload.old;
        console.log('useChatStore: Deleting message:', deletedMessage.id);
        
        const { messages } = get();
        console.log('useChatStore: Current message count:', messages.length);
        
        // Filter out the deleted message from messages
        const updatedMessages = messages.filter((msg: Message) => msg.id !== deletedMessage.id);
        
        // Update the state
        set({ 
          messages: updatedMessages
        });
        
        console.log('useChatStore: New message count:', updatedMessages.length);
        
        // Clear any fallback timeout for this message
        // @ts-ignore - Accessing custom property
        if (window._deleteMessageTimeouts && window._deleteMessageTimeouts[deletedMessage.id]) {
          console.log('useChatStore: Clearing fallback timeout for message:', deletedMessage.id);
          // @ts-ignore
          clearTimeout(window._deleteMessageTimeouts[deletedMessage.id]);
          // @ts-ignore
          delete window._deleteMessageTimeouts[deletedMessage.id];
        }
      }
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

  subscribeToAllChats: (userId) => {
    const { globalChatSubscription } = get();
    
    // Unsubscribe from existing global subscription if any
    if (globalChatSubscription) {
      globalChatSubscription.unsubscribe();
    }
    
    console.log('Subscribing to all chat updates for user:', userId);
    
    // Subscribe to all message inserts to update chat list order
    const newGlobalSubscription = realtimeService.subscribeToAllMessages((payload) => {
      console.log('Global chat subscription: Received message payload:', payload.eventType);
      
      if (payload.eventType === 'INSERT' && payload.new) {
        const newMessage = payload.new;
        const { chats, currentChat } = get();
        
        // Only update if this message is for a chat the user participates in
        const relevantChat = chats.find(chat => chat.id === newMessage.chat_id);
        if (relevantChat) {
          const updatedChats = chats.map(chat => {
            if (chat.id === newMessage.chat_id) {
              return {
                ...chat,
                last_message: newMessage.text || 'Media message',
                last_message_time: new Date(newMessage.timestamp),
                updated_at: new Date(newMessage.timestamp),
                unread_count: chat.id === currentChat?.id ? chat.unread_count : (chat.unread_count || 0) + 1
              };
            }
            return chat;
          });
          
          // Sort chats by most recent activity
          const sortedChats = updatedChats.sort((a, b) => {
            const timeA = a.last_message_time || a.updated_at;
            const timeB = b.last_message_time || b.updated_at;
            return new Date(timeB).getTime() - new Date(timeA).getTime();
          });
          
          set({ chats: sortedChats });
          get().updateUnreadCount();
        }
      }
    });
    
    set({ globalChatSubscription: newGlobalSubscription });
  },

  unsubscribeFromAllChats: () => {
    const { globalChatSubscription } = get();
    if (globalChatSubscription) {
      console.log('Unsubscribing from global chat updates');
      globalChatSubscription.unsubscribe();
      set({ globalChatSubscription: null });
    }
  },
}));
