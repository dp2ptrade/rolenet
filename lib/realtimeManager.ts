/**
 * Real-time Subscription Manager
 * 
 * Manages real-time subscriptions with performance optimizations:
 * - Throttled subscription updates
 * - Connection pooling
 * - Automatic cleanup
 * - Memory management
 * - Batch processing
 */

import { supabase } from './supabase';
import { throttle, debounce } from '../utils/performance';
import { CONFIG } from './config/chatConfig';

interface SubscriptionConfig {
  throttleDelay: number;
  batchSize: number;
  maxConnections: number;
  cleanupInterval: number;
  reconnectDelay: number;
}

interface ActiveSubscription {
  id: string;
  table: string;
  filter: string;
  callback: (payload: any) => void;
  subscription: any;
  lastActivity: Date;
  connectionCount: number;
}

interface BatchUpdate {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  payload: any;
  timestamp: Date;
}

class RealtimeManager {
  private subscriptions = new Map<string, ActiveSubscription>();
  private batchQueue: BatchUpdate[] = [];
  private config: SubscriptionConfig;
  private cleanupTimer: ReturnType<typeof setTimeout> | null = null;
  private batchTimer: ReturnType<typeof setTimeout> | null = null;
  private isProcessingBatch = false;

  constructor(config: Partial<SubscriptionConfig> = {}) {
    this.config = {
      throttleDelay: CONFIG.REALTIME.HEARTBEAT_INTERVAL / 2, // 15 seconds
      batchSize: 10,
      maxConnections: 20,
      cleanupInterval: 60000, // 1 minute
      reconnectDelay: CONFIG.REALTIME.RECONNECT_DELAY,
      ...config,
    };

    this.startCleanupTimer();
    this.processBatch = throttle(this.processBatch.bind(this), 1000);
  }

  /**
   * Subscribe to real-time updates with throttling and batching
   */
  subscribe(
    table: string,
    filter: string,
    callback: (payload: any) => void,
    options: { throttle?: boolean; batch?: boolean } = {}
  ): string {
    const subscriptionId = `${table}_${filter}_${Date.now()}`;
    
    // Check connection limits
    if (this.subscriptions.size >= this.config.maxConnections) {
      this.cleanupInactiveSubscriptions();
      
      if (this.subscriptions.size >= this.config.maxConnections) {
        console.warn('[RealtimeManager] Max connections reached, throttling new subscriptions');
        return this.createThrottledSubscription(subscriptionId, table, filter, callback);
      }
    }

    const wrappedCallback = options.batch 
      ? this.createBatchedCallback(callback)
      : options.throttle 
        ? throttle(callback, this.config.throttleDelay)
        : callback;

    try {
      const subscription = supabase
        .channel(`realtime_${subscriptionId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table,
            filter
          },
          (payload) => {
            this.updateSubscriptionActivity(subscriptionId);
            wrappedCallback(payload);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`[RealtimeManager] Subscribed to ${table} with filter: ${filter}`);
          } else if (status === 'CHANNEL_ERROR') {
            console.error(`[RealtimeManager] Subscription error for ${table}`);
            this.handleSubscriptionError(subscriptionId);
          }
        });

      this.subscriptions.set(subscriptionId, {
        id: subscriptionId,
        table,
        filter,
        callback: wrappedCallback,
        subscription,
        lastActivity: new Date(),
        connectionCount: 1
      });

      return subscriptionId;
    } catch (error) {
      console.error('[RealtimeManager] Failed to create subscription:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from real-time updates
   */
  unsubscribe(subscriptionId: string): void {
    const activeSubscription = this.subscriptions.get(subscriptionId);
    
    if (activeSubscription) {
      try {
        activeSubscription.subscription.unsubscribe();
        this.subscriptions.delete(subscriptionId);
        console.log(`[RealtimeManager] Unsubscribed from ${subscriptionId}`);
      } catch (error) {
        console.error('[RealtimeManager] Error unsubscribing:', error);
      }
    }
  }

  /**
   * Create a throttled subscription for when at connection limit
   */
  private createThrottledSubscription(
    subscriptionId: string,
    table: string,
    filter: string,
    callback: (payload: any) => void
  ): string {
    // Find existing subscription for same table/filter and share it
    const existingKey = Array.from(this.subscriptions.keys()).find(key => {
      const sub = this.subscriptions.get(key);
      return sub?.table === table && sub?.filter === filter;
    });

    if (existingKey) {
      const existing = this.subscriptions.get(existingKey)!;
      existing.connectionCount++;
      
      // Create a shared callback that throttles individual callbacks
      const originalCallback = existing.callback;
      const sharedCallback = (payload: any) => {
        originalCallback(payload);
        throttle(callback, this.config.throttleDelay)(payload);
      };
      
      existing.callback = sharedCallback;
      return existingKey;
    }

    // If no existing subscription, create a new throttled one
    return this.subscribe(table, filter, callback, { throttle: true });
  }

  /**
   * Create a batched callback for high-frequency updates
   */
  private createBatchedCallback(callback: (payload: any) => void) {
    return (payload: any) => {
      this.batchQueue.push({
        type: payload.eventType,
        table: payload.table,
        payload: payload.new || payload.old,
        timestamp: new Date()
      });

      if (this.batchQueue.length >= this.config.batchSize) {
        this.processBatch();
      } else if (!this.batchTimer) {
        this.batchTimer = setTimeout(() => {
          this.processBatch();
        }, 2000); // Process batch after 2 seconds
      }
    };
  }

  /**
   * Process batched updates
   */
  private processBatch(): void {
    if (this.isProcessingBatch || this.batchQueue.length === 0) {
      return;
    }

    this.isProcessingBatch = true;
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    try {
      // Group updates by table and type
      const groupedUpdates = this.batchQueue.reduce((groups, update) => {
        const key = `${update.table}_${update.type}`;
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(update);
        return groups;
      }, {} as Record<string, BatchUpdate[]>);

      // Process each group
      Object.entries(groupedUpdates).forEach(([key, updates]) => {
        const [table, type] = key.split('_');
        this.notifyBatchSubscribers(table, type as any, updates);
      });

      this.batchQueue = [];
    } catch (error) {
      console.error('[RealtimeManager] Error processing batch:', error);
    } finally {
      this.isProcessingBatch = false;
    }
  }

  /**
   * Notify subscribers of batched updates
   */
  private notifyBatchSubscribers(table: string, type: string, updates: BatchUpdate[]): void {
    this.subscriptions.forEach((subscription) => {
      if (subscription.table === table) {
        subscription.callback({
          eventType: 'BATCH_UPDATE',
          table,
          type,
          updates: updates.map(u => u.payload),
          count: updates.length,
          timestamp: new Date()
        });
      }
    });
  }

  /**
   * Update subscription activity timestamp
   */
  private updateSubscriptionActivity(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      subscription.lastActivity = new Date();
    }
  }

  /**
   * Handle subscription errors with automatic retry
   */
  private handleSubscriptionError(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    console.log(`[RealtimeManager] Attempting to reconnect subscription: ${subscriptionId}`);
    
    // Unsubscribe the failed subscription
    this.unsubscribe(subscriptionId);
    
    // Retry after delay
    setTimeout(() => {
      try {
        this.subscribe(
          subscription.table,
          subscription.filter,
          subscription.callback
        );
      } catch (error) {
        console.error('[RealtimeManager] Failed to reconnect subscription:', error);
      }
    }, this.config.reconnectDelay);
  }

  /**
   * Clean up inactive subscriptions
   */
  private cleanupInactiveSubscriptions(): void {
    const now = new Date();
    const inactiveThreshold = 5 * 60 * 1000; // 5 minutes

    this.subscriptions.forEach((subscription, id) => {
      const timeSinceActivity = now.getTime() - subscription.lastActivity.getTime();
      
      if (timeSinceActivity > inactiveThreshold) {
        console.log(`[RealtimeManager] Cleaning up inactive subscription: ${id}`);
        this.unsubscribe(id);
      }
    });
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupInactiveSubscriptions();
    }, this.config.cleanupInterval);
  }

  /**
   * Get subscription statistics
   */
  getStats(): {
    activeSubscriptions: number;
    batchQueueSize: number;
    memoryUsage: string;
  } {
    return {
      activeSubscriptions: this.subscriptions.size,
      batchQueueSize: this.batchQueue.length,
      memoryUsage: `${Math.round((performance as any).memory?.usedJSHeapSize / 1024 / 1024 || 0)}MB`
    };
  }

  /**
   * Cleanup all subscriptions
   */
  cleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    this.subscriptions.forEach((_, id) => {
      this.unsubscribe(id);
    });
    
    this.batchQueue = [];
    console.log('[RealtimeManager] Cleanup completed');
  }
}

// Export singleton instance
export const realtimeManager = new RealtimeManager();
export { RealtimeManager };