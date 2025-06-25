# Centralized Configuration for Chat and Messaging System
Based on my analysis of your RoleNet codebase, implementing centralized configuration for your chat and messaging system is crucial for maintainability, scalability, and consistency. Here's why you need it and what configurations should be centralized:

## Why Centralized Configuration is Needed
### 1. Scattered Hardcoded Values
Currently, your codebase has numerous hardcoded values scattered across different files:

- Message limits: limit = 50 , limit = 20 in multiple places
- Retry configurations: retryCount = 0 , baseDelay: 1000
- Timeouts and intervals: HEARTBEAT_INTERVAL = 30000
- Cache sizes and pagination limits
### 2. Inconsistent Behavior
Different parts of the system use different default values for similar operations, leading to inconsistent user experience.

### 3. Difficult Maintenance
Changing configuration values requires hunting through multiple files, increasing the risk of missing updates.

### 4. Environment-Specific Settings
No easy way to adjust settings for development, staging, and production environments.

## Recommended Centralized Configuration Structure
Create a new configuration file: lib/config/chatConfig.ts

export const CHAT_CONFIG = {
  // Message Configuration
  MESSAGES: {
    DEFAULT_LIMIT: 50,
    MAX_LIMIT: 100,
    BATCH_SIZE: 50,
    MAX_LENGTH: 4000,
    TYPING_TIMEOUT: 3000,
    DEBOUNCE_DELAY: 300,
  },

  // Chat Configuration
  CHATS: {
    DEFAULT_LIMIT: 20,
    PINNED_LIMIT: 10,
    RECENT_LIMIT: 20,
    PAGE_SIZE: 20,
    MAX_CACHED: 100,
    PRELOAD_THRESHOLD: 5,
  },

  // Offline & Sync Configuration
  OFFLINE: {
    MAX_RETRY_COUNT: 3,
    BASE_RETRY_DELAY: 1000,
    MAX_RETRY_DELAY: 10000,
    BACKOFF_MULTIPLIER: 2,
    SYNC_INTERVAL: 30000,
    MAX_OFFLINE_MESSAGES: 1000,
    CACHE_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours
  },

  // Real-time Configuration
  REALTIME: {
    HEARTBEAT_INTERVAL: 30000,
    RECONNECT_DELAY: 5000,
    MAX_RECONNECT_ATTEMPTS: 5,
    PRESENCE_TIMEOUT: 60000,
  },

  // Media Configuration
  MEDIA: {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    SUPPORTED_IMAGE_TYPES: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    SUPPORTED_VIDEO_TYPES: ['mp4', 'mov', 'avi'],
    SUPPORTED_AUDIO_TYPES: ['mp3', 'wav', 'aac', 'm4a'],
    COMPRESSION_QUALITY: 0.8,
    THUMBNAIL_SIZE: 200,
  },

  // Performance Configuration
  PERFORMANCE: {
    VIRTUALIZATION_THRESHOLD: 100,
    LAZY_LOAD_THRESHOLD: 50,
    IMAGE_CACHE_SIZE: 50,
    MEMORY_WARNING_THRESHOLD: 0.8,
  },

  // Notification Configuration
  NOTIFICATIONS: {
    BATCH_DELAY: 2000,
    MAX_BATCH_SIZE: 10,
    SOUND_ENABLED: true,
    VIBRATION_ENABLED: true,
  },

  // Security Configuration
  SECURITY: {
    MESSAGE_ENCRYPTION: true,
    AUTO_DELETE_TIMEOUT: 30 * 24 * 60 * 60 * 1000, // 30 days
    MAX_LOGIN_ATTEMPTS: 5,
    SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
  },

  // Development Configuration
  DEBUG: {
    ENABLE_LOGGING: __DEV__,
    LOG_LEVEL: __DEV__ ? 'verbose' : 'error',
    ENABLE_PERFORMANCE_MONITORING: true,
    MOCK_NETWORK_DELAY: __DEV__ ? 0 : 0,
  },
};

// Environment-specific overrides
export const getEnvironmentConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  
  const envConfigs = {
    development: {
      MESSAGES: {
        ...CHAT_CONFIG.MESSAGES,
        DEFAULT_LIMIT: 20, // Smaller for faster dev testing
      },
      DEBUG: {
        ...CHAT_CONFIG.DEBUG,
        ENABLE_LOGGING: true,
        LOG_LEVEL: 'verbose',
      },
    },
    production: {
      OFFLINE: {
        ...CHAT_CONFIG.OFFLINE,
        MAX_RETRY_COUNT: 5,
        SYNC_INTERVAL: 15000, // More frequent in production
      },
      DEBUG: {
        ...CHAT_CONFIG.DEBUG,
        ENABLE_LOGGING: false,
        LOG_LEVEL: 'error',
      },
    },
  };

  return {
    ...CHAT_CONFIG,
    ...envConfigs[env as keyof typeof envConfigs],
  };
};

export const CONFIG = getEnvironmentConfig();

## Key Configuration Categories Needed
### 1. Message Management
- Default and maximum message limits
- Message batch sizes for loading
- Typing indicators timeout
- Message length limits
- Debounce delays for search/typing
### 2. Chat Operations
- Chat list pagination settings
- Pinned chats limits
- Cache management settings
- Preloading thresholds
### 3. Offline & Synchronization
- Retry mechanisms (count, delays, backoff)
- Sync intervals and timeouts
- Offline message queue limits
- Cache expiry times
### 4. Real-time Features
- WebSocket heartbeat intervals
- Reconnection strategies
- Presence detection timeouts
- Connection retry limits
### 5. Media Handling
- File size limits
- Supported file types
- Compression settings
- Thumbnail generation
### 6. Performance Optimization
- Virtualization thresholds
- Lazy loading triggers
- Memory management limits
- Cache sizes
### 7. Security & Privacy
- Encryption settings
- Auto-delete timeouts
- Session management
- Rate limiting
## Implementation Benefits
1. Single Source of Truth : All configuration in one place
2. Environment Flexibility : Easy to adjust for dev/staging/production
3. Type Safety : TypeScript interfaces for configuration validation
4. Hot Reloading : Easy to adjust values during development
5. A/B Testing : Simple to test different configuration values
6. Performance Tuning : Centralized place to optimize performance settings
7. Compliance : Easy to adjust settings for different regions/regulations
This centralized approach will make your chat and messaging system much more maintainable and allow for easy optimization and customization based on user needs and performance requirements.