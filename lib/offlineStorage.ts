/**
 * Offline Storage Utility
 * 
 * Handles offline message queuing, local caching, and background sync
 * for the RoleNet chat system.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { chatService } from './supabaseService';
import { CONFIG } from './config/chatConfig';
import { Message, Chat } from './types';

// Storage keys
const STORAGE_KEYS = {
  OFFLINE_MESSAGES: 'offline_messages',
  CACHED_CHATS: 'cached_chats',
  CACHED_MESSAGES: 'cached_messages_',
  PINNED_CHATS: 'pinned_chats',
  LAST_SYNC: 'last_sync_timestamp',
  DRAFT_MESSAGES: 'draft_messages_',
  FAILED_UPLOADS: 'failed_uploads'
};

// Types
export interface OfflineMessage {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  type: 'text' | 'image' | 'audio';
  timestamp: string;
  tempId: string;
  retryCount: number;
  mediaUri?: string;
  status: 'pending' | 'failed' | 'synced';
}

export interface CachedChat {
  chat: Chat;
  lastAccessed: string;
  isPinned: boolean;
}

export interface SyncResult {
  success: boolean;
  syncedMessages: number;
  failedMessages: number;
  errors: string[];
}

class OfflineStorageManager {
  private static instance: OfflineStorageManager;
  private isOnline: boolean = true;
  private syncInProgress: boolean = false;
  private syncCallbacks: ((result: SyncResult) => void)[] = [];

  private constructor() {
    this.initializeNetworkListener();
  }

  static getInstance(): OfflineStorageManager {
    if (!OfflineStorageManager.instance) {
      OfflineStorageManager.instance = new OfflineStorageManager();
    }
    return OfflineStorageManager.instance;
  }

  /**
   * Initialize network connectivity listener
   */
  private async initializeNetworkListener() {
    // Get initial network state
    const netInfo = await NetInfo.fetch();
    this.isOnline = netInfo.isConnected ?? false;

    // Listen for network changes
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;
      
      console.log('Network status changed:', this.isOnline ? 'Online' : 'Offline');
      
      // If we just came back online, trigger sync
      if (wasOffline && this.isOnline) {
        this.triggerBackgroundSync();
      }
    });
  }

  /**
   * Check if device is currently online
   */
  isDeviceOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Queue message for offline sending
   */
  async queueOfflineMessage(message: Omit<OfflineMessage, 'id' | 'retryCount' | 'status'>): Promise<string> {
    try {
      const offlineMessage: OfflineMessage = {
        ...message,
        id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        retryCount: 0,
        status: 'pending'
      };

      const existingMessages = await this.getOfflineMessages();
      const updatedMessages = [...existingMessages, offlineMessage];
      
      await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_MESSAGES, JSON.stringify(updatedMessages));
      
      console.log('Message queued for offline sending:', offlineMessage.id);
      return offlineMessage.id;
    } catch (error) {
      console.error('Failed to queue offline message:', error);
      throw error;
    }
  }

  /**
   * Get all queued offline messages
   */
  async getOfflineMessages(): Promise<OfflineMessage[]> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_MESSAGES);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get offline messages:', error);
      return [];
    }
  }

  /**
   * Remove message from offline queue
   */
  async removeOfflineMessage(messageId: string): Promise<void> {
    try {
      const messages = await this.getOfflineMessages();
      const filteredMessages = messages.filter(msg => msg.id !== messageId);
      await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_MESSAGES, JSON.stringify(filteredMessages));
    } catch (error) {
      console.error('Failed to remove offline message:', error);
    }
  }

  /**
   * Update offline message status
   */
  async updateOfflineMessageStatus(messageId: string, status: OfflineMessage['status'], incrementRetry: boolean = false): Promise<void> {
    try {
      const messages = await this.getOfflineMessages();
      const updatedMessages = messages.map(msg => {
        if (msg.id === messageId) {
          return {
            ...msg,
            status,
            retryCount: incrementRetry ? msg.retryCount + 1 : msg.retryCount
          };
        }
        return msg;
      });
      
      await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_MESSAGES, JSON.stringify(updatedMessages));
    } catch (error) {
      console.error('Failed to update offline message status:', error);
    }
  }

  /**
   * Cache chat list locally
   */
  async cacheChats(chats: Chat[]): Promise<void> {
    try {
      const cachedChats: CachedChat[] = chats.map(chat => ({
        chat,
        lastAccessed: new Date().toISOString(),
        isPinned: chat.isPinned || false
      }));
      
      await AsyncStorage.setItem(STORAGE_KEYS.CACHED_CHATS, JSON.stringify(cachedChats));
      console.log(`Cached ${chats.length} chats locally`);
    } catch (error) {
      console.error('Failed to cache chats:', error);
    }
  }

  /**
   * Get cached chats
   */
  async getCachedChats(): Promise<Chat[]> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.CACHED_CHATS);
      if (!stored) return [];
      
      const cachedChats: CachedChat[] = JSON.parse(stored);
      return cachedChats.map(cached => cached.chat);
    } catch (error) {
      console.error('Failed to get cached chats:', error);
      return [];
    }
  }

  /**
   * Cache messages for a specific chat
   */
  async cacheMessages(chatId: string, messages: Message[]): Promise<void> {
    try {
      const key = `${STORAGE_KEYS.CACHED_MESSAGES}${chatId}`;
      await AsyncStorage.setItem(key, JSON.stringify({
        messages,
        cachedAt: new Date().toISOString()
      }));
      console.log(`Cached ${messages.length} messages for chat ${chatId}`);
    } catch (error) {
      console.error('Failed to cache messages:', error);
    }
  }

  /**
   * Get cached messages for a specific chat
   */
  async getCachedMessages(chatId: string): Promise<Message[]> {
    try {
      const key = `${STORAGE_KEYS.CACHED_MESSAGES}${chatId}`;
      const stored = await AsyncStorage.getItem(key);
      if (!stored) return [];
      
      const cached = JSON.parse(stored);
      return cached.messages || [];
    } catch (error) {
      console.error('Failed to get cached messages:', error);
      return [];
    }
  }

  /**
   * Cache pinned chats separately for priority loading
   */
  async cachePinnedChats(pinnedChats: Chat[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.PINNED_CHATS, JSON.stringify(pinnedChats));
      console.log(`Cached ${pinnedChats.length} pinned chats`);
    } catch (error) {
      console.error('Failed to cache pinned chats:', error);
    }
  }

  /**
   * Get cached pinned chats
   */
  async getCachedPinnedChats(): Promise<Chat[]> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.PINNED_CHATS);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get cached pinned chats:', error);
      return [];
    }
  }

  /**
   * Save draft message
   */
  async saveDraftMessage(chatId: string, text: string): Promise<void> {
    try {
      const key = `${STORAGE_KEYS.DRAFT_MESSAGES}${chatId}`;
      if (text.trim()) {
        await AsyncStorage.setItem(key, text);
      } else {
        await AsyncStorage.removeItem(key);
      }
    } catch (error) {
      console.error('Failed to save draft message:', error);
    }
  }

  /**
   * Get draft message
   */
  async getDraftMessage(chatId: string): Promise<string> {
    try {
      const key = `${STORAGE_KEYS.DRAFT_MESSAGES}${chatId}`;
      const draft = await AsyncStorage.getItem(key);
      return draft || '';
    } catch (error) {
      console.error('Failed to get draft message:', error);
      return '';
    }
  }

  /**
   * Clear draft message
   */
  async clearDraftMessage(chatId: string): Promise<void> {
    try {
      const key = `${STORAGE_KEYS.DRAFT_MESSAGES}${chatId}`;
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to clear draft message:', error);
    }
  }

  /**
   * Trigger background sync when coming back online
   */
  private async triggerBackgroundSync(): Promise<void> {
    if (this.syncInProgress) {
      console.log('Sync already in progress, skipping...');
      return;
    }

    console.log('Triggering background sync...');
    this.syncInProgress = true;

    try {
      const result = await this.syncOfflineMessages();
      this.notifySyncCallbacks(result);
    } catch (error) {
      console.error('Background sync failed:', error);
      this.notifySyncCallbacks({
        success: false,
        syncedMessages: 0,
        failedMessages: 0,
        errors: [error instanceof Error ? error.message : 'Unknown sync error']
      });
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sync offline messages with server
   */
  async syncOfflineMessages(): Promise<SyncResult> {
    const messages = await this.getOfflineMessages();
    const pendingMessages = messages.filter(msg => msg.status === 'pending' || (msg.status === 'failed' && msg.retryCount < 3));
    
    if (pendingMessages.length === 0) {
      return {
        success: true,
        syncedMessages: 0,
        failedMessages: 0,
        errors: []
      };
    }

    console.log(`Syncing ${pendingMessages.length} offline messages...`);
    
    let syncedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const message of pendingMessages) {
      try {
        // This would be replaced with actual API call to send message
        await this.sendMessageToServer(message);
        await this.updateOfflineMessageStatus(message.id, 'synced');
        syncedCount++;
        
        // Remove synced message from queue after a delay
        setTimeout(() => this.removeOfflineMessage(message.id), CONFIG.OFFLINE.CACHE_EXPIRY);
      } catch (error) {
        console.error(`Failed to sync message ${message.id}:`, error);
        await this.updateOfflineMessageStatus(message.id, 'failed', true);
        failedCount++;
        errors.push(`Message ${message.tempId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    const result: SyncResult = {
      success: failedCount === 0,
      syncedMessages: syncedCount,
      failedMessages: failedCount,
      errors
    };

    console.log('Sync completed:', result);
    return result;
  }

  /**
   * Send message to server (placeholder - should be implemented with actual API)
   */
  private async sendMessageToServer(message: OfflineMessage): Promise<void> {
    // This is a placeholder - in real implementation, this would call the actual
    // chat service to send the message to the server
    throw new Error('sendMessageToServer not implemented - should be connected to actual chat service');
  }

  /**
   * Register callback for sync completion
   */
  onSyncComplete(callback: (result: SyncResult) => void): void {
    this.syncCallbacks.push(callback);
  }

  /**
   * Remove sync callback
   */
  removeSyncCallback(callback: (result: SyncResult) => void): void {
    const index = this.syncCallbacks.indexOf(callback);
    if (index > -1) {
      this.syncCallbacks.splice(index, 1);
    }
  }

  /**
   * Notify all sync callbacks
   */
  private notifySyncCallbacks(result: SyncResult): void {
    this.syncCallbacks.forEach(callback => {
      try {
        callback(result);
      } catch (error) {
        console.error('Error in sync callback:', error);
      }
    });
  }

  /**
   * Clear all cached data
   */
  async clearAllCache(): Promise<void> {
    try {
      const keys = Object.values(STORAGE_KEYS);
      await AsyncStorage.multiRemove(keys);
      console.log('All cached data cleared');
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    offlineMessages: number;
    cachedChats: number;
    pinnedChats: number;
    totalCacheSize: string;
  }> {
    try {
      const [offlineMessages, cachedChats, pinnedChats] = await Promise.all([
        this.getOfflineMessages(),
        this.getCachedChats(),
        this.getCachedPinnedChats()
      ]);

      return {
        offlineMessages: offlineMessages.length,
        cachedChats: cachedChats.length,
        pinnedChats: pinnedChats.length,
        totalCacheSize: 'N/A' // Could be calculated if needed
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return {
        offlineMessages: 0,
        cachedChats: 0,
        pinnedChats: 0,
        totalCacheSize: 'Error'
      };
    }
  }
}

// Export singleton instance
export const offlineStorage = OfflineStorageManager.getInstance();

// Export utility functions
export const {
  isDeviceOnline,
  queueOfflineMessage,
  getOfflineMessages,
  removeOfflineMessage,
  cacheChats,
  getCachedChats,
  cacheMessages,
  getCachedMessages,
  cachePinnedChats,
  getCachedPinnedChats,
  saveDraftMessage,
  getDraftMessage,
  clearDraftMessage,
  syncOfflineMessages,
  onSyncComplete,
  removeSyncCallback,
  clearAllCache,
  getCacheStats
} = offlineStorage;