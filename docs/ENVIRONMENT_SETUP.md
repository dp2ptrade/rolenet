# Environment Variables Setup Guide

## Overview

This document explains how to properly set up environment variables for the RoleNet application. Environment variables are used to store sensitive information like API keys and configuration settings that should not be committed to version control.

## Required Environment Variables

The following environment variables are required for the application to function properly:

- `EXPO_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key

## Setting Up Environment Variables

### 1. Create a .env file

Create a `.env` file in the root directory of the project with the following content:

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Replace `your_supabase_url` and `your_supabase_anon_key` with your actual Supabase credentials.

### 2. Ensure app.config.js is present

The project uses `app.config.js` to load environment variables into the Expo configuration. This file should be present in the root directory and properly configured to read from the `.env` file.

### 3. Install required dependencies

Make sure you have the necessary dependencies installed:

```bash
npm install dotenv
```

## Troubleshooting

### Environment Variables Not Loading

If you encounter the error "Missing Supabase environment variables", try the following steps:

1. Verify that your `.env` file exists and contains the correct variables
2. Ensure that `app.config.js` is properly configured
3. Restart the development server with the `--clear` flag:
   ```bash
   npx expo start --clear
   ```
4. If using Expo web, try clearing your browser cache

### Checking Environment Variables

You can verify that your environment variables are properly loaded by checking the console logs when the application starts. The application will log whether the Supabase URL and anonymous key are set.

## Important Notes

- Never commit your `.env` file to version control
- The `.env` file should be listed in your `.gitignore` file
- When deploying, make sure to set the environment variables in your hosting platform

## References

- [Expo Environment Variables Documentation](https://docs.expo.dev/guides/environment-variables/)
- [Supabase Documentation](https://supabase.io/docs)