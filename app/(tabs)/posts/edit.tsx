import React, { useEffect, useState } from 'react';
import { StyleSheet, ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Appbar, Text } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import CreatePostForm from '@/components/CreatePostForm';
import { usePostStore } from '@/stores/usePostStore';
import { useUserStore } from '@/stores/useUserStore';
import { Post } from '@/lib/types';

export default function EditPostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { loadPost, currentPost, isLoading } = usePostStore();
  const { user } = useUserStore();
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (id) {
      loadPost(id).catch(err => {
        setError('Failed to load post');
        console.error(err);
      });
    } else {
      setError('Post ID is required');
    }
  }, [id]);
  
  useEffect(() => {
    // Check if the current user is the post owner
    if (currentPost && user && currentPost.user_id !== user.id) {
      setError('You do not have permission to edit this post');
    }
  }, [currentPost, user]);
  
  const handleSuccess = (post: Post) => {
    router.replace(`/posts/${post.id}`);
  };
  
  const handleCancel = () => {
    router.back();
  };
  
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Appbar.Header style={styles.header}>
          <Appbar.BackAction onPress={() => router.back()} />
          <Appbar.Content title="Edit Post" />
        </Appbar.Header>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading post...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Appbar.Header style={styles.header}>
          <Appbar.BackAction onPress={() => router.back()} />
          <Appbar.Content title="Edit Post" />
        </Appbar.Header>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  if (!currentPost) {
    return (
      <SafeAreaView style={styles.container}>
        <Appbar.Header style={styles.header}>
          <Appbar.BackAction onPress={() => router.back()} />
          <Appbar.Content title="Edit Post" />
        </Appbar.Header>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Post not found</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Edit Post" />
      </Appbar.Header>
      
      <CreatePostForm
        initialValues={currentPost}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
        isEditing={true}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    color: '#EF4444',
    textAlign: 'center',
  },
});