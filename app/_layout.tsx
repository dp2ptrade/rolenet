import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initializeDebugging } from '../debug.config.js';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider, DefaultTheme } from 'react-native-paper';
import { useFrameworkReady } from '../hooks/useFrameworkReady';
import { useCallStore } from '../stores/useCallStore';
import { useUserStore } from '../stores/useUserStore';
import { useAppStateStore } from '../stores/useAppStateStore';
import IncomingCallModal from '../components/IncomingCallModal';
import { UserService } from '../lib/supabaseService';
import AppSidebar from '../components/AppSidebar';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Drawer } from 'react-native-drawer-layout'

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
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

// Initialize upload debugging
initializeDebugging();
export default function RootLayout() {
  useFrameworkReady();
  
  const currentUser = useUserStore((state: any) => state.user);
  const initializeAuth = useUserStore((state: any) => state.initializeAuth);
  
  // Initialize authentication on app load
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);
  
  const {
    incomingCall,
    callStatus,
    acceptCall,
    declineCall,
    initializeWebRTC
  } = useCallStore();
  
  const { 
    initializeAppStateMonitoring, 
    handleAppWakeFromCall,
    ensureWebRTCSubscription,
    callNotificationReceived,
    isInCallBackground 
  } = useAppStateStore();
  
  const { handleForegroundCall, handleBackgroundCall } = useCallStore();
  const [callerInfo, setCallerInfo] = useState<any>(null);
  
  // Initialize WebRTC when user is available
  useEffect(() => {
    if (currentUser?.id) {
      initializeWebRTC(currentUser.id);
    }
  }, [currentUser?.id, initializeWebRTC]);
  
  // Initialize app state monitoring
  useEffect(() => {
    const cleanup = initializeAppStateMonitoring();
    return cleanup;
  }, [initializeAppStateMonitoring]);
  
  // Handle app state changes for calls
  useEffect(() => {
    const { AppState } = require('react-native');
    
    const handleAppStateChange = (nextAppState: string) => {
      console.log('📱 [Layout] App state changed:', {
        nextAppState,
        hasIncomingCall: !!incomingCall,
        isInCall: !!callStatus && callStatus !== 'idle',
        callNotificationReceived,
        isInCallBackground
      });
      
      if (nextAppState === 'active') {
        // App came to foreground
        if (callNotificationReceived) {
          console.log('📞 [Layout] Handling app wake from call notification');
          handleAppWakeFromCall();
        }
        
        // Handle call return to foreground
        if (incomingCall || (callStatus && callStatus !== 'idle')) {
          handleForegroundCall();
        }
        
        // Ensure WebRTC subscription is active
        ensureWebRTCSubscription();
      } else if (nextAppState.match(/inactive|background/)) {
        // App went to background
        if (incomingCall || (callStatus && callStatus !== 'idle')) {
          console.log('📞 [Layout] Call active when going to background');
          handleBackgroundCall();
        }
      }
    };
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, [incomingCall, callStatus, callNotificationReceived, isInCallBackground, handleAppWakeFromCall, ensureWebRTCSubscription, handleForegroundCall, handleBackgroundCall]);
  
  // Load caller info when incoming call is received
  useEffect(() => {
    console.log('📱 [Layout] Incoming call effect triggered:', {
      incomingCall: incomingCall ? {
        id: incomingCall.id,
        caller_id: incomingCall.caller_id,
        status: incomingCall.status
      } : null,
      callStatus,
      timestamp: new Date().toISOString()
    });
    
    if (incomingCall?.caller_id) {
      loadCallerInfo(incomingCall.caller_id);
    } else {
      setCallerInfo(null);
    }
  }, [incomingCall, callStatus]);
  
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
        console.log('✅ [Layout] Accepting call:', incomingCall.id);
        await acceptCall(incomingCall.id);
        
        // Navigate to call screen with error handling
        try {
          const router = require('expo-router').router;
          console.log('🧭 [Layout] Navigating to call screen');
          router.push(`/call?callId=${incomingCall.id}&type=incoming`);
        } catch (navError) {
          console.error('❌ [Layout] Navigation failed:', navError);
          // Fallback: try alternative navigation
          setTimeout(() => {
            try {
              const router = require('expo-router').router;
              router.replace(`/call?callId=${incomingCall.id}&type=incoming`);
            } catch (fallbackError) {
              console.error('❌ [Layout] Fallback navigation failed:', fallbackError);
            }
          }, 100);
        }
      } catch (error) {
        console.error('❌ [Layout] Failed to accept call:', error);
      }
    }
  };
  
  const handleDeclineCall = async () => {
    if (incomingCall?.id) {
      try {
        console.log('❌ [Layout] Declining call:', incomingCall.id);
        await declineCall(incomingCall.id);
      } catch (error) {
        console.error('❌ [Layout] Failed to decline call:', error);
      }
    }
  };

  // Responsive sidebar state
  const [open, setOpen] = useState(false);
  const { width } = Dimensions.get('window');
  const isLargeScreen = width >= 768;

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <Drawer
          open={open}
          onOpen={() => setOpen(true)}
          onClose={() => setOpen(false)}
          renderDrawerContent={() => <AppSidebar onClose={() => setOpen(false)} />}
          drawerType={isLargeScreen ? 'permanent' : 'front'}
          drawerStyle={[
            styles.drawer,
            isLargeScreen && styles.permanentDrawer
          ]}
        >
          <View style={styles.mainContent}>
            <Stack screenOptions={{ 
              headerShown: false,
              animation: 'fade',
            }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="auth/signin" />
              <Stack.Screen name="auth/signup" />
              <Stack.Screen name="onboarding" />
              <Stack.Screen name="discover" />
              <Stack.Screen name="activity" />
              <Stack.Screen name="chats" />
              <Stack.Screen name="calls" />
              <Stack.Screen name="posts" />
              <Stack.Screen name="friends" />
              <Stack.Screen name="notifications" />
              <Stack.Screen name="profile" />
              <Stack.Screen name="call" options={{ presentation: 'fullScreenModal' }} />
              <Stack.Screen name="+not-found" />
            </Stack>
          </View>
        </Drawer>
        
        {/* Global Incoming Call Modal */}
        {(() => {
          const shouldShowModal = !!incomingCall && callStatus === 'ringing';
          console.log('🎭 [Layout] Modal visibility check:', {
            shouldShowModal,
            hasIncomingCall: !!incomingCall,
            callStatus,
            incomingCallId: incomingCall?.id,
            callerInfo: callerInfo ? {
              name: callerInfo.name || callerInfo.full_name,
              hasAvatar: !!callerInfo.avatar_url
            } : null,
            timestamp: new Date().toISOString()
          });
          
          return (
            <IncomingCallModal
              visible={shouldShowModal}
              callerName={callerInfo?.name || callerInfo?.full_name}
              callerAvatar={callerInfo?.avatar_url}
              callerRole={callerInfo?.role}
              callId={incomingCall?.id}
              onAccept={handleAcceptCall}
              onDecline={handleDeclineCall}
            />
          );
        })()}
        
        <StatusBar style="auto" translucent />
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  drawer: {
    width: 280,
    backgroundColor: '#FFFFFF',
  },
  permanentDrawer: {
    width: 280,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  mainContent: {
    flex: 1,
  }
});