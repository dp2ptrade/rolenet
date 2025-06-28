/**
 * Custom hook for responsive design in RoleNet app
 * Provides responsive utilities and screen dimension tracking
 */

import { useState, useEffect } from 'react';
import { Dimensions } from 'react-native';
import { getBreakpointInfo, getResponsiveValue, BREAKPOINTS } from '@/utils/platform';

export interface ScreenDimensions {
  width: number;
  height: number;
}

export interface ResponsiveInfo {
  isSmall: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLargeDesktop: boolean;
  isLandscape: boolean;
  isPortrait: boolean;
}

export interface UseResponsiveReturn {
  screenDimensions: ScreenDimensions;
  responsive: ResponsiveInfo;
  getResponsiveValue: <T>(values: {
    small?: T;
    mobile?: T;
    tablet?: T;
    desktop?: T;
    largeDesktop?: T;
    default: T;
  }) => T;
  getIconSize: (baseSize?: number) => number;
  getSpacing: (baseSpacing: number) => number;
  getFontSize: (baseSize: number) => number;
}

/**
 * Hook that provides responsive design utilities
 */
export const useResponsive = (): UseResponsiveReturn => {
  const [screenDimensions, setScreenDimensions] = useState<ScreenDimensions>(() => {
    const { width, height } = Dimensions.get('window');
    return { width, height };
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenDimensions({ width: window.width, height: window.height });
    });

    return () => subscription?.remove();
  }, []);

  const breakpointInfo = getBreakpointInfo(screenDimensions.width);
  const isLandscape = screenDimensions.width > screenDimensions.height;
  const isPortrait = !isLandscape;

  const responsive: ResponsiveInfo = {
    ...breakpointInfo,
    isLandscape,
    isPortrait,
  };

  const getResponsiveValueWrapper = <T>(values: {
    small?: T;
    mobile?: T;
    tablet?: T;
    desktop?: T;
    largeDesktop?: T;
    default: T;
  }): T => {
    return getResponsiveValue(screenDimensions.width, values);
  };

  const getIconSize = (baseSize: number = 24): number => {
    return getResponsiveValueWrapper({
      small: Math.max(18, baseSize * 0.8),
      mobile: baseSize,
      tablet: baseSize * 1.1,
      desktop: baseSize,
      largeDesktop: baseSize * 1.05,
      default: baseSize,
    });
  };

  const getSpacing = (baseSpacing: number): number => {
    return getResponsiveValueWrapper({
      small: Math.max(4, baseSpacing * 0.8),
      mobile: baseSpacing,
      tablet: baseSpacing * 1.2,
      desktop: baseSpacing * 1.1,
      largeDesktop: baseSpacing * 1.15,
      default: baseSpacing,
    });
  };

  const getFontSize = (baseSize: number): number => {
    return getResponsiveValueWrapper({
      small: Math.max(10, baseSize * 0.9),
      mobile: baseSize,
      tablet: baseSize * 1.05,
      desktop: baseSize,
      largeDesktop: baseSize * 1.02,
      default: baseSize,
    });
  };

  return {
    screenDimensions,
    responsive,
    getResponsiveValue: getResponsiveValueWrapper,
    getIconSize,
    getSpacing,
    getFontSize,
  };
};

/**
 * Hook for responsive breakpoint checks
 */
export const useBreakpoint = () => {
  const { responsive } = useResponsive();
  return responsive;
};

/**
 * Hook for responsive values
 */
export const useResponsiveValue = <T>(values: {
  small?: T;
  mobile?: T;
  tablet?: T;
  desktop?: T;
  largeDesktop?: T;
  default: T;
}): T => {
  const { getResponsiveValue } = useResponsive();
  return getResponsiveValue(values);
};

export default useResponsive;