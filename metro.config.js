const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure proper handling of ES modules and import.meta
config.transformer.unstable_allowRequireContext = true;
config.resolver.unstable_enableSymlinks = true;

module.exports = config;