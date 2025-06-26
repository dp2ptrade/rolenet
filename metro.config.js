const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure proper handling of ES modules and import.meta
config.transformer.unstable_allowRequireContext = true;
config.resolver.unstable_enableSymlinks = true;

// Add TypeScript support
config.resolver.sourceExts.push('ts', 'tsx');

// Add platform extensions for better native module resolution
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// WebRTC specific configurations for Expo Go compatibility
config.resolver.alias = {
  ...config.resolver.alias,
  'react-native-webrtc': 'react-native-webrtc/lib/index.js',
  'event-target-shim': 'event-target-shim/dist/event-target-shim.js',
  // Fix React DOM compatibility for React 19
  'react-dom': 'react-native-web/dist/exports/ReactDOM',
  'react-dom/client': 'react-native-web/dist/exports/ReactDOM',
};

// Ensure proper asset resolution
config.resolver.assetExts.push('db', 'mp3', 'ttf', 'obj', 'png', 'jpg');

// Add resolver configuration for better web compatibility
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

module.exports = config;