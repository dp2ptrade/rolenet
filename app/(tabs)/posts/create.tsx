import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Appbar } from 'react-native-paper';
import { router } from 'expo-router';
import CreatePostForm from '@/components/CreatePostForm';
import { Post } from '@/lib/types';

export default function CreatePostScreen() {
  const handleSuccess = (post: Post) => {
    router.replace(`/posts/${post.id}`);
  };
  
  const handleCancel = () => {
    router.back();
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Create Service Post" />
      </Appbar.Header>
      
      <CreatePostForm
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: 'transparent',
    elevation: 0,
  },
});