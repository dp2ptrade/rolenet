import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
  MediaStream,
  MediaStreamConstructor,
  isWebRTCAvailable
} from './webrtcCompat';

type RNMediaStream = InstanceType<MediaStreamConstructor>;
import { supabase } from './supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Platform } from 'react-native';

export interface CallData {
  id: string;
  caller_id: string;
  callee_id: string;
  offer?: RTCSessionDescription;
  answer?: RTCSessionDescription;
  ice_candidates: RTCIceCandidate[];
  status: 'pending' | 'ringing' | 'active' | 'ended' | 'declined' | 'missed';
  created_at: Date;
  ended_at?: Date;
}

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'call-ended';
  callId: string | null;
  targetUserId?: string;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

export interface WebRTCCallbacks {
  onIncomingCall?: (callData: CallData) => void;
  onCallAccepted?: (callId: string) => void;
  onCallDeclined?: (callId?: string) => void;
  onCallEnded?: (callId: string | null) => void;
  onRemoteStream?: (stream: RNMediaStream) => void;
  onLocalStream?: (stream: RNMediaStream) => void;
  onConnectionStateChange?: (state: string) => void;
  onError?: (error: Error) => void;
  onWarning?: (message: string) => void;
}

class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: RNMediaStream | null = null;
  private remoteStream: RNMediaStream | null = null;
  private channel: RealtimeChannel | null = null;
  private currentCallId: string | null = null;
  private callbacks: WebRTCCallbacks = {};
  private isInitiator = false;
  private userId: string | null = null;
  private isSubscribed: boolean = false;

  // STUN/TURN servers configuration
  private readonly pcConfig = {
    iceServers: this.getIceServers(),
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle' as RTCBundlePolicy,
    rtcpMuxPolicy: 'require' as RTCRtcpMuxPolicy,
  };

  private getIceServers(): RTCIceServer[] {
    const iceServers: RTCIceServer[] = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
    ];

    // Add primary TURN server if configured
    const turnUrl = process.env.EXPO_PUBLIC_TURN_SERVER_URL;
    const turnUsername = process.env.EXPO_PUBLIC_TURN_SERVER_USERNAME;
    const turnCredential = process.env.EXPO_PUBLIC_TURN_SERVER_CREDENTIAL;

    if (turnUrl && turnUsername && turnCredential) {
      iceServers.push({
        urls: turnUrl,
        username: turnUsername,
        credential: turnCredential
      } as RTCIceServer);
      console.log('✅ Primary TURN server configured');
    } else {
      console.warn('⚠️ Primary TURN server not configured - using STUN only');
    }

    // Add backup TURN server if configured
    const backupTurnUrl = process.env.EXPO_PUBLIC_BACKUP_TURN_SERVER_URL;
    const backupTurnUsername = process.env.EXPO_PUBLIC_BACKUP_TURN_SERVER_USERNAME;
    const backupTurnCredential = process.env.EXPO_PUBLIC_BACKUP_TURN_SERVER_CREDENTIAL;

    if (backupTurnUrl && backupTurnUsername && backupTurnCredential) {
      iceServers.push({
        urls: backupTurnUrl,
        username: backupTurnUsername,
        credential: backupTurnCredential
      } as RTCIceServer);
      console.log('✅ Backup TURN server configured');
    }

    return iceServers;
  }

  async initialize(userId: string, callbacks: WebRTCCallbacks): Promise<void> {
    if (!isWebRTCAvailable()) {
      throw new Error('WebRTC is not available on this device');
    }

    this.userId = userId;
    this.callbacks = callbacks;
    
    try {
      await this.setupRealtimeSubscription();
      console.log('✅ WebRTC service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize WebRTC service:', error);
      throw error;
    }
  }

  private async setupRealtimeSubscription(): Promise<void> {
    if (!this.userId) {
      throw new Error('User ID is required for realtime subscription');
    }

    try {
      // Unsubscribe from existing channel if any
      if (this.channel) {
        await this.channel.unsubscribe();
      }

      // Create new channel
      this.channel = supabase.channel(`webrtc-${this.userId}`);
      
      // Set up event listeners
      this.channel
        .on('broadcast', { event: 'call_signal' }, (payload) => {
          this.handleSignalingMessage(payload.payload);
        })
        .on('broadcast', { event: 'incoming_call' }, (payload) => {
          this.handleIncomingCall(payload.payload);
          });

      // Subscribe to the channel
      await this.channel.subscribe();
      this.isSubscribed = true;
      
      console.log('✅ Realtime subscription established');
    } catch (error) {
      console.error('❌ Failed to setup realtime subscription:', error);
      this.isSubscribed = false;
      throw error;
    }
  }

  private handleSignalingMessage(message: SignalingMessage): void {
    if (!message || message.callId !== this.currentCallId) {
      return;
    }

    console.log('📨 Received signaling message:', message.type);

    switch (message.type) {
      case 'offer':
        if (message.offer) {
          this.handleOffer(message.offer);
        }
        break;
      case 'answer':
        if (message.answer) {
          this.handleAnswer(message.answer);
        }
        break;
      case 'ice-candidate':
        if (message.candidate) {
          this.handleIceCandidate(message.candidate);
        }
        break;
      case 'call-ended':
        this.handleCallEnded();
        break;
      default:
        console.warn('Unknown signaling message type:', message.type);
    }
  }

  async makeCall(targetUserId: string, includeVideo: boolean = false): Promise<string> {
    if (!this.userId) {
      throw new Error('WebRTC service not initialized');
    }

    try {
      // Create call record in database
      const { data: callData, error } = await supabase
        .from('calls')
        .insert({
          caller_id: this.userId,
          callee_id: targetUserId,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;
      if (!callData) throw new Error('Failed to create call record');

      this.currentCallId = callData.id;
      this.isInitiator = true;

      // Setup peer connection and get local stream
      await this.setupPeerConnection();
      await this.getLocalStream();
      
      // Send incoming call notification
      const tempChannel = supabase.channel(`temp-${targetUserId}`);
      await tempChannel.subscribe();
      await tempChannel.send({
        type: 'broadcast',
        event: 'incoming_call',
        payload: callData
      });
      await tempChannel.unsubscribe();

      // Initiate the call
      await this.initiateCall();
      
      return callData.id;
    } catch (error) {
      console.error('❌ Error making call:', error);
      this.cleanup();
      throw error;
    }
  }

  private async initiateCall(): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      
      if (this.currentCallId) {
        await this.sendSignalingMessage({
          type: 'offer',
          offer: offer,
          callId: this.currentCallId,
        });
      }
      
      console.log('✅ Call initiated successfully');
    } catch (error) {
      console.error('❌ Error initiating call:', error);
      throw error;
    }
  }

  async acceptCall(callId: string): Promise<void> {
    try {
      this.currentCallId = callId;
      this.isInitiator = false;

      // Update call status in database
      const { error } = await supabase
        .from('calls')
        .update({ status: 'active' })
        .eq('id', callId);

      if (error) throw error;

      // Setup peer connection and get local stream
      await this.setupPeerConnection();
      await this.getLocalStream();
      
      console.log('✅ Call accepted successfully');
    } catch (error) {
      console.error('❌ Error accepting call:', error);
      this.cleanup();
      throw error;
    }
  }

  async declineCall(callId: string): Promise<void> {
    try {
      // Update call status in database
      const { error } = await supabase
        .from('calls')
        .update({ status: 'declined' })
        .eq('id', callId);

      if (error) throw error;

      // Send signaling message
      await this.sendSignalingMessage({
        type: 'call-ended',
        callId: callId,
      });
      
      this.cleanup();
      this.callbacks.onCallDeclined?.(callId);
      
      console.log('✅ Call declined successfully');
    } catch (error) {
      console.error('❌ Error declining call:', error);
      throw error;
    }
  }

  async endCall(): Promise<void> {
    const callId = this.currentCallId;
    
    try {
      // Update call status in database
      if (callId) {
        const { error } = await supabase
          .from('calls')
          .update({ 
            status: 'ended',
            ended_at: new Date().toISOString()
          })
          .eq('id', callId);

        if (error) {
          console.error('❌ Error updating call status:', error);
        }

        // Send signaling message to other participant
        try {
          await this.sendSignalingMessage({
            type: 'call-ended',
            callId: callId,
          });
        } catch (signalingError) {
          console.error('❌ Error sending call-ended signal:', signalingError);
        }
      }
      
      this.cleanup();
      this.callbacks.onCallEnded?.(callId);
      
      console.log('✅ Call ended successfully');
    } catch (error) {
      console.error('❌ Error ending call:', error);
      this.cleanup();
      throw error;
    }
  }

  toggleMute(): boolean {
    if (!this.localStream) {
      console.warn('⚠️ No local stream available for muting');
      return false;
    }

    const audioTracks = this.localStream.getAudioTracks();
    if (audioTracks.length > 0) {
      const currentlyMuted = !audioTracks[0].enabled;
      audioTracks[0].enabled = currentlyMuted;
      console.log(`🎤 Audio ${currentlyMuted ? 'unmuted' : 'muted'}`);
      return !currentlyMuted;
    }
    
    return false;
  }

  async toggleSpeaker(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        return await this.toggleSpeakerIOS();
      } else if (Platform.OS === 'android') {
        return await this.toggleSpeakerAndroid();
      } else {
        console.warn('⚠️ Speaker toggle not supported on this platform');
        return false;
      }
    } catch (error) {
      console.error('❌ Error toggling speaker:', error);
      return false;
    }
  }

  private async toggleSpeakerIOS(): Promise<boolean> {
    try {
      if (!mediaDevices || typeof mediaDevices.selectAudioOutput !== 'function') {
        console.warn('⚠️ selectAudioOutput not available');
        return false;
      }

      const audioOutputs = await mediaDevices.enumerateDevices();
      if (!Array.isArray(audioOutputs)) {
        console.warn('⚠️ No audio outputs available');
        return false;
      }

      const speakers = audioOutputs.filter(device => device.kind === 'audiooutput');
      const targetSpeaker = speakers.find(speaker => 
        speaker.label.toLowerCase().includes('speaker') ||
        speaker.label.toLowerCase().includes('built-in')
      );

      if (targetSpeaker && targetSpeaker.deviceId) {
        await mediaDevices.selectAudioOutput({ deviceId: targetSpeaker.deviceId });
        console.log('🔊 Speaker toggled (iOS)');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Error toggling speaker (iOS):', error);
      return false;
    }
  }

  private async toggleSpeakerAndroid(): Promise<boolean> {
    try {
      if (!mediaDevices || typeof mediaDevices.selectAudioOutput !== 'function') {
        console.warn('⚠️ selectAudioOutput not available');
        return false;
      }

      const audioOutputs = await mediaDevices.enumerateDevices();
      if (!Array.isArray(audioOutputs)) {
        console.warn('⚠️ No audio outputs available');
        return false;
      }

      const targetDevice = audioOutputs.find(device => 
        device.kind === 'audiooutput' && 
        device.label && 
        device.deviceId &&
        (device.label.toLowerCase().includes('speaker') ||
         device.label.toLowerCase().includes('earpiece'))
      );

      if (targetDevice && targetDevice.label && targetDevice.deviceId) {
        await mediaDevices.selectAudioOutput({ deviceId: targetDevice.deviceId });
        console.log('🔊 Speaker toggled (Android)');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Error toggling speaker (Android):', error);
      return false;
    }
  }

  private async setupPeerConnection(): Promise<void> {
    const maxSetupAttempts = 3;
    let setupAttempts = 0;

    while (setupAttempts < maxSetupAttempts) {
      try {
        console.log(`🔄 Setting up peer connection (attempt ${setupAttempts + 1}/${maxSetupAttempts})`);
        
        // Close existing connection if any
        if (this.peerConnection) {
          this.peerConnection.close();
          this.peerConnection = null;
        }

        // Create new peer connection
        this.peerConnection = new RTCPeerConnection(this.pcConfig);
        console.log('✅ Peer connection created with config:', this.pcConfig);

        // Set up event listeners
        if (this.peerConnection) {
          this.peerConnection.addEventListener('icecandidate', (event) => {
          if (event.candidate && this.currentCallId) {
            console.log('Sending ICE candidate');
            this.sendSignalingMessage({
              type: 'ice-candidate',
              candidate: event.candidate,
              callId: this.currentCallId,
            }).catch(error => {
              console.error('Failed to send ICE candidate:', error);
            });
          }
          });

          this.peerConnection.addEventListener('track', (event) => {
          if (event.track) {
            console.log('Received remote track:', event.track.kind);
          }
          if (event.streams && event.streams[0]) {
            this.remoteStream = event.streams[0];
            this.callbacks.onRemoteStream?.(event.streams[0]);
          }
          });

          this.peerConnection.addEventListener('connectionstatechange', () => {
          const state = this.peerConnection?.connectionState;
          console.log('Peer connection state:', state);
          this.callbacks.onConnectionStateChange?.(state || 'unknown');
          
          if (state === 'failed' || state === 'disconnected') {
            this.callbacks.onError?.(new Error(`Peer connection ${state}`));
          } else if (state === 'connected') {
            console.log('Peer connection established successfully');
          }
          });

          this.peerConnection.addEventListener('iceconnectionstatechange', () => {
            const state = this.peerConnection?.iceConnectionState;
            console.log('ICE connection state:', state);
            
            if (state === 'failed') {
              this.callbacks.onError?.(new Error('ICE connection failed'));
            }
          });
        }

        // Add local stream tracks if available
        if (this.localStream) {
          const tracks = this.localStream.getTracks();
          if (tracks) {
            tracks.forEach(track => {
              if (this.peerConnection && this.localStream) {
                this.peerConnection.addTrack(track, this.localStream);
                console.log(`Added ${track.kind} track to peer connection`);
              }
            });
          }
        }

        console.log('✅ Peer connection setup completed successfully');
        return;
        
      } catch (error) {
        setupAttempts++;
        console.error(`❌ Error setting up peer connection (attempt ${setupAttempts}):`, error);
        
        if (setupAttempts >= maxSetupAttempts) {
          const errorMessage = this.getConnectionErrorMessage(error);
          this.callbacks.onError?.(new Error(errorMessage));
          throw new Error(errorMessage);
        }
        
        const retryDelay = Math.min(1000 * Math.pow(2, setupAttempts - 1), 5000);
        console.log(`⏳ Retrying peer connection setup in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  private getConnectionErrorMessage(error: any): string {
    const errorString = error?.toString() || 'Unknown error';
    
    if (errorString.includes('network')) {
      return 'Network connection failed. Please check your internet connection and try again.';
    } else if (errorString.includes('permission')) {
      return 'Camera or microphone permission denied. Please enable permissions and try again.';
    } else if (errorString.includes('NotFoundError')) {
      return 'Camera or microphone not found. Please check your device settings.';
    } else if (errorString.includes('NotAllowedError')) {
      return 'Camera or microphone access denied. Please allow permissions in your browser settings.';
    } else if (errorString.includes('ice')) {
      return 'Connection failed due to network restrictions. This may be due to firewall or NAT issues.';
    } else {
      return `Connection failed: ${errorString}. Please try again or contact support if the issue persists.`;
    }
  }

  private async getLocalStream(): Promise<void> {
    if (this.localStream) {
      console.log('Local stream already exists');
      return;
    }

    if (!mediaDevices) {
      const errorMessage = 'MediaDevices not available. WebRTC may not be supported on this device.';
      this.callbacks.onError?.(new Error(errorMessage));
      throw new Error(errorMessage);
    }

    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        const constraints = {
          video: retryCount === 0,
          audio: true
        };

        console.log(`📷 Requesting user media (attempt ${retryCount + 1}/${maxRetries}):`, constraints);
        this.localStream = await mediaDevices.getUserMedia(constraints);
        
        if (this.localStream) {
          console.log('✅ Local stream obtained:', {
            videoTracks: this.localStream.getVideoTracks().length,
            audioTracks: this.localStream.getAudioTracks().length
          });
          
          this.callbacks.onLocalStream?.(this.localStream);
          
          if (this.peerConnection) {
            const tracks = this.localStream.getTracks();
            if (tracks) {
              tracks.forEach(track => {
                this.peerConnection!.addTrack(track, this.localStream!);
              });
            }
          }
          
          return;
        }
        
      } catch (error) {
        retryCount++;
        console.error(`❌ Error getting local stream (attempt ${retryCount}):`, error);
        
        if (retryCount >= maxRetries) {
          const errorMessage = this.getMediaErrorMessage(error);
          this.callbacks.onError?.(new Error(errorMessage));
          throw new Error(errorMessage);
        }
        
        const retryDelay = 1000 * retryCount;
        console.log(`⏳ Retrying media access in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  private getMediaErrorMessage(error: any): string {
    const errorString = error?.toString() || 'Unknown error';
    
    if (errorString.includes('NotAllowedError') || errorString.includes('permission')) {
      return 'Camera and microphone access denied. Please allow permissions in your browser settings and try again.';
    } else if (errorString.includes('NotFoundError')) {
      return 'Camera or microphone not found. Please check that your devices are connected and try again.';
    } else if (errorString.includes('NotReadableError')) {
      return 'Camera or microphone is already in use by another application. Please close other apps and try again.';
    } else if (errorString.includes('OverconstrainedError')) {
      return 'Camera or microphone does not meet the required specifications. Please check your device settings.';
    } else if (errorString.includes('AbortError')) {
      return 'Media access was interrupted. Please try again.';
    } else {
      return `Failed to access camera or microphone: ${errorString}. Please check your device settings and try again.`;
    }
  }

  private async handleOffer(offer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        console.log(`📞 Handling offer (attempt ${retryCount + 1}/${maxRetries})`);
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer as any));
        
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        
        if (this.currentCallId) {
          await this.sendSignalingMessage({
            type: 'answer',
            answer: answer,
            callId: this.currentCallId,
          });
        }
        
        console.log('✅ Offer handled and answer sent successfully');
        return;
        
      } catch (error) {
        retryCount++;
        console.error(`❌ Error handling offer (attempt ${retryCount}):`, error);
        
        if (retryCount >= maxRetries) {
          const errorMessage = this.getConnectionErrorMessage(error);
          this.callbacks.onError?.(new Error(`Failed to handle incoming call: ${errorMessage}`));
          throw new Error(errorMessage);
        }
        
        const retryDelay = 1000 * retryCount;
        console.log(`⏳ Retrying offer handling in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  private async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        console.log(`📞 Handling answer (attempt ${retryCount + 1}/${maxRetries})`);
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer as any));
        this.callbacks.onCallAccepted?.(this.currentCallId || '');
        console.log('✅ Answer handled successfully');
        return;
        
      } catch (error) {
        retryCount++;
        console.error(`❌ Error handling answer (attempt ${retryCount}):`, error);
        
        if (retryCount >= maxRetries) {
          const errorMessage = this.getConnectionErrorMessage(error);
          this.callbacks.onError?.(new Error(`Failed to establish connection: ${errorMessage}`));
          throw new Error(errorMessage);
        }
        
        const retryDelay = 1000 * retryCount;
        console.log(`⏳ Retrying answer handling in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  private async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection) {
      console.warn('⚠️ Peer connection not initialized, ignoring ICE candidate');
      return;
    }

    const maxRetries = 3;
    let retryCount = 0;
    let lastError: any = null;

    while (retryCount < maxRetries) {
      try {
        console.log(`🧊 Handling ICE candidate (attempt ${retryCount + 1}/${maxRetries})`);
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        console.log('✅ ICE candidate added successfully');
        return;
      } catch (error) {
        lastError = error;
        retryCount++;
        console.error(`❌ Error handling ICE candidate (attempt ${retryCount}/${maxRetries}):`, error);
        
        if (this.peerConnection.connectionState === 'closed' || 
            this.peerConnection.connectionState === 'failed') {
          console.warn('⚠️ Peer connection is closed or failed, not retrying ICE candidate');
          break;
        }
        
        if (retryCount < maxRetries) {
          const retryDelay = 500 * Math.pow(2, retryCount - 1);
          console.log(`⏳ Retrying ICE candidate in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }
    
    if (lastError) {
      console.warn('⚠️ Failed to add ICE candidate after retries, this may be normal behavior');
      if (this.peerConnection.iceConnectionState === 'failed') {
        this.callbacks.onWarning?.('Network connectivity issue detected. Call quality may be affected.');
      }
    }
  }

  private handleCallEnded(): void {
    console.log('Call ended by remote peer');
    const callId = this.currentCallId;
    this.cleanup();
    this.callbacks.onCallEnded?.(callId);
  }

  private handleIncomingCall(callData: CallData): void {
    if (!callData || !callData.id || !callData.caller_id || !callData.callee_id) {
      console.error('❌ Invalid call data received:', callData);
      return;
    }

    console.log('📞 Incoming call from:', callData.caller_id);
    this.callbacks.onIncomingCall?.(callData);
  }

  private async sendSignalingMessage(message: SignalingMessage): Promise<void> {
    if (!message.callId) {
      throw new Error('Call ID is required for signaling message');
    }

    if (!message.targetUserId) {
      console.warn('No target user ID provided for signaling message');
      return;
    }

    try {
      console.log('Sending signaling message:', message.type, 'for call:', message.callId);
      
      if (this.channel) {
        await this.channel.send({
          type: 'broadcast',
          event: 'call_signal',
          payload: message
        });
      } else {
        const tempChannel = supabase.channel(`temp-${message.targetUserId}`);
        await tempChannel.subscribe();
        await tempChannel.send({
          type: 'broadcast',
          event: 'call_signal',
          payload: message
        });
        await tempChannel.unsubscribe();
      }

      console.log('Signaling message sent successfully');
    } catch (error) {
      console.error('Error in sendSignalingMessage:', error);
      throw error;
    }
  }

  maintainBackgroundSubscription(): void {
    console.log('🔄 [WebRTCService] Maintaining background subscription');
    
    if (!this.isSubscribed || !this.channel) {
      console.log('⚠️ [WebRTCService] No active subscription to maintain, setting up new one');
      this.setupRealtimeSubscription();
      return;
    }
    
    this.channel.send({
      type: 'broadcast',
      event: 'heartbeat',
      payload: {
        userId: this.userId,
        timestamp: new Date().toISOString()
      }
    }).then(() => {
      console.log('✅ [WebRTCService] Background subscription maintained');
    }).catch((error) => {
      console.error('❌ [WebRTCService] Failed to maintain background subscription:', error);
      this.setupRealtimeSubscription();
    });
  }

  ensureSubscriptionActive(): void {
    console.log('🔄 [WebRTCService] Ensuring subscription is active');
    
    if (!this.userId) {
      console.warn('⚠️ [WebRTCService] Cannot ensure subscription: userId not set');
      return;
    }
    
    if (!this.isSubscribed || !this.channel) {
      console.log('🔄 [WebRTCService] Subscription not active, setting up');
      this.setupRealtimeSubscription();
    } else {
      console.log('✅ [WebRTCService] Subscription already active');
      this.verifySubscriptionHealth();
    }
  }

  private verifySubscriptionHealth(): void {
    if (!this.channel) {
      console.warn('⚠️ [WebRTCService] No channel to verify');
      return;
    }
    
    try {
      const channelState = this.channel.state;
      console.log('📊 [WebRTCService] Channel state:', channelState);
      
      if (channelState !== 'joined' && channelState !== 'joining') {
        console.log('🔄 [WebRTCService] Channel not properly connected, re-establishing');
        this.setupRealtimeSubscription();
      }
    } catch (error) {
      console.error('❌ [WebRTCService] Error verifying subscription health:', error);
      this.setupRealtimeSubscription();
    }
  }

  getSubscriptionStatus(): { isSubscribed: boolean; hasChannel: boolean; userId: string | null } {
    return {
      isSubscribed: this.isSubscribed,
      hasChannel: !!this.channel,
      userId: this.userId
    };
  }

  private cleanup(): void {
    if (this.peerConnection) {
      try {
        this.peerConnection.removeEventListener('icecandidate', () => {});
        this.peerConnection.removeEventListener('track', () => {});
        this.peerConnection.removeEventListener('connectionstatechange', () => {});
        this.peerConnection.removeEventListener('iceconnectionstatechange', () => {});
      } catch (error) {
        console.warn('Error removing event listeners:', error);
      }
      
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.localStream) {
      const tracks = this.localStream.getTracks();
      if (tracks && Array.isArray(tracks)) {
        tracks.forEach(track => {
          try {
            track.stop();
            console.log(`Stopped ${track.kind} track`);
          } catch (error) {
            console.warn(`Error stopping ${track.kind} track:`, error);
          }
        });
      }
      this.localStream = null;
    }

    this.remoteStream = null;
    this.currentCallId = null;
    this.isInitiator = false;
    
    console.log('WebRTC cleanup completed');
  }

  disconnect(): void {
    try {
      this.cleanup();
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
    
    if (this.channel) {
      try {
        this.channel.unsubscribe();
      } catch (error) {
        console.error('Error unsubscribing from channel:', error);
      } finally {
        this.channel = null;
        this.isSubscribed = false;
      }
    }
    
    this.userId = null;
    
    console.log('WebRTC service disconnected');
  }
}

export const webrtcService = new WebRTCService();
export default webrtcService;
