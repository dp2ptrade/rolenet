/**
 * Lazy loading components for performance optimization
 * Phase 2: Performance Improvements
 */

import React, { Suspense, lazy } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { LoadingSpinner } from './LoadingSpinner';

// Lazy load heavy components
export const LazyGroupChat = lazy(() => import('@/app/groupChat'));
export const LazyChat = lazy(() => import('@/app/chat'));
export const LazyCall = lazy(() => import('@/app/call'));
export const LazyDiscover = lazy(() => import('@/app/(tabs)/discover'));
export const LazyProfile = lazy(() => import('@/app/edit-profile'));

// Loading fallback component
const ComponentLoadingFallback: React.FC<{ componentName?: string }> = ({ 
  componentName = 'Component' 
}) => (
  <View style={{
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa'
  }}>
    <LoadingSpinner size="large" />
    <Text style={{
      marginTop: 16,
      fontSize: 16,
      color: '#666',
      textAlign: 'center'
    }}>
      Loading {componentName}...
    </Text>
  </View>
);

// Error boundary for lazy components
class LazyComponentErrorBoundary extends React.Component<
  { children: React.ReactNode; componentName?: string },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Lazy component error in ${this.props.componentName}:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20
        }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
            Failed to load {this.props.componentName || 'component'}
          </Text>
          <Text style={{ textAlign: 'center', color: '#666' }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for lazy loading with error boundary
export const withLazyLoading = <P extends object>(
  LazyComponent: React.LazyExoticComponent<React.ComponentType<P>>,
  componentName: string,
  fallback?: React.ReactNode
) => {
  return React.forwardRef<any, P>((props, ref) => (
    <LazyComponentErrorBoundary componentName={componentName}>
      <Suspense 
        fallback={fallback || <ComponentLoadingFallback componentName={componentName} />}
      >
        <LazyComponent {...props} ref={ref} />
      </Suspense>
    </LazyComponentErrorBoundary>
  ));
};

// Pre-configured lazy components with error boundaries
export const LazyGroupChatWithBoundary = withLazyLoading(LazyGroupChat, 'Group Chat');
export const LazyChatWithBoundary = withLazyLoading(LazyChat, 'Chat');
export const LazyCallWithBoundary = withLazyLoading(LazyCall, 'Call');
export const LazyDiscoverWithBoundary = withLazyLoading(LazyDiscover, 'Discover');
export const LazyProfileWithBoundary = withLazyLoading(LazyProfile, 'Profile');

// Preload utility for critical components
export const preloadComponent = (component: React.LazyExoticComponent<any>) => {
  // Preload the component in the background
  try {
    // Access the _payload to trigger the import
    (component as any)._payload;
  } catch (error: any) {
    console.warn('Failed to preload component:', error);
  }
};

// Preload critical components on app start
export const preloadCriticalComponents = () => {
  // Preload components that are likely to be used soon
  setTimeout(() => {
    preloadComponent(LazyChat);
    preloadComponent(LazyGroupChat);
  }, 2000); // Preload after 2 seconds to not interfere with initial load
};

// Custom hook for conditional lazy loading
export const useConditionalLazyLoad = (shouldLoad: boolean, component: React.LazyExoticComponent<any>) => {
  React.useEffect(() => {
    if (shouldLoad) {
      preloadComponent(component);
    }
  }, [shouldLoad, component]);
};

// Intersection observer based lazy loading for list items
export const useLazyListItem = (threshold: number = 0.1) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const [hasBeenVisible, setHasBeenVisible] = React.useState(false);
  const elementRef = React.useRef<View>(null);

  React.useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // For React Native, we'll use a simple approach
    // In a real implementation, you might use react-native-intersection-observer
    // or implement your own visibility detection
    
    // Simulate intersection observer behavior
    const timer = setTimeout(() => {
      setIsVisible(true);
      setHasBeenVisible(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return {
    elementRef,
    isVisible,
    hasBeenVisible
  };
};

// Lazy image component for better performance
export const LazyImage: React.FC<{
  source: { uri: string };
  style?: any;
  placeholder?: React.ReactNode;
}> = ({ source, style, placeholder }) => {
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState(false);
  const { elementRef, isVisible } = useLazyListItem();

  if (!isVisible) {
    return (
      <View ref={elementRef} style={[style, { backgroundColor: '#f0f0f0' }]}>
        {placeholder || (
          <View style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <ActivityIndicator size="small" color="#999" />
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={style}>
      {!loaded && !error && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#f0f0f0'
        }}>
          <ActivityIndicator size="small" color="#999" />
        </View>
      )}
      
      {error ? (
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#f0f0f0'
        }}>
          <Text style={{ color: '#999', fontSize: 12 }}>Failed to load</Text>
        </View>
      ) : (
        <Image
          source={source}
          style={[style, { opacity: loaded ? 1 : 0 }]}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
        />
      )}
    </View>
  );
};

// Import Image component
import { Image } from 'react-native';