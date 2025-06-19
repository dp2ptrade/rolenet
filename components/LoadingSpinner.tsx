/**
 * Loading Spinner component for RoleNet app
 * Provides consistent loading states across the application
 */

import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  message?: string;
  overlay?: boolean;
  style?: any;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'large',
  color = COLORS.PRIMARY,
  message,
  overlay = false,
  style,
}) => {
  const containerStyle = [
    overlay ? styles.overlayContainer : styles.container,
    style,
  ];

  return (
    <View style={containerStyle}>
      <ActivityIndicator size={size} color={color} />
      {message && (
        <Text style={styles.message}>
          {message}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.LG,
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.OVERLAY.LIGHT,
    zIndex: 1000,
  },
  message: {
    marginTop: SPACING.SM,
    fontSize: TYPOGRAPHY.SIZES.BODY,
    color: COLORS.TEXT.SECONDARY,
    textAlign: 'center',
  },
});

export default LoadingSpinner;