/**
 * Retry Upload Utility
 * 
 * This utility provides robust retry mechanisms for media uploads
 * to handle connection reset errors and improve upload reliability.
 */

interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryCondition?: (error: Error) => boolean;
  shouldRetry?: (error: Error) => boolean;
  onRetry?: (attempt: number, error: Error) => void;
}

interface CircuitBreaker {
  onSuccess(): void;
  onFailure(): void;
  shouldReject(): boolean;
}

interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalDuration: number;
}

class RetryUploadManager {
  private static instance: RetryUploadManager;
  private circuitBreaker: CircuitBreaker | null = null;
  private defaultOptions: Required<RetryOptions> = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    retryCondition: this.defaultRetryCondition,
    shouldRetry: this.defaultRetryCondition,
    onRetry: this.defaultOnRetry
  };

  private constructor() {}

  static getInstance(): RetryUploadManager {
    if (!RetryUploadManager.instance) {
      RetryUploadManager.instance = new RetryUploadManager();
    }
    return RetryUploadManager.instance;
  }

  /**
   * Execute a function with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ): Promise<T> {
    const config = { ...this.defaultOptions, ...options };
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
      try {
        const result = await operation();
        
        // Reset circuit breaker on success
        if (this.circuitBreaker) {
          this.circuitBreaker.onSuccess();
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        // Check circuit breaker
        if (this.circuitBreaker && this.circuitBreaker.shouldReject()) {
          throw new Error('Circuit breaker is open - too many failures');
        }
        
        // Record failure
        if (this.circuitBreaker) {
          this.circuitBreaker.onFailure();
        }
        
        console.log(`🔄 Retry attempt ${attempt}/${config.maxRetries} failed:`, error);
        
        // Don't retry if this is the last attempt
        if (attempt === config.maxRetries) {
          break;
        }
        
        // Check if error should trigger retry
        if (config.shouldRetry && !config.shouldRetry(error as Error)) {
          console.log('❌ Error type should not be retried');
          break;
        }
        
        // Calculate delay with exponential backoff
        const delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError || new Error('Operation failed after all retry attempts');
  }

  /**
   * Upload media with retry logic
   */
  async uploadMediaWithRetry(
    uploadFunction: () => Promise<string>,
    options: RetryOptions = {}
  ): Promise<string> {
    return this.executeWithRetry(uploadFunction, {
      ...options,
      shouldRetry: this.uploadRetryCondition,
      onRetry: (attempt, error) => {
        console.log(`🔄 Upload retry ${attempt}: ${error.message}`);
        options.onRetry?.(attempt, error);
      }
    });
  }

  /**
   * Default retry condition - determines if an error should trigger a retry
   */
  private defaultRetryCondition(error: Error): boolean {
    const retryableErrors = [
      'network error',
      'connection reset',
      'timeout',
      'temporary failure',
      'service unavailable',
      'too many requests',
      'rate limit',
      'fetch failed'
    ];
    
    const errorMessage = error.message.toLowerCase();
    return retryableErrors.some(retryableError => 
      errorMessage.includes(retryableError)
    );
  }

  /**
   * Upload-specific retry condition
   */
  private uploadRetryCondition(error: Error): boolean {
    const errorMessage = error.message.toLowerCase();
    
    // Don't retry authentication errors
    if (errorMessage.includes('not authenticated') || 
        errorMessage.includes('unauthorized') ||
        errorMessage.includes('forbidden')) {
      return false;
    }
    
    // Don't retry file size errors
    if (errorMessage.includes('size exceeds') ||
        errorMessage.includes('too large')) {
      return false;
    }
    
    // Don't retry invalid file errors
    if (errorMessage.includes('invalid file') ||
        errorMessage.includes('unsupported format')) {
      return false;
    }
    
    // Retry network and temporary errors
    const retryableErrors = [
      'network error',
      'connection reset',
      'connection refused',
      'timeout',
      'temporary failure',
      'service unavailable',
      'too many requests',
      'rate limit',
      'fetch failed',
      'upload failed',
      'storage error'
    ];
    
    return retryableErrors.some(retryableError => 
      errorMessage.includes(retryableError)
    );
  }

  /**
   * Default retry callback
   */
  private defaultOnRetry(attempt: number, error: Error): void {
    console.log(`🔄 Retry attempt ${attempt} due to: ${error.message}`);
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Set circuit breaker for this manager
   */
  setCircuitBreaker(circuitBreaker: CircuitBreaker | null) {
    this.circuitBreaker = circuitBreaker;
  }

  /**
   * Create a circuit breaker for uploads
   */
  createCircuitBreaker(options: {
    failureThreshold?: number;
    resetTimeout?: number;
    monitoringPeriod?: number;
  } = {}) {
    const config = {
      failureThreshold: 5,
      resetTimeout: 30000, // 30 seconds
      monitoringPeriod: 60000, // 1 minute
      ...options
    };
    
    let failures = 0;
    let lastFailureTime = 0;
    let state: 'closed' | 'open' | 'half-open' = 'closed';
    
    return {
      onSuccess(): void {
        if (state === 'half-open') {
          state = 'closed';
          failures = 0;
          console.log('✅ Circuit breaker reset to closed state');
        }
      },
      
      onFailure(): void {
        failures++;
        lastFailureTime = Date.now();
        
        if (failures >= config.failureThreshold) {
          state = 'open';
          console.log(`🚫 Circuit breaker opened after ${failures} failures`);
        }
      },
      
      shouldReject(): boolean {
        const now = Date.now();
        
        // Reset failures if monitoring period has passed
        if (now - lastFailureTime > config.monitoringPeriod) {
          failures = 0;
          state = 'closed';
        }
        
        // Check circuit state
        if (state === 'open') {
          if (now - lastFailureTime < config.resetTimeout) {
            return true;
          } else {
            state = 'half-open';
            console.log('🔄 Circuit breaker moving to half-open state');
            return false;
          }
        }
        
        return false;
      },
      
      async execute<T>(operation: () => Promise<T>): Promise<T> {
        if (this.shouldReject()) {
          throw new Error('Circuit breaker is open - too many recent failures');
        }
        
        try {
          const result = await operation();
          this.onSuccess();
          return result;
        } catch (error) {
          this.onFailure();
          throw error;
        }
      },
      
      getState: () => ({ state, failures, lastFailureTime })
    };
  }
}

// Export singleton instance
export const retryUploadManager = RetryUploadManager.getInstance();

// Convenience functions
export const executeWithRetry = <T>(
  operation: () => Promise<T>,
  options?: RetryOptions
) => retryUploadManager.executeWithRetry(operation, options);

export const uploadWithRetry = (
  uploadFunction: () => Promise<string>,
  options?: RetryOptions
) => retryUploadManager.uploadMediaWithRetry(uploadFunction, options);

export const createUploadCircuitBreaker = (options?: {
  failureThreshold?: number;
  resetTimeout?: number;
  monitoringPeriod?: number;
}) => retryUploadManager.createCircuitBreaker(options);

// Enhanced upload function with retry logic
export const uploadMediaWithRetry = async (
  uri: string,
  bucket: string = 'chat-media',
  options: RetryOptions = {}
): Promise<string> => {
  const ChatService = require('./supabaseService').ChatService;
  
  return retryUploadManager.uploadMediaWithRetry(
    () => ChatService.uploadMedia(uri, bucket),
    {
      maxRetries: 3,
      baseDelay: 1000,
      backoffMultiplier: 2,
      ...options
    }
  );
};

// Make available globally in development
if (__DEV__) {
  // @ts-ignore
  global.retryUploadManager = retryUploadManager;
  // @ts-ignore
  global.uploadWithRetry = uploadWithRetry;
  
  console.log('🔄 Retry Upload Manager: Available in development mode');
  console.log('🔄 Use uploadWithRetry() for robust uploads');
}