import React, { useEffect } from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import { Text, Avatar, IconButton, Surface } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useCallStore } from '@/stores/useCallStore';
import { useUserStore } from '@/stores/useUserStore';
import { CallService } from '@/lib/supabaseService';
import { ASSETS } from '@/constants/assets';
import { router } from 'expo-router';

interface IncomingCallModalProps {
  visible: boolean;
  callerName?: string;
  callerAvatar?: string;
  callerRole?: string;
  callId?: string;
  onAccept: () => void;
  onDecline: () => void;
}

export default function IncomingCallModal({
  visible,
  callerName = 'Unknown Caller',
  callerAvatar,
  callerRole,
  callId,
  onAccept,
  onDecline
}: IncomingCallModalProps) {
  const { isLoading } = useCallStore();

  // Debug logging for modal visibility
  useEffect(() => {
    console.log('🎭 [IncomingCallModal] Visibility changed:', {
      visible,
      callerName,
      callId,
      callerRole,
      hasAvatar: !!callerAvatar,
      isLoading,
      timestamp: new Date().toISOString()
    });
  }, [visible, callerName, callId, callerRole, callerAvatar, isLoading]);

  // Log when component mounts/unmounts
  useEffect(() => {
    console.log('🎭 [IncomingCallModal] Component mounted');
    return () => {
      console.log('🎭 [IncomingCallModal] Component unmounted');
    };
  }, []);

  const handleAccept = () => {
    console.log('✅ [IncomingCallModal] Accept button pressed:', { callId, callerName });
    
    try {
      onAccept();
      
      // Navigate to call screen with error handling
      console.log('🧭 [IncomingCallModal] Attempting navigation to call screen');
      router.push({
        pathname: '/call',
        params: {
          callId,
          isIncoming: 'true',
          userName: callerName,
          userRole: callerRole,
          userAvatar: callerAvatar
        }
      });
      console.log('✅ [IncomingCallModal] Navigation initiated successfully');
    } catch (error) {
      console.error('❌ [IncomingCallModal] Error in handleAccept:', error);
    }
  };

  const handleDecline = () => {
    console.log('❌ [IncomingCallModal] Decline button pressed:', { callId, callerName });
    
    try {
      onDecline();
      console.log('✅ [IncomingCallModal] Call declined successfully');
    } catch (error) {
      console.error('❌ [IncomingCallModal] Error in handleDecline:', error);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <BlurView intensity={50} style={styles.container}>
        <LinearGradient
          colors={['rgba(31, 41, 55, 0.95)', 'rgba(55, 65, 81, 0.95)']}
          style={styles.modalContent}
        >
          <Surface style={styles.callCard} elevation={5}>
            {/* Incoming Call Header */}
            <Text variant="titleMedium" style={styles.incomingText}>
              Incoming Call
            </Text>
            
            {/* Caller Info */}
            <View style={styles.callerInfo}>
              <Avatar.Image
                size={100}
                source={callerAvatar ? { uri: callerAvatar } : ASSETS.IMAGES.LOGO}
                style={styles.avatar}
              />
              <Text variant="headlineSmall" style={styles.callerName}>
                {callerName}
              </Text>
              {callerRole && (
                <Text variant="bodyLarge" style={styles.callerRole}>
                  {callerRole}
                </Text>
              )}
            </View>
            
            {/* Call Controls */}
            <View style={styles.controls}>
              <IconButton
                icon="phone-hangup"
                size={35}
                iconColor="white"
                containerColor="#ef4444"
                onPress={handleDecline}
                style={[styles.controlButton, styles.declineButton]}
                disabled={isLoading}
              />
              <IconButton
                icon="phone"
                size={35}
                iconColor="white"
                containerColor="#22c55e"
                onPress={handleAccept}
                style={[styles.controlButton, styles.acceptButton]}
                disabled={isLoading}
              />
            </View>
            
            {/* Action Labels */}
            <View style={styles.actionLabels}>
              <Text variant="bodySmall" style={styles.actionLabel}>
                Decline
              </Text>
              <Text variant="bodySmall" style={styles.actionLabel}>
                Accept
              </Text>
            </View>
          </Surface>
        </LinearGradient>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    maxWidth: 350,
    borderRadius: 20,
    padding: 20,
  },
  callCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  incomingText: {
    color: 'white',
    marginBottom: 20,
    opacity: 0.8,
  },
  callerInfo: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    marginBottom: 16,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  callerName: {
    color: 'white',
    textAlign: 'center',
    marginBottom: 4,
  },
  callerRole: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    maxWidth: 200,
    marginBottom: 16,
  },
  controlButton: {
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  acceptButton: {
    transform: [{ scale: 1.1 }],
  },
  declineButton: {
    transform: [{ scale: 1.1 }],
  },
  actionLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    maxWidth: 200,
  },
  actionLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
});