import { create } from 'zustand';
import { Call, User } from '@/lib/types';

interface CallState {
  currentCall: Call | null;
  callHistory: Call[];
  incomingCall: Call | null;
  outgoingCall: Call | null;
  isInCall: boolean;
  isMuted: boolean;
  isSpeakerOn: boolean;
  
  setCurrentCall: (call: Call | null) => void;
  setCallHistory: (history: Call[]) => void;
  setIncomingCall: (call: Call | null) => void;
  setOutgoingCall: (call: Call | null) => void;
  setInCall: (inCall: boolean) => void;
  setMuted: (muted: boolean) => void;
  setSpeakerOn: (speakerOn: boolean) => void;
  addCallToHistory: (call: Call) => void;
  updateCall: (callId: string, updates: Partial<Call>) => void;
}

export const useCallStore = create<CallState>((set, get) => ({
  currentCall: null,
  callHistory: [],
  incomingCall: null,
  outgoingCall: null,
  isInCall: false,
  isMuted: false,
  isSpeakerOn: false,
  
  setCurrentCall: (call) => set({ currentCall: call }),
  setCallHistory: (history) => set({ callHistory: history }),
  setIncomingCall: (call) => set({ incomingCall: call }),
  setOutgoingCall: (call) => set({ outgoingCall: call }),
  setInCall: (inCall) => set({ isInCall: inCall }),
  setMuted: (muted) => set({ isMuted: muted }),
  setSpeakerOn: (speakerOn) => set({ isSpeakerOn: speakerOn }),
  
  addCallToHistory: (call) => {
    const { callHistory } = get();
    set({ callHistory: [call, ...callHistory] });
  },
  
  updateCall: (callId, updates) => {
    const state = get();
    
    if (state.currentCall?.id === callId) {
      set({ currentCall: { ...state.currentCall, ...updates } });
    }
    
    if (state.incomingCall?.id === callId) {
      set({ incomingCall: { ...state.incomingCall, ...updates } });
    }
    
    if (state.outgoingCall?.id === callId) {
      set({ outgoingCall: { ...state.outgoingCall, ...updates } });
    }
    
    const updateHistoryArray = (history: Call[]) =>
      history.map(call => call.id === callId ? { ...call, ...updates } : call);
    
    set({ callHistory: updateHistoryArray(state.callHistory) });
  },
}));