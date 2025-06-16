const { withInfoPlist } = require('@expo/config-plugins');

// Function to ensure proper iOS configuration for WebRTC
const withWebRTCIOS = (config) => {
  return withInfoPlist(config, (config) => {
    const infoPlist = config.modResults;
    
    // Add camera usage description if not exists
    if (!infoPlist.NSCameraUsageDescription) {
      infoPlist.NSCameraUsageDescription = 'Allow $(PRODUCT_NAME) to access your camera for video calls';
    }
    
    // Add microphone usage description if not exists
    if (!infoPlist.NSMicrophoneUsageDescription) {
      infoPlist.NSMicrophoneUsageDescription = 'Allow $(PRODUCT_NAME) to access your microphone for calls';
    }
    
    // Add Bluetooth usage description if not exists
    if (!infoPlist.NSBluetoothPeripheralUsageDescription) {
      infoPlist.NSBluetoothPeripheralUsageDescription = 'Allow $(PRODUCT_NAME) to access your bluetooth for calls';
    }
    
    // Add Bluetooth Always Usage description (for iOS 13+)
    if (!infoPlist.NSBluetoothAlwaysUsageDescription) {
      infoPlist.NSBluetoothAlwaysUsageDescription = 'Allow $(PRODUCT_NAME) to access your bluetooth for calls';
    }
    
    // Configure background modes for audio and VoIP
    if (!infoPlist.UIBackgroundModes) {
      infoPlist.UIBackgroundModes = [];
    }
    
    // Add audio background mode if not exists
    if (!infoPlist.UIBackgroundModes.includes('audio')) {
      infoPlist.UIBackgroundModes.push('audio');
    }
    
    // Add voip background mode if not exists
    if (!infoPlist.UIBackgroundModes.includes('voip')) {
      infoPlist.UIBackgroundModes.push('voip');
    }
    
    return config;
  });
};

module.exports = withWebRTCIOS;