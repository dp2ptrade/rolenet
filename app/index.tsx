import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
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
    const checkGuideStatus = async () => {
      try {
        const value = await AsyncStorage.getItem('hasSeenWelcomeGuide');
        setHasSeenGuide(value === 'true');
      } catch (err) {
        console.error('Error checking guide status:', err);
        setHasSeenGuide(false); // Default to showing guide on error
      }
    };
    checkGuideStatus();
    initializeAuth();
    setupNotifications();
  }, []);

  useEffect(() => {
    if (hasSeenGuide !== null && !isLoading) {
      // Add a small delay to ensure the Root Layout is fully mounted
      const timer = setTimeout(() => {
        if (!hasSeenGuide) {
          router.replace('/welcome-guide');
        } else if (isAuthenticated) {
          if (user) {
            // User is authenticated and has a profile, go to main app
            router.replace('/(tabs)/discover');
          } else {
            // User is authenticated but needs to complete onboarding
            router.replace('/onboarding');
          }
        } else {
          // User is not authenticated, go to sign in
          router.replace('/auth/signin');
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, isLoading, user, hasSeenGuide]);

  const setupNotifications = async () => {
    try {
      // Request notification permissions
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('Notification permissions not granted');
        return;
      }

      // Get push token - Note: For Android, FCM setup is required
      let token;
      try {
        token = (await Notifications.getExpoPushTokenAsync({ projectId: 'your-project-id' })).data;
        console.log('Push token:', token);
      } catch (e) {
        console.error('Error getting push token:', e);
        console.log('For Android, ensure FCM is set up as per https://docs.expo.dev/push-notifications/fcm-credentials/');
      }

      // Save push token to user profile if user is authenticated and token is available
      if (user?.id && token) {
        const { error } = await supabase
          .from('users')
          .update({ push_token: token })
          .eq('id', user.id);
        if (error) {
          console.error('Error saving push token:', error);
        } else {
          console.log('Push token saved to user profile');
        }
      }

      // Set up notification handler
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      // Handle incoming notifications
      const subscription = Notifications.addNotificationReceivedListener(notification => {
        console.log('Notification received:', notification);
        // Handle navigation or state update based on notification data
      });

      return () => subscription.remove();
    } catch (error) {
      console.error('Error setting up notifications:', error);
    }
  };

  return (
    <LinearGradient
      colors={['#3B82F6', '#06B6D4']}
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <View style={{ alignItems: 'center' }}>
        <ActivityIndicator size="large" color="white" />
        <Text style={{
          color: 'white',
          fontSize: 18,
          marginTop: 20,
          fontWeight: '600',
        }}>
          {error ? 'Error loading app...' : 'Loading RoleNet...'}
        </Text>
        {error && (
          <Text style={{
            color: 'rgba(255,255,255,0.8)',
            fontSize: 14,
            marginTop: 10,
            textAlign: 'center',
            paddingHorizontal: 40,
          }}>
            {error}
          </Text>
        )}
      </View>
    </LinearGradient>
  );
}
