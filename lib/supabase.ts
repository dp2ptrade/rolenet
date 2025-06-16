import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import Constants from 'expo-constants'

// Get environment variables from Expo config or process.env as fallback
const supabaseUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

// Debug logging
console.log('Environment variables check:');
console.log('EXPO_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'SET' : 'NOT SET');
console.log('EXPO_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'SET' : 'NOT SET');

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Environment variables debug:');
  console.error('supabaseUrl:', supabaseUrl);
  console.error('supabaseAnonKey:', supabaseAnonKey ? 'EXISTS' : 'MISSING');
  console.error('process.env keys:', Object.keys(process.env).filter(key => key.includes('SUPABASE')));
  
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file and ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Export auth for easy access
export const auth = supabase.auth;

// Export database for easy access
export const database = supabase;

// Export storage for easy access
export const storage = supabase.storage;

// Export realtime for easy access
export const realtime = supabase.realtime;