/**
 * Upload Testing Utility
 * 
 * This utility provides systematic testing capabilities for media uploads
 * to help identify specific conditions that cause connection reset errors.
 */

import { ChatService } from './supabaseService';
import { networkDebugger } from './networkDebugger';

interface TestResult {
  testName: string;
  success: boolean;
  duration: number;
  fileSize: number;
  error?: string;
  publicUrl?: string;
  timestamp: number;
}

interface TestSuite {
  name: string;
  results: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    averageDuration: number;
    successRate: number;
  };
}

class UploadTester {
  private static instance: UploadTester;
  private testResults: TestSuite[] = [];

  private constructor() {}

  static getInstance(): UploadTester {
    if (!UploadTester.instance) {
      UploadTester.instance = new UploadTester();
    }
    return UploadTester.instance;
  }

  /**
   * Run comprehensive upload tests
   */
  async runComprehensiveTests(): Promise<TestSuite[]> {
    console.log('🧪 Starting comprehensive upload tests...');
    
    // Enable network debugging for detailed monitoring
    networkDebugger.enable();
    
    try {
      const testSuites = [
        await this.testFileSizes(),
        await this.testFileTypes(),
        await this.testNetworkConditions(),
        await this.testConcurrentUploads(),
        await this.testRetryScenarios()
      ];
      
      this.testResults = testSuites;
      this.printComprehensiveReport();
      
      return testSuites;
    } finally {
      networkDebugger.disable();
    }
  }

  /**
   * Test different file sizes
   */
  async testFileSizes(): Promise<TestSuite> {
    console.log('📏 Testing different file sizes...');
    
    const testSuite: TestSuite = {
      name: 'File Size Tests',
      results: [],
      summary: { total: 0, passed: 0, failed: 0, averageDuration: 0, successRate: 0 }
    };

    const fileSizes = [
      { name: 'Tiny (10KB)', size: 10 * 1024 },
      { name: 'Small (100KB)', size: 100 * 1024 },
      { name: 'Medium (1MB)', size: 1024 * 1024 },
      { name: 'Large (5MB)', size: 5 * 1024 * 1024 },
      { name: 'Very Large (9MB)', size: 9 * 1024 * 1024 },
      { name: 'Max Size (10MB)', size: 10 * 1024 * 1024 }
    ];

    for (const fileSize of fileSizes) {
      const result = await this.testFileUpload(
        `Size Test: ${fileSize.name}`,
        await this.generateTestImage(fileSize.size)
      );
      testSuite.results.push(result);
    }

    testSuite.summary = this.calculateSummary(testSuite.results);
    return testSuite;
  }

  /**
   * Test different file types
   */
  async testFileTypes(): Promise<TestSuite> {
    console.log('🎨 Testing different file types...');
    
    const testSuite: TestSuite = {
      name: 'File Type Tests',
      results: [],
      summary: { total: 0, passed: 0, failed: 0, averageDuration: 0, successRate: 0 }
    };

    const fileTypes = [
      { name: 'JPEG', mimeType: 'image/jpeg', extension: 'jpg' },
      { name: 'PNG', mimeType: 'image/png', extension: 'png' },
      { name: 'WebP', mimeType: 'image/webp', extension: 'webp' },
      { name: 'GIF', mimeType: 'image/gif', extension: 'gif' }
    ];

    for (const fileType of fileTypes) {
      const result = await this.testFileUpload(
        `Type Test: ${fileType.name}`,
        await this.generateTestImage(1024 * 1024, fileType.mimeType) // 1MB test files
      );
      testSuite.results.push(result);
    }

    testSuite.summary = this.calculateSummary(testSuite.results);
    return testSuite;
  }

  /**
   * Test under different network conditions
   */
  async testNetworkConditions(): Promise<TestSuite> {
    console.log('🌐 Testing network conditions...');
    
    const testSuite: TestSuite = {
      name: 'Network Condition Tests',
      results: [],
      summary: { total: 0, passed: 0, failed: 0, averageDuration: 0, successRate: 0 }
    };

    // Test rapid successive uploads
    for (let i = 0; i < 3; i++) {
      const result = await this.testFileUpload(
        `Rapid Upload ${i + 1}`,
        await this.generateTestImage(512 * 1024) // 512KB
      );
      testSuite.results.push(result);
      
      // Small delay between uploads
      await this.delay(500);
    }

    testSuite.summary = this.calculateSummary(testSuite.results);
    return testSuite;
  }

  /**
   * Test concurrent uploads
   */
  async testConcurrentUploads(): Promise<TestSuite> {
    console.log('🔄 Testing concurrent uploads...');
    
    const testSuite: TestSuite = {
      name: 'Concurrent Upload Tests',
      results: [],
      summary: { total: 0, passed: 0, failed: 0, averageDuration: 0, successRate: 0 }
    };

    // Create multiple upload promises
    const uploadPromises = [];
    for (let i = 0; i < 3; i++) {
      uploadPromises.push(
        this.testFileUpload(
          `Concurrent Upload ${i + 1}`,
          await this.generateTestImage(256 * 1024) // 256KB
        )
      );
    }

    // Wait for all uploads to complete
    const results = await Promise.allSettled(uploadPromises);
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        testSuite.results.push(result.value);
      } else {
        testSuite.results.push({
          testName: `Concurrent Upload ${index + 1}`,
          success: false,
          duration: 0,
          fileSize: 256 * 1024,
          error: result.reason?.message || 'Promise rejected',
          timestamp: Date.now()
        });
      }
    });

    testSuite.summary = this.calculateSummary(testSuite.results);
    return testSuite;
  }

  /**
   * Test retry scenarios
   */
  async testRetryScenarios(): Promise<TestSuite> {
    console.log('🔁 Testing retry scenarios...');
    
    const testSuite: TestSuite = {
      name: 'Retry Scenario Tests',
      results: [],
      summary: { total: 0, passed: 0, failed: 0, averageDuration: 0, successRate: 0 }
    };

    // Test upload after simulated failure
    for (let i = 0; i < 2; i++) {
      const result = await this.testFileUpload(
        `Retry Test ${i + 1}`,
        await this.generateTestImage(1024 * 1024) // 1MB
      );
      testSuite.results.push(result);
      
      // Longer delay to simulate recovery
      await this.delay(2000);
    }

    testSuite.summary = this.calculateSummary(testSuite.results);
    return testSuite;
  }

  /**
   * Test individual file upload
   */
  private async testFileUpload(testName: string, fileUri: string): Promise<TestResult> {
    console.log(`🧪 Running test: ${testName}`);
    
    const startTime = Date.now();
    
    try {
      // Get file size
      const response = await fetch.call(globalThis, fileUri);
      const blob = await response.blob();
      const fileSize = blob.size;
      
      // Attempt upload
      const publicUrl = await ChatService.uploadMedia(fileUri, 'chat-media');
      
      const duration = Date.now() - startTime;
      
      const result: TestResult = {
        testName,
        success: true,
        duration,
        fileSize,
        publicUrl,
        timestamp: Date.now()
      };
      
      console.log(`✅ ${testName} passed in ${duration}ms`);
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      const result: TestResult = {
        testName,
        success: false,
        duration,
        fileSize: 0,
        error: errorMessage,
        timestamp: Date.now()
      };
      
      console.log(`❌ ${testName} failed: ${errorMessage}`);
      return result;
    }
  }

  /**
   * Generate test image with specified size
   */
  private async generateTestImage(targetSize: number, mimeType: string = 'image/jpeg'): Promise<string> {
    // Create a canvas to generate test image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Could not create canvas context');
    }
    
    // Calculate dimensions based on target size
    const pixelCount = Math.sqrt(targetSize / 3); // Rough estimate for RGB
    canvas.width = Math.ceil(pixelCount);
    canvas.height = Math.ceil(pixelCount);
    
    // Fill with random colored pixels
    const imageData = ctx.createImageData(canvas.width, canvas.height);
    for (let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i] = Math.random() * 255;     // Red
      imageData.data[i + 1] = Math.random() * 255; // Green
      imageData.data[i + 2] = Math.random() * 255; // Blue
      imageData.data[i + 3] = 255;                 // Alpha
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    // Convert to blob and create object URL
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          resolve(url);
        } else {
          throw new Error('Failed to create blob from canvas');
        }
      }, mimeType, 0.8);
    });
  }

  /**
   * Calculate test suite summary
   */
  private calculateSummary(results: TestResult[]): TestSuite['summary'] {
    const total = results.length;
    const passed = results.filter(r => r.success).length;
    const failed = total - passed;
    const averageDuration = total > 0 
      ? results.reduce((sum, r) => sum + r.duration, 0) / total 
      : 0;
    const successRate = total > 0 ? (passed / total) * 100 : 0;
    
    return {
      total,
      passed,
      failed,
      averageDuration,
      successRate
    };
  }

  /**
   * Print comprehensive test report
   */
  private printComprehensiveReport(): void {
    console.log('\n📊 COMPREHENSIVE UPLOAD TEST REPORT');
    console.log('=====================================');
    
    this.testResults.forEach(suite => {
      console.log(`\n📋 ${suite.name}`);
      console.log(`   Total Tests: ${suite.summary.total}`);
      console.log(`   Passed: ${suite.summary.passed} (${suite.summary.successRate.toFixed(1)}%)`);
      console.log(`   Failed: ${suite.summary.failed}`);
      console.log(`   Average Duration: ${suite.summary.averageDuration.toFixed(0)}ms`);
      
      // Show failed tests
      const failedTests = suite.results.filter(r => !r.success);
      if (failedTests.length > 0) {
        console.log('   Failed Tests:');
        failedTests.forEach(test => {
          console.log(`     ❌ ${test.testName}: ${test.error}`);
        });
      }
    });
    
    // Overall statistics
    const allResults = this.testResults.flatMap(suite => suite.results);
    const overallSummary = this.calculateSummary(allResults);
    
    console.log('\n🎯 OVERALL SUMMARY');
    console.log('==================');
    console.log(`Total Tests: ${overallSummary.total}`);
    console.log(`Success Rate: ${overallSummary.successRate.toFixed(1)}%`);
    console.log(`Average Duration: ${overallSummary.averageDuration.toFixed(0)}ms`);
    
    // Network statistics
    const networkStats = networkDebugger.getStats();
    console.log('\n🌐 NETWORK STATISTICS');
    console.log('=====================');
    console.log(`Total Requests: ${networkStats.totalRequests}`);
    console.log(`Failed Requests: ${networkStats.failedRequests}`);
    console.log(`Average Response Time: ${networkStats.averageResponseTime.toFixed(0)}ms`);
    console.log(`Data Transferred: ${(networkStats.totalDataTransferred / 1024 / 1024).toFixed(2)}MB`);
  }

  /**
   * Export test results
   */
  exportResults(): string {
    const exportData = {
      testResults: this.testResults,
      networkData: networkDebugger.exportData(),
      timestamp: new Date().toISOString()
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear all test results
   */
  clear(): void {
    this.testResults = [];
    networkDebugger.clear();
    console.log('🧪 Upload Tester: Data cleared');
  }
}

// Export singleton instance
export const uploadTester = UploadTester.getInstance();

// Convenience functions
export const runUploadTests = () => uploadTester.runComprehensiveTests();
export const exportTestResults = () => uploadTester.exportResults();
export const clearTestData = () => uploadTester.clear();

// Make available globally in development
if (__DEV__) {
  // @ts-ignore
  global.uploadTester = uploadTester;
  // @ts-ignore
  global.runUploadTests = runUploadTests;
  
  console.log('🧪 Upload Tester: Available in development mode');
  console.log('🧪 Use runUploadTests() to start comprehensive testing');
}