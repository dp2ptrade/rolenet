import { create } from 'zustand';
import { AppState, AppStateStatus } from 'react-native';
import { useUserStore } from './useUserStore';
import { userService } from '../lib/supabaseService';
import { webrtcService } from '../lib/webrtcService';

interface AppStateStore {
  appState: AppStateStatus;
  isActive: boolean;
  lastActivity: Date;
  heartbeatInterval: number | NodeJS.Timeout | null;
  inactivityTimeout: number | NodeJS.Timeout | null;
  
  // Call-specific state
  isInCallBackground: boolean;
  backgroundCallStartTime: Date | null;
  webrtcSubscriptionActive: boolean;
  callNotificationReceived: boolean;
  lastCallNotificationTime: Date | null;
  
  // Actions
  setAppState: (state: AppStateStatus) => void;
  updateActivity: () => void;
  startHeartbeat: () => void;
  stopHeartbeat: () => void;
  handleAppStateChange: (nextAppState: AppStateStatus) => void;
  initializeAppStateMonitoring: () => void;
  logAppStateForCalls: () => void;
  
  // Call-specific actions
  handleCallInBackground: (callId: string) => void;
  handleCallNotificationReceived: () => void;
  ensureWebRTCSubscription: () => void;
  handleAppWakeFromCall: () => void;
  cleanupCallBackground: () => void;
}

const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const INACTIVITY_THRESHOLD = 300000; // 5 minutes

export const useAppStateStore = create<AppStateStore>((set, get) => ({
  appState: AppState.currentState,
  isActive: AppState.currentState === 'active',
  lastActivity: new Date(),
  heartbeatInterval: null,
  inactivityTimeout: null,
  
  // Call-specific state
  isInCallBackground: false,
  backgroundCallStartTime: null,
  webrtcSubscriptionActive: false,
  callNotificationReceived: false,
  lastCallNotificationTime: null,

  setAppState: (state) => {
    set({ 
      appState: state, 
      isActive: state === 'active' 
    });
  },

  updateActivity: () => {
    const now = new Date();
    set({ lastActivity: now });
    
    // Clear existing inactivity timeout
    const { inactivityTimeout } = get();
    if (inactivityTimeout) {
      clearTimeout(inactivityTimeout);
    }
    
    // Set user status to online if they were away
    const currentUser = useUserStore.getState().user;
    if (currentUser) {
      userService.updateOnlineStatus(currentUser.id, 'online');
    }
    
    // Set new inactivity timeout
    const newTimeout = setTimeout(() => {
      const user = useUserStore.getState().user;
      if (user && get().isActive) {
        userService.updateOnlineStatus(user.id, 'away');
      }
    }, INACTIVITY_THRESHOLD);
    
    set({ inactivityTimeout: newTimeout });
  },

  startHeartbeat: () => {
    const { heartbeatInterval } = get();
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }
    
    const interval = setInterval(async () => {
      const { isActive, lastActivity } = get();
      const currentUser = useUserStore.getState().user;
      
      if (currentUser && isActive) {
        const timeSinceActivity = Date.now() - lastActivity.getTime();
        const status = timeSinceActivity > INACTIVITY_THRESHOLD ? 'away' : 'online';
        
        try {
          await userService.updateOnlineStatus(currentUser.id, status);
        } catch (error) {
          console.error('Failed to update heartbeat status:', error);
        }
      }
    }, HEARTBEAT_INTERVAL);
    
    set({ heartbeatInterval: interval });
  },

  stopHeartbeat: () => {
    const { heartbeatInterval, inactivityTimeout } = get();
    
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      set({ heartbeatInterval: null });
    }
    
    if (inactivityTimeout) {
      clearTimeout(inactivityTimeout);
      set({ inactivityTimeout: null });
    }
  },

  handleAppStateChange: async (nextAppState) => {
    const { appState } = get();
    const currentUser = useUserStore.getState().user;
    
    // Import call store to check call state
    const { useCallStore } = require('./useCallStore');
    const callState = useCallStore.getState();
    
    console.log('📱 [AppState] State change:', {
      from: appState,
      to: nextAppState,
      hasIncomingCall: !!callState.incomingCall,
      isInCall: callState.isInCall,
      callStatus: callState.callStatus,
      webrtcActive: get().webrtcSubscriptionActive,
      isInCallBackground: get().isInCallBackground,
      timestamp: new Date().toISOString()
    });
    
    if (currentUser) {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground
        console.log('🔄 [AppState] App came to foreground');
        await userService.updateOnlineStatus(currentUser.id, 'online');
        get().startHeartbeat();
        get().updateActivity();
        
        // Handle app wake from call notification
        if (get().callNotificationReceived) {
          console.log('📞 [AppState] App woke from call notification');
          get().handleAppWakeFromCall();
        }
        
        // Ensure WebRTC subscription is active
        get().ensureWebRTCSubscription();
        
        // Log call state when app becomes active
        if (callState.incomingCall || callState.isInCall) {
          console.log('📞 [AppState] Call state when app became active:', {
            incomingCall: callState.incomingCall?.id,
            isInCall: callState.isInCall,
            callStatus: callState.callStatus,
            wasInCallBackground: get().isInCallBackground,
            backgroundDuration: get().backgroundCallStartTime ? 
              Date.now() - get().backgroundCallStartTime!.getTime() : 0
          });
          
          // Clear background call state if call is no longer active
          if (!callState.isInCall && !callState.incomingCall) {
            get().cleanupCallBackground();
          }
        }
      } else if (appState === 'active' && nextAppState.match(/inactive|background/)) {
        // App went to background
        console.log('🔄 [AppState] App went to background');
        
        // Handle call in background
        if (callState.incomingCall || callState.isInCall) {
          console.log('📞 [AppState] Call active when going to background:', {
            incomingCall: callState.incomingCall?.id,
            isInCall: callState.isInCall,
            callStatus: callState.callStatus
          });
          
          const callId = callState.incomingCall?.id || callState.currentCallId;
          if (callId) {
            get().handleCallInBackground(callId);
          }
          
          // Keep WebRTC subscription active for calls
          console.log('🔄 [AppState] Maintaining WebRTC subscription for background call');
        } else {
          // No active call, normal background behavior
          await userService.updateOnlineStatus(currentUser.id, 'offline');
          get().stopHeartbeat();
        }
      }
    }
    
    get().setAppState(nextAppState);
  },

  initializeAppStateMonitoring: () => {
    // Set up app state change listener
    const subscription = AppState.addEventListener('change', get().handleAppStateChange);
    
    // Start heartbeat if app is active
    if (AppState.currentState === 'active') {
      get().startHeartbeat();
      get().updateActivity();
    }
    
    // Return cleanup function
    return () => {
      subscription?.remove();
      get().stopHeartbeat();
    };
  },

  logAppStateForCalls: () => {
    const state = get();
    const { useCallStore } = require('./useCallStore');
    const callState = useCallStore.getState();
    
    console.log('📱 [AppState] Current app state for calls:', {
      appState: state.appState,
      isActive: state.isActive,
      lastActivity: state.lastActivity.toISOString(),
      hasIncomingCall: !!callState.incomingCall,
      isInCall: callState.isInCall,
      callStatus: callState.callStatus,
      incomingCallId: callState.incomingCall?.id,
      isInCallBackground: state.isInCallBackground,
      webrtcSubscriptionActive: state.webrtcSubscriptionActive,
      callNotificationReceived: state.callNotificationReceived,
      timestamp: new Date().toISOString()
    });
  },

  // Call-specific methods
  handleCallInBackground: (callId: string) => {
    console.log('📞 [AppState] Handling call in background:', { callId });
    set({
      isInCallBackground: true,
      backgroundCallStartTime: new Date(),
      webrtcSubscriptionActive: true
    });
    
    // Ensure WebRTC subscription persists
    try {
      webrtcService.maintainBackgroundSubscription();
    } catch (error) {
      console.error('❌ [AppState] Failed to maintain background subscription:', error);
    }
  },

  handleCallNotificationReceived: () => {
    console.log('📞 [AppState] Call notification received');
    set({
      callNotificationReceived: true,
      lastCallNotificationTime: new Date()
    });
  },

  ensureWebRTCSubscription: () => {
    const { webrtcSubscriptionActive } = get();
    
    if (!webrtcSubscriptionActive) {
      console.log('🔄 [AppState] Ensuring WebRTC subscription is active');
      try {
        webrtcService.ensureSubscriptionActive();
        set({ webrtcSubscriptionActive: true });
      } catch (error) {
        console.error('❌ [AppState] Failed to ensure WebRTC subscription:', error);
      }
    } else {
      console.log('✅ [AppState] WebRTC subscription already active');
    }
  },

  handleAppWakeFromCall: () => {
    console.log('📞 [AppState] Handling app wake from call notification');
    
    // Reset call notification state
    set({ callNotificationReceived: false });
    
    // Ensure WebRTC is ready
    get().ensureWebRTCSubscription();
    
    // Log wake-up details
    const { lastCallNotificationTime } = get();
    if (lastCallNotificationTime) {
      const wakeDelay = Date.now() - lastCallNotificationTime.getTime();
      console.log('📞 [AppState] Wake delay from notification:', { wakeDelay });
    }
  },

  cleanupCallBackground: () => {
    console.log('🧹 [AppState] Cleaning up call background state');
    
    const { backgroundCallStartTime } = get();
    if (backgroundCallStartTime) {
      const backgroundDuration = Date.now() - backgroundCallStartTime.getTime();
      console.log('📞 [AppState] Call background duration:', { backgroundDuration });
    }
    
    set({
      isInCallBackground: false,
      backgroundCallStartTime: null,
      callNotificationReceived: false,
      lastCallNotificationTime: null
    });
  },
}));
