const { withAndroidManifest } = require('@expo/config-plugins');

// Function to ensure permissions are added to Android manifest
const withWebRTCAndroid = (config) => {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const mainApplication = androidManifest.manifest.application[0];

    // Ensure we have the uses-permission array
    if (!androidManifest.manifest['uses-permission']) {
      androidManifest.manifest['uses-permission'] = [];
    }
    
    // Ensure we have the uses-feature array
    if (!androidManifest.manifest['uses-feature']) {
      androidManifest.manifest['uses-feature'] = [];
    }

    // Define required permissions for WebRTC
    const requiredPermissions = [
      'android.permission.CAMERA',
      'android.permission.RECORD_AUDIO',
      'android.permission.ACCESS_NETWORK_STATE',
      'android.permission.CHANGE_NETWORK_STATE',
      'android.permission.MODIFY_AUDIO_SETTINGS',
      'android.permission.BLUETOOTH',
      'android.permission.BLUETOOTH_ADMIN',
      'android.permission.BLUETOOTH_CONNECT',
      'android.permission.BLUETOOTH_SCAN'
    ];

    // Define required features for WebRTC
    const requiredFeatures = [
      { name: 'android.hardware.camera' },
      { name: 'android.hardware.camera.autofocus' },
      { name: 'android.hardware.microphone' },
      { name: 'android.hardware.bluetooth', required: 'false' },
      { name: 'android.hardware.bluetooth_le', required: 'false' }
    ];

    // Add permissions if they don't exist
    for (const permission of requiredPermissions) {
      const permissionExists = androidManifest.manifest['uses-permission'].some(
        (existingPermission) => existingPermission.$?.['android:name'] === permission
      );

      if (!permissionExists) {
        androidManifest.manifest['uses-permission'].push({
          $: { 'android:name': permission },
        });
      }
    }

    // Add features if they don't exist
    for (const feature of requiredFeatures) {
      const featureExists = androidManifest.manifest['uses-feature'].some(
        (existingFeature) => existingFeature.$?.['android:name'] === feature.name
      );

      if (!featureExists) {
        const featureEntry = { $: { 'android:name': feature.name } };
        
        // Add required attribute if specified
        if (feature.required) {
          featureEntry.$['android:required'] = feature.required;
        }
        
        androidManifest.manifest['uses-feature'].push(featureEntry);
      }
    }

    return config;
  });
};

module.exports = withWebRTCAndroid;