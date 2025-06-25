import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';

interface AnimatedStatusDotProps {
  status: 'online' | 'offline' | 'away';
  size?: number;
  style?: any;
}

export default function AnimatedStatusDot({
  status,
  size = 8,
  style
}: AnimatedStatusDotProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Reset animations
    scaleAnim.setValue(1);
    opacityAnim.setValue(1);
    pulseAnim.setValue(1);

    // Status change animation
    Animated.sequence([
      // Scale down
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 150,
        useNativeDriver: true,
      }),
      // Scale back up
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation for online status
    if (status === 'online') {
      const pulse = () => {
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]).start(() => {
          if (status === 'online') {
            pulse();
          }
        });
      };
      pulse();
    }

    // Fade animation for offline status
    if (status === 'offline') {
      Animated.timing(opacityAnim, {
        toValue: 0.6,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [status]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return '#10B981';
      case 'away':
        return '#F59E0B';
      case 'offline':
      default:
        return '#EF4444';
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: getStatusColor(status),
          transform: [
            { scale: scaleAnim },
            { scale: status === 'online' ? pulseAnim : 1 },
          ],
          opacity: opacityAnim,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
});