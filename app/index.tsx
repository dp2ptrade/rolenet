import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useUserStore } from '../stores/useUserStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { supabase } from '../lib/supabase';

export default function IndexScreen() {
  const { isAuthenticated, isLoading, user, initializeAuth, error } = useUserStore();
  const [hasSeenGuide, setHasSeenGuide] = useState<boolean | null>(null);

  useEffect(() => {
    console.log('🚀 IndexScreen: Component mounted, starting initialization');
    const checkGuideStatus = async () => {
      try {
        console.log('📖 IndexScreen: Checking guide status');
        const value = await AsyncStorage.getItem('hasSeenWelcomeGuide');
        console.log('📖 IndexScreen: Guide status value:', value);
        setHasSeenGuide(value === 'true');
      } catch (err) {
        console.error('Error checking guide status:', err);
        setHasSeenGuide(false); // Default to showing guide on error
      }
    };
    checkGuideStatus();
    console.log('🔐 IndexScreen: Starting auth initialization');
    initializeAuth();
    // setupNotifications(); // Commented out - notifications feature not implemented yet
  }, []);

  useEffect(() => {
    console.log('🧭 IndexScreen: Navigation effect triggered', {
      hasSeenGuide,
      isLoading,
      isAuthenticated,
      hasUser: !!user
    });
    
    // Only navigate when both guide status and auth are loaded
    if (hasSeenGuide !== null && !isLoading) {
      console.log('🧭 IndexScreen: Ready to navigate');
      // Add a small delay to ensure the Root Layout is fully mounted
      const timer = setTimeout(() => {
        if (!hasSeenGuide) {
          console.log('🧭 IndexScreen: Navigating to welcome guide');
          router.replace('/welcome-guide');
        } else if (isAuthenticated) {
          if (user) {
            // User is authenticated and has a profile, go to main app
            console.log('🧭 IndexScreen: Navigating to discover (authenticated with profile)');
            router.replace('/discover');
          } else {
            // User is authenticated but needs to complete onboarding
            console.log('🧭 IndexScreen: Navigating to onboarding (authenticated without profile)');
            router.replace('/onboarding');
          }
        } else {
          // User is not authenticated, go to sign in
          console.log('🧭 IndexScreen: Navigating to signin (not authenticated)');
          router.replace('/auth/signin');
        }
      }, 100);

      return () => clearTimeout(timer);
    } else {
      console.log('🧭 IndexScreen: Not ready to navigate yet');
    }
  }, [isAuthenticated, isLoading, user, hasSeenGuide]);

  // Show loading screen while auth is initializing or guide status is unknown
  if (isLoading || hasSeenGuide === null) {
    return (
      <LinearGradient
        colors={['#3B82F6', '#06B6D4']}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="white" />
          <Text style={styles.loadingText}>
            {error ? 'Error loading app...' : 'Initializing RoleNet...'}
          </Text>
          {error && (
            <Text style={styles.errorText}>
              {error}
            </Text>
          )}
        </View>
      </LinearGradient>
    );
  }

  // This component only handles navigation logic
  // The loading UI is handled above
  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 18,
    marginTop: 20,
    fontWeight: '600',
  },
  errorText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
    paddingHorizontal: 20,
  }
});