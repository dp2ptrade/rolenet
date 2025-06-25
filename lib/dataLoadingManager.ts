/**
 * Data Loading Manager
 * 
 * Manages efficient data loading with:
 * - Smart pagination
 * - Request throttling
 * - Cache management
 * - Memory optimization
 * - Background sync
 */

import { supabase } from './supabase';
import { throttle, debounce } from '../utils/performance';
import { CONFIG } from './config/chatConfig';
import { realtimeManager } from './realtimeManager';

interface LoadingConfig {
  pageSize: number;
  maxCacheSize: number;
  throttleDelay: number;
  prefetchThreshold: number;
  backgroundSyncInterval: number;
  maxRetries: number;
}

interface CacheEntry<T> {
  data: T[];
  timestamp: Date;
  totalCount?: number;
  hasMore: boolean;
  lastKey?: string;
}

interface LoadingState {
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  currentPage: number;
  totalCount: number;
}

interface PaginationParams {
  limit: number;
  offset?: number;
  cursor?: string;
  filters?: Record<string, any>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

class DataLoadingManager<T extends { id: string | number } = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private loadingStates = new Map<string, LoadingState>();
  private activeRequests = new Map<string, Promise<any>>();
  private config: LoadingConfig;
  private backgroundSyncTimer: ReturnType<typeof setTimeout> | null = null;
  private lastExecutionTimes = new Map<string, number>();

  constructor(config: Partial<LoadingConfig> = {}) {
    this.config = {
      pageSize: CONFIG.CHATS.PAGE_SIZE,
      maxCacheSize: CONFIG.CHATS.MAX_CACHED,
      throttleDelay: 1000,
      prefetchThreshold: 3,
      backgroundSyncInterval: CONFIG.OFFLINE.SYNC_INTERVAL,
      maxRetries: CONFIG.OFFLINE.MAX_RETRY_COUNT,
      ...config,
    };

    this.startBackgroundSync();
    // Note: Cannot throttle async methods that return promises
    // Throttling is handled internally in executeDataLoad method
  }

  /**
   * Load data with smart pagination and caching
   */
  async loadData(
    table: string,
    params: PaginationParams,
    cacheKey?: string
  ): Promise<{ data: T[]; hasMore: boolean; totalCount: number }> {
    const key = cacheKey || this.generateCacheKey(table, params);
    
    // Check if request is already in progress
    if (this.activeRequests.has(key)) {
      return this.activeRequests.get(key)!;
    }

    // Check cache first
    const cached = this.getCachedData(key);
    if (cached && this.isCacheValid(cached)) {
      return {
        data: cached.data,
        hasMore: cached.hasMore,
        totalCount: cached.totalCount || 0
      };
    }

    // Set loading state
    this.setLoadingState(key, { isLoading: true, error: null });

    const request = this.executeDataLoad(table, params, key);
    this.activeRequests.set(key, request);

    try {
      const result = await request;
      this.setLoadingState(key, { isLoading: false, error: null });
      return result;
    } catch (error) {
      this.setLoadingState(key, { 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      this.activeRequests.delete(key);
    }
  }

  /**
   * Load more data (pagination)
   */
  async loadMore(
    table: string,
    params: PaginationParams,
    cacheKey?: string
  ): Promise<{ data: T[]; hasMore: boolean }> {
    const key = cacheKey || this.generateCacheKey(table, params);
    const cached = this.getCachedData(key);
    
    if (!cached || !cached.hasMore) {
      return { data: [], hasMore: false };
    }

    // Check if load more request is already in progress
    const loadMoreKey = `${key}_loadmore`;
    if (this.activeRequests.has(loadMoreKey)) {
      return this.activeRequests.get(loadMoreKey)!;
    }

    this.setLoadingState(key, { isLoadingMore: true });

    const nextParams: PaginationParams = {
      ...params,
      offset: (params.offset || 0) + params.limit,
      cursor: cached.lastKey
    };

    const request = this.executeLoadMore(table, nextParams, key);
    this.activeRequests.set(loadMoreKey, request);

    try {
      const result = await request;
      this.setLoadingState(key, { isLoadingMore: false });
      return result;
    } catch (error) {
      this.setLoadingState(key, { 
        isLoadingMore: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      this.activeRequests.delete(loadMoreKey);
    }
  }

  /**
   * Execute the actual data loading
   */
  private async executeDataLoad(
    table: string,
    params: PaginationParams,
    cacheKey: string
  ): Promise<{ data: T[]; hasMore: boolean; totalCount: number }> {
    // Throttling logic
    const now = Date.now();
    const lastExecution = this.lastExecutionTimes.get(cacheKey) || 0;
    const timeSinceLastExecution = now - lastExecution;
    
    if (timeSinceLastExecution < this.config.throttleDelay) {
      await new Promise(resolve => setTimeout(resolve, this.config.throttleDelay - timeSinceLastExecution));
    }
    
    this.lastExecutionTimes.set(cacheKey, Date.now());
    let query = supabase.from(table).select('*', { count: 'exact' });

    // Apply filters
    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else if (typeof value === 'string' && value.includes('%')) {
          query = query.ilike(key, value);
        } else {
          query = query.eq(key, value);
        }
      });
    }

    // Apply sorting
    if (params.sortBy) {
      query = query.order(params.sortBy, { ascending: params.sortOrder === 'asc' });
    }

    // Apply pagination
    if (params.offset !== undefined) {
      query = query.range(params.offset, params.offset + params.limit - 1);
    } else {
      query = query.limit(params.limit);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to load ${table}: ${error.message}`);
    }

    const hasMore = data ? data.length === params.limit : false;
    const totalCount = count || 0;
    const lastKey = data && data.length > 0 ? data[data.length - 1].id : undefined;

    // Cache the result
    this.setCacheData(cacheKey, {
      data: data || [],
      timestamp: new Date(),
      totalCount,
      hasMore,
      lastKey
    });

    // Prefetch next page if needed
    if (hasMore && this.shouldPrefetch(cacheKey)) {
      this.prefetchNextPage(table, params, cacheKey);
    }

    return {
      data: data || [],
      hasMore,
      totalCount
    };
  }

  /**
   * Execute load more operation
   */
  private async executeLoadMore(
    table: string,
    params: PaginationParams,
    cacheKey: string
  ): Promise<{ data: T[]; hasMore: boolean }> {
    const result = await this.executeDataLoad(table, params, `${cacheKey}_next`);
    
    // Merge with existing cache
    const existing = this.getCachedData(cacheKey);
    if (existing) {
      const mergedData = [...existing.data, ...result.data];
      this.setCacheData(cacheKey, {
        ...existing,
        data: mergedData,
        hasMore: result.hasMore,
        lastKey: result.data.length > 0 ? String(result.data[result.data.length - 1].id) : existing.lastKey
      });
    }

    return {
      data: result.data,
      hasMore: result.hasMore
    };
  }

  /**
   * Prefetch next page in background
   */
  private prefetchNextPage(
    table: string,
    params: PaginationParams,
    cacheKey: string
  ): void {
    setTimeout(async () => {
      try {
        const nextParams: PaginationParams = {
          ...params,
          offset: (params.offset || 0) + params.limit
        };
        
        await this.executeDataLoad(table, nextParams, `${cacheKey}_prefetch`);
        console.log(`[DataLoadingManager] Prefetched next page for ${table}`);
      } catch (error) {
        console.warn('[DataLoadingManager] Prefetch failed:', error);
      }
    }, 2000); // Delay prefetch to avoid overwhelming the server
  }

  /**
   * Check if prefetching should be triggered
   */
  private shouldPrefetch(cacheKey: string): boolean {
    const state = this.loadingStates.get(cacheKey);
    return state ? state.currentPage >= this.config.prefetchThreshold : false;
  }

  /**
   * Generate cache key from parameters
   */
  private generateCacheKey(table: string, params: PaginationParams): string {
    const filterStr = params.filters ? JSON.stringify(params.filters) : '';
    const sortStr = params.sortBy ? `${params.sortBy}_${params.sortOrder}` : '';
    return `${table}_${filterStr}_${sortStr}_${params.limit}`;
  }

  /**
   * Get cached data
   */
  private getCachedData(key: string): CacheEntry<T> | null {
    return this.cache.get(key) || null;
  }

  /**
   * Set cached data with memory management
   */
  private setCacheData(key: string, entry: CacheEntry<T>): void {
    // Clean up old cache entries if at limit
    if (this.cache.size >= this.config.maxCacheSize) {
      this.cleanupOldCache();
    }

    this.cache.set(key, entry);
  }

  /**
   * Check if cache entry is still valid
   */
  private isCacheValid(entry: CacheEntry<T>): boolean {
    const now = new Date();
    const cacheAge = now.getTime() - entry.timestamp.getTime();
    const maxAge = CONFIG.SEARCH.CACHE_DURATION; // 5 minutes
    
    return cacheAge < maxAge;
  }

  /**
   * Clean up old cache entries
   */
  private cleanupOldCache(): void {
    const entries = Array.from(this.cache.entries());
    
    // Sort by timestamp (oldest first)
    entries.sort((a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime());
    
    // Remove oldest 25% of entries
    const toRemove = Math.floor(entries.length * 0.25);
    for (let i = 0; i < toRemove; i++) {
      const keyToRemove = entries[i][0];
      this.cache.delete(keyToRemove);
      this.loadingStates.delete(keyToRemove);
      this.lastExecutionTimes.delete(keyToRemove);
    }

    // Also clean up stale lastExecutionTimes entries (older than 1 hour)
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const executionEntries = Array.from(this.lastExecutionTimes.entries());
    let cleanedExecutionEntries = 0;
    
    for (const [key, timestamp] of executionEntries) {
      if (timestamp < oneHourAgo) {
        this.lastExecutionTimes.delete(key);
        cleanedExecutionEntries++;
      }
    }

    console.log(`[DataLoadingManager] Cleaned up ${toRemove} old cache entries and ${cleanedExecutionEntries} stale execution times`);
  }

  /**
   * Set loading state
   */
  private setLoadingState(key: string, updates: Partial<LoadingState>): void {
    const current = this.loadingStates.get(key) || {
      isLoading: false,
      isLoadingMore: false,
      error: null,
      hasMore: true,
      currentPage: 0,
      totalCount: 0
    };

    this.loadingStates.set(key, { ...current, ...updates });
  }

  /**
   * Get loading state
   */
  getLoadingState(key: string): LoadingState {
    return this.loadingStates.get(key) || {
      isLoading: false,
      isLoadingMore: false,
      error: null,
      hasMore: true,
      currentPage: 0,
      totalCount: 0
    };
  }

  /**
   * Start background sync for cache refresh
   */
  private startBackgroundSync(): void {
    this.backgroundSyncTimer = setInterval(() => {
      this.refreshStaleCache();
    }, this.config.backgroundSyncInterval);
  }

  /**
   * Refresh stale cache entries in background
   */
  private async refreshStaleCache(): Promise<void> {
    const staleEntries = Array.from(this.cache.entries())
      .filter(([_, entry]) => !this.isCacheValid(entry))
      .slice(0, 5); // Limit to 5 refreshes per cycle

    for (const [key, entry] of staleEntries) {
      try {
        // Extract table and params from cache key (simplified)
        const [table] = key.split('_');
        const params: PaginationParams = {
          limit: this.config.pageSize,
          offset: 0
        };

        await this.executeDataLoad(table, params, key);
        console.log(`[DataLoadingManager] Refreshed stale cache for ${key}`);
      } catch (error) {
        console.warn(`[DataLoadingManager] Failed to refresh cache for ${key}:`, error);
      }
    }
  }

  /**
   * Clear cache for specific key or all
   */
  clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
      this.loadingStates.delete(key);
      this.lastExecutionTimes.delete(key);
    } else {
      this.cache.clear();
      this.loadingStates.clear();
      this.lastExecutionTimes.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    cacheSize: number;
    activeRequests: number;
    memoryUsage: string;
  } {
    return {
      cacheSize: this.cache.size,
      activeRequests: this.activeRequests.size,
      memoryUsage: `${Math.round((performance as any).memory?.usedJSHeapSize / 1024 / 1024 || 0)}MB`
    };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.backgroundSyncTimer) {
      clearInterval(this.backgroundSyncTimer);
    }
    
    this.cache.clear();
    this.loadingStates.clear();
    this.activeRequests.clear();
    this.lastExecutionTimes.clear();
    
    console.log('[DataLoadingManager] Cleanup completed');
  }
}

// Export singleton instances for different data types
export const chatDataManager = new DataLoadingManager({
  pageSize: CONFIG.CHATS.PAGE_SIZE,
  maxCacheSize: CONFIG.CHATS.MAX_CACHED,
  prefetchThreshold: CONFIG.CHATS.PRELOAD_THRESHOLD
});

export const messageDataManager = new DataLoadingManager({
  pageSize: CONFIG.MESSAGES.DEFAULT_LIMIT,
  maxCacheSize: 200, // Higher cache for messages
  prefetchThreshold: 3
});

export const callDataManager = new DataLoadingManager({
  pageSize: 20,
  maxCacheSize: 50,
  prefetchThreshold: 2
});

export { DataLoadingManager };
