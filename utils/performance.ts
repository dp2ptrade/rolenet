/**
 * Performance optimization utilities for RoleNet
 * Phase 2: Performance Improvements
 */

import { useCallback, useRef, useMemo } from 'react';

/**
 * Debounce function to limit the rate of function execution
 * @param func - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

/**
 * Throttle function to limit function execution to once per interval
 * @param func - Function to throttle
 * @param limit - Time limit in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastExecTime = 0;
  
  return (...args: Parameters<T>) => {
    const currentTime = Date.now();
    
    if (currentTime - lastExecTime > delay) {
      func(...args);
      lastExecTime = currentTime;
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        func(...args);
        lastExecTime = Date.now();
        timeoutId = null;
      }, delay - (currentTime - lastExecTime));
    }
  };
}

/**
 * Custom hook for debounced values
 * @param value - Value to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced value
 */
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Custom hook for debounced callbacks
 * @param callback - Callback function to debounce
 * @param delay - Delay in milliseconds
 * @param deps - Dependencies array
 * @returns Debounced callback
 */
export const useDebouncedCallback = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => callback(...args), delay);
  }, [callback, delay]);
};

/**
 * Custom hook for throttled callbacks
 * @param callback - Callback function to throttle
 * @param limit - Time limit in milliseconds
 * @param deps - Dependencies array
 * @returns Throttled callback
 */
export const useThrottledCallback = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastExecRef = useRef<number>(0);
  
  return useCallback((...args: Parameters<T>) => {
    const currentTime = Date.now();
    
    if (currentTime - lastExecRef.current > delay) {
      callback(...args);
      lastExecRef.current = currentTime;
    } else if (!timeoutRef.current) {
      timeoutRef.current = setTimeout(() => {
        callback(...args);
        lastExecRef.current = Date.now();
        timeoutRef.current = null;
      }, delay - (currentTime - lastExecRef.current));
    }
  }, [callback, delay]);
};

/**
 * Performance measurement utility
 * @param name - Name of the operation being measured
 * @param operation - Function to measure
 * @returns Result of the operation
 */
export const measurePerformance = async <T>(
  name: string,
  operation: () => Promise<T> | T
): Promise<T> => {
  const start = performance.now();
  
  try {
    const result = await operation();
    const duration = performance.now() - start;
    
    if (__DEV__) {
      console.log(`Performance: ${name} took ${duration.toFixed(2)}ms`);
    }
    
    // In production, you might want to log to analytics
    // analytics().logEvent('performance_metric', {
    //   operation: name,
    //   duration: Math.round(duration)
    // });
    
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    if (__DEV__) {
      console.error(`Performance: ${name} failed after ${duration.toFixed(2)}ms`, error);
    }
    throw error;
  }
};

/**
 * Memoization utility for expensive computations
 * @param fn - Function to memoize
 * @param keySelector - Function to generate cache key
 * @returns Memoized function
 */
export const memoize = <TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  keySelector?: (...args: TArgs) => string
): ((...args: TArgs) => TReturn) => {
  const cache = new Map<string, TReturn>();
  
  return (...args: TArgs): TReturn => {
    const key = keySelector ? keySelector(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
};

/**
 * Custom hook for memoized expensive computations
 * @param factory - Factory function for the computation
 * @param deps - Dependencies array
 * @returns Memoized result
 */
export const useExpensiveMemo = <T>(
  factory: () => T,
  deps: React.DependencyList
): T => {
  return useMemo(() => {
    if (__DEV__) {
      const start = performance.now();
      const result = factory();
      const duration = performance.now() - start;
      if (duration > 16) { // More than one frame at 60fps
        console.warn(`Expensive computation took ${duration.toFixed(2)}ms`);
      }
      return result;
    }
    return factory();
  }, deps);
};

/**
 * React import for useDebounce hook
 */
import React from 'react';