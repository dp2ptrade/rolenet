import { Platform } from 'react-native';

export interface VoiceSearchConfig {
  elevenLabsApiKey: string;
  voiceId?: string;
}

export class VoiceSearchService {
  private static config: VoiceSearchConfig;
  private static isRecording = false;
  private static mediaRecorder: any;
  private static audioChunks: Blob[] = [];

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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event: any) => {
        this.audioChunks.push(event.data);
      };

      this.mediaRecorder.start();
      this.isRecording = true;
    } catch (error) {
      console.error('Error starting web recording:', error);
      throw new Error('Failed to start recording. Please check microphone permissions.');
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

  // Native implementation (placeholder for expo-av)
  private static async startNativeRecording(): Promise<void> {
    // This would use expo-av for native recording
    // For now, we'll use web implementation as fallback
    if (Platform.OS !== 'web') {
      console.warn('Native voice recording not implemented yet, using web fallback');
    }
    return this.startWebRecording();
  }

  private static async stopNativeRecording(): Promise<string> {
    // This would use expo-av for native recording
    // For now, we'll use web implementation as fallback
    return this.stopWebRecording();
  }

  // Transcribe audio using ElevenLabs or Web Speech API
  private static async transcribeAudio(audioBlob: Blob): Promise<string> {
    // Try Web Speech API first (free and fast)
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      return this.transcribeWithWebSpeech(audioBlob);
    }

    // Fallback to ElevenLabs if configured
    if (this.config?.elevenLabsApiKey) {
      return this.transcribeWithElevenLabs(audioBlob);
    }

    throw new Error('No speech recognition service available');
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
      const audio = new Audio(audioUrl);
      
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

      const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
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
      // Fallback to Web Speech API
      return this.speakWithWebSpeech(text);
    }

    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${this.config.voiceId || 'pNInz6obpgDQGcFmaJgB'}`, {
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
      const audio = new Audio(audioUrl);
      
      await audio.play();
      
      // Clean up
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };
    } catch (error) {
      console.error('ElevenLabs TTS error:', error);
      // Fallback to Web Speech API
      this.speakWithWebSpeech(text);
    }
  }

  // Web Speech API TTS fallback
  private static speakWithWebSpeech(text: string): void {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      speechSynthesis.speak(utterance);
    }
  }

  static isCurrentlyRecording(): boolean {
    return this.isRecording;
  }
}