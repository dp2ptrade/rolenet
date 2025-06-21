# APK Signature Mismatch Troubleshooting Guide

This guide addresses the common error: "INSTALL_FAILED_UPDATE_INCOMPATIBLE: Package signatures do not match the previously installed version" when installing Android APKs during development.

## Understanding the Error

This error occurs when you try to install a new version of your app that has been signed with a different key than the version already installed on your device. Android's security model requires that updates to an app must be signed with the same key as the original installation.

## Common Scenarios

1. **Development vs. Production Builds**: Debug builds are signed with the debug key, while release builds are signed with your release key.

2. **Different Development Machines**: Each development machine has its own debug keystore, so builds from different machines will have different signatures.

3. **CI/CD Builds**: Builds from CI/CD systems may use different signing keys than your local development environment.

4. **EAS Build vs. Local Build**: An app built with EAS Build might use different signing keys than one built locally.

## Solutions

### Solution 1: Uninstall the Existing App

The simplest solution is to uninstall the existing app from your device before installing the new version.

```bash
adb uninstall com.zxoom.rolenetapp
```

**Pros**: Quick and simple.
**Cons**: Loses all app data and settings.

### Solution 2: Use Product Flavors with Different Package Names

By using product flavors with different package names (as described in the Android Build Configuration Guide), you can install multiple versions of your app on the same device.

**Pros**: Allows multiple versions to coexist, preserves data for each version.
**Cons**: Requires configuration changes to your build system.

### Solution 3: Use the Same Signing Key

Ensure that all builds use the same signing key. For development, you can copy the debug.keystore file between development machines.

The debug keystore is typically located at:
- macOS/Linux: `~/.android/debug.keystore`
- Windows: `C:\Users\[username]\.android\debug.keystore`

**Pros**: Maintains consistent signing across environments.
**Cons**: Requires key management and distribution.

### Solution 4: Use App Bundle Instead of APK

When using Google Play, you can upload an Android App Bundle (AAB) instead of an APK. Google Play will handle the signing process using Play App Signing.

**Pros**: Consistent signing managed by Google Play.
**Cons**: Only applicable for Play Store distribution, not for direct APK installation.

### Solution 5: Clear App Data Instead of Uninstalling

If you want to preserve the app installation but clear its data:

```bash
adb shell pm clear com.zxoom.rolenetapp
```

Or through the device settings:

Settings > Apps > [Your App] > Storage > Clear Data

**Pros**: Keeps the app installed with the same signature.
**Cons**: Still loses all app data.

## Implementing Product Flavors (Recommended Solution)

The most robust solution for development is to use product flavors with different package names. This allows you to have multiple versions of your app installed simultaneously.

### Step 1: Configure Product Flavors in build.gradle

See the [SAMPLE_BUILD_GRADLE.md](./SAMPLE_BUILD_GRADLE.md) file for a complete example.

### Step 2: Configure EAS Build Profiles

See the [SAMPLE_EAS_JSON.md](./SAMPLE_EAS_JSON.md) file for a complete example.

### Step 3: Build and Install

Build the app with the specific flavor:

```bash
# For local development builds
cd android && ./gradlew assembleDevelopmentDebug

# For EAS builds
eas build --profile development --platform android
```

Install the APK:

```bash
adb install android/app/build/outputs/apk/development/debug/app-development-debug.apk
```

## Debugging Signature Issues

To check the signature of an installed app:

```bash
adb shell dumpsys package com.zxoom.rolenetapp | grep -A 20 signatures
```

To check the signature of an APK file:

```bash
keytool -printcert -jarfile path/to/your/app.apk
```

## Best Practices for Development Workflow

1. **Use Product Flavors**: Set up development, staging, and production flavors with different package names.

2. **Consistent Signing Strategy**: Establish a clear signing strategy for different build types and environments.

3. **Document Keystore Information**: Keep secure records of all keystores and passwords.

4. **Use Environment Variables**: Store signing information in environment variables rather than hardcoding them.

5. **Automate Builds**: Use scripts or CI/CD to ensure consistent build configurations.

## Conclusion

The APK signature mismatch error is a common challenge in Android development, but with proper build configuration and workflow practices, it can be effectively managed. The product flavors approach provides the most flexible solution for development, allowing multiple versions of your app to coexist on the same device.

For a complete implementation guide, refer to the [Android Build Configuration Guide](./ANDROID_BUILD_GUIDE.md).