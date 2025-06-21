# Sample EAS.json Configuration

This file provides a complete example of the `eas.json` file with build profiles for different environments. You can use this as a reference when updating your own `eas.json` file.

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
        "package": "com.zxoom.rolenetapp.dev",
        "withoutCredentials": true
      },
      "env": {
        "APP_ENV": "development"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleStagingRelease",
        "package": "com.zxoom.rolenetapp.staging"
      },
      "env": {
        "APP_ENV": "staging",
        "RELEASE_STORE_PASSWORD": "${RELEASE_STORE_PASSWORD}",
        "RELEASE_KEY_ALIAS": "${RELEASE_KEY_ALIAS}",
        "RELEASE_KEY_PASSWORD": "${RELEASE_KEY_PASSWORD}"
      }
    },
    "production": {
      "autoIncrement": true,
      "android": {
        "buildType": "app-bundle",
        "gradleCommand": ":app:bundleProductionRelease",
        "package": "com.zxoom.rolenetapp"
      },
      "env": {
        "APP_ENV": "production",
        "RELEASE_STORE_PASSWORD": "${RELEASE_STORE_PASSWORD}",
        "RELEASE_KEY_ALIAS": "${RELEASE_KEY_ALIAS}",
        "RELEASE_KEY_PASSWORD": "${RELEASE_KEY_PASSWORD}"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "track": "internal",
        "releaseStatus": "draft"
      }
    }
  }
}
```

## Key Configuration Elements Explained

### 1. Development Profile

```json
"development": {
  "developmentClient": true,
  "distribution": "internal",
  "android": {
    "buildType": "apk",
    "gradleCommand": ":app:assembleDevelopmentDebug",
    "package": "com.zxoom.rolenetapp.dev",
    "withoutCredentials": true
  },
  "env": {
    "APP_ENV": "development"
  }
}
```

- `developmentClient: true` - Builds a development client that can be used with Expo Go
- `distribution: "internal"` - Makes the build available only to your team
- `buildType: "apk"` - Builds an APK file (easier for development testing)
- `gradleCommand: ":app:assembleDevelopmentDebug"` - Uses the development flavor with debug configuration
- `package: "com.zxoom.rolenetapp.dev"` - Uses the development package name
- `withoutCredentials: true` - Uses debug signing keys, not requiring release credentials
- `APP_ENV: "development"` - Sets an environment variable that your app can use to determine the environment

### 2. Preview/Staging Profile

```json
"preview": {
  "distribution": "internal",
  "android": {
    "buildType": "apk",
    "gradleCommand": ":app:assembleStagingRelease",
    "package": "com.zxoom.rolenetapp.staging"
  },
  "env": {
    "APP_ENV": "staging",
    "RELEASE_STORE_PASSWORD": "${RELEASE_STORE_PASSWORD}",
    "RELEASE_KEY_ALIAS": "${RELEASE_KEY_ALIAS}",
    "RELEASE_KEY_PASSWORD": "${RELEASE_KEY_PASSWORD}"
  }
}
```

- `distribution: "internal"` - Makes the build available only to your team
- `buildType: "apk"` - Builds an APK file (easier for testing)
- `gradleCommand: ":app:assembleStagingRelease"` - Uses the staging flavor with release configuration
- `package: "com.zxoom.rolenetapp.staging"` - Uses the staging package name
- Environment variables for release signing are included
- `APP_ENV: "staging"` - Sets an environment variable for staging environment

### 3. Production Profile

```json
"production": {
  "autoIncrement": true,
  "android": {
    "buildType": "app-bundle",
    "gradleCommand": ":app:bundleProductionRelease",
    "package": "com.zxoom.rolenetapp"
  },
  "env": {
    "APP_ENV": "production",
    "RELEASE_STORE_PASSWORD": "${RELEASE_STORE_PASSWORD}",
    "RELEASE_KEY_ALIAS": "${RELEASE_KEY_ALIAS}",
    "RELEASE_KEY_PASSWORD": "${RELEASE_KEY_PASSWORD}"
  }
}
```

- `autoIncrement: true` - Automatically increments the version code for each build
- `buildType: "app-bundle"` - Builds an AAB file (required for Play Store submission)
- `gradleCommand: ":app:bundleProductionRelease"` - Uses the production flavor with release configuration
- `package: "com.zxoom.rolenetapp"` - Uses the main package name without suffix
- Environment variables for release signing are included
- `APP_ENV: "production"` - Sets an environment variable for production environment

### 4. Submit Configuration

```json
"submit": {
  "production": {
    "android": {
      "track": "internal",
      "releaseStatus": "draft"
    }
  }
}
```

- `track: "internal"` - Submits to the internal testing track on Google Play
- `releaseStatus: "draft"` - Creates a draft release that you can review before publishing

## Using Environment Variables in Your App

You can access the environment variables in your JavaScript code using the `Constants.expoConfig.extra` object:

```javascript
import Constants from 'expo-constants';

const appEnv = Constants.expoConfig.extra.APP_ENV;
console.log(`Current environment: ${appEnv}`);
```

To make this work, you need to update your `app.config.js` file to include these variables:

```javascript
export default {
  // ... other config
  extra: {
    APP_ENV: process.env.APP_ENV || 'development',
  },
};
```

## Building with Different Profiles

With this configuration, you can build your app using different profiles:

```bash
# For development builds
eas build --profile development --platform android

# For staging/preview builds
eas build --profile preview --platform android

# For production builds
eas build --profile production --platform android
```

Each build will have its own package name, allowing you to install multiple versions on the same device without signature conflicts.