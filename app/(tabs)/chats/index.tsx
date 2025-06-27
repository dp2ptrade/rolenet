import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useEffect } from 'react';

export default function ChatsTab() {
  useEffect(() => {
    // Redirect to the main chats screen
    router.replace('/chat');
  }, []);

  return (
    <View style={styles.container}>
      <Text>Redirecting to Chats...</Text>
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