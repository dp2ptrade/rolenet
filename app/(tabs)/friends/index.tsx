import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useEffect } from 'react';

export default function FriendsTab() {
  useEffect(() => {
    // Redirect to the main friends screen
    router.replace('/friends');
  }, []);

  return (
    <View style={styles.container}>
      <Text>Redirecting to Friends...</Text>
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