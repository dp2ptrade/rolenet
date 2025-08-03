/**
 * Theme constants for RoleNet app
 * Centralized design system for consistent UI/UX
 */

import { Dimensions } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const COLORS = {
  PRIMARY: '#3B82F6',
  SECONDARY: '#4c669f',
  TERTIARY: '#3b5998',
  DARK: '#192f6a',
  WHITE: '#FFFFFF',
  BACKGROUND: '#F8FAFC',
  TEXT: {
    PRIMARY: '#1F2937',
    SECONDARY: '#4B5563',
    LIGHT: '#9CA3AF',
    WHITE: '#FFFFFF',
  },
  GRADIENT: {
    BLUE: ['#4c669f', '#3b5998', '#192f6a'],
    PRIMARY: ['#3B82F6', '#2563EB', '#1D4ED8'],
  },
  OVERLAY: {
    LIGHT: 'rgba(255, 255, 255, 0.9)',
    DARK: 'rgba(0, 0, 0, 0.5)',
  },
} as const;

export const TYPOGRAPHY = {
  SIZES: {
    TITLE: Math.min(28, screenWidth * 0.065),
    SUBTITLE: Math.min(20, screenWidth * 0.05),
    BODY: Math.min(16, screenWidth * 0.04),
    CARD_TITLE: Math.min(18, screenWidth * 0.045),
    CARD_BODY: Math.min(14, screenWidth * 0.035),
    CAPTION: Math.min(12, screenWidth * 0.03),
  },
  WEIGHTS: {
    LIGHT: '300' as const,
    REGULAR: '400' as const,
    MEDIUM: '500' as const,
    SEMIBOLD: '600' as const,
    BOLD: '700' as const,
  },
  LINE_HEIGHTS: {
    TIGHT: Math.min(20, screenWidth * 0.05),
    NORMAL: Math.min(24, screenWidth * 0.06),
    RELAXED: Math.min(28, screenWidth * 0.07),
  },
} as const;

export const SPACING = {
  XS: 4,
  SM: 8,
  MD: 16,
  LG: 24,
  XL: 32,
  XXL: 48,
  SCREEN_PADDING: screenWidth * 0.04,
  CARD_PADDING: screenWidth * 0.04,
} as const;

export const DIMENSIONS = {
  SCREEN: {
    WIDTH: screenWidth,
    HEIGHT: screenHeight,
  },
  LOGO: {
    WIDTH: Math.min(80, screenWidth * 0.2),
    HEIGHT: Math.min(80, screenWidth * 0.2),
  },

  BUTTON: {
    HEIGHT: 48,
    BORDER_RADIUS: 30,
  },
  CARD: {
    BORDER_RADIUS: 12,
    ELEVATION: 3,
  },
} as const;

export const ANIMATIONS = {
  DURATION: {
    FAST: 200,
    NORMAL: 300,
    SLOW: 500,
    EXTRA_SLOW: 2000,
  },
  SPRING: {
    TENSION: 50,
    FRICTION: 7,
  },
} as const;

// Helper functions
export const getResponsiveSize = (baseSize: number, factor: number = 0.04) => {
  return Math.min(baseSize, screenWidth * factor);
};

export const getScreenPercentage = (percentage: number) => {
  return screenWidth * (percentage / 100);
};