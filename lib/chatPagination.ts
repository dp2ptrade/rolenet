/**
 * Chat Pagination Utility
 * 
 * Handles smart loading of chats with support for:
 * - Pinned chats (always visible)
 * - Recent chats (priority loading)
 * - Cached older chats (background loading)
 * - Incremental loading with "Load More" functionality
 */

import { offlineStorage } from './offlineStorage';
import { chatService } from './supabaseService';
import { CONFIG } from './config/chatConfig';

export interface ChatPaginationConfig {
  pinnedChatsLimit: number;
  recentChatsLimit: number;
  pageSize: number;
  maxCachedChats: number;
  preloadThreshold: number; // Load more when this many items from end
}

export interface ChatLoadResult {
  chats: any[];
  pinnedChats: any[];
  recentChats: any[];
  olderChats: any[];
  hasMore: boolean;
  totalLoaded: number;
  fromCache: boolean;
  lastLoadTime: Date;
}

export interface PaginationState {
  currentPage: number;
  totalPages: number;
  isLoading: boolean;
  hasMore: boolean;
  lastCursor?: string;
  loadedChatIds: Set<string>;
}

class ChatPagination {
  private config: ChatPaginationConfig;
  private state: PaginationState;
  private userId: string | null = null;

  constructor(config: Partial<ChatPaginationConfig> = {}) {
    this.config = {
      pinnedChatsLimit: CONFIG.CHATS.PINNED_LIMIT,
      recentChatsLimit: CONFIG.CHATS.RECENT_LIMIT,
      pageSize: CONFIG.CHATS.PAGE_SIZE,
      maxCachedChats: CONFIG.CHATS.MAX_CACHED,
      preloadThreshold: CONFIG.CHATS.PRELOAD_THRESHOLD,
      ...config,
    };

    this.state = {
      currentPage: 0,
      totalPages: 0,
      isLoading: false,
      hasMore: true,
      loadedChatIds: new Set(),
    };
  }

  /**
   * Initialize pagination for a user
   */
  initialize(userId: string, config?: Partial<ChatPaginationConfig>) {
    this.userId = userId;
    if (config) {
      this.config = { ...this.config, ...config };
    }
    this.reset();
  }

  /**
   * Reset pagination state
   */
  reset() {
    this.state = {
      currentPage: 0,
      totalPages: 0,
      isLoading: false,
      hasMore: true,
      loadedChatIds: new Set(),
    };
  }

  /**
   * Load initial chats with smart prioritization
   */
  async loadInitialChats(useCache: boolean = true): Promise<ChatLoadResult> {
    if (!this.userId) {
      throw new Error('User ID not set. Call initialize() first.');
    }

    this.state.isLoading = true;

    try {
      const result: ChatLoadResult = {
        chats: [],
        pinnedChats: [],
        recentChats: [],
        olderChats: [],
        hasMore: false,
        totalLoaded: 0,
        fromCache: false,
        lastLoadTime: new Date(),
      };

      // 1. Load pinned chats first (always from server if online)
      const isOnline = offlineStorage.isDeviceOnline();
      
      if (isOnline) {
        result.pinnedChats = await this.loadPinnedChats();
      } else if (useCache) {
        result.pinnedChats = await this.loadCachedPinnedChats();
        result.fromCache = true;
      }

      // 2. Load recent chats
      if (isOnline) {
        result.recentChats = await this.loadRecentChats();
      } else if (useCache) {
        result.recentChats = await this.loadCachedRecentChats();
        result.fromCache = true;
      }

      // 3. Load cached older chats if available
      if (useCache) {
        result.olderChats = await this.loadCachedOlderChats();
      }

      // 4. Combine and deduplicate chats
      result.chats = this.combineAndDeduplicateChats(
        result.pinnedChats,
        result.recentChats,
        result.olderChats
      );

      // 5. Update state
      result.chats.forEach(chat => this.state.loadedChatIds.add(chat.id));
      result.totalLoaded = result.chats.length;
      result.hasMore = result.totalLoaded >= this.config.pageSize;
      this.state.hasMore = result.hasMore;
      this.state.currentPage = 1;

      // 6. Cache the results if loaded from server
      if (isOnline && !result.fromCache) {
        await this.cacheChats(result.chats);
      }

      return result;
    } catch (error) {
      console.error('Error loading initial chats:', error);
      
      // Fallback to cache on error
      if (!useCache) {
        return this.loadInitialChats(true);
      }
      
      throw error;
    } finally {
      this.state.isLoading = false;
    }
  }

  /**
   * Load more chats (pagination)
   */
  async loadMoreChats(): Promise<ChatLoadResult> {
    if (!this.userId || this.state.isLoading || !this.state.hasMore) {
      throw new Error('Cannot load more chats');
    }

    this.state.isLoading = true;

    try {
      const isOnline = offlineStorage.isDeviceOnline();
      let newChats: any[] = [];
      let fromCache = false;

      if (isOnline) {
        // Load from server with pagination
        const offset = this.state.currentPage * this.config.pageSize;
        const result = await chatService.getUserChats(this.userId!);
        newChats = result.data || [];
      } else {
        // Load from cache
        newChats = await this.loadMoreCachedChats();
        fromCache = true;
      }

      // Filter out already loaded chats
      const filteredChats = newChats.filter(
        chat => !this.state.loadedChatIds.has(chat.id)
      );

      // Update state
      filteredChats.forEach(chat => this.state.loadedChatIds.add(chat.id));
      this.state.currentPage++;
      this.state.hasMore = filteredChats.length >= this.config.pageSize;

      // Cache new chats if loaded from server
      if (isOnline && !fromCache) {
        await this.cacheChats(filteredChats);
      }

      return {
        chats: filteredChats,
        pinnedChats: [],
        recentChats: [],
        olderChats: filteredChats,
        hasMore: this.state.hasMore,
        totalLoaded: filteredChats.length,
        fromCache,
        lastLoadTime: new Date(),
      };
    } catch (error) {
      console.error('Error loading more chats:', error);
      throw error;
    } finally {
      this.state.isLoading = false;
    }
  }

  /**
   * Check if should preload more chats
   */
  shouldPreload(currentIndex: number, totalChats: number): boolean {
    return (
      !this.state.isLoading &&
      this.state.hasMore &&
      currentIndex >= totalChats - this.config.preloadThreshold
    );
  }

  /**
   * Load pinned chats from server
   */
  private async loadPinnedChats(): Promise<any[]> {
    try {
      const result = await chatService.getUserChats(this.userId!);
      const allChats = result.data || [];
      return allChats.filter(chat => chat.isPinned);
    } catch (error) {
      console.error('Error loading pinned chats:', error);
      return [];
    }
  }

  /**
   * Load recent chats from server
   */
  private async loadRecentChats(): Promise<any[]> {
    try {
      const result = await chatService.getUserChats(this.userId!);
      return result.data || [];
    } catch (error) {
      console.error('Error loading recent chats:', error);
      return [];
    }
  }

  /**
   * Load cached pinned chats
   */
  private async loadCachedPinnedChats(): Promise<any[]> {
    try {
      const cachedChats = await offlineStorage.getCachedChats();
      return cachedChats.filter(chat => chat.isPinned).slice(0, this.config.pinnedChatsLimit);
    } catch (error) {
      console.error('Error loading cached pinned chats:', error);
      return [];
    }
  }

  /**
   * Load cached recent chats
   */
  private async loadCachedRecentChats(): Promise<any[]> {
    try {
      const cachedChats = await offlineStorage.getCachedChats();
      return cachedChats
        .filter(chat => !chat.isPinned)
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, this.config.recentChatsLimit);
    } catch (error) {
      console.error('Error loading cached recent chats:', error);
      return [];
    }
  }

  /**
   * Load cached older chats
   */
  private async loadCachedOlderChats(): Promise<any[]> {
    try {
      const cachedChats = await offlineStorage.getCachedChats();
      const recentLimit = this.config.recentChatsLimit + this.config.pinnedChatsLimit;
      
      return cachedChats
        .filter(chat => !chat.isPinned)
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(recentLimit, recentLimit + this.config.pageSize);
    } catch (error) {
      console.error('Error loading cached older chats:', error);
      return [];
    }
  }

  /**
   * Load more cached chats for pagination
   */
  private async loadMoreCachedChats(): Promise<any[]> {
    try {
      const cachedChats = await offlineStorage.getCachedChats();
      const offset = this.state.currentPage * this.config.pageSize;
      
      return cachedChats
        .filter(chat => !chat.isPinned)
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(offset, offset + this.config.pageSize);
    } catch (error) {
      console.error('Error loading more cached chats:', error);
      return [];
    }
  }

  /**
   * Combine and deduplicate chats while preserving order
   */
  private combineAndDeduplicateChats(
    pinnedChats: any[],
    recentChats: any[],
    olderChats: any[]
  ): any[] {
    const chatMap = new Map();
    const result: any[] = [];

    // Add pinned chats first
    pinnedChats.forEach(chat => {
      if (!chatMap.has(chat.id)) {
        chatMap.set(chat.id, chat);
        result.push({ ...chat, isPinned: true });
      }
    });

    // Add recent chats
    recentChats.forEach(chat => {
      if (!chatMap.has(chat.id)) {
        chatMap.set(chat.id, chat);
        result.push(chat);
      }
    });

    // Add older chats
    olderChats.forEach(chat => {
      if (!chatMap.has(chat.id)) {
        chatMap.set(chat.id, chat);
        result.push(chat);
      }
    });

    return result;
  }

  /**
   * Cache chats for offline access
   */
  private async cacheChats(chats: any[]): Promise<void> {
    try {
      await offlineStorage.cacheChats(chats);
    } catch (error) {
      console.error('Error caching chats:', error);
    }
  }

  /**
   * Get current pagination state
   */
  getState(): PaginationState {
    return { ...this.state };
  }

  /**
   * Get current configuration
   */
  getConfig(): ChatPaginationConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const chatPagination = new ChatPagination();

// Export class for custom instances
export { ChatPagination };
