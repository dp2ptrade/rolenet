import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useEffect } from 'react';

export default function NotificationsTab() {
  useEffect(() => {
    // Redirect to the main notifications screen
    router.replace('/notifications');
  }, []);

  return (
    <View style={styles.container}>
      <Text>Redirecting to Notifications...</Text>
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