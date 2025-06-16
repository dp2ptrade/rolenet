import { create } from 'zustand';
import { Call, User } from '@/lib/types';
import { callService } from '@/lib/supabaseService';
import { webrtcService, WebRTCCallbacks, CallData } from '@/lib/webrtcService';
import { MediaStream, MediaStreamConstructor } from '../lib/webrtcCompat';

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
  loadCallHistory: (userId: string) => Promise<void>;
  subscribeToCall: (callId: string) => void;
  unsubscribeFromCall: () => void;
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
  
  // Basic setters
  setCurrentCall: (call) => set({ currentCall: call }),
  setCallHistory: (history) => set({ callHistory: history }),
  setIncomingCall: (call) => set({ incomingCall: call }),
  setOutgoingCall: (call) => set({ outgoingCall: call }),
  setInCall: (inCall) => set({ isInCall: inCall }),
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
    webrtcService.setUserId(userId);
    
    const callbacks: WebRTCCallbacks = {
      onIncomingCall: (callData: CallData) => {
        set({ 
          incomingCall: callData as Call,
          callStatus: 'ringing'
        });
      },
      onCallAccepted: () => {
        set({ 
          callStatus: 'connected',
          isInCall: true
        });
      },
      onCallDeclined: () => {
        set({ 
          callStatus: 'ended',
          incomingCall: null,
          outgoingCall: null
        });
      },
      onCallEnded: () => {
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
    
    webrtcService.setCallbacks(callbacks);
  },
  
  // WebRTC Call actions
  initiateCall: async (calleeId: string) => {
    try {
      set({ isLoading: true, callStatus: 'calling' });
      const callId = await webrtcService.initiateCall(calleeId);
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
  
  loadCallHistory: async (userId) => {
    try {
      set({ isLoading: true });
      const { data: history, error } = await callService.getCallHistory(userId);
      
      if (error) {
        throw error;
      }
      
      set({ callHistory: history || [] });
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
}));