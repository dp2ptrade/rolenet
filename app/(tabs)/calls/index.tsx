import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useEffect } from 'react';

export default function CallsTab() {
  useEffect(() => {
    // Redirect to the main calls screen
    router.replace('/call');
  }, []);

  return (
    <View style={styles.container}>
      <Text>Redirecting to Calls...</Text>
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