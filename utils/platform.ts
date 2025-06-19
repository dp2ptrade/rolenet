/**
 * Platform-specific utilities for RoleNet app
 * Handles cross-platform compatibility and optimizations
 */

import { Platform } from 'react-native';

/**
 * Check if the current platform is iOS
 */
export const isIOS = Platform.OS === 'ios';

/**
 * Check if the current platform is Android
 */
export const isAndroid = Platform.OS === 'android';

/**
 * Check if the current platform is Web
 */
export const isWeb = Platform.OS === 'web';

/**
 * Get platform-specific animation configuration
 * Disables native driver for web to avoid warnings
 */
export const getAnimationConfig = (config: {
  toValue: number;
  duration?: number;
  tension?: number;
  friction?: number;
}) => ({
  ...config,
  useNativeDriver: !isWeb,
});

/**
 * Get platform-specific styles
 */
export const getPlatformStyles = (styles: {
  ios?: any;
  android?: any;
  web?: any;
  default?: any;
}) => {
  if (isIOS && styles.ios) return styles.ios;
  if (isAndroid && styles.android) return styles.android;
  if (isWeb && styles.web) return styles.web;
  return styles.default || {};
};

/**
 * Get platform-specific elevation/shadow styles
 */
export const getElevationStyle = (elevation: number) => {
  if (isIOS) {
    return {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: elevation / 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: elevation,
    };
  }
  
  if (isAndroid) {
    return {
      elevation,
    };
  }
  
  // Web fallback
  return {
    boxShadow: `0px ${elevation}px ${elevation * 2}px rgba(0, 0, 0, 0.1)`,
  };
};

/**
 * Check if native driver is supported for animations
 */
export const supportsNativeDriver = !isWeb;

/**
 * Get platform-specific haptic feedback
 * Note: Import expo-haptics in the component that uses this function
 */
export const triggerHapticFeedback = async (type: 'light' | 'medium' | 'heavy' = 'light') => {
  if (isWeb) return; // No haptic feedback on web
  
  try {
    // This function should be called with the Haptics module passed as parameter
    // Example usage: triggerHapticFeedback('light', Haptics)
    console.log(`Haptic feedback requested: ${type}`);
    // Implementation should be done in the component using expo-haptics directly
  } catch (error) {
    console.warn('Haptic feedback not available:', error);
  }
};