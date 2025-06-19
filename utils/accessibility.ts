/**
 * Accessibility utilities for RoleNet app
 * Provides consistent accessibility features across the application
 */

import { AccessibilityInfo } from 'react-native';

/**
 * Common accessibility labels and hints for the app
 */
export const ACCESSIBILITY_LABELS = {
  BUTTONS: {
    GET_STARTED: 'Get started with RoleNet',
    SIGN_IN: 'Sign in to your account',
    SIGN_UP: 'Create a new account',
    SEND_PING: 'Send connection request',
    CALL: 'Start voice call',
    END_CALL: 'End voice call',
    MUTE: 'Mute microphone',
    UNMUTE: 'Unmute microphone',
    SPEAKER: 'Toggle speaker',
    SEND_MESSAGE: 'Send message',
    BACK: 'Go back',
    CLOSE: 'Close',
    MENU: 'Open menu',
    SEARCH: 'Search professionals',
    FILTER: 'Filter results',
  },
  INPUTS: {
    EMAIL: 'Email address',
    PASSWORD: 'Password',
    MESSAGE: 'Type your message',
    SEARCH: 'Search for professionals',
    NAME: 'Full name',
    BIO: 'Professional bio',
  },
  IMAGES: {
    PROFILE_PICTURE: 'Profile picture',
    LOGO: 'RoleNet logo',
    AVATAR: 'User avatar',
  },
  STATUS: {
    ONLINE: 'User is online',
    OFFLINE: 'User is offline',
    BUSY: 'User is busy',
    AWAY: 'User is away',
  },
} as const;

/**
 * Accessibility hints for better user guidance
 */
export const ACCESSIBILITY_HINTS = {
  BUTTONS: {
    GET_STARTED: 'Tap to begin using RoleNet and connect with professionals',
    PING: 'Double tap to send a connection request to this professional',
    CALL: 'Double tap to start a voice call with this user',
    PROFILE: 'Double tap to view detailed profile information',
    SEARCH: 'Double tap to search for professionals by role or location',
  },
  NAVIGATION: {
    TAB: 'Navigate to different sections of the app',
    BACK: 'Return to the previous screen',
  },
} as const;

/**
 * Accessibility roles for different UI elements
 */
export const ACCESSIBILITY_ROLES = {
  BUTTON: 'button' as const,
  LINK: 'link' as const,
  TEXT: 'text' as const,
  IMAGE: 'image' as const,
  HEADER: 'header' as const,
  SEARCH: 'search' as const,
  TAB: 'tab' as const,
  MENU: 'menu' as const,
  LIST: 'list' as const,
  LIST_ITEM: 'listitem' as const,
};

/**
 * Check if screen reader is enabled
 */
export const isScreenReaderEnabled = async (): Promise<boolean> => {
  try {
    return await AccessibilityInfo.isScreenReaderEnabled();
  } catch (error) {
    console.warn('Failed to check screen reader status:', error);
    return false;
  }
};

/**
 * Check if reduce motion is enabled
 */
export const isReduceMotionEnabled = async (): Promise<boolean> => {
  try {
    return await AccessibilityInfo.isReduceMotionEnabled();
  } catch (error) {
    console.warn('Failed to check reduce motion status:', error);
    return false;
  }
};

/**
 * Announce message to screen reader
 */
export const announceForAccessibility = (message: string): void => {
  try {
    AccessibilityInfo.announceForAccessibility(message);
  } catch (error) {
    console.warn('Failed to announce for accessibility:', error);
  }
};

/**
 * Get accessibility props for a button
 */
export const getButtonAccessibilityProps = ({
  label,
  hint,
  disabled = false,
}: {
  label: string;
  hint?: string;
  disabled?: boolean;
}) => ({
  accessible: true,
  accessibilityRole: ACCESSIBILITY_ROLES.BUTTON,
  accessibilityLabel: label,
  accessibilityHint: hint,
  accessibilityState: { disabled },
});

/**
 * Get accessibility props for an image
 */
export const getImageAccessibilityProps = ({
  label,
  decorative = false,
}: {
  label?: string;
  decorative?: boolean;
}) => {
  if (decorative) {
    return {
      accessible: false,
      accessibilityElementsHidden: true,
    };
  }
  
  return {
    accessible: true,
    accessibilityRole: ACCESSIBILITY_ROLES.IMAGE,
    accessibilityLabel: label,
  };
};

/**
 * Get accessibility props for text input
 */
export const getTextInputAccessibilityProps = ({
  label,
  hint,
  required = false,
  error,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  error?: string;
}) => ({
  accessible: true,
  accessibilityLabel: label,
  accessibilityHint: hint,
  accessibilityRequired: required,
  accessibilityInvalid: !!error,
  accessibilityErrorMessage: error,
});

/**
 * Get accessibility props for navigation elements
 */
export const getNavigationAccessibilityProps = ({
  label,
  selected = false,
}: {
  label: string;
  selected?: boolean;
}) => ({
  accessible: true,
  accessibilityRole: ACCESSIBILITY_ROLES.TAB,
  accessibilityLabel: label,
  accessibilityState: { selected },
});

/**
 * Create semantic accessibility structure for lists
 */
export const getListAccessibilityProps = ({
  itemCount,
  currentIndex,
}: {
  itemCount: number;
  currentIndex?: number;
}) => ({
  accessible: true,
  accessibilityRole: ACCESSIBILITY_ROLES.LIST,
  accessibilityLabel: `List with ${itemCount} items`,
  ...(currentIndex !== undefined && {
    accessibilityValue: {
      now: currentIndex + 1,
      min: 1,
      max: itemCount,
    },
  }),
});

/**
 * Focus management utilities
 */
export const focusUtils = {
  /**
   * Set focus to an element after a delay
   */
  setFocusWithDelay: (ref: any, delay: number = 100) => {
    setTimeout(() => {
      if (ref?.current?.focus) {
        ref.current.focus();
      }
    }, delay);
  },
  
  /**
   * Move focus to next focusable element
   */
  focusNext: () => {
    // Implementation would depend on the specific navigation library
    // This is a placeholder for focus management
  },
};