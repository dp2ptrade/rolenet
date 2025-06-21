/**
 * Network Debugging Utility
 * 
 * This utility provides comprehensive network request monitoring and debugging
 * capabilities to help identify connection issues, especially for media uploads.
 */

interface NetworkRequest {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  bodySize: number;
  timestamp: number;
}

interface NetworkResponse {
  id: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  responseSize: number;
  duration: number;
  success: boolean;
  error?: string;
}

class NetworkDebugger {
  private static instance: NetworkDebugger;
  private requests: Map<string, NetworkRequest> = new Map();
  private responses: Map<string, NetworkResponse> = new Map();
  private isEnabled: boolean = false;
  private originalFetch: typeof fetch;

  private constructor() {
    this.originalFetch = global.fetch.bind(globalThis);
  }

  static getInstance(): NetworkDebugger {
    if (!NetworkDebugger.instance) {
      NetworkDebugger.instance = new NetworkDebugger();
    }
    return NetworkDebugger.instance;
  }

  /**
   * Enable network debugging
   * This will intercept all fetch requests and log detailed information
   */
  enable(): void {
    if (this.isEnabled) return;
    
    console.log('🌐 Network Debugger: Enabled');
    this.isEnabled = true;

    global.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const requestId = this.generateRequestId();
      const url = typeof input === 'string' ? input : input.toString();
      const method = init?.method || 'GET';
      const headers = this.extractHeaders(init?.headers);
      const bodySize = this.calculateBodySize(init?.body);
      const timestamp = Date.now();

      // Log request
      const request: NetworkRequest = {
        id: requestId,
        url,
        method,
        headers,
        bodySize,
        timestamp
      };
      
      this.requests.set(requestId, request);
      this.logRequest(request);

      try {
        const startTime = Date.now();
        const response = await this.originalFetch(input, init);
        const endTime = Date.now();
        const duration = endTime - startTime;

        // Log response
        const networkResponse: NetworkResponse = {
          id: requestId,
          status: response.status,
          statusText: response.statusText,
          headers: this.extractResponseHeaders(response.headers),
          responseSize: this.estimateResponseSize(response),
          duration,
          success: response.ok
        };

        this.responses.set(requestId, networkResponse);
        this.logResponse(networkResponse);

        return response;
      } catch (error) {
        const endTime = Date.now();
        const duration = endTime - timestamp;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Log error response
        const networkResponse: NetworkResponse = {
          id: requestId,
          status: 0,
          statusText: 'Network Error',
          headers: {},
          responseSize: 0,
          duration,
          success: false,
          error: errorMessage
        };

        this.responses.set(requestId, networkResponse);
        this.logError(networkResponse);

        throw error;
      }
    };
  }

  /**
   * Disable network debugging and restore original fetch
   */
  disable(): void {
    if (!this.isEnabled) return;
    
    console.log('🌐 Network Debugger: Disabled');
    this.isEnabled = false;
    global.fetch = this.originalFetch;
  }

  /**
   * Get network statistics
   */
  getStats(): {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    totalDataTransferred: number;
  } {
    const responses = Array.from(this.responses.values());
    const totalRequests = responses.length;
    const successfulRequests = responses.filter(r => r.success).length;
    const failedRequests = totalRequests - successfulRequests;
    const averageResponseTime = responses.length > 0 
      ? responses.reduce((sum, r) => sum + r.duration, 0) / responses.length 
      : 0;
    const totalDataTransferred = responses.reduce((sum, r) => sum + r.responseSize, 0);

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      totalDataTransferred
    };
  }

  /**
   * Get failed requests for analysis
   */
  getFailedRequests(): NetworkResponse[] {
    return Array.from(this.responses.values()).filter(r => !r.success);
  }

  /**
   * Get requests by URL pattern
   */
  getRequestsByPattern(pattern: string): { request: NetworkRequest; response?: NetworkResponse }[] {
    const results: { request: NetworkRequest; response?: NetworkResponse }[] = [];
    
    for (const request of this.requests.values()) {
      if (request.url.includes(pattern)) {
        const response = this.responses.get(request.id);
        results.push({ request, response });
      }
    }
    
    return results;
  }

  /**
   * Clear all stored request/response data
   */
  clear(): void {
    this.requests.clear();
    this.responses.clear();
    console.log('🌐 Network Debugger: Data cleared');
  }

  /**
   * Export debug data for analysis
   */
  exportData(): string {
    const data = {
      requests: Array.from(this.requests.values()),
      responses: Array.from(this.responses.values()),
      stats: this.getStats(),
      timestamp: new Date().toISOString()
    };
    
    return JSON.stringify(data, null, 2);
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private extractHeaders(headers?: HeadersInit): Record<string, string> {
    const result: Record<string, string> = {};
    
    if (!headers) return result;
    
    if (headers instanceof Headers) {
      headers.forEach((value: string, key: string) => {
        result[key] = value;
      });
    } else if (Array.isArray(headers)) {
      headers.forEach(([key, value]) => {
        result[key] = value;
      });
    } else {
      Object.assign(result, headers);
    }
    
    return result;
  }

  private extractResponseHeaders(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((value: string, key: string) => {
      result[key] = value;
    });
    return result;
  }

  private calculateBodySize(body?: BodyInit | null): number {
    if (!body) return 0;
    
    if (typeof body === 'string') {
      return new Blob([body]).size;
    }
    
    if (body instanceof Blob) {
      return body.size;
    }
    
    if (body instanceof ArrayBuffer) {
      return body.byteLength;
    }
    
    if (body instanceof FormData) {
      // Estimate FormData size (approximate)
      return 1024; // Default estimate
    }
    
    return 0;
  }

  private estimateResponseSize(response: Response): number {
    const contentLength = response.headers.get('content-length');
    return contentLength ? parseInt(contentLength, 10) : 0;
  }

  private logRequest(request: NetworkRequest): void {
    const isSupabaseRequest = request.url.includes('supabase');
    const isStorageRequest = request.url.includes('/storage/');
    
    console.log(`🌐 ${isSupabaseRequest ? '☁️' : '🔗'} ${request.method} ${request.url}`, {
      id: request.id,
      headers: this.sanitizeHeaders(request.headers),
      bodySize: request.bodySize > 0 ? `${(request.bodySize / 1024).toFixed(2)}KB` : '0B',
      isStorage: isStorageRequest,
      timestamp: new Date(request.timestamp).toISOString()
    });
  }

  private logResponse(response: NetworkResponse): void {
    const statusEmoji = response.success ? '✅' : '❌';
    const sizeText = response.responseSize > 0 ? `${(response.responseSize / 1024).toFixed(2)}KB` : 'Unknown';
    
    console.log(`🌐 ${statusEmoji} ${response.status} ${response.statusText}`, {
      id: response.id,
      duration: `${response.duration}ms`,
      size: sizeText,
      headers: this.sanitizeHeaders(response.headers)
    });
  }

  private logError(response: NetworkResponse): void {
    console.error(`🌐 💥 Network Error`, {
      id: response.id,
      error: response.error,
      duration: `${response.duration}ms`,
      status: response.status
    });
  }

  private sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sanitized = { ...headers };
    
    // Remove sensitive headers from logs
    const sensitiveHeaders = ['authorization', 'apikey', 'x-api-key', 'cookie'];
    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
      if (sanitized[header.toLowerCase()]) {
        sanitized[header.toLowerCase()] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }
}

// Export singleton instance
export const networkDebugger = NetworkDebugger.getInstance();

// Convenience functions
export const enableNetworkDebugging = () => networkDebugger.enable();
export const disableNetworkDebugging = () => networkDebugger.disable();
export const getNetworkStats = () => networkDebugger.getStats();
export const getFailedRequests = () => networkDebugger.getFailedRequests();
export const clearNetworkData = () => networkDebugger.clear();
export const exportNetworkData = () => networkDebugger.exportData();

// Auto-enable in development mode
if (__DEV__) {
  console.log('🌐 Network Debugger: Available in development mode');
  console.log('🌐 Use enableNetworkDebugging() to start monitoring');
}