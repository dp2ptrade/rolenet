/**
 * Enhanced Chat Store with Offline Support
 * 
 * Extends the existing chat store with offline capabilities including:
 * - Message queuing for offline sending
 * - Local caching with AsyncStorage
 * - Background sync when coming back online
 * - Smart loading with pagination
 * - Draft message persistence
 */

import { create } from 'zustand';
import { Chat, Message, User } from '../lib/types';
import { chatService, realtimeService } from '../lib/supabaseService';
import { CONFIG } from '../lib/config/chatConfig';
import { AppError, handleAsyncError, ERROR_CODES } from '../lib/errors';
import { SendMessageParams, ChatData, ApiResult } from '../lib/apiTypes';
import { offlineStorage, OfflineMessage, SyncResult } from '../lib/offlineStorage';

interface OfflineChatState {
  // Existing state
  chats: Chat[];
  currentChat: Chat | null;
  messages: Message[];
  isLoading: boolean;
  error: AppError | null;
  subscription: any;
  currentSubscriptionChatId?: string;
  globalChatSubscription: any;
  unreadChatsCount: number;
  
  // Offline-specific state
  isOnline: boolean;
  offlineMessages: OfflineMessage[];
  syncInProgress: boolean;
  lastSyncTime: Date | null;
  cachedChatsLoaded: boolean;
  pinnedChatsLoaded: boolean;
  
  // Pagination state
  hasMoreMessages: boolean;
  loadingMoreMessages: boolean;
  messageOffset: number;
  
  // Draft messages
  draftMessages: Record<string, string>;
  
  // Basic setters
  setChats: (chats: Chat[]) => void;
  setCurrentChat: (chat: Chat | null) => void;
  setMessages: (messages: Message[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: AppError | null) => void;
  addMessage: (message: Message) => void;
  updateUnreadCount: () => void;
  clearError: () => void;
  
  // Offline-specific setters
  setOnlineStatus: (isOnline: boolean) => void;
  setOfflineMessages: (messages: OfflineMessage[]) => void;
  setSyncInProgress: (inProgress: boolean) => void;
  setLastSyncTime: (time: Date) => void;
  
  // Enhanced chat actions with offline support
  togglePinChat: (chatId: string, pin: boolean) => Promise<ApiResult<void>>;
  getOrCreateChat: (participants: string[]) => Promise<ApiResult<any>>;
  createGroupChat: (name: string, participants: string[], createdBy: string) => Promise<ApiResult<any>>;
  loadUserChats: (userId: string, limit?: number, useCache?: boolean) => Promise<ApiResult<undefined>>;
  sendMessage: (params: SendMessageParams) => Promise<ApiResult<Message>>;
  loadChatMessages: (chatId: string, limit?: number, offset?: number) => Promise<ApiResult<any[]>>;
  loadMoreMessages: (chatId: string) => Promise<ApiResult<any[]>>;
  
  // Offline-specific actions
  initializeOfflineSupport: () => Promise<void>;
  loadCachedData: () => Promise<void>;
  syncOfflineMessages: () => Promise<SyncResult>;
  queueOfflineMessage: (params: SendMessageParams) => Promise<string>;
  
  // Draft message actions
  saveDraft: (chatId: string, text: string) => Promise<void>;
  getDraft: (chatId: string) => Promise<string>;
  clearDraft: (chatId: string) => Promise<void>;
  
  // Subscription methods
  subscribeToMessages: (chatId: string) => void;
  unsubscribeFromMessages: () => void;
  subscribeToAllChats: (userId: string) => void;
  unsubscribeFromAllChats: () => void;
}

export const useOfflineChatStore = create<OfflineChatState>((set, get) => ({
  // Existing state
  chats: [],
  currentChat: null,
  messages: [],
  isLoading: false,
  error: null,
  subscription: null,
  currentSubscriptionChatId: undefined,
  globalChatSubscription: null,
  unreadChatsCount: 0,
  
  // Offline-specific state
  isOnline: true,
  offlineMessages: [],
  syncInProgress: false,
  lastSyncTime: null,
  cachedChatsLoaded: false,
  pinnedChatsLoaded: false,
  
  // Pagination state
  hasMoreMessages: true,
  loadingMoreMessages: false,
  messageOffset: 0,
  
  // Draft messages
  draftMessages: {},
  
  // Basic setters
  setChats: (chats) => {
    set({ chats, error: null });
    get().updateUnreadCount();
    // Cache chats when updated
    offlineStorage.cacheChats(chats);
  },
  
  setCurrentChat: (chat) => set({ currentChat: chat, error: null, messageOffset: 0, hasMoreMessages: true }),
  setMessages: (messages) => {
    set({ messages, error: null });
    // Cache messages for current chat
    const { currentChat } = get();
    if (currentChat) {
      offlineStorage.cacheMessages(currentChat.id, messages);
    }
  },
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error, isLoading: false }),
  clearError: () => set({ error: null }),
  
  // Offline-specific setters
  setOnlineStatus: (isOnline) => {
    const wasOffline = !get().isOnline;
    set({ isOnline });
    
    // If we just came back online, trigger sync
    if (wasOffline && isOnline) {
      get().syncOfflineMessages();
    }
  },
  
  setOfflineMessages: (messages) => set({ offlineMessages: messages }),
  setSyncInProgress: (inProgress) => set({ syncInProgress: inProgress }),
  setLastSyncTime: (time) => set({ lastSyncTime: time }),
  
  addMessage: (message) => {
    const { messages, chats, currentChat } = get();
    const updatedMessages = [...messages, message];
    set({ messages: updatedMessages });
    
    // Cache the updated messages
    if (currentChat) {
      offlineStorage.cacheMessages(currentChat.id, updatedMessages);
    }
    
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
    
    // Cache updated chats
    offlineStorage.cacheChats(sortedChats);
  },
  
  updateUnreadCount: () => {
    const { chats } = get();
    const unreadCount = chats.reduce((count, chat) => {
      return count + (chat.unread_count || 0);
    }, 0);
    set({ unreadChatsCount: unreadCount });
  },
  
  // Initialize offline support
  initializeOfflineSupport: async () => {
    try {
      // Load cached data first
      await get().loadCachedData();
      
      // Set up sync callback
      offlineStorage.onSyncComplete((result: SyncResult) => {
        console.log('Sync completed:', result);
        get().setLastSyncTime(new Date());
        get().setSyncInProgress(false);
        
        if (result.success) {
          // Reload offline messages after successful sync
          offlineStorage.getOfflineMessages().then(messages => {
            get().setOfflineMessages(messages);
          });
        }
      });
      
      // Load initial offline messages
      const offlineMessages = await offlineStorage.getOfflineMessages();
      set({ offlineMessages });
      
      console.log('Offline support initialized');
    } catch (error) {
      console.error('Failed to initialize offline support:', error);
    }
  },
  
  // Load cached data
  loadCachedData: async () => {
    try {
      // Load pinned chats first (priority)
      const pinnedChats = await offlineStorage.getCachedPinnedChats();
      if (pinnedChats.length > 0) {
        set({ chats: pinnedChats, pinnedChatsLoaded: true });
        console.log(`Loaded ${pinnedChats.length} pinned chats from cache`);
      }
      
      // Load all cached chats
      const cachedChats = await offlineStorage.getCachedChats();
      if (cachedChats.length > 0) {
        // Merge with pinned chats, avoiding duplicates
        const existingIds = new Set(pinnedChats.map(chat => chat.id));
        const newChats = cachedChats.filter(chat => !existingIds.has(chat.id));
        const allChats = [...pinnedChats, ...newChats];
        
        set({ chats: allChats, cachedChatsLoaded: true });
        console.log(`Loaded ${cachedChats.length} total chats from cache`);
      }
    } catch (error) {
      console.error('Failed to load cached data:', error);
    }
  },
  
  // Enhanced chat actions with offline support
  togglePinChat: async (chatId, pin) => {
    return handleAsyncError(async () => {
      if (!chatId?.trim()) {
        throw new AppError('Chat ID is required', ERROR_CODES.VALIDATION_ERROR);
      }
      
      // Update local state immediately
      const { chats } = get();
      const updatedChats = chats.map(chat => 
        chat.id === chatId ? { ...chat, isPinned: pin } : chat
      );
      set({ chats: updatedChats });
      
      // Cache updated chats
      offlineStorage.cacheChats(updatedChats);
      
      // Update pinned chats cache
      const pinnedChats = updatedChats.filter(chat => chat.isPinned);
      offlineStorage.cachePinnedChats(pinnedChats);
      
      // Try to sync with server if online
      if (offlineStorage.isDeviceOnline()) {
        try {
          const { data, error } = await chatService.togglePinChat(chatId, pin);
          if (error) {
            throw new AppError(error.message, ERROR_CODES.FETCH_CHATS_ERROR);
          }
        } catch (error) {
          // If server update fails, revert local change
          const revertedChats = chats.map(chat => 
            chat.id === chatId ? { ...chat, isPinned: !pin } : chat
          );
          set({ chats: revertedChats });
          throw error;
        }
      }
      
      return { success: true as const, data: undefined, error: null };
    }, ERROR_CODES.FETCH_CHATS_ERROR, 'Failed to update chat pin status');
  },
  
  getOrCreateChat: async (participants) => {
    set({ isLoading: true, error: null });
    
    return handleAsyncError(async () => {
      if (!participants || !Array.isArray(participants) || participants.length === 0) {
        throw new AppError('Valid participants are required', ERROR_CODES.VALIDATION_ERROR);
      }
      
      const { data: chat, error } = await chatService.getOrCreateChat(participants);
      
      if (error) {
        throw new AppError(error.message, ERROR_CODES.FETCH_CHATS_ERROR);
      }
      if (!chat) {
        throw new AppError('No chat data returned', ERROR_CODES.FETCH_CHATS_ERROR);
      }
      
      const mappedChat = {
        ...chat,
        isPinned: chat.is_pinned || false
      };
      
      const { chats } = get();
      const existingChatIndex = chats.findIndex(c => c.id === mappedChat.id);
      
      let updatedChats;
      if (existingChatIndex === -1) {
        updatedChats = [mappedChat, ...chats];
      } else {
        updatedChats = [...chats];
        updatedChats[existingChatIndex] = mappedChat;
      }
      
      set({ chats: updatedChats, currentChat: mappedChat, isLoading: false, error: null });
      
      // Cache updated chats
      offlineStorage.cacheChats(updatedChats);
      
      return { success: true as const, data: mappedChat, error: null };
    }, ERROR_CODES.FETCH_CHATS_ERROR, 'Failed to get or create chat').finally(() => {
      set({ isLoading: false });
    });
  },
  
  createGroupChat: async (name, participants, createdBy) => {
    set({ isLoading: true, error: null });
    
    return handleAsyncError(async () => {
      if (!name?.trim()) {
        throw new AppError('Group name is required', ERROR_CODES.VALIDATION_ERROR);
      }
      if (!participants || !Array.isArray(participants) || participants.length === 0) {
        throw new AppError('Valid participants are required', ERROR_CODES.VALIDATION_ERROR);
      }
      if (!createdBy?.trim()) {
        throw new AppError('Creator ID is required', ERROR_CODES.VALIDATION_ERROR);
      }
      
      const { data: chat, error } = await chatService.createGroupChat(name, participants, createdBy);
      
      if (error) {
        throw new AppError(error.message, ERROR_CODES.FETCH_CHATS_ERROR);
      }
      if (!chat) {
        throw new AppError('No chat data returned', ERROR_CODES.FETCH_CHATS_ERROR);
      }
      
      const mappedChat = {
        ...chat,
        isPinned: chat.is_pinned || false
      };
      
      const { chats } = get();
      const updatedChats = [mappedChat, ...chats];
      set({ chats: updatedChats, currentChat: mappedChat, isLoading: false, error: null });
      
      // Cache updated chats
      offlineStorage.cacheChats(updatedChats);
      
      return { success: true as const, data: mappedChat, error: null };
    }, ERROR_CODES.FETCH_CHATS_ERROR, 'Failed to create group chat').finally(() => {
      set({ isLoading: false });
    });
  },
  
  loadUserChats: async (userId, limit = CONFIG.CHATS.DEFAULT_LIMIT, useCache = true) => {
    set({ isLoading: true, error: null });
    
    return handleAsyncError(async () => {
      if (!userId?.trim()) {
        throw new AppError('User ID is required', ERROR_CODES.VALIDATION_ERROR);
      }
      if (limit && (limit <= 0 || limit > 100)) {
        throw new AppError('Limit must be between 1 and 100', ERROR_CODES.VALIDATION_ERROR);
      }
      
      // Load from cache first if requested and available
      if (useCache && !get().cachedChatsLoaded) {
        await get().loadCachedData();
      }
      
      // If offline, use cached data only
      if (!offlineStorage.isDeviceOnline()) {
        console.log('Device offline, using cached chats only');
        set({ isLoading: false });
        return { success: true as const, data: undefined, error: null };
      }
      
      // Fetch fresh data from server
      const { data: chats, error } = await chatService.getUserChats(userId, limit);
      if (error) {
        throw new AppError(error.message, ERROR_CODES.FETCH_CHATS_ERROR);
      }
      
      const mappedChats = (chats || []).map(chat => ({
        ...chat,
        isPinned: chat.is_pinned || false
      }));
      
      set({ chats: mappedChats, isLoading: false, error: null });
      
      // Cache the fresh data
      offlineStorage.cacheChats(mappedChats);
      
      // Cache pinned chats separately
      const pinnedChats = mappedChats.filter(chat => chat.isPinned);
      if (pinnedChats.length > 0) {
        offlineStorage.cachePinnedChats(pinnedChats);
      }
      
      return { success: true as const, data: undefined, error: null };
    }, ERROR_CODES.FETCH_CHATS_ERROR, 'Failed to load chats').finally(() => {
      set({ isLoading: false });
    });
  },
  
  sendMessage: async (params: SendMessageParams): Promise<ApiResult<Message>> => {
    set({ error: null });
    
    return handleAsyncError(async () => {
      if (!params.chatId?.trim()) {
        throw new AppError('Chat ID is required', ERROR_CODES.VALIDATION_ERROR);
      }
      if (!params.senderId?.trim()) {
        throw new AppError('Sender ID is required', ERROR_CODES.VALIDATION_ERROR);
      }
      if (!params.text?.trim()) {
        throw new AppError('Message text is required', ERROR_CODES.VALIDATION_ERROR);
      }
      
      const { chatId, senderId, text, type = 'text' } = params;
      
      // If offline, queue the message
      if (!offlineStorage.isDeviceOnline()) {
        const tempId = await get().queueOfflineMessage(params);
        
        // Create a temporary message for immediate UI feedback
        const tempMessage: Message = {
          id: tempId,
          chat_id: chatId,
          senderId: senderId,
          text,
          type,
          timestamp: new Date(),
          status: 'pending',
          tempId: tempId
        };
        
        get().addMessage(tempMessage);
        return { success: true as const, data: tempMessage, error: null };
      }
      
      // Send message normally if online
      const { data: newMessage, error } = await chatService.sendMessage(chatId, senderId, text, undefined, type);
      if (error) {
        // If sending fails, queue for offline sending
        await get().queueOfflineMessage(params);
        throw new AppError(error.message, ERROR_CODES.SEND_MESSAGE_ERROR);
      }
      if (!newMessage) {
        throw new AppError('No message data returned', ERROR_CODES.SEND_MESSAGE_ERROR);
      }
      
      get().addMessage(newMessage);
      
      // Update chat's last message and move it to the top
      const { chats } = get();
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
      
      const sortedChats = updatedChats.sort((a, b) => {
        const timeA = a.last_message_time || a.updated_at;
        const timeB = b.last_message_time || b.updated_at;
        return new Date(timeB).getTime() - new Date(timeA).getTime();
      });
      
      set({ chats: sortedChats });
      
      // Cache updated chats
      offlineStorage.cacheChats(sortedChats);
      
      return { success: true as const, data: newMessage, error: null };
    }, ERROR_CODES.SEND_MESSAGE_ERROR, 'Failed to send message');
  },
  
  loadChatMessages: async (chatId: string, limit = CONFIG.MESSAGES.DEFAULT_LIMIT, offset = 0): Promise<ApiResult<any[]>> => {
    set({ isLoading: true, error: null });
    
    return handleAsyncError(async () => {
      if (!chatId?.trim()) {
        throw new AppError('Chat ID is required', ERROR_CODES.VALIDATION_ERROR);
      }
      if (limit <= 0 || limit > 100) {
        throw new AppError('Limit must be between 1 and 100', ERROR_CODES.VALIDATION_ERROR);
      }
      
      // Load from cache first if offline or if no offset (initial load)
      if (!offlineStorage.isDeviceOnline() || offset === 0) {
        const cachedMessages = await offlineStorage.getCachedMessages(chatId);
        if (cachedMessages.length > 0) {
          const slicedMessages = cachedMessages.slice(offset, offset + limit);
          set({ 
            messages: offset === 0 ? slicedMessages : [...get().messages, ...slicedMessages], 
            isLoading: false, 
            error: null,
            messageOffset: offset + slicedMessages.length,
            hasMoreMessages: cachedMessages.length > offset + limit
          });
          
          if (!offlineStorage.isDeviceOnline()) {
            return { success: true as const, data: slicedMessages, error: null };
          }
        }
      }
      
      // Fetch from server if online
      if (offlineStorage.isDeviceOnline()) {
        const { data: messages, error } = await chatService.getChatMessages(chatId, limit);
        if (error) {
          throw new AppError(error.message, ERROR_CODES.FETCH_MESSAGES_ERROR);
        }
        
        const messageList = messages || [];
        set({ 
          messages: offset === 0 ? messageList : [...get().messages, ...messageList], 
          isLoading: false, 
          error: null,
          messageOffset: offset + messageList.length,
          hasMoreMessages: messageList.length === limit
        });
        
        // Cache the messages
        if (offset === 0) {
          offlineStorage.cacheMessages(chatId, messageList);
        }
        
        return { success: true as const, data: messageList, error: null };
      }
      
      return { success: true as const, data: [], error: null };
    }, ERROR_CODES.FETCH_MESSAGES_ERROR, 'Failed to load chat messages').finally(() => {
      set({ isLoading: false });
    });
  },
  
  loadMoreMessages: async (chatId: string): Promise<ApiResult<any[]>> => {
    const { messageOffset, hasMoreMessages, loadingMoreMessages } = get();
    
    if (!hasMoreMessages || loadingMoreMessages) {
      return { success: true as const, data: [], error: null };
    }
    
    set({ loadingMoreMessages: true });
    
    try {
      const result = await get().loadChatMessages(chatId, 20, messageOffset);
      return result;
    } finally {
      set({ loadingMoreMessages: false });
    }
  },
  
  // Queue message for offline sending
  queueOfflineMessage: async (params: SendMessageParams): Promise<string> => {
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const offlineMessage = {
      tempId,
      chatId: params.chatId,
      senderId: params.senderId,
      text: params.text,
      type: params.type || 'text',
      timestamp: new Date().toISOString(),
      mediaUri: params.mediaUri
    };
    
    const messageId = await offlineStorage.queueOfflineMessage(offlineMessage);
    
    // Update offline messages in store
    const offlineMessages = await offlineStorage.getOfflineMessages();
    set({ offlineMessages });
    
    return messageId;
  },
  
  // Sync offline messages
  syncOfflineMessages: async (): Promise<SyncResult> => {
    if (get().syncInProgress) {
      console.log('Sync already in progress');
      return {
        success: false,
        syncedMessages: 0,
        failedMessages: 0,
        errors: ['Sync already in progress']
      };
    }
    
    set({ syncInProgress: true });
    
    try {
      const result = await offlineStorage.syncOfflineMessages();
      
      // Update offline messages after sync
      const offlineMessages = await offlineStorage.getOfflineMessages();
      set({ offlineMessages, lastSyncTime: new Date() });
      
      return result;
    } finally {
      set({ syncInProgress: false });
    }
  },
  
  // Draft message actions
  saveDraft: async (chatId: string, text: string): Promise<void> => {
    await offlineStorage.saveDraftMessage(chatId, text);
    const { draftMessages } = get();
    set({ 
      draftMessages: { 
        ...draftMessages, 
        [chatId]: text 
      } 
    });
  },
  
  getDraft: async (chatId: string): Promise<string> => {
    const draft = await offlineStorage.getDraftMessage(chatId);
    const { draftMessages } = get();
    set({ 
      draftMessages: { 
        ...draftMessages, 
        [chatId]: draft 
      } 
    });
    return draft;
  },
  
  clearDraft: async (chatId: string): Promise<void> => {
    await offlineStorage.clearDraftMessage(chatId);
    const { draftMessages } = get();
    const updatedDrafts = { ...draftMessages };
    delete updatedDrafts[chatId];
    set({ draftMessages: updatedDrafts });
  },
  
  // Subscription methods (same as original)
  subscribeToMessages: (chatId) => {
    const { subscription } = get();
    const currentSubscriptionChatId = get().currentSubscriptionChatId;
    
    if (subscription && currentSubscriptionChatId === chatId) {
      console.log('Already subscribed to messages for chat:', chatId);
      return;
    }
    
    if (subscription) {
      console.log('Unsubscribing from previous chat subscription');
      subscription.unsubscribe();
    }
    
    console.log('Subscribing to messages for chat:', chatId);
    
    const newSubscription = realtimeService.subscribeToChat(chatId, (payload) => {
      console.log('useOfflineChatStore: Received payload:', payload.eventType);
      
      if (payload.eventType === 'INSERT' && payload.new) {
        const newMessage = payload.new;
        console.log('useOfflineChatStore: Adding new message:', newMessage.id);
        const { addMessage } = get();
        addMessage(newMessage);
      }
      
      if (payload.eventType === 'DELETE' && payload.old) {
        const deletedMessage = payload.old;
        console.log('useOfflineChatStore: Deleting message:', deletedMessage.id);
        
        const { messages } = get();
        const updatedMessages = messages.filter((msg: Message) => msg.id !== deletedMessage.id);
        set({ messages: updatedMessages });
        
        // Update cache
        const { currentChat } = get();
        if (currentChat) {
          offlineStorage.cacheMessages(currentChat.id, updatedMessages);
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
    
    if (globalChatSubscription) {
      globalChatSubscription.unsubscribe();
    }
    
    console.log('Subscribing to all chat updates for user:', userId);
    
    const newGlobalSubscription = realtimeService.subscribeToAllMessages((payload) => {
      console.log('Global chat subscription: Received message payload:', payload.eventType);
      
      if (payload.eventType === 'INSERT' && payload.new) {
        const newMessage = payload.new;
        const { chats, currentChat } = get();
        
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
          
          const sortedChats = updatedChats.sort((a, b) => {
            const timeA = a.last_message_time || a.updated_at;
            const timeB = b.last_message_time || b.updated_at;
            return new Date(timeB).getTime() - new Date(timeA).getTime();
          });
          
          set({ chats: sortedChats });
          get().updateUnreadCount();
          
          // Cache updated chats
          offlineStorage.cacheChats(sortedChats);
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