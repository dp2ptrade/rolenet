/**
 * Error Boundary component for RoleNet app
 * Catches JavaScript errors anywhere in the child component tree
 */

import React, { Component, ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Card } from 'react-native-paper';
import { AlertTriangle } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Log error to console in development
    if (__DEV__) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In production, you might want to log to a crash reporting service
    // Example: Sentry.captureException(error);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <View style={styles.container}>
          <Card style={styles.errorCard}>
            <Card.Content style={styles.cardContent}>
              <View style={styles.iconContainer}>
                <AlertTriangle size={48} color={COLORS.PRIMARY} />
              </View>
              
              <Text style={styles.title}>Oops! Something went wrong</Text>
              
              <Text style={styles.description}>
                We're sorry for the inconvenience. The app encountered an unexpected error.
              </Text>
              
              {__DEV__ && this.state.error && (
                <View style={styles.errorDetails}>
                  <Text style={styles.errorTitle}>Error Details (Development):</Text>
                  <Text style={styles.errorMessage}>
                    {this.state.error.message}
                  </Text>
                </View>
              )}
              
              <Button
                mode="contained"
                onPress={this.handleRetry}
                style={styles.retryButton}
                buttonColor={COLORS.PRIMARY}
              >
                Try Again
              </Button>
            </Card.Content>
          </Card>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND,
    padding: SPACING.MD,
  },
  errorCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 12,
    elevation: 3,
  },
  cardContent: {
    alignItems: 'center',
    padding: SPACING.LG,
  },
  iconContainer: {
    marginBottom: SPACING.MD,
  },
  title: {
    fontSize: TYPOGRAPHY.SIZES.SUBTITLE,
    fontWeight: TYPOGRAPHY.WEIGHTS.BOLD,
    color: COLORS.TEXT.PRIMARY,
    textAlign: 'center',
    marginBottom: SPACING.SM,
  },
  description: {
    fontSize: TYPOGRAPHY.SIZES.BODY,
    color: COLORS.TEXT.SECONDARY,
    textAlign: 'center',
    lineHeight: TYPOGRAPHY.LINE_HEIGHTS.NORMAL,
    marginBottom: SPACING.LG,
  },
  errorDetails: {
    width: '100%',
    backgroundColor: '#f5f5f5',
    padding: SPACING.SM,
    borderRadius: 8,
    marginBottom: SPACING.LG,
  },
  errorTitle: {
    fontSize: TYPOGRAPHY.SIZES.CARD_BODY,
    fontWeight: TYPOGRAPHY.WEIGHTS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: SPACING.XS,
  },
  errorMessage: {
    fontSize: TYPOGRAPHY.SIZES.CAPTION,
    color: COLORS.TEXT.SECONDARY,
    fontFamily: 'monospace',
  },
  retryButton: {
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.XS,
  },
});

export default ErrorBoundary;