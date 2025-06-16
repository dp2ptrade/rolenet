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

- Node.js (v14 or higher)
- Expo CLI
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