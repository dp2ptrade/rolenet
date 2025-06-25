import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { User } from '../lib/types';

interface StatusChangeNotificationProps {
  user: User;
  newStatus: 'online' | 'offline' | 'away';
  visible: boolean;
  onHide: () => void;
}

export default function StatusChangeNotification({
  user,
  newStatus,
  visible,
  onHide
}: StatusChangeNotificationProps) {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Slide in animation
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide after 3 seconds
      const timer = setTimeout(() => {
        hideNotification();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const hideNotification = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide();
    });
  };

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

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online':
        return 'came online';
      case 'away':
        return 'is away';
      case 'offline':
      default:
        return 'went offline';
    }
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <Surface style={styles.notification} elevation={4}>
        <View style={styles.content}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: getStatusColor(newStatus) },
            ]}
          />
          <Text style={styles.text}>
            <Text style={styles.userName}>{user.name}</Text>
            {' '}
            <Text style={styles.statusText}>{getStatusText(newStatus)}</Text>
          </Text>
        </View>
      </Surface>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  notification: {
    borderRadius: 12,
    backgroundColor: 'white',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  text: {
    flex: 1,
    fontSize: 14,
  },
  userName: {
    fontWeight: '600',
    color: '#1F2937',
  },
  statusText: {
    color: '#6B7280',
  },
});