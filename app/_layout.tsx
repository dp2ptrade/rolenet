import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#3B82F6',
    primaryContainer: '#EFF6FF',
    secondary: '#06B6D4',
    secondaryContainer: '#ECFDF5',
    tertiary: '#8B5CF6',
    surface: '#FFFFFF',
    surfaceVariant: '#F1F5F9',
    background: '#F8FAFC',
    error: '#EF4444',
    errorContainer: '#FEE2E2',
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onSurface: '#1F2937',
    onSurfaceVariant: '#6B7280',
    outline: '#D1D5DB',
  },
};

export default function RootLayout() {
  useFrameworkReady();

  return (
    <PaperProvider theme={theme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </PaperProvider>
  );
}