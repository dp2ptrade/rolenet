import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useUserStore } from '../stores/useUserStore';

interface AuthGuardProps {
  children: React.ReactNode;
  requireProfile?: boolean;
}

export function AuthGuard({ children, requireProfile = true }: AuthGuardProps) {
  const { isAuthenticated, isLoading, user } = useUserStore();
  
  // Show loading while authentication is being checked
  if (isLoading) {
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
            fontSize: 16,
            marginTop: 16,
            fontWeight: '500',
          }}>
            Verifying authentication...
          </Text>
        </View>
      </LinearGradient>
    );
  }
  
  // Redirect to sign in if not authenticated
  if (!isAuthenticated) {
    router.replace('/auth/signin');
    return null;
  }
  
  // Redirect to onboarding if profile is required but doesn't exist
  if (requireProfile && !user) {
    router.replace('/onboarding');
    return null;
  }
  
  // Render protected content
  return <>{children}</>;
}

export default AuthGuard;