import { Platform } from 'react-native';
import { Audio } from 'expo-av';

export interface VoiceSearchConfig {
  elevenLabsApiKey: string;
  voiceId?: string;
}

export class VoiceSearchService {
  private static config: VoiceSearchConfig;
  private static isRecording = false;
  private static mediaRecorder: any;
  private static audioChunks: Blob[] = [];
  private static recording: Audio.Recording | null = null;

  static configure(config: VoiceSearchConfig) {
    this.config = config;
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
        reject(new Error('No active recording'));
        return;
      }

      this.mediaRecorder.onstop = async () => {
        try {
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
          const transcript = await this.transcribeAudio(audioBlob);
          this.isRecording = false;
          
          // Stop all tracks to release microphone
          this.mediaRecorder.stream.getTracks().forEach((track: any) => track.stop());
          
          resolve(transcript);
        } catch (error) {
          reject(error);
        }
      };

      this.mediaRecorder.stop();
    });
  }

  // Native implementation using expo-av
  private static async startNativeRecording(): Promise<void> {
    try {
      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Microphone permission denied. Please enable microphone access in your device settings.');
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Create and start recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      this.recording = recording;
      this.isRecording = true;
    } catch (error: any) {
      console.error('Error starting native recording:', error);
      if (error.message && error.message.includes('permission')) {
        throw error; // Re-throw permission errors with original message
      }
      throw new Error('Failed to start recording. Please check microphone permissions.');
    }
  }

  private static async stopNativeRecording(): Promise<string> {
    try {
      if (!this.recording || !this.isRecording) {
        throw new Error('No active recording');
      }

      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      this.isRecording = false;
      
      if (!uri) {
        throw new Error('Failed to get recording URI');
      }

      // For now, return a placeholder transcript
      // In a real implementation, you would send the audio file to a speech-to-text service
      return 'Voice recording completed. Speech-to-text not implemented for native platforms yet.';
    } catch (error) {
      console.error('Error stopping native recording:', error);
      throw new Error('Failed to stop recording.');
    } finally {
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
      return this.transcribeWithElevenLabs(audioBlob);
    }

    throw new Error('No speech recognition service available. Please configure ElevenLabs API key for speech-to-text.');
  }

  // Web Speech API implementation (free, works offline)
  private static async transcribeWithWebSpeech(audioBlob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        reject(new Error('Speech recognition not supported'));
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        resolve(transcript);
      };

      recognition.onerror = (event: any) => {
        reject(new Error(`Speech recognition error: ${event.error}`));
      };

      recognition.onend = () => {
        // Recognition ended
      };

      // Convert blob to audio URL and play it for recognition
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new (window as any).Audio(audioUrl);
      
      recognition.start();
      
      // Clean up
      setTimeout(() => {
        URL.revokeObjectURL(audioUrl);
      }, 1000);
    });
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

  // Text-to-speech for voice feedback (using ElevenLabs)
  static async speakText(text: string): Promise<void> {
    if (!this.config?.elevenLabsApiKey) {
      // Fallback to Web Speech API only on web platform
      if (Platform.OS === 'web') {
        return this.speakWithWebSpeech(text);
      } else {
        console.log('TTS:', text); // Just log on native platforms without ElevenLabs
        return;
      }
    }

    try {
      const response = await fetch.call(globalThis, `https://api.elevenlabs.io/v1/text-to-speech/${this.config.voiceId || 'pNInz6obpgDQGcFmaJgB'}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.config.elevenLabsApiKey,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs TTS error: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new (window as any).Audio(audioUrl);
      
      await audio.play();
      
      // Clean up
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };
    } catch (error) {
      console.error('ElevenLabs TTS error:', error);
      // Fallback to Web Speech API only on web platform
      if (Platform.OS === 'web') {
        this.speakWithWebSpeech(text);
      } else {
        console.log('TTS fallback:', text);
      }
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

  static isCurrentlyRecording(): boolean {
    return this.isRecording;
  }
}