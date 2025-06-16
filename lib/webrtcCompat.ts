// WebRTC Compatibility Layer for Expo Go
// This provides fallback implementations when native modules are not available

import { Platform } from 'react-native';

// Check if we're running in Expo Go environment
const isExpoGo = __DEV__ && Platform.OS === 'web';

// Mock WebRTC implementations for Expo Go
class MockRTCPeerConnection {
  constructor(config?: any) {
    console.info('📱 MockRTCPeerConnection: Using fallback implementation. For real WebRTC calls, create a development build with: npx expo run:ios or npx expo run:android');
  }

  createOffer() {
    return Promise.resolve({
      type: 'offer',
      sdp: 'mock-offer-sdp'
    });
  }

  createAnswer() {
    return Promise.resolve({
      type: 'answer',
      sdp: 'mock-answer-sdp'
    });
  }

  setLocalDescription(desc: any) {
    return Promise.resolve();
  }

  setRemoteDescription(desc: any) {
    return Promise.resolve();
  }

  addIceCandidate(candidate: any) {
    return Promise.resolve();
  }

  close() {
    // Mock close
  }

  addEventListener(event: string, handler: Function) {
    // Mock event listener
  }

  removeEventListener(event: string, handler: Function) {
    // Mock remove event listener
  }
}

class MockRTCSessionDescription {
  type: string;
  sdp: string;

  constructor(init: { type: string; sdp: string }) {
    this.type = init.type;
    this.sdp = init.sdp;
  }
}

class MockRTCIceCandidate {
  candidate: string;
  sdpMLineIndex: number;
  sdpMid: string;

  constructor(init: any) {
    this.candidate = init.candidate || '';
    this.sdpMLineIndex = init.sdpMLineIndex || 0;
    this.sdpMid = init.sdpMid || '';
  }
}

class MockMediaStream {
  id: string;
  active: boolean = true;
  onaddtrack: ((this: MediaStream, ev: MediaStreamTrackEvent) => any) | null = null;
  onremovetrack: ((this: MediaStream, ev: MediaStreamTrackEvent) => any) | null = null;

  constructor() {
    this.id = 'mock-stream-' + Math.random().toString(36).substr(2, 9);
  }

  getTracks() {
    return [];
  }

  getAudioTracks() {
    return [];
  }

  getVideoTracks() {
    return [];
  }

  addTrack(track: any) {
    // Mock add track
  }

  removeTrack(track: any) {
    // Mock remove track
  }

  clone(): MediaStream {
    return new MockMediaStream() as any;
  }

  getTrackById(trackId: string): MediaStreamTrack | null {
    return null;
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void {
    // Mock addEventListener
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void {
    // Mock removeEventListener
  }

  dispatchEvent(event: Event): boolean {
    return true;
  }
}

const mockMediaDevices = {
  getUserMedia: (constraints: any) => {
    console.info('🎤 MockMediaDevices: Using mock audio stream. Real microphone access requires a development build.');
    return Promise.resolve(new MockMediaStream());
  },
  enumerateDevices: () => {
    return Promise.resolve([]);
  }
};

// Type definitions for WebRTC components
type MediaStreamConstructor = new () => {
  id: string;
  active: boolean;
  onaddtrack: ((this: MediaStream, ev: MediaStreamTrackEvent) => any) | null;
  onremovetrack: ((this: MediaStream, ev: MediaStreamTrackEvent) => any) | null;
  getTracks(): any[];
  getAudioTracks(): any[];
  getVideoTracks(): any[];
  addTrack(track: any): void;
  removeTrack(track: any): void;
  clone(): MediaStream;
  getTrackById(trackId: string): MediaStreamTrack | null;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
  dispatchEvent(event: Event): boolean;
};

// Export the appropriate implementations based on environment
let RTCPeerConnection: any;
let RTCSessionDescription: any;
let RTCIceCandidate: any;
let MediaStream: MediaStreamConstructor;
let mediaDevices: any;

try {
  // Try to import the real WebRTC modules
  const webrtc = require('react-native-webrtc');
  RTCPeerConnection = webrtc.RTCPeerConnection;
  RTCSessionDescription = webrtc.RTCSessionDescription;
  RTCIceCandidate = webrtc.RTCIceCandidate;
  MediaStream = webrtc.MediaStream as MediaStreamConstructor;
  mediaDevices = webrtc.mediaDevices;
  console.log('✅ WebRTC native module loaded successfully');
} catch (error) {
  console.warn('⚠️  WebRTC native module not available. This is expected in Expo Go - use a development build for WebRTC functionality.');
  // Use mock implementations
  RTCPeerConnection = MockRTCPeerConnection;
  RTCSessionDescription = MockRTCSessionDescription;
  RTCIceCandidate = MockRTCIceCandidate;
  MediaStream = MockMediaStream as MediaStreamConstructor;
  mediaDevices = mockMediaDevices;
}

export {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  MediaStream,
  mediaDevices
};

export type { MediaStreamConstructor };

export const isWebRTCAvailable = () => {
  try {
    require('react-native-webrtc');
    return true;
  } catch {
    return false;
  }
};