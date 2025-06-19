/**
 * Asset constants for RoleNet app
 * Centralized asset management for better maintainability
 */

export const ASSETS = {
  IMAGES: {
    LOGO: require('../assets/images/rolenet-logo.png'),
    ANIMATED_LOGO: require('../assets/images/rolenet-logo.png'), // Same as logo for consistency
    FAVICON: require('../assets/images/rolenet-logo.png'), // Using PNG logo as favicon
    PING_ICON: require('../assets/images/ping-icon.svg'),
    POWERED_BY_BOLT: require('../assets/images/powered-by-bolt.svg'),
    ADAPTIVE_ICON: require('../assets/images/adaptive-icon.png'),
    ICON: require('../assets/images/icon.png'),
    BLACK_CIRCLE: require('../assets/images/black_circle_360x360.png'),
  },
} as const;

// Type definitions for better TypeScript support
export type AssetKeys = keyof typeof ASSETS.IMAGES;

// Helper function to get asset path
export const getAsset = (key: AssetKeys) => ASSETS.IMAGES[key];