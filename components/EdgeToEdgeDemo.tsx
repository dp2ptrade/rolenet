import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Card, Surface } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function EdgeToEdgeDemo() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      {/* Background that extends to edges */}
      <LinearGradient
        colors={['#3B82F6', '#06B6D4', '#8B5CF6']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      {/* Safe area content */}
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <Card style={styles.infoCard}>
            <Card.Content>
              <Text variant="headlineSmall" style={styles.title}>
                Edge-to-Edge Display Active! 🎉
              </Text>
              
              <Text variant="bodyMedium" style={styles.description}>
                Your app now uses the full screen real estate while respecting safe areas.
              </Text>
              
              <Surface style={styles.insetInfo}>
                <Text variant="labelLarge" style={styles.insetTitle}>
                  Safe Area Insets:
                </Text>
                <Text variant="bodySmall">Top: {insets.top}px</Text>
                <Text variant="bodySmall">Bottom: {insets.bottom}px</Text>
                <Text variant="bodySmall">Left: {insets.left}px</Text>
                <Text variant="bodySmall">Right: {insets.right}px</Text>
              </Surface>
              
              <Surface style={styles.screenInfo}>
                <Text variant="labelLarge" style={styles.insetTitle}>
                  Screen Dimensions:
                </Text>
                <Text variant="bodySmall">Width: {width}px</Text>
                <Text variant="bodySmall">Height: {height}px</Text>
              </Surface>
            </Card.Content>
          </Card>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  infoCard: {
    elevation: 8,
    borderRadius: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: 'bold',
  },
  description: {
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  insetInfo: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  screenInfo: {
    padding: 16,
    borderRadius: 12,
  },
  insetTitle: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
});