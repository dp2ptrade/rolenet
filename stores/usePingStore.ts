import { create } from 'zustand';
import { Ping } from '@/lib/types';

interface PingState {
  receivedPings: Ping[];
  sentPings: Ping[];
  respondedPings: Ping[];
  isLoading: boolean;
  
  setReceivedPings: (pings: Ping[]) => void;
  setSentPings: (pings: Ping[]) => void;
  setRespondedPings: (pings: Ping[]) => void;
  addReceivedPing: (ping: Ping) => void;
  addSentPing: (ping: Ping) => void;
  updatePing: (pingId: string, updates: Partial<Ping>) => void;
  setLoading: (loading: boolean) => void;
}

export const usePingStore = create<PingState>((set, get) => ({
  receivedPings: [],
  sentPings: [],
  respondedPings: [],
  isLoading: false,
  
  setReceivedPings: (pings) => set({ receivedPings: pings }),
  setSentPings: (pings) => set({ sentPings: pings }),
  setRespondedPings: (pings) => set({ respondedPings: pings }),
  
  addReceivedPing: (ping) => {
    const { receivedPings } = get();
    set({ receivedPings: [ping, ...receivedPings] });
  },
  
  addSentPing: (ping) => {
    const { sentPings } = get();
    set({ sentPings: [ping, ...sentPings] });
  },
  
  updatePing: (pingId, updates) => {
    const state = get();
    
    const updatePingsArray = (pings: Ping[]) =>
      pings.map(ping => ping.id === pingId ? { ...ping, ...updates } : ping);
    
    set({
      receivedPings: updatePingsArray(state.receivedPings),
      sentPings: updatePingsArray(state.sentPings),
      respondedPings: updatePingsArray(state.respondedPings),
    });
  },
  
  setLoading: (loading) => set({ isLoading: loading }),
}));