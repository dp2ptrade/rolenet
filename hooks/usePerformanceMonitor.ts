/**
 * Performance Monitor Hook
 * 
 * Provides real-time performance monitoring for:
 * - Real-time subscriptions
 * - Data loading operations
 * - Memory usage
 * - Network performance
 * - UI responsiveness
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { realtimeManager } from '../lib/realtimeManager';
import { chatDataManager, messageDataManager, callDataManager } from '../lib/dataLoadingManager';
import { useChatStore } from '../stores/useChatStore';
import { useCallStore } from '../stores/useCallStore';
import { CONFIG } from '../lib/config/chatConfig';

interface PerformanceMetrics {
  realtime: {
    activeSubscriptions: number;
    batchQueueSize: number;
    memoryUsage: string;
    connectionHealth: 'good' | 'warning' | 'critical';
  };
  dataLoading: {
    chatCache: number;
    messageCache: number;
    callCache: number;
    activeRequests: number;
    cacheHitRate: number;
  };
  memory: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
    warningThreshold: boolean;
  };
  network: {
    isOnline: boolean;
    latency: number;
    reconnectCount: number;
    lastReconnect: Date | null;
  };
  ui: {
    frameDrops: number;
    averageFrameTime: number;
    isResponsive: boolean;
  };
}

interface PerformanceAlerts {
  type: 'memory' | 'network' | 'subscriptions' | 'cache';
  severity: 'low' | 'medium' | 'high';
  message: string;
  timestamp: Date;
  resolved: boolean;
}

interface UsePerformanceMonitorOptions {
  enabled?: boolean;
  interval?: number;
  alertThresholds?: {
    memoryWarning?: number;
    memoryCritical?: number;
    subscriptionWarning?: number;
    subscriptionCritical?: number;
    latencyWarning?: number;
    latencyCritical?: number;
  };
}

export const usePerformanceMonitor = (options: UsePerformanceMonitorOptions = {}) => {
  const {
    enabled = true,
    interval = 10000, // 10 seconds
    alertThresholds = {
      memoryWarning: CONFIG.PERFORMANCE.MEMORY_WARNING_THRESHOLD,
      memoryCritical: 0.9,
      subscriptionWarning: 15,
      subscriptionCritical: 25,
      latencyWarning: 1000,
      latencyCritical: 3000
    }
  } = options;

  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [alerts, setAlerts] = useState<PerformanceAlerts[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frameTimeRef = useRef<number[]>([]);
  const reconnectCountRef = useRef(0);
  const lastReconnectRef = useRef<Date | null>(null);
  const cacheHitsRef = useRef(0);
  const cacheMissesRef = useRef(0);

  const getChatStore = useChatStore();
  const getCallStore = useCallStore();

  /**
   * Collect performance metrics
   */
  const collectMetrics = useCallback(async (): Promise<PerformanceMetrics> => {
    // Real-time metrics
    const realtimeStats = realtimeManager.getStats();
    const chatStats = useChatStore.getState().getPerformanceStats?.() || {};
    const callStats = useCallStore.getState().getCallPerformanceStats?.() || {};
    
    // Data loading metrics
    const chatDataStats = chatDataManager.getStats();
    const messageDataStats = messageDataManager.getStats();
    const callDataStats = callDataManager.getStats();
    
    // Memory metrics
    const memoryUsage = process.memoryUsage?.() || {
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
      rss: 0
    };
    
    // Calculate cache hit rate
    const totalCacheRequests = cacheHitsRef.current + cacheMissesRef.current;
    const cacheHitRate = totalCacheRequests > 0 ? cacheHitsRef.current / totalCacheRequests : 0;
    
    // Calculate average frame time
    const avgFrameTime = frameTimeRef.current.length > 0 
      ? frameTimeRef.current.reduce((a, b) => a + b, 0) / frameTimeRef.current.length
      : 0;
    
    // Determine connection health
    let connectionHealth: 'good' | 'warning' | 'critical' = 'good';
    if (realtimeStats.activeSubscriptions > alertThresholds.subscriptionCritical!) {
      connectionHealth = 'critical';
    } else if (realtimeStats.activeSubscriptions > alertThresholds.subscriptionWarning!) {
      connectionHealth = 'warning';
    }
    
    return {
      realtime: {
        activeSubscriptions: realtimeStats.activeSubscriptions,
        batchQueueSize: realtimeStats.batchQueueSize,
        memoryUsage: realtimeStats.memoryUsage,
        connectionHealth
      },
      dataLoading: {
        chatCache: chatDataStats.cacheSize,
        messageCache: messageDataStats.cacheSize,
        callCache: callDataStats.cacheSize,
        activeRequests: chatDataStats.activeRequests + messageDataStats.activeRequests + callDataStats.activeRequests,
        cacheHitRate: Math.round(cacheHitRate * 100) / 100
      },
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        warningThreshold: (memoryUsage.heapUsed / memoryUsage.heapTotal) > alertThresholds.memoryWarning!
      },
      network: {
        isOnline: getChatStore.isOnline,
        latency: 0, // Would need to implement ping functionality
        reconnectCount: reconnectCountRef.current,
        lastReconnect: lastReconnectRef.current
      },
      ui: {
        frameDrops: frameTimeRef.current.filter(time => time > 16.67).length, // 60fps = 16.67ms per frame
        averageFrameTime: Math.round(avgFrameTime * 100) / 100,
        isResponsive: avgFrameTime < 16.67
      }
    };
  }, [getChatStore, getCallStore, alertThresholds]);

  /**
   * Check for performance issues and generate alerts
   */
  const checkForAlerts = useCallback((currentMetrics: PerformanceMetrics) => {
    const newAlerts: PerformanceAlerts[] = [];
    const now = new Date();

    // Memory alerts
    if (currentMetrics.memory.warningThreshold) {
      const severity = (currentMetrics.memory.heapUsed / currentMetrics.memory.heapTotal) > alertThresholds.memoryCritical! 
        ? 'high' : 'medium';
      
      newAlerts.push({
        type: 'memory',
        severity,
        message: `High memory usage: ${currentMetrics.memory.heapUsed}MB / ${currentMetrics.memory.heapTotal}MB`,
        timestamp: now,
        resolved: false
      });
    }

    // Subscription alerts
    if (currentMetrics.realtime.connectionHealth !== 'good') {
      newAlerts.push({
        type: 'subscriptions',
        severity: currentMetrics.realtime.connectionHealth === 'critical' ? 'high' : 'medium',
        message: `High subscription count: ${currentMetrics.realtime.activeSubscriptions} active connections`,
        timestamp: now,
        resolved: false
      });
    }

    // Network alerts
    if (!currentMetrics.network.isOnline) {
      newAlerts.push({
        type: 'network',
        severity: 'high',
        message: 'Device is offline - real-time features unavailable',
        timestamp: now,
        resolved: false
      });
    }

    // Cache performance alerts
    if (currentMetrics.dataLoading.cacheHitRate < 0.7) {
      newAlerts.push({
        type: 'cache',
        severity: 'low',
        message: `Low cache hit rate: ${Math.round(currentMetrics.dataLoading.cacheHitRate * 100)}%`,
        timestamp: now,
        resolved: false
      });
    }

    // Add new alerts and mark old ones as resolved
    setAlerts(prevAlerts => {
      const updatedAlerts = prevAlerts.map(alert => {
        // Auto-resolve old alerts (older than 5 minutes)
        if (now.getTime() - alert.timestamp.getTime() > 5 * 60 * 1000) {
          return { ...alert, resolved: true };
        }
        return alert;
      });
      
      return [...updatedAlerts, ...newAlerts];
    });
  }, [alertThresholds]);

  /**
   * Start performance monitoring
   */
  const startMonitoring = useCallback(() => {
    if (!enabled || isMonitoring) return;

    setIsMonitoring(true);
    
    const monitor = async () => {
      try {
        const currentMetrics = await collectMetrics();
        setMetrics(currentMetrics);
        checkForAlerts(currentMetrics);
      } catch (error) {
        console.error('[PerformanceMonitor] Error collecting metrics:', error);
      }
    };

    // Initial collection
    monitor();
    
    // Set up interval
    intervalRef.current = setInterval(monitor, interval);
    
    console.log('[PerformanceMonitor] Started monitoring');
  }, [enabled, isMonitoring, interval, collectMetrics, checkForAlerts]);

  /**
   * Stop performance monitoring
   */
  const stopMonitoring = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    setIsMonitoring(false);
    console.log('[PerformanceMonitor] Stopped monitoring');
  }, []);

  /**
   * Clear all alerts
   */
  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  /**
   * Resolve specific alert
   */
  const resolveAlert = useCallback((index: number) => {
    setAlerts(prevAlerts => 
      prevAlerts.map((alert, i) => 
        i === index ? { ...alert, resolved: true } : alert
      )
    );
  }, []);

  /**
   * Track frame performance
   */
  const trackFrame = useCallback((frameTime: number) => {
    frameTimeRef.current.push(frameTime);
    
    // Keep only last 60 frames (1 second at 60fps)
    if (frameTimeRef.current.length > 60) {
      frameTimeRef.current.shift();
    }
  }, []);

  /**
   * Track cache performance
   */
  const trackCacheHit = useCallback(() => {
    cacheHitsRef.current++;
  }, []);

  const trackCacheMiss = useCallback(() => {
    cacheMissesRef.current++;
  }, []);

  /**
   * Track network reconnection
   */
  const trackReconnect = useCallback(() => {
    reconnectCountRef.current++;
    lastReconnectRef.current = new Date();
  }, []);

  /**
   * Get performance recommendations
   */
  const getRecommendations = useCallback((): string[] => {
    if (!metrics) return [];
    
    const recommendations: string[] = [];
    
    if (metrics.memory.warningThreshold) {
      recommendations.push('Consider clearing old cache entries or reducing cache size');
    }
    
    if (metrics.realtime.activeSubscriptions > 10) {
      recommendations.push('Too many active subscriptions - consider unsubscribing from inactive chats');
    }
    
    if (metrics.dataLoading.cacheHitRate < 0.7) {
      recommendations.push('Low cache hit rate - consider increasing cache size or improving cache strategy');
    }
    
    if (!metrics.ui.isResponsive) {
      recommendations.push('UI performance issues detected - consider reducing real-time update frequency');
    }
    
    return recommendations;
  }, [metrics]);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        startMonitoring();
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        stopMonitoring();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    // Start monitoring if app is active
    if (AppState.currentState === 'active') {
      startMonitoring();
    }

    return () => {
      subscription?.remove();
      stopMonitoring();
    };
  }, [startMonitoring, stopMonitoring]);

  return {
    metrics,
    alerts: alerts.filter(alert => !alert.resolved),
    allAlerts: alerts,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    clearAlerts,
    resolveAlert,
    trackFrame,
    trackCacheHit,
    trackCacheMiss,
    trackReconnect,
    getRecommendations
  };
};

export type { PerformanceMetrics, PerformanceAlerts, UsePerformanceMonitorOptions };