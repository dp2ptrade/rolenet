import 'dotenv/config';

export default {
  expo: {
    name: "RoleNet",
    slug: "rolenet-app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "rolenet",
    userInterfaceStyle: "automatic",
    newArchEnabled: false,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.rolenet.rolenet-app",
      associatedDomains: ["applinks:rolenet.site"]
    },
    android: {
      edgeToEdgeEnabled: true,
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      permissions: [
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.RECORD_AUDIO",
        "android.permission.MODIFY_AUDIO_SETTINGS",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.RECORD_AUDIO",
        "android.permission.MODIFY_AUDIO_SETTINGS"
      ],
      package: "com.rolenet.rolenetapp",
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "https",
              host: "rolenet.site",
              pathPrefix: "/auth/confirm"
            }
          ],
          category: ["BROWSABLE", "DEFAULT"]
        }
      ]
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/rolenet-logo.png"
    },
    plugins: [
      "expo-router",
      "expo-web-browser",
      "expo-font",
      "expo-location",
      "expo-notifications",
      "expo-video",
      "expo-audio",
      "./plugins/react-native-webrtc"
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      EXPO_PUBLIC_TURN_SERVER_URL: process.env.EXPO_PUBLIC_TURN_SERVER_URL,
      EXPO_PUBLIC_TURN_SERVER_USERNAME: process.env.EXPO_PUBLIC_TURN_SERVER_USERNAME,
      EXPO_PUBLIC_TURN_SERVER_CREDENTIAL: process.env.EXPO_PUBLIC_TURN_SERVER_CREDENTIAL,
      EXPO_PUBLIC_BACKUP_TURN_SERVER_URL: process.env.EXPO_PUBLIC_BACKUP_TURN_SERVER_URL,
      EXPO_PUBLIC_BACKUP_TURN_SERVER_USERNAME: process.env.EXPO_PUBLIC_BACKUP_TURN_SERVER_USERNAME,
      EXPO_PUBLIC_BACKUP_TURN_SERVER_CREDENTIAL: process.env.EXPO_PUBLIC_BACKUP_TURN_SERVER_CREDENTIAL,
      eas: {
        projectId: "e94b7ba1-6bd3-4965-89eb-b70b4eae8127"
      }
    }
  }
};
