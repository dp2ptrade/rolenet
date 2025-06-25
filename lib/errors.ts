/**
 * Centralized Error Management for RoleNet
 * Provides structured error handling with user-friendly messages
 */

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public severity: 'low' | 'medium' | 'high' = 'medium',
    public userMessage?: string
  ) {
    super(message);
    this.name = 'AppError';
  }

  getUserMessage(): string {
    return this.userMessage || this.getDefaultUserMessage();
  }

  private getDefaultUserMessage(): string {
    switch (this.code) {
      case 'NETWORK_ERROR':
        return 'Please check your internet connection and try again.';
      case 'AUTH_ERROR':
        return 'Please sign in again to continue.';
      case 'VALIDATION_ERROR':
        return 'Please check your input and try again.';
      case 'PERMISSION_ERROR':
        return 'You don\'t have permission to perform this action.';
      case 'NOT_FOUND_ERROR':
        return 'The requested item could not be found.';
      case 'RATE_LIMIT_ERROR':
        return 'Too many requests. Please wait a moment and try again.';
      default:
        return 'Something went wrong. Please try again.';
    }
  }
}

/**
 * Async error handler utility
 * Wraps async operations with consistent error handling
 */
export const handleAsyncError = async <T>(
  operation: () => Promise<T>,
  errorCode: string,
  userMessage?: string
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    // Handle common error types
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new AppError(
        'Network request failed',
        'NETWORK_ERROR',
        'medium',
        userMessage
      );
    }
    
    throw new AppError(
      error instanceof Error ? error.message : 'Unknown error',
      errorCode,
      'medium',
      userMessage
    );
  }
};

/**
 * Error boundary helper for React components
 */
export const logError = (error: Error, errorInfo?: any) => {
  if (__DEV__) {
    console.error('🚨 Application Error:', {
      message: error.message,
      stack: error.stack,
      errorInfo,
      timestamp: new Date().toISOString()
    });
  }
  
  // In production, you would send this to a crash reporting service
  // Example: Sentry.captureException(error, { extra: errorInfo });
};

/**
 * Common error codes used throughout the app
 */
export const ERROR_CODES = {
  // Authentication
  AUTH_ERROR: 'AUTH_ERROR',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  
  // Network
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  REQUIRED_FIELD: 'REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  
  // Permissions
  PERMISSION_ERROR: 'PERMISSION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  
  // Data
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  DUPLICATE_ERROR: 'DUPLICATE_ERROR',
  
  // Chat specific
  FETCH_CHATS_ERROR: 'FETCH_CHATS_ERROR',
  SEND_MESSAGE_ERROR: 'SEND_MESSAGE_ERROR',
  FETCH_MESSAGES_ERROR: 'FETCH_MESSAGES_ERROR',
  LOAD_MESSAGES_ERROR: 'LOAD_MESSAGES_ERROR',
  
  // Call specific
  CALL_INIT_ERROR: 'CALL_INIT_ERROR',
  CALL_CONNECTION_ERROR: 'CALL_CONNECTION_ERROR',
  
  // Media
  MEDIA_UPLOAD_ERROR: 'MEDIA_UPLOAD_ERROR',
  MEDIA_PERMISSION_ERROR: 'MEDIA_PERMISSION_ERROR',
  
  // Rate limiting
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  
  // Generic
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];