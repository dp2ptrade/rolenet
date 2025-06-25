/**
 * Network Utilities
 * 
 * Provides cross-platform network connectivity detection
 * Compatible with both React Native and web environments
 */

// Type definitions for network state
export interface NetworkState {
  isConnected: boolean | null;
  type?: string;
}

export interface NetworkStateChangeCallback {
  (state: NetworkState): void;
}

// Simple mock network detector for environments where NetInfo is not available
class MockNetworkDetector {
  private listeners: Set<NetworkStateChangeCallback> = new Set();
  private currentState: NetworkState = { isConnected: true, type: 'wifi' };

  addEventListener(callback: NetworkStateChangeCallback) {
    this.listeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  async fetch(): Promise<NetworkState> {
    return this.currentState;
  }

  cleanup() {
    this.listeners.clear();
  }
}

// Web-compatible network detection
class WebNetworkDetector {
  private listeners: Set<NetworkStateChangeCallback> = new Set();
  private currentState: NetworkState = { isConnected: true }; // Default to online

  constructor() {
    // Check if we're in a browser environment and not React Native
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && (typeof Platform === 'undefined' || Platform.OS === 'web')) {
      this.currentState = { isConnected: navigator.onLine };
      // Listen for online/offline events
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  private handleOnline = () => {
    this.currentState = { isConnected: true, type: 'wifi' };
    this.notifyListeners();
  };

  private handleOffline = () => {
    this.currentState = { isConnected: false, type: 'none' };
    this.notifyListeners();
  };

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentState));
  }

  addEventListener(callback: NetworkStateChangeCallback) {
    this.listeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  async fetch(): Promise<NetworkState> {
    return this.currentState;
  }

  cleanup() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
    this.listeners.clear();
  }
}

import { Platform } from 'react-native';

// Platform detection and network utility factory
function createNetworkDetector() {
  // Check if we're in a React Native environment
  if (typeof Platform !== 'undefined' && Platform.OS !== 'web') {
    console.warn('Using mock network detector for React Native - network state will always be online');
    return new MockNetworkDetector();
  }
  
  // For web browser environment
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
    return new WebNetworkDetector();
  }
  
  // Default to mock detector for other environments
  console.warn('Using mock network detector - network state will always be online');
  return new MockNetworkDetector();
}

// Export the network utility instance
export const NetworkUtils = createNetworkDetector();

// Export a NetInfo-compatible interface for easy replacement
export const NetInfo = {
  addEventListener: (callback: NetworkStateChangeCallback) => {
    return NetworkUtils.addEventListener(callback);
  },
  
  fetch: async (): Promise<NetworkState> => {
    return await NetworkUtils.fetch();
  }
};

export default NetInfo;
