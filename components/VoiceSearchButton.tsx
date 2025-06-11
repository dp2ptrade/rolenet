import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Button, Text, Surface, ActivityIndicator } from 'react-native-paper';
import { Mic, MicOff, Volume2 } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming,
  withSequence,
  Easing
} from 'react-native-reanimated';
import { VoiceSearchService } from '@/lib/voiceSearch';

interface VoiceSearchButtonProps {
  onTranscript: (transcript: string) => void;
  onError: (error: string) => void;
  disabled?: boolean;
}

export default function VoiceSearchButton({ 
  onTranscript, 
  onError, 
  disabled = false 
}: VoiceSearchButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    checkMicrophonePermission();
  }, []);

  useEffect(() => {
    if (isRecording) {
      // Pulsing animation while recording
      scale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.7, { duration: 600 }),
          withTiming(1, { duration: 600 })
        ),
        -1,
        false
      );
    } else {
      scale.value = withTiming(1, { duration: 200 });
      opacity.value = withTiming(1, { duration: 200 });
    }
  }, [isRecording]);

  const checkMicrophonePermission = async () => {
    if (Platform.OS === 'web') {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        setHasPermission(true);
      } catch (error) {
        setHasPermission(false);
      }
    } else {
      // For native platforms, you would check permissions here
      setHasPermission(true);
    }
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  const handleVoiceSearch = async () => {
    if (disabled || hasPermission === false) return;

    if (isRecording) {
      // Stop recording
      try {
        setIsProcessing(true);
        setIsRecording(false);
        
        const transcript = await VoiceSearchService.stopRecording();
        
        if (transcript.trim()) {
          onTranscript(transcript);
          
          // Provide voice feedback
          await VoiceSearchService.speakText(`Searching for ${transcript}`);
        } else {
          onError('No speech detected. Please try again.');
        }
      } catch (error) {
        console.error('Voice search error:', error);
        onError('Failed to process voice input. Please try again.');
      } finally {
        setIsProcessing(false);
      }
    } else {
      // Start recording
      try {
        await VoiceSearchService.startRecording();
        setIsRecording(true);
        
        // Provide voice feedback
        await VoiceSearchService.speakText('Listening...');
      } catch (error) {
        console.error('Failed to start recording:', error);
        onError('Failed to start voice recording. Please check microphone permissions.');
      }
    }
  };

  const getButtonIcon = () => {
    if (isProcessing) {
      return <ActivityIndicator size={24} color="white" />;
    }
    if (isRecording) {
      return <MicOff size={24} color="white" />;
    }
    return <Mic size={24} color="white" />;
  };

  const getButtonColor = () => {
    if (isProcessing) return '#6B7280';
    if (isRecording) return '#EF4444';
    return '#3B82F6';
  };

  const getButtonText = () => {
    if (isProcessing) return 'Processing...';
    if (isRecording) return 'Stop Recording';
    return 'Voice Search';
  };

  if (hasPermission === false) {
    return (
      <Surface style={[styles.container, styles.disabledContainer]} elevation={2}>
        <View style={styles.content}>
          <Volume2 size={20} color="#6B7280" />
          <Text variant="bodySmall" style={styles.disabledText}>
            Microphone access required
          </Text>
        </View>
      </Surface>
    );
  }

  return (
    <Animated.View style={animatedStyle}>
      <Button
        mode="contained"
        onPress={handleVoiceSearch}
        disabled={disabled || isProcessing}
        style={[
          styles.button,
          { backgroundColor: getButtonColor() }
        ]}
        contentStyle={styles.buttonContent}
        icon={() => getButtonIcon()}
      >
        {getButtonText()}
      </Button>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    padding: 12,
  },
  disabledContainer: {
    opacity: 0.6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledText: {
    marginLeft: 8,
    color: '#6B7280',
  },
  button: {
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  buttonContent: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
});