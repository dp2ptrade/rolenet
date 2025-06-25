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

  // Search & Discovery Configuration
  SEARCH: {
    DEFAULT_LIMIT: 50,
    MAX_LIMIT: 100,
    DEFAULT_RADIUS_KM: 50,
    MAX_RADIUS_KM: 500,
    MIN_QUERY_LENGTH: 2,
    DEBOUNCE_DELAY: 300,
    CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
    MAX_RECENT_SEARCHES: 10,
  },

  // User Interface Configuration
  UI: {
    MESSAGE_MAX_LENGTH: 500,
    BIO_MAX_LENGTH: 1000,
    SCROLL_THRESHOLD: 100,
    PAGINATION_SIZE: 20,
    INFINITE_SCROLL_THRESHOLD: 5,
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