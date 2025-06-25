declare module 'react-native-voice/voice' {
  const Voice: {
    isAvailable(): boolean;
    isRecognizing(): boolean;
    start(lang: string): Promise<void>;
    stop(): Promise<void>;
    onSpeechResults?: (e: any) => void;
    onSpeechError?: (e: any) => void;
  };
  export default Voice;
}
