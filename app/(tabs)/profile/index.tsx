import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useEffect } from 'react';

export default function ProfileTab() {
  useEffect(() => {
    // Redirect to the main profile screen
    router.replace('/profile');
  }, []);

  return (
    <View style={styles.container}>
      <Text>Redirecting to Profile...</Text>
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