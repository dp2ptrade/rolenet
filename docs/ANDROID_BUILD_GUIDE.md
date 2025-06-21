# Android Build Configuration Guide for RoleNet

This guide provides detailed instructions for setting up different package names, signing configurations, and EAS Build profiles for the RoleNet app. These configurations help solve common development issues like APK installation signature mismatches.

## Table of Contents

1. [Product Flavors Configuration](#1-product-flavors-configuration)
2. [Signing Configurations](#2-signing-configurations)
3. [EAS Build Profiles](#3-eas-build-profiles)
4. [Environment Variables Setup](#4-environment-variables-setup)
5. [Building with Different Profiles](#5-building-with-different-profiles)
6. [Troubleshooting](#6-troubleshooting)

## 1. Product Flavors Configuration

Product flavors allow you to create different versions of your app (e.g., development, staging, production) with different package names, enabling installation of multiple versions on the same device.

### Implementation Steps

1. Open `android/app/build.gradle`
2. Add the following configuration inside the `android` block:

```gradle
android {
    // ... existing code ...
    
    defaultConfig {
        applicationId 'com.zxoom.rolenetapp'
        // ... other config ...
    }
    
    flavorDimensions "environment"
    productFlavors {
        development {
            dimension "environment"
            applicationIdSuffix ".dev"
            versionNameSuffix "-dev"
        }
        staging {
            dimension "environment"
            applicationIdSuffix ".staging"
            versionNameSuffix "-staging"
        }
        production {
            dimension "environment"
            // Uses the default applicationId without suffix
        }
    }
    
    // ... rest of your config ...
}
```

This configuration creates three flavors:
- Development: `com.zxoom.rolenetapp.dev`
- Staging: `com.zxoom.rolenetapp.staging`
- Production: `com.zxoom.rolenetapp` (original package name)

## 2. Signing Configurations

Proper signing configuration ensures that your app is signed consistently across different build types and environments.

### Implementation Steps

1. Add environment variable references at the top of your `android/app/build.gradle` file:

```gradle
def RELEASE_STORE_FILE = System.getenv("RELEASE_STORE_FILE") ?: "release-key.keystore"
def RELEASE_STORE_PASSWORD = System.getenv("RELEASE_STORE_PASSWORD") ?: ""
def RELEASE_KEY_ALIAS = System.getenv("RELEASE_KEY_ALIAS") ?: ""
def RELEASE_KEY_PASSWORD = System.getenv("RELEASE_KEY_PASSWORD") ?: ""
```

2. Update the `signingConfigs` and `buildTypes` sections in your `android/app/build.gradle`:

```gradle
android {
    // ... existing code ...
    
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            storeFile file(RELEASE_STORE_FILE)
            storePassword RELEASE_STORE_PASSWORD
            keyAlias RELEASE_KEY_ALIAS
            keyPassword RELEASE_KEY_PASSWORD
        }
    }
    
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            signingConfig signingConfigs.release
            // ... other release settings ...
        }
    }
    
    // ... rest of your config ...
}
```

### Creating a Release Keystore

To create a release keystore for signing your app:

```bash
keytool -genkey -v -keystore release-key.keystore -alias your-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

Store this keystore file securely and remember the password and alias you used.

## 3. EAS Build Profiles

EAS Build profiles allow you to define different build configurations for various environments.

### Implementation Steps

Update your `eas.json` file with the following configuration:

```json
{
  "cli": {
    "version": ">= 16.10.1",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleDevelopmentDebug",
        "package": "com.zxoom.rolenetapp.dev"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleStagingRelease",
        "package": "com.zxoom.rolenetapp.staging"
      }
    },
    "production": {
      "autoIncrement": true,
      "android": {
        "buildType": "app-bundle",
        "gradleCommand": ":app:bundleProductionRelease",
        "package": "com.zxoom.rolenetapp"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

This configuration:
1. Links each EAS profile to a specific product flavor
2. Sets appropriate build types (debug/release) for each profile
3. Specifies the correct package name for each profile
4. Uses the appropriate build output format (APK for development/preview, AAB for production)

## 4. Environment Variables Setup

For secure handling of signing keys with EAS, you can set up environment variables.

### Using EAS CLI

```bash
eas secret:create --scope project --name RELEASE_STORE_PASSWORD --value "your_password"
eas secret:create --scope project --name RELEASE_KEY_ALIAS --value "your_key_alias"
eas secret:create --scope project --name RELEASE_KEY_PASSWORD --value "your_key_password"
```

### Updating EAS.json to Use Environment Variables

Update your `eas.json` file to reference these environment variables:

```json
"production": {
  "autoIncrement": true,
  "android": {
    "buildType": "app-bundle",
    "gradleCommand": ":app:bundleProductionRelease",
    "package": "com.zxoom.rolenetapp"
  },
  "env": {
    "RELEASE_STORE_PASSWORD": "${RELEASE_STORE_PASSWORD}",
    "RELEASE_KEY_ALIAS": "${RELEASE_KEY_ALIAS}",
    "RELEASE_KEY_PASSWORD": "${RELEASE_KEY_PASSWORD}"
  }
}
```

## 5. Building with Different Profiles

With these configurations in place, you can build your app using different profiles:

```bash
# For development builds
eas build --profile development --platform android

# For staging/preview builds
eas build --profile preview --platform android

# For production builds
eas build --profile production --platform android
```

## 6. Troubleshooting

### APK Installation Signature Mismatch

If you encounter the error "INSTALL_FAILED_UPDATE_INCOMPATIBLE: Package signatures do not match the previously installed version", you have several options:

1. **Uninstall the existing app**: This is the simplest solution if you don't need to preserve app data.

2. **Use the same signing key**: Ensure you're using the same signing key for both builds.

3. **Use different package names**: This is what our product flavors configuration accomplishes, allowing multiple versions to be installed simultaneously.

4. **Clear app data**: Sometimes clearing the app's data on the device can resolve the issue without uninstalling.

### Gradle Build Issues

If you encounter Gradle build issues:

1. Check that your product flavor names match exactly in both `build.gradle` and `eas.json`.

2. Verify that the Gradle commands in `eas.json` are correct for your flavor names.

3. Try running a local Gradle build to debug issues:

```bash
cd android
./gradlew assembleDevelopmentDebug --info
```

### EAS Build Issues

If you encounter issues with EAS Build:

1. Verify that your environment variables are correctly set in the EAS dashboard or via the CLI.

2. Check the EAS Build logs for specific error messages.

3. Try running with `--no-wait` flag to avoid concurrency limits:

```bash
eas build --profile development --platform android --no-wait
```

---

By implementing these configurations, you'll have a robust setup for managing different build types, package names, and signing configurations for your RoleNet app, which will help avoid installation conflicts and streamline your development workflow.