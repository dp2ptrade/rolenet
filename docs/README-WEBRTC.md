# WebRTC Setup for RoleNet

## Overview

This document explains how we've configured WebRTC for the RoleNet app using a custom Expo config plugin.

## The Problem

When using `react-native-webrtc` with Expo, you might encounter this error:

```
PluginError: Package "react-native-webrtc" does not contain a valid config plugin.
Learn more: https://docs.expo.dev/guides/config-plugins/#creating-a-plugin

Unexpected token 'typeof'
SyntaxError: Unexpected token 'typeof'
```

This happens because `react-native-webrtc` doesn't include a proper Expo config plugin to handle the necessary native modifications.

## Our Solution

We've created a custom config plugin that handles all the necessary modifications for WebRTC to work properly in both iOS and Android.

### Plugin Structure

- `plugins/react-native-webrtc/index.js` - Main plugin entry point
- `plugins/react-native-webrtc/withWebRTCAndroid.js` - Android-specific modifications
- `plugins/react-native-webrtc/withWebRTCIOS.js` - iOS-specific modifications

### What the Plugin Does

#### For Android
- Adds necessary permissions to AndroidManifest.xml:
  - Camera
  - Record Audio
  - Network access
  - Bluetooth
- Adds hardware feature requirements (camera, microphone, etc.)

#### For iOS
- Adds usage descriptions for camera and microphone
- Adds Bluetooth usage descriptions
- Configures background modes for audio and VoIP

## How to Use

1. The plugin is already configured in `app.json`:

```json
"plugins": [
  "expo-router",
  "expo-font",
  "expo-location",
  "expo-notifications",
  "expo-video",
  "expo-audio",
  "./plugins/react-native-webrtc"
],
```

2. To run the app with full WebRTC support:

```bash
# For iOS
npm run ios

# For Android
npm run android
```

## Development vs Production

- **Expo Go**: WebRTC will use mock implementations (no real audio/video calls)
- **Development Build**: Full WebRTC functionality with real audio/video calls

## Troubleshooting

If you encounter issues with WebRTC:

1. Make sure you're using a development build, not Expo Go
2. Check that all permissions are granted at runtime
3. Verify network connectivity for STUN/TURN servers
4. Look for specific WebRTC-related errors in the console

## References

- [Expo Config Plugins Documentation](https://docs.expo.dev/guides/config-plugins/)
- [react-native-webrtc Documentation](https://github.com/react-native-webrtc/react-native-webrtc)
- [WebRTC Official Documentation](https://webrtc.org/getting-started/overview)