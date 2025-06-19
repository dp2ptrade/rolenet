# RoleNet - Professional Networking App

## Overview

RoleNet is a real-time, professional matchmaking app that allows users from any field (e.g., teacher, driver, doctor, student, shopkeeper, architect, etc.) to connect globally and locally. Users discover professionals based on role and tag filters, send connection requests ("pings"), and initiate calls and chat. The app is designed to be inclusive, fast, and intuitive.

## Features

- **Discover Professionals**: Find nearby or global professionals based on role, tags, and more
- **Ping System**: Send connection requests with personalized messages
- **Real-time Communication**: Audio calls and chat using WebRTC
- **User Profiles**: Detailed profiles with roles, tags, ratings, and more
- **Smart Search**: AI-powered search with voice commands

## Getting Started

### Prerequisites

- Node.js (v18 or higher) try v18 for smooth installion. 
- Expo CLI  (npm install -g expo-cli)
- EAS cli (npm install -g eas-cli) (for building apk)
- Supabase account and project

### Installation

1. Clone the repository

```bash
git clone https://github.com/yourusername/rolenet.git
cd rolenet
```

2. Install dependencies

```bash
npm install
```

3. Configure environment variables

Create a `.env` file in the root directory with your Supabase credentials:

```
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

For detailed instructions on environment variable setup, please refer to [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md).

### Database Setup

1. Set up the database schema by running the SQL in `lib/database-schema.sql` in your Supabase SQL Editor

2. Seed the database with sample users

```bash
npm run seed-db
```

For detailed database setup instructions, see [DATABASE_SETUP.md](DATABASE_SETUP.md).

### WebRTC Setup

RoleNet uses WebRTC for real-time audio calls. For setup instructions, see [README-WEBRTC.md](README-WEBRTC.md).

### Running the App

```bash
npm run dev
```

For iOS:

```bash
npm run ios
```

For Android:

```bash
npm run android
```
To build an APK that you can share with testers, run:
```bash
eas build -p android --profile preview
```

This command will:
1. Bundle your JavaScript code
2. Build a native Android app
3. Generate an APK file
4. Upload it to Expo's servers

### Alternative: Build a development client
If you want to test with the Expo development client (which allows for faster iterations), run:
```bash
eas build -p android --profile development
```

### Build for local testing (faster option)
If you want to build locally and get the APK file directly on your machine:

```bash
eas build -p android --profile development --local
```



## Distributing the APK
After the build completes, you'll receive a URL where you can download the APK. You can share this URL with your testers, or download the APK and distribute it directly.

### Internal Distribution
For a more managed approach to distribution:

```
eas build:submit -p android --latest
```
This will submit your latest build to internal testing on Google Play (requires Google Play Console setup).

## Troubleshooting Common Issues
1. Build Failures : If the build fails, check the logs for specific errors. Common issues include:
   
   - Missing Android SDK components
   - Incompatible dependencies
   - Incorrect configuration in app.config.js
2. Installation Issues : If testers have trouble installing the APK:
   
   - Ensure they have enabled "Install from Unknown Sources" in their device settings
   - Check if the APK is compatible with their Android version
3. Credentials Issues : If you encounter credentials problems:
   
   ```
   eas credentials
   ```
   This will help you manage your Android credentials.

## Project Structure

- `app/`: Main application screens and navigation
- `components/`: Reusable UI components
- `lib/`: Utility functions and services
- `stores/`: Zustand state management stores
- `plugins/`: Custom Expo plugins (WebRTC)
- `scripts/`: Utility scripts for development

## Technologies

- **Frontend**: React Native, Expo
- **State Management**: Zustand
- **Backend**: Supabase (Auth, Database, Storage, Realtime)
- **Real-time Communication**: WebRTC
- **UI Components**: React Native Paper

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.