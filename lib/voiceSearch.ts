import { Platform } from 'react-native';
import * as Audio from 'expo-audio';
import Voice from '@react-native-voice/voice';
import * as Speech from 'expo-speech';

export interface VoiceSearchConfig {
  elevenLabsApiKey: string;
  voiceId?: string;
}

export class VoiceSearchService {
  private static config: VoiceSearchConfig;
  private static isRecording = false;
  private static mediaRecorder: any;
  private static audioChunks: Blob[] = [];
  private static recording: Audio.AudioRecorder | null = null;
  private static lastTranscript: string = '';
  private static audioUri: string | null = null;

  static configure(config: VoiceSearchConfig) {
    this.config = config;
  }

  // Check if currently recording
  static isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  // Start voice recording
  static async startRecording(): Promise<void> {
    if (Platform.OS === 'web') {
      return this.startWebRecording();
    } else {
      return this.startNativeRecording();
    }
  }

  // Stop voice recording and get transcript
  static async stopRecording(): Promise<string> {
    if (Platform.OS === 'web') {
      return this.stopWebRecording();
    } else {
      return this.stopNativeRecording();
    }
  }

  // Web implementation using Web Audio API
  private static async startWebRecording(): Promise<void> {
    try {
      // Check if we're in a web environment with proper API support
      if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone not available in this environment');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event: any) => {
        this.audioChunks.push(event.data);
      };

      this.mediaRecorder.start();
      this.isRecording = true;
    } catch (error: any) {
      console.error('Error starting web recording:', error);
      if (error.name === 'NotAllowedError') {
        throw new Error('Microphone permission denied. Please allow microphone access in your browser.');
      } else if (error.name === 'NotFoundError') {
        throw new Error('No microphone found. Please connect a microphone and try again.');
      } else if (error.name === 'NotSupportedError') {
        throw new Error('Audio recording not supported in this browser.');
      }
      throw new Error('Failed to access microphone. Please check your browser settings.');
    }
  }

  private static async stopWebRecording(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.isRecording) {
        console.log('No active web recording to stop');
        this.isRecording = false;
        resolve('No active recording');
        return;
      }

      this.mediaRecorder.onstop = async () => {
        try {
          // Check if we have any audio data
          if (this.audioChunks.length === 0) {
            console.log('No audio data captured');
            this.isRecording = false;
            resolve('No audio captured. Please try again.');
            return;
          }

          const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
          const transcript = await this.transcribeAudio(audioBlob);
          this.isRecording = false;
          
          // Stop all tracks to release microphone
          if (this.mediaRecorder.stream) {
            this.mediaRecorder.stream.getTracks().forEach((track: any) => track.stop());
          }
          
          resolve(transcript);
        } catch (error) {
          console.error('Error in stopWebRecording:', error);
          this.isRecording = false;
          resolve('Failed to process recording. Please try again.');
        }
      };

      this.mediaRecorder.onerror = (error: any) => {
        console.error('MediaRecorder error:', error);
        this.isRecording = false;
        resolve('Recording error. Please try again.');
      };

      this.mediaRecorder.stop();
    });
  }

  // Native implementation using expo-av for recording and react-native-voice for STT
  private static async startNativeRecording(): Promise<void> {
    try {
      // Check if already recording
      if (this.isRecording || this.recording) {
        console.log('Recording already in progress, stopping previous recording');
        await this.stopNativeRecording();
      }

      // Request permissions for audio recording
      const { status } = await Audio.requestRecordingPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Microphone permission denied. Please enable microphone access in your device settings.');
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      // Create and start recording
      const recording = new Audio.AudioRecorder(Audio.RecordingPresets.HIGH_QUALITY);
      await recording.record();
      
      this.recording = recording;
      this.isRecording = true;

      // Start speech recognition if supported
      try {
        const isVoiceAvailable = await Voice.isAvailable();
        if (isVoiceAvailable) {
          Voice.onSpeechResults = (e: any) => {
            if (e.value && e.value.length > 0) {
              this.lastTranscript = e.value[0];
            }
          };
          Voice.onSpeechError = (e: any) => {
            console.error('Speech recognition error:', e.error);
            if (e.error && (e.error.code === '7' || e.error.code === '5')) {
              this.lastTranscript = 'Speech recognition failed. Please try again.';
            }
          };
          await Voice.start('en-US');
        }
      } catch (error) {
        console.error('Error initializing speech recognition:', error);
      }
    } catch (error: any) {
      console.error('Error starting native recording:', error);
      // Clean up on error
      this.isRecording = false;
      this.recording = null;
      if (error.message && error.message.includes('permission')) {
        throw error; // Re-throw permission errors with original message
      }
      throw new Error('Failed to start recording. Please check microphone permissions.');
    }
  }

  private static async stopNativeRecording(): Promise<string> {
    try {
      if (!this.recording || !this.isRecording) {
        console.log('No active recording to stop');
        this.isRecording = false;
        this.recording = null;
        return 'No active recording';
      }

      await this.recording.stop();
      const uri = this.recording.uri;
      
      if (!uri) {
        console.warn('Failed to get recording URI');
        return 'Recording completed but failed to get audio file';
      }

      this.audioUri = uri;

      // Stop speech recognition if active - with improved error handling
      try {
        const isVoiceRecognizing = await Voice.isRecognizing();
        if (isVoiceRecognizing) {
          await Voice.stop();
        }
      } catch (error) {
        console.warn('Speech recognition stop error (non-critical):', error);
        // Don't treat this as a critical error - just log it
        // Speech recognition might not be active or supported
      }

      // Return the transcript if available from speech recognition
      if (this.lastTranscript) {
        const transcript = this.lastTranscript;
        this.lastTranscript = '';
        return transcript;
      }

      return 'Voice recording completed. Speech-to-text not fully available.';
    } catch (error) {
      console.error('Error stopping native recording:', error);
      return 'Failed to stop recording';
    } finally {
      this.isRecording = false;
      this.recording = null;
    }
  }

  // Transcribe audio using ElevenLabs or Web Speech API
  private static async transcribeAudio(audioBlob: Blob): Promise<string> {
    // Check if we're in a web environment first
    if (Platform.OS === 'web') {
      // Try Web Speech API first (free and fast)
      if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
        return this.transcribeWithWebSpeech(audioBlob);
      }
    }

    // Fallback to ElevenLabs if configured
    if (this.config?.elevenLabsApiKey) {
      try {
        return await this.transcribeWithElevenLabs(audioBlob);
      } catch (error) {
        console.warn('ElevenLabs transcription failed:', error);
        return 'Voice message recorded. Transcription service temporarily unavailable.';
      }
    }

    // Return a user-friendly message instead of throwing an error
    return 'Voice message recorded successfully. Transcription requires premium service configuration.';
  }

  // Web Speech API implementation (free, works offline)
  // Note: Web Speech API can only transcribe live microphone input, not pre-recorded audio
  private static async transcribeWithWebSpeech(audioBlob: Blob): Promise<string> {
    console.warn('Web Speech API cannot transcribe pre-recorded audio blobs. Returning placeholder.');
    // Web Speech API limitation: it can only work with live microphone input
    // For pre-recorded audio transcription, we need a different service like ElevenLabs
    return 'Voice message recorded successfully. Transcription requires premium service.';
  }

  // ElevenLabs implementation (premium, more accurate)
  private static async transcribeWithElevenLabs(audioBlob: Blob): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');

      const response = await fetch.call(globalThis, 'https://api.elevenlabs.io/v1/speech-to-text', {
        method: 'POST',
        headers: {
          'xi-api-key': this.config.elevenLabsApiKey,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const result = await response.json();
      return result.text || '';
    } catch (error) {
      console.error('ElevenLabs transcription error:', error);
      throw new Error('Failed to transcribe audio with ElevenLabs');
    }
  }

  // Text-to-speech for voice feedback
  static async speakText(text: string): Promise<void> {
    if (Platform.OS === 'web') {
      return this.speakWithWebSpeech(text);
    } else {
      return this.speakWithExpoSpeech(text);
    }
  }

  // Web Speech API TTS fallback
  private static speakWithWebSpeech(text: string): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      speechSynthesis.speak(utterance);
    } else {
      console.log('Web Speech API not available:', text);
    }
  }

  // Expo Speech TTS for native platforms
  private static async speakWithExpoSpeech(text: string): Promise<void> {
    try {
      await Speech.speak(text, {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.8,
      });
    } catch (error) {
      console.error('Expo Speech error:', error);
      console.log('TTS fallback:', text);
    }
  }

  // Get the URI of the last recorded audio for voice message feature
  static getLastAudioUri(): string | null {
    return this.audioUri;
  }
}
