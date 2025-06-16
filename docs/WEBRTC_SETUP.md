# WebRTC Setup Guide for RoleNet

## Overview

RoleNet uses WebRTC for peer-to-peer audio calling functionality. Due to Expo Go limitations, WebRTC requires a development build to function properly.

## Current Status

- ✅ WebRTC compatibility layer implemented
- ✅ Mock implementations for Expo Go testing
- ✅ react-native-webrtc dependency installed
- ✅ Plugin configured in app.json

## Development Modes

### 1. Expo Go (Current)
- **Status**: Mock implementations only
- **Functionality**: UI testing, navigation, non-WebRTC features
- **Limitations**: No real audio calls, mock streams only
- **Use Case**: Development and testing of non-calling features

### 2. Development Build (Required for WebRTC)
- **Status**: Full WebRTC functionality
- **Functionality**: Real peer-to-peer audio calls
- **Requirements**: Physical device or simulator with development build

## Creating a Development Build

### Prerequisites
```bash
# Install EAS CLI
npm install -g @expo/eas-cli

# Login to Expo
eas login
```

### For iOS
```bash
# Create development build for iOS
eas build --profile development --platform ios

# Or run locally (requires Xcode)
npx expo run:ios
```

### For Android
```bash
# Create development build for Android
eas build --profile development --platform android

# Or run locally (requires Android Studio)
npx expo run:android
```

## Testing WebRTC Functionality

### In Expo Go
- All WebRTC calls will use mock implementations
- Console will show informative messages about fallback usage
- UI and navigation can be tested normally

### In Development Build
- Real WebRTC peer connections will be established
- Microphone access will be requested
- Actual audio streaming between devices

## Troubleshooting

### Common Issues

1. **"WebRTC native module not available" warning**
   - Expected in Expo Go
   - Solution: Create development build

2. **Microphone permissions**
   - Required for real audio calls
   - Automatically handled in development builds

3. **Network connectivity**
   - WebRTC requires STUN/TURN servers
   - Currently using Google's public STUN servers
   - For production, consider dedicated TURN servers

### Debug Information

The app provides helpful console messages:
- ✅ WebRTC native module loaded successfully
- ⚠️ WebRTC native module not available (expected in Expo Go)
- 📱 MockRTCPeerConnection: Using fallback implementation
- 🎤 MockMediaDevices: Using mock audio stream

## Production Considerations

1. **TURN Servers**: Add dedicated TURN servers for NAT traversal
2. **Permissions**: Ensure microphone permissions are properly configured
3. **Error Handling**: Implement robust error handling for connection failures
4. **Fallback**: Consider fallback options for unsupported devices

## Next Steps

1. Test current implementation in Expo Go
2. Create development build when ready to test real calling
3. Configure production TURN servers
4. Implement comprehensive error handling
5. Add call quality monitoring

---

**Note**: The current WebRTC implementation includes comprehensive fallbacks and will work seamlessly in both Expo Go (with mocks) and development builds (with real WebRTC).