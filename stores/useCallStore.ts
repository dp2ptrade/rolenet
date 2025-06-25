import { create } from 'zustand';
import { Call, User } from '../lib/types';
import { callService } from '../lib/supabaseService';
import { webrtcService, WebRTCCallbacks, CallData } from '../lib/webrtcService';
import { MediaStream, MediaStreamConstructor } from '../lib/webrtcCompat';
import { AppState } from 'react-native';
import { useUserStore } from './useUserStore';

type RNMediaStream = InstanceType<MediaStreamConstructor>;

interface CallState {
  currentCall: Call | null;
  callHistory: Call[];
  incomingCall: Call | null;
  outgoingCall: Call | null;
  isInCall: boolean;
  isMuted: boolean;
  isSpeakerOn: boolean;
  isLoading: boolean;
  subscription: any;
  currentSubscriptionCallId?: string; // Track the current call ID we're subscribed to
  callStatus: 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';
  localStream: RNMediaStream | null;
  remoteStream: RNMediaStream | null;
  connectionState: string;
  missedCallsCount: number;
  
  // App state integration
  currentCallId: string | null;
  lastCallNotificationTime: Date | null;
  callInBackground: boolean;
  
  // Basic setters
  setCurrentCall: (call: Call | null) => void;
  setCallHistory: (history: Call[]) => void;
  setIncomingCall: (call: Call | null) => void;
  setOutgoingCall: (call: Call | null) => void;
  setInCall: (inCall: boolean) => void;
  setMuted: (muted: boolean) => void;
  setSpeakerOn: (speakerOn: boolean) => void;
  setLoading: (loading: boolean) => void;
  addCallToHistory: (call: Call) => void;
  updateCall: (callId: string, updates: Partial<Call>) => void;
  
  // Debug helpers
  logCallState: () => void;
  
  // WebRTC actions
  initializeWebRTC: (userId: string) => void;
  initiateCall: (calleeId: string) => Promise<string>;
  acceptCall: (callId: string) => Promise<void>;
  declineCall: (callId: string) => Promise<void>;
  endCall: () => Promise<void>;
  toggleMute: () => Promise<void>;
  toggleSpeaker: () => Promise<void>;
  
  // Legacy call actions
  updateCallData: (callId: string, updates: Partial<Call>) => Promise<void>;
  loadCallHistory: () => Promise<void>;
  subscribeToCall: (callId: string) => void;
  unsubscribeFromCall: () => void;
  
  // App state integration methods
  handleCallNotification: (callData: CallData) => void;
  notifyAppStateOfCall: (callId: string) => void;
  handleBackgroundCall: () => void;
  handleForegroundCall: () => void;
}

export const useCallStore = create<CallState>((set, get) => ({
  currentCall: null,
  callHistory: [],
  incomingCall: null,
  outgoingCall: null,
  isInCall: false,
  isMuted: false,
  isSpeakerOn: false,
  isLoading: false,
  subscription: null,
  currentSubscriptionCallId: undefined,
  callStatus: 'idle',
  localStream: null,
  remoteStream: null,
  connectionState: 'new',
  missedCallsCount: 0,
  
  // App state integration
  currentCallId: null,
  lastCallNotificationTime: null,
  callInBackground: false,
  
  // Basic setters
  setCurrentCall: (call) => {
    console.log('🔄 [CallStore] Setting current call:', call?.id || 'null');
    set({ currentCall: call });
  },
  setCallHistory: (history) => set({ callHistory: history }),
  setIncomingCall: (call) => {
    const prevCall = get().incomingCall;
    console.log('📞 [CallStore] Incoming call state change:', {
      previous: prevCall?.id || 'null',
      new: call?.id || 'null',
      caller: call?.caller_id,
      status: call?.status,
      timestamp: new Date().toISOString()
    });
    set({ incomingCall: call });
  },
  setOutgoingCall: (call) => {
    console.log('📱 [CallStore] Setting outgoing call:', call?.id || 'null');
    set({ outgoingCall: call });
  },
  setInCall: (inCall) => {
    console.log('🎯 [CallStore] In-call state changed:', inCall);
    set({ isInCall: inCall });
  },
  setMuted: (muted) => set({ isMuted: muted }),
  setSpeakerOn: (speakerOn) => set({ isSpeakerOn: speakerOn }),
  setLoading: (loading) => set({ isLoading: loading }),
  
  addCallToHistory: (call) => {
    const { callHistory } = get();
    set({ callHistory: [call, ...callHistory] });
  },
  
  updateCall: (callId, updates) => {
    const { callHistory, currentCall } = get();
    
    // Update in history
    const updatedHistory = callHistory.map(call => 
      call.id === callId ? { ...call, ...updates } : call
    );
    
    // Update current call if it matches
    const updatedCurrentCall = currentCall?.id === callId 
      ? { ...currentCall, ...updates } 
      : currentCall;
    
    set({ 
      callHistory: updatedHistory, 
      currentCall: updatedCurrentCall 
    });
  },

  // WebRTC Integration
  initializeWebRTC: (userId: string) => {
    const callbacks: WebRTCCallbacks = {
      onIncomingCall: (callData: CallData) => {
        console.log('🔔 [WebRTC] Incoming call received:', {
          callId: callData.id,
          caller: callData.caller_id,
          callee: callData.callee_id,
          status: callData.status,
          appState: AppState.currentState,
          timestamp: new Date().toISOString()
        });
        
        // Handle call notification with app state integration
        get().handleCallNotification(callData);
        
        set({ 
          incomingCall: callData as Call,
          callStatus: 'ringing',
          currentCallId: callData.id,
          lastCallNotificationTime: new Date()
        });
        
        // Notify app state store about the call
        get().notifyAppStateOfCall(callData.id);
        
        // Log state after setting
        setTimeout(() => get().logCallState(), 100);
      },
      onCallAccepted: () => {
        console.log('✅ [WebRTC] Call accepted');
        set({ 
          callStatus: 'connected',
          isInCall: true
        });
      },
      onCallDeclined: () => {
        console.log('❌ [WebRTC] Call declined');
        set({ 
          callStatus: 'ended',
          incomingCall: null,
          outgoingCall: null
        });
      },
      onCallEnded: () => {
        console.log('🔚 [WebRTC] Call ended');
        set({ 
          callStatus: 'ended',
          isInCall: false,
          incomingCall: null,
          outgoingCall: null,
          currentCall: null,
          localStream: null,
          remoteStream: null
        });
      },
      onLocalStream: (stream: RNMediaStream) => {
        set({ localStream: stream });
      },
      onRemoteStream: (stream: RNMediaStream) => {
        set({ remoteStream: stream });
      },
      onConnectionStateChange: (state: string) => {
        set({ connectionState: state });
      },
      onError: (error: Error) => {
        console.error('WebRTC Error:', error);
        set({ 
          callStatus: 'ended',
          isLoading: false
        });
      }
    };

    webrtcService.initialize(userId, callbacks);
  },
  
  // WebRTC Call actions
  initiateCall: async (calleeId: string) => {
    try {
      set({ isLoading: true, callStatus: 'calling' });
      const callId = await webrtcService.makeCall(calleeId);
      set({ 
        isLoading: false,
        callStatus: 'ringing'
      });
      return callId;
    } catch (error) {
      set({ isLoading: false, callStatus: 'idle' });
      throw error;
    }
  },

  acceptCall: async (callId: string) => {
    try {
      set({ isLoading: true });
      await webrtcService.acceptCall(callId);
      set({ 
        isLoading: false,
        callStatus: 'connected',
        isInCall: true,
        incomingCall: null
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  declineCall: async (callId: string) => {
    try {
      await webrtcService.declineCall(callId);
      set({ 
        incomingCall: null,
        callStatus: 'idle'
      });
    } catch (error) {
      console.error('Error declining call:', error);
    }
  },

  endCall: async () => {
    try {
      await webrtcService.endCall();
      set({ 
        isInCall: false,
        callStatus: 'ended',
        currentCall: null,
        incomingCall: null,
        outgoingCall: null,
        localStream: null,
        remoteStream: null
      });
    } catch (error) {
      console.error('Error ending call:', error);
    }
  },

  toggleMute: async () => {
    try {
      const isMuted = await webrtcService.toggleMute();
      set({ isMuted });
    } catch (error) {
      console.error('Error toggling mute:', error);
    }
  },

  toggleSpeaker: async () => {
    try {
      const isSpeakerOn = await webrtcService.toggleSpeaker();
      set({ isSpeakerOn });
    } catch (error) {
      console.error('Error toggling speaker:', error);
    }
  },
  
  updateCallData: async (callId, updates) => {
    try {
      const { data: updatedCall, error } = await callService.updateCall(callId, updates);
      
      if (error) {
        throw error;
      }
      
      const state = get();
      
      if (state.currentCall?.id === callId) {
        set({ currentCall: updatedCall });
      }
      
      if (state.incomingCall?.id === callId) {
        set({ incomingCall: updatedCall });
      }
      
      if (state.outgoingCall?.id === callId) {
        set({ outgoingCall: updatedCall });
      }
    } catch (error) {
      console.error('Update call data error:', error);
      throw error;
    }
  },
  
  loadCallHistory: async () => {
    try {
      set({ isLoading: true });
      const currentUser = useUserStore.getState().user;
      
      if (!currentUser?.id) {
        throw new Error('No user logged in');
      }
      
      const { data: history, error } = await callService.getCallHistory(currentUser.id);
      
      if (error) {
        throw error;
      }
      
      // Calculate missed calls count
      const missedCalls = (history || []).filter((call: Call) => 
        call.status === 'missed' && call.callee_id === currentUser.id
      );
      
      set({ 
        callHistory: history || [],
        missedCallsCount: missedCalls.length
      });
    } catch (error) {
      console.error('Load call history error:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  
  subscribeToCall: (callId) => {
    const { subscription } = get();
    
    // Unsubscribe from existing subscription
    if (subscription) {
      subscription.unsubscribe();
    }
    
    // Subscribe to call updates
    const newSubscription = callService.subscribeToCall(callId, (payload) => {
      const updatedCall = payload.new;
      const { updateCall } = get();
      updateCall(callId, updatedCall);
    });
    
    set({ subscription: newSubscription });
  },
  
  unsubscribeFromCall: () => {
    const { subscription } = get();
    if (subscription) {
      subscription.unsubscribe();
      set({ subscription: null });
    }
  },
  
  // Legacy endCall method for database operations
  endCallLegacy: () => {
    const { currentCall, addCallToHistory, unsubscribeFromCall } = get();
    
    if (currentCall) {
      // Add to history
      addCallToHistory({
        ...currentCall,
        status: 'ended',
        ended_at: new Date()
      });
      
      // Update call in database
      callService.updateCall(currentCall.id, {
        status: 'ended',
        ended_at: new Date()
      }).catch(error => {
        console.error('Error updating call status:', error);
      });
    }
    
    // Clean up state
    set({
      currentCall: null,
      incomingCall: null,
      outgoingCall: null,
      isInCall: false,
      isMuted: false,
      isSpeakerOn: false
    });
    
    // Unsubscribe from call updates
    unsubscribeFromCall();
  },

  // Debug logging method
  logCallState: () => {
    const state = get();
    console.log('🔍 [CallStore] Current state:', {
      incomingCall: state.incomingCall ? {
        id: state.incomingCall.id,
        caller_id: state.incomingCall.caller_id,
        callee_id: state.incomingCall.callee_id,
        status: state.incomingCall.status
      } : null,
      currentCall: state.currentCall ? {
        id: state.currentCall.id,
        status: state.currentCall.status
      } : null,
      outgoingCall: state.outgoingCall ? {
        id: state.outgoingCall.id,
        status: state.outgoingCall.status
      } : null,
      callStatus: state.callStatus,
      isInCall: state.isInCall,
      isMuted: state.isMuted,
      isSpeakerOn: state.isSpeakerOn,
      hasLocalStream: !!state.localStream,
      hasRemoteStream: !!state.remoteStream,
      connectionState: state.connectionState,
      currentCallId: state.currentCallId,
      callInBackground: state.callInBackground,
      lastCallNotificationTime: state.lastCallNotificationTime?.toISOString(),
      timestamp: new Date().toISOString()
    });
  },

  // App state integration methods
  handleCallNotification: (callData: CallData) => {
    console.log('📞 [CallStore] Handling call notification:', {
      callId: callData.id,
      appState: AppState.currentState,
      timestamp: new Date().toISOString()
    });
    
    // Check if app is in background
    if (AppState.currentState !== 'active') {
      console.log('📱 [CallStore] App is backgrounded during call notification');
      set({ callInBackground: true });
      get().handleBackgroundCall();
    }
  },

  notifyAppStateOfCall: (callId: string) => {
    try {
      // Import app state store dynamically to avoid circular dependency
      const { useAppStateStore } = require('./useAppStateStore');
      const appStateStore = useAppStateStore.getState();
      
      console.log('📱 [CallStore] Notifying app state of call:', { callId });
      appStateStore.handleCallNotificationReceived();
      
      // If app is in background, handle accordingly
      if (AppState.currentState !== 'active') {
        appStateStore.handleCallInBackground(callId);
      }
    } catch (error) {
      console.error('❌ [CallStore] Failed to notify app state:', error);
    }
  },

  handleBackgroundCall: () => {
    console.log('📱 [CallStore] Handling call in background');
    
    // Ensure WebRTC subscription remains active
    try {
      webrtcService.maintainBackgroundSubscription();
    } catch (error) {
      console.error('❌ [CallStore] Failed to maintain background subscription:', error);
    }
    
    // Set background call state
    set({ callInBackground: true });
  },

  handleForegroundCall: () => {
    console.log('📱 [CallStore] Handling call return to foreground');
    
    // Ensure WebRTC subscription is active
    try {
      webrtcService.ensureSubscriptionActive();
    } catch (error) {
      console.error('❌ [CallStore] Failed to ensure subscription:', error);
    }
    
    // Clear background call state
    set({ callInBackground: false });
    
    // Log current call state
    get().logCallState();
  },
}));