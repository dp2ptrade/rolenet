import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useEffect } from 'react';

export default function DiscoverTab() {
  useEffect(() => {
    // Redirect to the main discover screen
    router.replace('/discover');
  }, []);

  return (
    <View style={styles.container}>
      <Text>Redirecting to Discover...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});