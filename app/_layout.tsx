import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { useFrameworkReady } from '../hooks/useFrameworkReady';
import { useCallStore } from '../stores/useCallStore';
import { useUserStore } from '../stores/useUserStore';
import IncomingCallModal from '../components/IncomingCallModal';
import { UserService } from '../lib/supabaseService';

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
  
  const currentUser = useUserStore((state: any) => state.user);
  const {
    incomingCall,
    callStatus,
    acceptCall,
    declineCall,
    initializeWebRTC
  } = useCallStore();
  
  const [callerInfo, setCallerInfo] = useState<any>(null);
  
  // Initialize WebRTC when user is available
  useEffect(() => {
    if (currentUser?.id) {
      initializeWebRTC(currentUser.id);
    }
  }, [currentUser?.id, initializeWebRTC]);
  
  // Load caller info when incoming call is received
  useEffect(() => {
    if (incomingCall?.caller_id) {
      loadCallerInfo(incomingCall.caller_id);
    } else {
      setCallerInfo(null);
    }
  }, [incomingCall]);
  
  const loadCallerInfo = async (callerId: string) => {
    try {
      const userProfile = await UserService.getUserProfile(callerId);
      setCallerInfo(userProfile);
    } catch (error) {
      console.error('Failed to load caller info:', error);
      setCallerInfo({ name: 'Unknown Caller' });
    }
  };
  
  const handleAcceptCall = async () => {
    if (incomingCall?.id) {
      try {
        await acceptCall(incomingCall.id);
      } catch (error) {
        console.error('Failed to accept call:', error);
      }
    }
  };
  
  const handleDeclineCall = async () => {
    if (incomingCall?.id) {
      try {
        await declineCall(incomingCall.id);
      } catch (error) {
        console.error('Failed to decline call:', error);
      }
    }
  };

  return (
    <PaperProvider theme={theme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth/signin" />
        <Stack.Screen name="auth/signup" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="+not-found" />
      </Stack>
      
      {/* Global Incoming Call Modal */}
      <IncomingCallModal
        visible={!!incomingCall && callStatus === 'ringing'}
        callerName={callerInfo?.name || callerInfo?.full_name}
        callerAvatar={callerInfo?.avatar_url}
        callerRole={callerInfo?.role}
        callId={incomingCall?.id}
        onAccept={handleAcceptCall}
        onDecline={handleDeclineCall}
      />
      
      <StatusBar style="auto" />
    </PaperProvider>
  );
}