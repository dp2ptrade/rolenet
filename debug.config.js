/**
 * Debug Configuration for Upload Issues
 * 
 * This file enables various debugging features to help identify
 * and resolve media upload connection reset errors.
 */

// Import debugging utilities
// Note: Debugging utilities are disabled to prevent bundling issues
// import { enableNetworkDebugging, getNetworkStats } from './lib/networkDebugger';
// import { runUploadTests } from './lib/uploadTester';
// import { uploadWithRetry } from './lib/retryUpload';

// Debug configuration
export const DEBUG_CONFIG = {
  // Enable detailed logging
  enableNetworkDebugging: true,
  enableUploadTesting: true,
  enableRetryMechanism: true,
  
  // Logging levels
  logLevel: 'verbose', // 'minimal', 'normal', 'verbose'
  
  // Retry configuration
  retryOptions: {
    maxRetries: 3,
    baseDelay: 1000,
    backoffMultiplier: 2
  },
  
  // Test configuration
  testOptions: {
    runOnStartup: false,
    testFileSizes: [100 * 1024, 1024 * 1024, 5 * 1024 * 1024], // 100KB, 1MB, 5MB
    testConcurrency: 3
  }
};

// Initialize debugging features
export function initializeDebugging() {
  console.log('🔍 Initializing upload debugging...');
  
  // Temporarily disabled to prevent bundling issues
  // if (DEBUG_CONFIG.enableNetworkDebugging) {
  //   enableNetworkDebugging();
  //   console.log('✅ Network debugging enabled');
  // }
  
  // Make debugging functions globally available
  if (__DEV__) {
    global.debugUpload = {
      // getNetworkStats,
      // runUploadTests,
      // uploadWithRetry,
      config: DEBUG_CONFIG
    };
    
    console.log('🛠️  Debug utilities available at global.debugUpload');
  }
  
  return DEBUG_CONFIG;
}

// Auto-initialize in development
if (__DEV__) {
  initializeDebugging();
}
