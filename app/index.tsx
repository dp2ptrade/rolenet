import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect } from 'expo-router';
import { useUserStore } from '@/stores/useUserStore';

export default function IndexScreen() {
  const { isAuthenticated, isLoading, setAuthenticated, setLoading } = useUserStore();

  useEffect(() => {
    // Simulate authentication check
    const checkAuth = async () => {
      try {
        // TODO: Check if user is authenticated with Firebase
        // For now, simulate loading and then redirect to onboarding
        setTimeout(() => {
          setLoading(false);
          // For demo purposes, set as not authenticated to show onboarding
          setAuthenticated(false);
        }, 2000);
      } catch (error) {
        console.error('Auth check failed:', error);
        setLoading(false);
        setAuthenticated(false);
      }
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#3B82F6', '#06B6D4']}
          style={styles.gradient}
        >
          <View style={styles.content}>
            <Text variant="displayMedium" style={styles.title}>
              RoleNet
            </Text>
            <Text variant="titleMedium" style={styles.subtitle}>
              Every Role. One Network.
            </Text>
            <ActivityIndicator 
              size="large" 
              color="white" 
              style={styles.loader}
            />
            <Text variant="bodyMedium" style={styles.loadingText}>
              Connecting professionals worldwide...
            </Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)/discover" />;
  } else {
    return <Redirect href="/onboarding" />;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 48,
  },
  loader: {
    marginBottom: 24,
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
});