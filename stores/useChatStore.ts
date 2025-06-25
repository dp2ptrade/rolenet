import { create } from 'zustand';
import { chatService } from '../lib/supabaseService';
import { offlineStorage } from '../lib/offlineStorage';
import { chatPagination } from '../lib/chatPagination';
import NetInfo from '@react-native-community/netinfo';
import { CONFIG } from '../lib/config/chatConfig';'../lib/networkUtils';
import { Chat, Message } from '../lib/types';

interface OfflineMessage {
  id?: string;
  chatId: string;
  senderId: string;
  text: string;
  type: 'text' | 'image' | 'audio';
  timestamp: string;
  tempId: string;
  retryCount?: number;
  status?: 'pending' | 'failed' | 'synced';
}

interface ChatState {
  // Core state
  chats: Chat[];
  currentChat: Chat | null;
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  subscription: any;
  currentSubscriptionChatId: string | undefined;
  globalChatSubscription: any;
  unreadChatsCount: number;
  
  // Pagination state
  hasMoreMessages: boolean;
  loadingMoreMessages: boolean;
  messageOffset: number;
  hasMoreChats: boolean;
  loadingMoreChats: boolean;
  
  // Offline support state
  isOnline: boolean;
  offlineMessages: OfflineMessage[];
  syncInProgress: boolean;
  lastSyncTime: Date | null;
  currentPage: number;
  cachedDataLoaded: boolean;
  
  // Actions
  setChats: (chats: Chat[]) => void;
  setCurrentChat: (chat: Chat | null) => void;
  setMessages: (messages: Message[]) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  addMessage: (message: Message) => void;
  updateUnreadCount: () => void;
  togglePinChat: (chatId: string, value?: boolean) => Promise<void>;
  getOrCreateChat: (participants: string[]) => Promise<Chat | null>;
  createGroupChat: (name: string, participants: string[], createdBy: string) => Promise<Chat | null>;
  loadUserChats: (userId: string, useCache?: boolean) => Promise<void>;
  loadMoreChats: (userId: string, limit?: number) => Promise<void>;
  sendMessage: (message: { chatId: string; senderId: string; text: string; type?: 'text' | 'audio' | 'image' }) => Promise<void>;
  loadChatMessages: (chatId: string) => Promise<void>;
  loadMoreMessages: (chatId: string, limit?: number) => Promise<void>;
  subscribeToMessages: (chatId: string) => void;
  unsubscribeFromMessages: () => void;
  subscribeToAllChats: (userId: string) => void;
  unsubscribeFromAllChats: () => void;
  
  // Offline support actions
  setOnlineStatus: (isOnline: boolean) => void;
  initializeOfflineSupport: (userId: string) => Promise<void>;
  syncOfflineMessages: () => Promise<void>;
  queueOfflineMessage: (message: Omit<OfflineMessage, 'id' | 'retryCount' | 'status'>) => Promise<void>;
  loadCachedData: (userId: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  // Initial state
  chats: [],
  currentChat: null,
  messages: [],
  isLoading: false,
  error: null,
  subscription: null,
  currentSubscriptionChatId: undefined,
  globalChatSubscription: null,
  unreadChatsCount: 0,
  
  // Pagination state
  hasMoreMessages: false,
  loadingMoreMessages: false,
  messageOffset: 0,
  hasMoreChats: false,
  loadingMoreChats: false,
  
  // Offline support state
  isOnline: true,
  offlineMessages: [],
  syncInProgress: false,
  lastSyncTime: null,
  currentPage: 0,
  cachedDataLoaded: false,
  
  // Basic setters
  setChats: (chats) => set({ chats }),
  setCurrentChat: (chat) => set({ currentChat: chat }),
  setMessages: (messages) => set({ messages }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
  
  addMessage: (message) => {
    const { messages, chats } = get();
    const updatedMessages = [...messages, message];
    set({ messages: updatedMessages });
    
    // Update chat's last message and timestamp
    const updatedChats = chats.map(chat => {
      if (chat.id === message.chat_id) {
        return {
          ...chat,
          last_message: message.text,
          last_message_time: message.timestamp,
          updated_at: new Date()
        };
      }
      return chat;
    });
    
    // Sort chats by most recent activity
    const sortedChats = updatedChats.sort((a, b) => {
      const aTime = new Date(a.last_message_time || a.updated_at).getTime();
      const bTime = new Date(b.last_message_time || b.updated_at).getTime();
      return bTime - aTime;
    });
    
    set({ chats: sortedChats });
    get().updateUnreadCount();
  },
  
  updateUnreadCount: () => {
    const { chats } = get();
    const unreadCount = chats.reduce((total, chat) => total + (chat.unread_count || 0), 0);
    set({ unreadChatsCount: unreadCount });
  },
  
  togglePinChat: async (chatId, value) => {
    try {
      const { chats } = get();
      const currentChat = chats.find(chat => chat.id === chatId);
      const pinValue = value !== undefined ? value : !currentChat?.isPinned;
      
      const { data, error } = await chatService.togglePinChat(chatId, pinValue);
      if (error) throw new Error(error.message);
      
      const updatedChats = chats.map(chat => 
        chat.id === chatId ? { ...chat, isPinned: data.is_pinned } : chat
      );
      set({ chats: updatedChats });
    } catch (error: any) {
      set({ error: error.message });
    }
  },
  
  getOrCreateChat: async (participants) => {
    try {
      const { data, error } = await chatService.getOrCreateChat(participants);
      if (error) throw new Error(error.message);
      
      const { chats } = get();
      const existingChatIndex = chats.findIndex(chat => chat.id === data.id);
      
      if (existingChatIndex >= 0) {
        return chats[existingChatIndex];
      } else {
        const updatedChats = [data, ...chats];
        set({ chats: updatedChats });
        return data;
      }
    } catch (error: any) {
      set({ error: error.message });
      return null;
    }
  },

  createGroupChat: async (name, participants, createdBy) => {
    try {
      const { data, error } = await chatService.createGroupChat(name, participants, createdBy);
      if (error) throw new Error(error.message);
      
      const { chats } = get();
      const updatedChats = [data, ...chats];
      set({ chats: updatedChats });
      return data;
    } catch (error: any) {
      set({ error: error.message });
      return null;
    }
  },
  
  loadUserChats: async (userId: string, useCache = false) => {
    const { isOnline } = get();
    
    if (!userId) {
      set({ error: 'User ID is required', isLoading: false });
      return;
    }

    set({ isLoading: true, error: null });
    
    console.log('🔄 loadUserChats called with userId:', userId, 'useCache:', useCache);
    console.log('📊 isOnline:', isOnline);

    try {
      if (isOnline) {
        try {
          const result = await chatPagination.loadInitialChats(useCache);
          
          console.log('📥 loadInitialChats result:', {
            chatsCount: result.chats.length,
            pinnedCount: result.pinnedChats.length,
            recentCount: result.recentChats.length,
            fromCache: result.fromCache
          });
          
          if (result.chats.length > 0) {
            await offlineStorage.cacheChats(result.chats);
          }
          
          const sortedChats = result.chats.sort((a: Chat, b: Chat) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            
            const aTime = new Date(a.last_message_time || a.updated_at).getTime();
            const bTime = new Date(b.last_message_time || b.updated_at).getTime();
            return bTime - aTime;
          });
          
          set({ chats: sortedChats, isLoading: false });
        } catch (serverError) {
          console.error('❌ Server error, falling back to cache:', serverError);
          const cachedChats = await offlineStorage.getCachedChats();
          const sortedChats = cachedChats.sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            const aTime = new Date(a.last_message_time || a.updated_at).getTime();
            const bTime = new Date(b.last_message_time || b.updated_at).getTime();
            return bTime - aTime;
          });
          set({ chats: sortedChats, isLoading: false, error: 'Using cached data' });
        }
      } else {
        console.log('📱 Offline mode, loading from cache');
        const cachedChats = await offlineStorage.getCachedChats();
        const sortedChats = cachedChats.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          const aTime = new Date(a.last_message_time || a.updated_at).getTime();
          const bTime = new Date(b.last_message_time || b.updated_at).getTime();
          return bTime - aTime;
        });
        set({ chats: sortedChats, isLoading: false });
      }
    } catch (error: any) {
      console.error('❌ loadUserChats error:', error);
      set({ error: error.message, isLoading: false });
    }
  },
  
  loadMoreChats: async (userId, limit = CONFIG.CHATS.DEFAULT_LIMIT) => {
    const { loadingMoreChats, hasMoreChats, chats } = get();
    
    if (loadingMoreChats || !hasMoreChats) return;
    
    set({ loadingMoreChats: true });
    
    try {
      const offset = chats.length;
      const result = await chatService.getUserChats(userId);
      const { data, error } = result;
      
      if (error) throw new Error(error.message);
      
      if (data && data.length > 0) {
        const newChats = [...chats, ...data];
        await offlineStorage.cacheChats(newChats);
        set({ 
          chats: newChats, 
          hasMoreChats: data.length === limit,
          loadingMoreChats: false 
        });
      } else {
        set({ hasMoreChats: false, loadingMoreChats: false });
      }
    } catch (error: any) {
      set({ error: error.message, loadingMoreChats: false });
    }
  },
  
  sendMessage: async (message: { chatId: string; senderId: string; text: string; type?: 'text' | 'audio' | 'image' }) => {
    const { isOnline, messages } = get();
    const { chatId, senderId, text, type = 'text' } = message;
    
    if (!chatId || !text.trim() || !senderId) {
      set({ error: 'Chat ID, message text, and sender ID are required' });
      return;
    }

    const tempId = `temp_${Date.now()}_${Math.random()}`;
    const optimisticMessage: Message = {
      id: tempId,
      chat_id: chatId,
      senderId,
      text: text.trim(),
      type,
      timestamp: new Date(),
      status: 'sent'
    };

    const updatedMessages = [...messages, optimisticMessage];
    set({ messages: updatedMessages });

    if (isOnline) {
      try {
        const { data: sentMessage, error } = await chatService.sendMessage(
          chatId,
          senderId,
          text.trim(),
          undefined,
          undefined,
          type
        );

        if (error) {
          throw new Error(error.message);
        }

        const finalMessages = messages.map(msg => 
          msg.id === tempId ? sentMessage : msg
        );
        set({ messages: finalMessages });

        if (sentMessage) {
          await offlineStorage.cacheMessages(chatId, [sentMessage]);
        }

        const { chats } = get();
        const updatedChats = chats.map(chat => {
          if (chat.id === chatId) {
            return {
              ...chat,
              last_message: sentMessage.text,
              last_message_time: sentMessage.timestamp,
              updated_at: new Date()
            };
          }
          return chat;
        }).sort((a, b) => {
          const aTime = new Date(a.last_message_time || a.updated_at).getTime();
          const bTime = new Date(b.last_message_time || b.updated_at).getTime();
          return bTime - aTime;
        });

        set({ chats: updatedChats });
      } catch (error: any) {
        const filteredMessages = messages.filter(msg => msg.id !== tempId);
        set({ messages: filteredMessages, error: error.message });
        
        await get().queueOfflineMessage({
          chatId,
          text: text.trim(),
          senderId,
          type: type as 'text' | 'image' | 'audio',
          timestamp: new Date().toISOString(),
          tempId: tempId
        });
      }
    } else {
      await get().queueOfflineMessage({
        chatId,
        text: text.trim(),
        senderId,
        type: type as 'text' | 'image' | 'audio',
        timestamp: new Date().toISOString(),
        tempId: `temp_${Date.now()}_${Math.random()}`
      });
    }
  },
  
  loadChatMessages: async (chatId: string) => {
    const { isOnline } = get();
    
    if (!chatId) {
      set({ error: 'Chat ID is required', isLoading: false });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      if (isOnline) {
        const { data, error } = await chatService.getChatMessages(chatId);
        
        if (error) throw new Error(error.message);
        
        if (data) {
          await offlineStorage.cacheMessages(chatId, data);
        }
        
        const sortedMessages = data?.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        ) || [];
        
        set({ 
          messages: sortedMessages, 
          isLoading: false,
          hasMoreMessages: data?.length === 50,
          messageOffset: data?.length || 0
        });
      } else {
        const cachedMessages = await offlineStorage.getCachedMessages(chatId);
        const sortedMessages = cachedMessages.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        
        set({ 
          messages: sortedMessages, 
          isLoading: false,
          hasMoreMessages: cachedMessages.length === 50,
          messageOffset: cachedMessages.length
        });
      }
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },
  
  loadMoreMessages: async (chatId, limit = CONFIG.MESSAGES.DEFAULT_LIMIT) => {
    const { loadingMoreMessages, hasMoreMessages, messages, messageOffset } = get();
    
    if (loadingMoreMessages || !hasMoreMessages) return;
    
    set({ loadingMoreMessages: true });
    
    try {
      const { data, error } = await chatService.getChatMessages(chatId, CONFIG.MESSAGES.DEFAULT_LIMIT);
      
      if (error) throw new Error(error.message);
      
      if (data && data.length > 0) {
        await offlineStorage.cacheMessages(chatId, data);
        
        const sortedNewMessages = data.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        
        const allMessages = [...sortedNewMessages, ...messages];
        
        set({ 
          messages: allMessages,
          hasMoreMessages: data.length === 20,
          messageOffset: messageOffset + data.length,
          loadingMoreMessages: false
        });
      } else {
        set({ hasMoreMessages: false, loadingMoreMessages: false });
      }
    } catch (error: any) {
      set({ error: error.message, loadingMoreMessages: false });
    }
  },
  
  subscribeToMessages: (chatId) => {
    const currentState = get();
    
    if (currentState.currentSubscriptionChatId === chatId) {
      return;
    }
    
    get().unsubscribeFromMessages();
    
    const subscription = {
      unsubscribe: () => {}
    };
    // Placeholder for subscription logic
    // const subscription = chatService.subscribeToMessages(chatId, (message: Message) => {
    //   get().addMessage(message);
    // });
    
    set({ 
      subscription, 
      currentSubscriptionChatId: chatId 
    });
  },
  
  unsubscribeFromMessages: () => {
    const { subscription } = get();
    if (subscription) {
      subscription.unsubscribe();
      set({ 
        subscription: null, 
        currentSubscriptionChatId: undefined 
      });
    }
  },
  
  subscribeToAllChats: (userId) => {
    const { globalChatSubscription } = get();
    
    if (globalChatSubscription) {
      globalChatSubscription.unsubscribe();
    }
    
    const subscription = {
      unsubscribe: () => {}
    };
    // Placeholder for subscription logic
    // const subscription = chatService.subscribeToAllChats(userId, (payload: any) => {
    //   if (payload.eventType === 'INSERT') {
    //     const newMessage = payload.new;
    //     const { chats } = get();
    //     
    //     const updatedChats = chats.map(chat => {
    //       if (chat.id === newMessage.chat_id) {
    //         return {
    //           ...chat,
    //           last_message: newMessage.text,
    //           last_message_time: newMessage.timestamp,
    //           unread_count: (chat.unread_count || 0) + 1,
    //           updated_at: new Date()
    //         };
    //       }
    //       return chat;
    //     });
    //     
    //     const sortedChats = updatedChats.sort((a, b) => {
    //       const aTime = new Date(a.last_message_time || a.updated_at).getTime();
    //       const bTime = new Date(b.last_message_time || b.updated_at).getTime();
    //       return bTime - aTime;
    //     });
    //     
    //     set({ chats: sortedChats });
    //     get().updateUnreadCount();
    //   }
    // });
    
    set({ globalChatSubscription: subscription });
  },
  
  unsubscribeFromAllChats: () => {
    const { globalChatSubscription } = get();
    if (globalChatSubscription) {
      globalChatSubscription.unsubscribe();
      set({ globalChatSubscription: null });
    }
  },
  
  // Offline support methods
  setOnlineStatus: (isOnline) => {
    set({ isOnline });
    
    if (isOnline) {
      const { syncInProgress } = get();
      if (!syncInProgress) {
        get().syncOfflineMessages();
      }
    }
  },
  
  initializeOfflineSupport: async (userId) => {
    try {
      // Initialize pagination
      await chatPagination.initialize(userId);
      
      // Set up network monitoring
      const unsubscribe = NetInfo.addEventListener(state => {
        set({ isOnline: state.isConnected || false });
      });
      
      // Load offline messages
      const offlineMessages = await offlineStorage.getOfflineMessages();
      set({ offlineMessages });
      
      // Check initial online status
      const netInfo = await NetInfo.fetch();
      set({ isOnline: netInfo.isConnected || false });
      
    } catch (error: any) {
      set({ error: error.message });
    }
  },
  
  syncOfflineMessages: async () => {
    const { offlineMessages, syncInProgress } = get();
    
    if (syncInProgress || offlineMessages.length === 0) return;
    
    set({ syncInProgress: true });
    
    try {
      for (const message of offlineMessages) {
        try {
          await chatService.sendMessage(
            message.chatId,
            message.senderId,
            message.text,
            undefined,
            undefined,
            message.type
          );
          
          // Remove from offline queue
          await offlineStorage.removeOfflineMessage(message.id!);
          
          const updatedOfflineMessages = get().offlineMessages.filter(m => m.id !== message.id);
          set({ offlineMessages: updatedOfflineMessages });
          
        } catch (error) {
          console.error('Failed to sync message:', error);
        }
      }
      
      set({ 
        syncInProgress: false, 
        lastSyncTime: new Date() 
      });
      
    } catch (error: any) {
      set({ syncInProgress: false, error: error.message });
    }
  },
  
  queueOfflineMessage: async (message) => {
    try {
      const messageId = await offlineStorage.queueOfflineMessage(message);
      
      const { offlineMessages } = get();
      const newMessage = { ...message, id: messageId, retryCount: 0, status: 'pending' as const };
      set({ offlineMessages: [...offlineMessages, newMessage] });
      
    } catch (error: any) {
      set({ error: error.message });
    }
  },
  
  loadCachedData: async (userId) => {
    try {
      set({ isLoading: true });
      
      // Load cached chats
      const cachedChats = await offlineStorage.getCachedChats();
      
      if (cachedChats.length > 0) {
        const sortedChats = cachedChats.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          const aTime = new Date(a.last_message_time || a.updated_at).getTime();
           const bTime = new Date(b.last_message_time || b.updated_at).getTime();
          return bTime - aTime;
        });
        
        set({ 
          chats: sortedChats, 
          cachedDataLoaded: true,
          isLoading: false 
        });
      } else {
        set({ isLoading: false });
      }
      
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  }
}));
