# RoleNet Database Setup Guide

This guide explains how to set up and populate the Supabase database for the RoleNet app.

## Prerequisites

- Supabase account and project
- Node.js installed
- RoleNet project cloned and dependencies installed

## Configuration

1. Make sure your `.env` file is properly configured with your Supabase credentials:

```
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

2. Verify that these credentials are correct by checking your Supabase dashboard under Settings > API.

## Database Schema

The database schema is defined in `lib/database-schema.sql`. This file contains all the necessary tables and relationships for the RoleNet app.

To set up the schema:

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Create a new query
4. Copy and paste the contents of `lib/database-schema.sql`
5. Run the query to create all tables and extensions

## Seeding the Database

We've provided a script to populate the database with sample users. This is useful for development and testing.

To seed the database:

1. Make sure your `.env` file is correctly configured
2. Run the following command from the project root:

```bash
npm run seed-db
```

This will insert sample users into your Supabase database.

## Verifying the Setup

To verify that your database is properly set up and populated:

1. Go to your Supabase dashboard
2. Navigate to the Table Editor
3. Select the `users` table
4. You should see the sample users that were inserted by the seeding script

## Troubleshooting

### No Users Appearing in the App

If you're not seeing any users in the Discover page of the app, check the following:

1. Verify that the seeding script ran successfully without errors
2. Check the Supabase dashboard to confirm that users exist in the database
3. Ensure your app is correctly configured with the Supabase URL and anon key
4. Check the app logs for any database connection errors

### Database Connection Issues

If you're experiencing connection issues:

1. Verify that your Supabase project is active (not paused)
2. Double-check your Supabase URL and anon key in the `.env` file
3. Ensure your device has internet connectivity
4. Check if your Supabase project has any restrictions on API access

## Custom Data

To add your own custom users to the database:

1. Edit the `scripts/seed-database.js` file
2. Add or modify the user objects in the `sampleUsers` array
3. Run the seeding script again with `npm run seed-db`

## Next Steps

Once your database is set up and populated, you can start using the RoleNet app with real data. The Discover page should now show users from the database instead of mock data.



## Push Notification Setup

### Setting Up FCM Credentials for Android Push Notifications

To resolve the error regarding Firebase initialization on Android, you need to set up FCM credentials as per Expo's documentation. Follow these steps:

1. __Create a Firebase Project__:

   - Go to the [Firebase Console](https://console.firebase.google.com/).
   - Click on "Add project" and follow the prompts to create a new project for your app.

2. __Register Your App with Firebase__:

   - In the Firebase Console, click on your project, then click on "Add app" and select "Android".
   - Enter your app's package name (found in `app.json` or `app.config.js` under `android.package`, e.g., `com.zxoom.rolenetapp`).
   - Download the `google-services.json` file provided by Firebase.

3. __Add Firebase Configuration to Expo__:

   - Place the `google-services.json` file in your project's root directory or a subdirectory (e.g., `android/`).

   - Update your `app.json` or `app.config.js` to include the path to this file:

     ```json
     {
       "expo": {
         "android": {
           "googleServicesFile": "./android/google-services.json"
         }
       }
     }
     ```

   - If using a dynamic configuration with `app.config.js`, ensure it returns the correct structure.

4. __Update Project ID in Code__:

   - In `app/index.tsx`, replace `'your-project-id'` in the `Notifications.getExpoPushTokenAsync({ projectId: 'your-project-id' })` call with your actual Firebase project ID (found in Firebase Console under Project Settings).

5. __Rebuild Your App__:

   - Run `npx expo prebuild` to regenerate native project files with Firebase configuration.
   - Build your app for Android using `npx expo build:android` or test it with `npx expo start --android`.

For detailed instructions, refer to Expo's guide: [](https://docs.expo.dev/push-notifications/fcm-credentials/)<https://docs.expo.dev/push-notifications/fcm-credentials/>.

### Setting Up Supabase Edge Function for Push Notifications

I've created a file `supabase/functions/send-push-notification/index.ts` with the code for a Supabase Edge Function to send push notifications when new notifications are inserted into the `notifications` table. Follow these steps to deploy and configure it:

1. __Create the Edge Function in Supabase__:

   - Log in to your Supabase Dashboard.
   - Navigate to "Database" > "Webhooks" or "Edge Functions" (depending on your Supabase version).
   - Create a new function named `send-push-notification`.
   - Copy the content from `supabase/functions/send-push-notification/index.ts` into the function editor.

2. __Set Environment Variables__:

   - In the Supabase Dashboard, go to "Settings" > "Environment Variables".

   - Add the following variables:

     - `SUPABASE_URL`: Your Supabase project URL (e.g., `https://xxxxxxxxxxxx.supabase.co`).
     - `SUPABASE_ANON_KEY`: Your Supabase anonymous key.
     - `EXPO_ACCESS_TOKEN`: Your Expo access token for push notifications. Obtain this from your Expo account dashboard under "Access Tokens".

3. __Deploy the Function__:

   - Deploy the function through the Supabase Dashboard.

   - Alternatively, if you have the Supabase CLI installed, you can deploy it using:

     ```bash
     supabase functions deploy send-push-notification
     ```

4. __Set Up a Database Trigger__:

   - To automatically trigger this function on new notification inserts, create a database trigger in Supabase:

     - Go to "Database" > "Webhooks".
     - Create a new webhook that triggers on `INSERT` events for the `notifications` table.
     - Set the webhook URL to your deployed function endpoint (e.g., `https://xxxxxxxxxxxx.functions.supabase.co/send-push-notification`).

5. __Test the Function__:

   - Insert a test notification into the `notifications` table manually or through your app.
   - Check the logs in Supabase under "Edge Functions" to see if the function executed and sent a push notification.

__Note__: The TypeScript errors in the `index.ts` file are due to VSCode not recognizing Deno-specific syntax, as this code is meant for Supabase's Deno runtime. These errors will not affect the function's execution in Supabase.

### Summary of Notification System

1. __Frontend Setup__:

   - Installed `expo-notifications` for push notification support.
   - Created `stores/useNotificationStore.ts` to manage notification state.
   - Added a Notifications tab in `app/(tabs)/_layout.tsx` with a badge for unread notifications.
   - Developed `app/(tabs)/notifications.tsx` to display and interact with notifications.
   - Configured push notification handling in `app/index.tsx`, including error handling for FCM setup.

2. __Backend Setup__:

   - Provided `supabase/functions/send-push-notification/index.ts` as a Supabase Edge Function to send push notifications via Expo's push API when new notifications are added.

With these steps, your notification system should be fully operational, including both frontend display and backend push notification delivery. If you encounter any issues during setup or deployment, I can assist further with troubleshooting.
