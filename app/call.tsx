import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Card, Button, Avatar, Surface, IconButton, ProgressBar } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useUserStore } from '../stores/useUserStore';
import { useCallStore } from '../stores/useCallStore';

export default function CallScreen() {
  const { userId, userName, userRole, userAvatar, pingId, callId, isIncoming } = useLocalSearchParams();
  const [callDuration, setCallDuration] = useState(0);
  const [callQuality, setCallQuality] = useState<number>(1.0); // 0.0 to 1.0, 1.0 being excellent
  const currentUser = useUserStore((state: any) => state.user);
  
  const {
    callStatus,
    isInCall,
    isMuted,
    isSpeakerOn,
    isLoading,
    connectionState,
    localStream,
    remoteStream,
    initiateCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
    toggleSpeaker,
    initializeWebRTC
  } = useCallStore();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Initialize WebRTC when component mounts
    if (currentUser?.id) {
      initializeWebRTC(currentUser.id);
    }

    // Handle incoming call
    if (isIncoming === 'true' && callId) {
      // This is an incoming call screen
      console.log('Incoming call screen loaded');
      startPulseAnimation();
    } else if (userId && !callId) {
      // This is an outgoing call - initiate the call
      handleInitiateCall();
    }
  }, [currentUser?.id, isIncoming, callId, userId]);

  const handleInitiateCall = async () => {
    if (!userId || !currentUser?.id) return;
    
    try {
      await initiateCall(userId as string);
    } catch (error) {
      console.error('Failed to initiate call:', error);
      Alert.alert('Call Failed', 'Unable to start the call. Please check your connection and try again.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    }
  };

  useEffect(() => {
    // Call duration timer and quality simulation
    let interval: NodeJS.Timeout;
    if (callStatus === 'connected' && isInCall) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
        // Simulate call quality changes (in a real app, this would be based on actual network stats)
        setCallQuality(Math.random() * 0.3 + 0.7); // Random between 0.7 and 1.0 for demo
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callStatus, isInCall]);

  useEffect(() => {
    // Handle call status changes
    if (callStatus === 'ended') {
      const timer = setTimeout(() => {
        router.back();
      }, 2000);
      return () => clearTimeout(timer);
    } else if (callStatus === 'connected') {
      // Stop pulse animation when call is connected
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [callStatus]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    Alert.alert(
      'End Call',
      'Are you sure you want to end this call?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Call',
          style: 'destructive',
          onPress: async () => {
            await endCall();
          }
        }
      ]
    );
  };

  const handleAcceptCall = async () => {
    if (!callId) return;
    
    try {
      await acceptCall(callId as string);
    } catch (error) {
      console.error('Failed to accept call:', error);
      Alert.alert('Call Failed', 'Unable to accept the call. Please check your connection.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    }
  };

  const handleDeclineCall = async () => {
    if (!callId) return;
    
    try {
      await declineCall(callId as string);
      router.back();
    } catch (error) {
      console.error('Failed to decline call:', error);
      router.back();
    }
  };

  const handleMute = async () => {
    await toggleMute();
  };

  const handleSpeaker = async () => {
    await toggleSpeaker();
  };

  const getStatusText = () => {
    switch (callStatus) {
      case 'calling':
        return 'Calling...';
      case 'ringing':
        return isIncoming === 'true' ? 'Incoming call' : 'Ringing...';
      case 'connected':
        return formatDuration(callDuration);
      case 'ended':
        return 'Call ended';
      default:
        return 'Connecting...';
    }
  };

  const getCallQualityText = () => {
    if (callQuality >= 0.9) return 'Excellent';
    if (callQuality >= 0.7) return 'Good';
    if (callQuality >= 0.5) return 'Fair';
    return 'Poor';
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#1F2937', '#374151']}
        style={styles.background}
      >
        <View style={styles.content}>
          {/* User Info */}
          <View style={styles.userSection}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <Avatar.Image
                size={120}
                source={userAvatar ? { uri: userAvatar as string } : require('../assets/images/icon.png')}
                style={styles.avatar}
              />
            </Animated.View>
            <Text variant="headlineMedium" style={styles.userName}>
              {userName}
            </Text>
            <Text variant="bodyLarge" style={styles.userRole}>
              {userRole}
            </Text>
            
            {/* Call Status */}
            <Surface style={styles.statusChip} elevation={2}>
              <Text variant="bodyMedium" style={styles.statusText}>
                {getStatusText()}
              </Text>
            </Surface>
            
            {/* Call Quality Indicator */}
            {callStatus === 'connected' && (
              <View style={styles.qualityContainer}>
                <ProgressBar 
                  progress={callQuality} 
                  color={callQuality >= 0.7 ? '#10B981' : callQuality >= 0.5 ? '#F59E0B' : '#EF4444'} 
                  style={styles.qualityBar}
                />
                <Text variant="bodySmall" style={styles.qualityText}>
                  Call Quality: {getCallQualityText()}
                </Text>
              </View>
            )}
            
            {/* Connection State Debug Info */}
            {__DEV__ && (
              <Text variant="bodySmall" style={styles.debugText}>
                Connection: {connectionState}
              </Text>
            )}
          </View>

          {/* Call Controls */}
          <View style={styles.controlsSection}>
            {isIncoming === 'true' && callStatus === 'ringing' ? (
              // Incoming call controls
              <View style={styles.incomingControlsRow}>
                <IconButton
                  icon="phone-hangup"
                  size={35}
                  iconColor="white"
                  containerColor="#ef4444"
                  onPress={handleDeclineCall}
                  style={[styles.controlButton, styles.declineButton]}
                  disabled={isLoading}
                />
                <IconButton
                  icon="phone"
                  size={35}
                  iconColor="white"
                  containerColor="#22c55e"
                  onPress={handleAcceptCall}
                  style={[styles.controlButton, styles.acceptButton]}
                  disabled={isLoading}
                />
              </View>
            ) : (
              // Active call controls
              <View style={styles.controls}>
                {/* Mute Button */}
                <IconButton
                  icon={isMuted ? "microphone-off" : "microphone"}
                  size={32}
                  iconColor="white"
                  containerColor={isMuted ? "#ef4444" : "rgba(255, 255, 255, 0.2)"}
                  onPress={handleMute}
                  style={styles.controlButton}
                  disabled={!isInCall}
                />
                
                {/* End Call Button */}
                <IconButton
                  icon="phone-hangup"
                  size={40}
                  iconColor="white"
                  containerColor="#EF4444"
                  onPress={handleEndCall}
                  style={[styles.controlButton, styles.endCallButton]}
                  disabled={isLoading}
                />
                
                {/* Speaker Button */}
                <IconButton
                  icon={isSpeakerOn ? "volume-high" : "volume-medium"}
                  size={32}
                  iconColor="white"
                  containerColor={isSpeakerOn ? "#3b82f6" : "rgba(255, 255, 255, 0.2)"}
                  onPress={handleSpeaker}
                  style={styles.controlButton}
                  disabled={!isInCall}
                />
              </View>
            )}
          </View>

          {/* Ping Context */}
          {pingId && (
            <Card style={styles.pingCard}>
              <Card.Content>
                <Text variant="bodySmall" style={styles.pingLabel}>
                  Started from ping
                </Text>
                <Text variant="bodyMedium">
                  This call was initiated in response to a ping from {userName}
                </Text>
              </Card.Content>
            </Card>
          )}
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 24,
  },
  userSection: {
    alignItems: 'center',
    marginTop: 60,
  },
  avatar: {
    marginBottom: 24,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  userName: {
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  userRole: {
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 16,
    textAlign: 'center',
  },
  statusChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 16,
  },
  qualityContainer: {
    width: '60%',
    alignItems: 'center',
    marginBottom: 24,
  },
  qualityBar: {
    height: 6,
    width: '100%',
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 8,
  },
  qualityText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
  statusText: {
    color: 'white',
    fontWeight: '600',
  },
  controlsSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 32,
  },
  incomingControlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    maxWidth: 200,
  },
  controlButton: {
    elevation: 4,
  },
  endCallButton: {
    transform: [{ scale: 1.2 }],
  },
  acceptButton: {
    transform: [{ scale: 1.2 }],
  },
  declineButton: {
    transform: [{ scale: 1.2 }],
  },
  debugText: {
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 8,
    textAlign: 'center',
  },
  pingCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 20,
  },
  pingLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
});
