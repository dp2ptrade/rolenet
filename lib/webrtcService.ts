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

  // STUN/TURN servers configuration
  private readonly pcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      // Add TURN servers for production
      // {
      //   urls: 'turn:your-turn-server.com:3478',
      //   username: 'your-username',
      //   credential: 'your-password'
      // }
    ],
  };

  constructor() {
    // Don't setup subscription here - userId is not set yet
  }

  setCallbacks(callbacks: WebRTCCallbacks) {
    this.callbacks = callbacks;
  }

  setUserId(userId: string) {
    this.userId = userId;
    // Setup subscription after userId is set
    this.setupRealtimeSubscription();
  }

  private setupRealtimeSubscription() {
    if (!this.userId) {
      console.warn('Cannot setup realtime subscription: userId not set');
      return;
    }

    // Cleanup existing channel if any
    if (this.channel) {
      this.channel.unsubscribe();
      this.channel = null;
    }

    try {
      this.channel = supabase
        .channel(`calls:${this.userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'calls',
            filter: `callee_id=eq.${this.userId}`,
          },
          (payload) => {
            try {
              this.handleIncomingCall(payload.new as CallData);
            } catch (error) {
              console.error('Error handling incoming call:', error);
              this.callbacks.onError?.(error as Error);
            }
          }
        )
        .on('broadcast', { event: 'call_signal' }, (payload) => {
          try {
            this.handleSignalingMessage(payload.payload);
          } catch (error) {
            console.error('Error handling signaling message:', error);
            this.callbacks.onError?.(error as Error);
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('WebRTC realtime subscription established');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('WebRTC realtime subscription error');
            this.callbacks.onError?.(new Error('Realtime subscription failed'));
          }
        });
    } catch (error) {
      console.error('Error setting up realtime subscription:', error);
      this.callbacks.onError?.(error as Error);
    }
  }

  private async handleIncomingCall(callData: CallData) {
    if (callData.status === 'pending' && this.callbacks.onIncomingCall) {
      this.currentCallId = callData.id;
      this.callbacks.onIncomingCall(callData);
    }
  }

  private async handleSignalingMessage(message: SignalingMessage) {
    if (!message || !message.type || !message.callId) {
      console.warn('Invalid signaling message received:', message);
      return;
    }

    if (message.callId !== this.currentCallId) {
      console.log('Ignoring signaling message for different call:', message.callId);
      return;
    }

    try {
      switch (message.type) {
        case 'offer':
          if (message.offer) {
            await this.handleOffer(message.offer);
          } else {
            console.error('Offer message missing offer data');
          }
          break;
        case 'answer':
          if (message.answer) {
            await this.handleAnswer(message.answer);
          } else {
            console.error('Answer message missing answer data');
          }
          break;
        case 'ice-candidate':
          if (message.candidate) {
            await this.handleIceCandidate(message.candidate);
          } else {
            console.error('ICE candidate message missing candidate data');
          }
          break;
        case 'call-ended':
          this.handleCallEnded();
          break;
        default:
          console.warn('Unknown signaling message type:', message.type);
      }
    } catch (error) {
      console.error('Error handling signaling message:', error);
      this.callbacks.onError?.(error as Error);
    }
  }

  async initiateCall(calleeId: string): Promise<string> {
    if (!this.userId) {
      throw new Error('User ID not set. Call setUserId() first.');
    }

    if (!calleeId) {
      throw new Error('Callee ID is required');
    }

    if (this.currentCallId) {
      throw new Error('Another call is already in progress');
    }

    try {
      this.isInitiator = true;
      
      // Create call record in database
      const { data: callData, error } = await supabase
        .from('calls')
        .insert({
          caller_id: this.userId,
          callee_id: calleeId,
          status: 'pending',
          ice_candidates: [],
        })
        .select()
        .single();

      if (error) {
        console.error('Database error creating call:', error);
        throw new Error(`Failed to create call record: ${error.message}`);
      }

      if (!callData) {
        throw new Error('No call data returned from database');
      }

      this.currentCallId = callData.id;
      
      try {
        // Setup peer connection
        await this.setupPeerConnection();
        
        // Get local media stream
        await this.getLocalStream();
        
        // Create and send offer
        const offer = await this.peerConnection!.createOffer({});
        await this.peerConnection!.setLocalDescription(offer);
        
        // Update call with offer
        const { error: updateError } = await supabase
          .from('calls')
          .update({ 
            offer: offer,
            status: 'ringing'
          })
          .eq('id', this.currentCallId);

        if (updateError) {
          console.error('Database error updating call with offer:', updateError);
          throw new Error(`Failed to update call with offer: ${updateError.message}`);
        }

        // Send offer via realtime
        await this.sendSignalingMessage({
          type: 'offer',
          offer: offer,
          callId: this.currentCallId,
          targetUserId: calleeId,
        });

        return this.currentCallId!;
      } catch (setupError) {
        // Cleanup call record if setup fails
        await supabase
          .from('calls')
          .update({ status: 'ended' })
          .eq('id', this.currentCallId);
        
        this.cleanup();
        throw setupError;
      }
    } catch (error) {
      console.error('Error initiating call:', error);
      this.callbacks.onError?.(error as Error);
      throw error;
    }
  }

  async acceptCall(callId: string): Promise<void> {
    if (!this.userId) {
      throw new Error('User ID not set. Call setUserId() first.');
    }

    if (!callId) {
      throw new Error('Call ID is required');
    }

    if (this.currentCallId && this.currentCallId !== callId) {
      throw new Error('Another call is already in progress');
    }

    try {
      this.isInitiator = false;
      this.currentCallId = callId;
      
      // Get call data
      const { data: callData, error } = await supabase
        .from('calls')
        .select('*')
        .eq('id', callId)
        .single();

      if (error) {
        console.error('Database error fetching call:', error);
        throw new Error(`Failed to fetch call data: ${error.message}`);
      }

      if (!callData) {
        throw new Error('Call not found');
      }

      if (callData.status !== 'ringing' && callData.status !== 'pending') {
        throw new Error(`Cannot accept call with status: ${callData.status}`);
      }

      if (!callData.offer) {
        throw new Error('Call offer not found');
      }
      
      try {
        // Setup peer connection
        await this.setupPeerConnection();
        
        // Get local media stream
        await this.getLocalStream();
        
        // Set remote description from offer
        await this.peerConnection!.setRemoteDescription(callData.offer);
        
        // Create and send answer
        const answer = await this.peerConnection!.createAnswer();
        await this.peerConnection!.setLocalDescription(answer);
        
        // Update call with answer
        const { error: updateError } = await supabase
          .from('calls')
          .update({ 
            answer: answer,
            status: 'active'
          })
          .eq('id', callId);

        if (updateError) {
          console.error('Database error updating call with answer:', updateError);
          throw new Error(`Failed to update call with answer: ${updateError.message}`);
        }

        // Send answer via realtime
        await this.sendSignalingMessage({
          type: 'answer',
          answer: answer,
          callId: callId,
          targetUserId: callData.caller_id,
        });

        this.callbacks.onCallAccepted?.(callId);
      } catch (setupError) {
        // Cleanup call record if setup fails
        await supabase
          .from('calls')
          .update({ status: 'ended' })
          .eq('id', callId);
        
        this.cleanup();
        throw setupError;
      }
    } catch (error) {
      console.error('Error accepting call:', error);
      this.callbacks.onError?.(error as Error);
      throw error;
    }
  }

  async declineCall(callId: string): Promise<void> {
    try {
      await supabase
        .from('calls')
        .update({ status: 'declined' })
        .eq('id', callId);

      const { data: callData } = await supabase
        .from('calls')
        .select('caller_id')
        .eq('id', callId)
        .single();

      if (callData) {
        await this.sendSignalingMessage({
          type: 'call-ended',
          callId: callId,
          targetUserId: callData.caller_id,
        });
      }

      this.callbacks.onCallDeclined?.(callId);
      this.cleanup();
    } catch (error) {
      console.error('Error declining call:', error);
      this.callbacks.onError?.(error as Error);
    }
  }

  async endCall(): Promise<void> {
    if (!this.currentCallId) {
      console.warn('No active call to end');
      return;
    }

    const callId = this.currentCallId;

    try {
      // Update call status in database
      const { error: updateError } = await supabase
        .from('calls')
        .update({ 
          status: 'ended',
          ended_at: new Date().toISOString()
        })
        .eq('id', callId);

      if (updateError) {
        console.error('Database error ending call:', updateError);
        // Continue with cleanup even if database update fails
      }

      // Get the other participant
      const { data: callData } = await supabase
        .from('calls')
        .select('caller_id, callee_id')
        .eq('id', callId)
        .single();

      if (callData) {
        const targetUserId = callData.caller_id === this.userId 
          ? callData.callee_id 
          : callData.caller_id;

        try {
          await this.sendSignalingMessage({
            type: 'call-ended',
            callId: callId,
            targetUserId: targetUserId,
          });
        } catch (signalingError) {
          console.error('Error sending end call signal:', signalingError);
          // Continue with cleanup even if signaling fails
        }
      }

      this.cleanup();
      this.callbacks.onCallEnded?.(callId);
    } catch (error) {
      console.error('Error ending call:', error);
      this.cleanup(); // Ensure cleanup happens even on error
      this.callbacks.onError?.(error as Error);
    }
  }

  async toggleMute(): Promise<boolean> {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return !audioTrack.enabled; // Return muted state
      }
    }
    return false;
  }

  async toggleSpeaker(): Promise<boolean> {
    // This would typically involve switching audio output
    // Implementation depends on platform-specific audio routing
    console.log('Toggle speaker - implementation needed');
    return false;
  }

  private async setupPeerConnection(): Promise<void> {
    if (this.peerConnection) {
      console.warn('Peer connection already exists, cleaning up first');
      this.peerConnection.close();
    }

    try {
      this.peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
        iceCandidatePoolSize: 10,
      });

      // Handle ICE candidates
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

        // Handle remote stream (modern API)
        this.peerConnection.addEventListener('track', (event) => {
          if (event.track) {
            console.log('Received remote track:', event.track.kind);
          }
          if (event.streams && event.streams[0]) {
            this.remoteStream = event.streams[0];
            this.callbacks.onRemoteStream?.(event.streams[0]);
          }
        });

        // Handle connection state changes
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

        // Handle ICE connection state changes
        this.peerConnection.addEventListener('iceconnectionstatechange', () => {
          const state = this.peerConnection?.iceConnectionState;
          console.log('ICE connection state:', state);
          
          if (state === 'failed') {
            this.callbacks.onError?.(new Error('ICE connection failed'));
          }
        });
      }

      // Add local stream tracks (modern API)
       if (this.localStream) {
         this.localStream.getTracks().forEach(track => {
           if (this.peerConnection && this.localStream) {
             this.peerConnection.addTrack(track, this.localStream);
             console.log(`Added ${track.kind} track to peer connection`);
           }
         });
       }

       console.log('Peer connection setup completed');
     } catch (error) {
       console.error('Error setting up peer connection:', error);
       throw new Error(`Failed to setup peer connection: ${error}`);
     }
  }

  private async getLocalStream(): Promise<void> {
    if (this.localStream) {
      console.log('Local stream already exists');
      return;
    }

    if (!mediaDevices) {
      throw new Error('MediaDevices not available');
    }

    try {
      const constraints = {
        video: true,
        audio: true
      };

      console.log('Requesting user media with constraints:', constraints);
       this.localStream = await mediaDevices.getUserMedia(constraints);
      
      if (this.localStream) {
        console.log('Local stream obtained:', {
          videoTracks: this.localStream.getVideoTracks().length,
          audioTracks: this.localStream.getAudioTracks().length
        });
      }
      
      if (this.localStream) {
        this.callbacks.onLocalStream?.(this.localStream);
      }
      
      // Add tracks to peer connection (modern API)
       if (this.peerConnection && this.localStream) {
         this.localStream.getTracks().forEach(track => {
           this.peerConnection!.addTrack(track, this.localStream!);
         });
       }
    } catch (error) {
      console.error('Error getting local stream:', error);
      
      // Try with basic constraints as fallback
      try {
        if (!mediaDevices) {
          throw new Error('MediaDevices not available for fallback');
        }
        console.log('Trying fallback constraints');
        this.localStream = await mediaDevices.getUserMedia({
           video: false,
           audio: true
         });
        
        console.log('Fallback local stream obtained');
        if (this.localStream) {
          this.callbacks.onLocalStream?.(this.localStream);
        }
        
        // Add tracks to peer connection (modern API)
         if (this.peerConnection && this.localStream) {
           this.localStream.getTracks().forEach(track => {
             this.peerConnection!.addTrack(track, this.localStream!);
           });
         }
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        this.callbacks.onError?.(fallbackError as Error);
        throw new Error(`Failed to get user media: ${fallbackError}`);
      }
    }
  }

  private async handleOffer(offer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    try {
      console.log('Handling offer');
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer as any));
      
      // Create and send answer
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      
      // Send answer back
      if (this.currentCallId) {
        await this.sendSignalingMessage({
          type: 'answer',
          answer: answer,
          callId: this.currentCallId,
        });
      }
      
      console.log('Offer handled and answer sent');
    } catch (error) {
      console.error('Error handling offer:', error);
      throw error;
    }
  }

  private async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    try {
      console.log('Handling answer');
       await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer as any));
       this.callbacks.onCallAccepted?.(this.currentCallId || '');
       console.log('Answer handled successfully');
    } catch (error) {
      console.error('Error handling answer:', error);
      throw error;
    }
  }

  private async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection) {
      console.warn('Peer connection not initialized, ignoring ICE candidate');
      return;
    }

    try {
      console.log('Handling ICE candidate');
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      console.log('ICE candidate added successfully');
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
      // Don't throw here as ICE candidates can fail and that's normal
    }
  }

  private handleCallEnded(): void {
    console.log('Call ended by remote peer');
    const callId = this.currentCallId;
    this.cleanup();
    this.callbacks.onCallEnded?.(callId);
  }

  private async sendSignalingMessage(message: SignalingMessage): Promise<void> {
    if (!message.callId) {
      throw new Error('Call ID is required for signaling message');
    }

    try {
      console.log('Sending signaling message:', message.type, 'for call:', message.callId);
      
      // Send via Supabase realtime channel
      const channel = supabase.channel(`call-${message.callId}`);
      
      const response = await channel.send({
        type: 'broadcast',
        event: 'signaling',
        payload: message
      });

      // Note: Supabase channel.send() doesn't return error in response
      // If there's an error, it would throw an exception

      console.log('Signaling message sent successfully');
    } catch (error) {
      console.error('Error in sendSignalingMessage:', error);
      throw error;
    }
  }

  private cleanup(): void {
    // Close peer connection
    if (this.peerConnection) {
      // Note: react-native-webrtc doesn't support setting event handlers to null
      // The connection will be closed which should clean up resources
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Stop local media tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
        console.log(`Stopped ${track.kind} track`);
      });
      this.localStream = null;
    }

    // Clear remote stream
    this.remoteStream = null;
    this.currentCallId = null;
    this.isInitiator = false;
    
    console.log('WebRTC cleanup completed');
  }

  disconnect(): void {
    this.cleanup();
    
    // Unsubscribe from realtime
    if (this.channel) {
      this.channel.unsubscribe();
      this.channel = null;
    }
  }
}

export const webrtcService = new WebRTCService();
export default webrtcService;