import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useEffect } from 'react';

export default function ActivityTab() {
  useEffect(() => {
    // Redirect to the main activity screen
    router.replace('/activity');
  }, []);

  return (
    <View style={styles.container}>
      <Text>Redirecting to Activity...</Text>
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