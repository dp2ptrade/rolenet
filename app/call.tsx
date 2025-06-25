import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert, Animated, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Card, Avatar, IconButton, ProgressBar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useUserStore } from '../stores/useUserStore';
import { useCallStore } from '../stores/useCallStore';
import { COLORS } from '../constants/theme';

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
    let interval: number;
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
    if (Platform.OS === 'web') {
      endCall();
    } else {
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
    }
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
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    ).start();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.background}>
        <View style={styles.content}>
          {/* User Info */}
          <View style={styles.userSection}>
            <Text variant="headlineMedium" style={styles.userName}>
              {userName}
            </Text>
            <Text variant="bodyLarge" style={styles.callStatus}>
              {getStatusText()}
            </Text>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <Avatar.Image
                size={200}
                source={userAvatar ? { uri: userAvatar as string } : { uri: 'https://via.placeholder.com/200' }}
                style={styles.avatar}
              />
            </Animated.View>
          </View>

          {/* Call Controls */}
          <View style={styles.controlsSection}>
            {isIncoming === 'true' && callStatus === 'ringing' ? (
              // Incoming call controls
              <View style={styles.incomingControlsRow}>
                <IconButton
                  icon="phone-hangup"
                  size={60}
                  iconColor="white"
                  containerColor="#ff3b30"
                  onPress={handleDeclineCall}
                  style={[styles.controlButton, styles.declineButton]}
                  disabled={isLoading}
                />
                <IconButton
                  icon="phone"
                  size={60}
                  iconColor="white"
                  containerColor="#34c759"
                  onPress={handleAcceptCall}
                  style={[styles.controlButton, styles.acceptButton]}
                  disabled={isLoading}
                />
              </View>
            ) : (
              // Active call controls
              <View style={styles.controls}>
                <IconButton
                  icon={isMuted ? "microphone-off" : "microphone"}
                  size={40}
                  iconColor="white"
                  containerColor={isMuted ? "#ff3b30" : "rgba(255, 255, 255, 0.3)"}
                  onPress={handleMute}
                  style={styles.controlButton}
                  disabled={!isInCall}
                />
                <IconButton
                  icon="phone-hangup"
                  size={60}
                  iconColor="white"
                  containerColor="#ff3b30"
                  onPress={handleEndCall}
                  style={[styles.controlButton, styles.endCallButton]}
                  disabled={isLoading}
                />
                <IconButton
                  icon={isSpeakerOn ? "volume-high" : "volume-medium"}
                  size={40}
                  iconColor="white"
                  containerColor={isSpeakerOn ? "#007aff" : "rgba(255, 255, 255, 0.3)"}
                  onPress={handleSpeaker}
                  style={styles.controlButton}
                  disabled={!isInCall}
                />
              </View>
            )}
          </View>

          {/* Call Quality Indicator */}
          {callStatus === 'connected' && (
            <View style={styles.qualityContainer}>
              <ProgressBar 
                progress={callQuality} 
                color={callQuality >= 0.7 ? '#34c759' : callQuality >= 0.5 ? '#ffcc00' : '#ff3b30'} 
                style={styles.qualityBar}
              />
              <Text variant="bodySmall" style={styles.qualityText}>
                Call Quality: {getCallQualityText()}
              </Text>
            </View>
          )}

          {/* Ping Context */}
          {pingId && (
            <Card style={styles.pingCard}>
              <Card.Content>
                <Text variant="bodySmall" style={styles.pingLabel}>
                  Started from ping
                </Text>
                <Text variant="bodyMedium" style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: 14 }}>
                  This call was initiated in response to a ping from {userName}
                </Text>
              </Card.Content>
            </Card>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  background: {
    flex: 1,
    backgroundColor: '#121212',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
  },
  userSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  userName: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 28,
    marginBottom: 8,
    textAlign: 'center',
  },
  callStatus: {
    color: '#AAAAAA',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  avatar: {
    borderWidth: 6,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: '#333',
    marginTop: 20,
  },
  controlsSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  incomingControlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 40,
    paddingVertical: 20,
  },
  controlButton: {
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  endCallButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.3)',
  },
  acceptButton: {
    backgroundColor: 'rgba(52, 199, 89, 0.3)',
  },
  declineButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.3)',
  },
  qualityContainer: {
    alignItems: 'center',
    marginVertical: 20,
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
  },
  qualityBar: {
    height: 8,
    width: 200,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 8,
  },
  qualityText: {
    color: '#AAAAAA',
    fontSize: 12,
  },
  pingCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 20,
    borderRadius: 10,
    borderWidth: 0,
  },
  pingLabel: {
    color: '#AAAAAA',
    marginBottom: 5,
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
});
