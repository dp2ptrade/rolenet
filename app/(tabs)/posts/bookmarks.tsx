import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePostStore } from '@/stores/usePostStore';
import { useUserStore } from '@/stores/useUserStore';
import PostCard from '@/components/PostCard';
import { Post } from '@/lib/types';
import { FileText } from 'lucide-react-native';

export default function BookmarkedPostsScreen() {
  const { bookmarkedPosts, isLoading, loadBookmarkedPosts } = usePostStore();
  const { user } = useUserStore();
  
  const [refreshing, setRefreshing] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  useEffect(() => {
    if (user?.id) {
      loadBookmarkedPosts(user.id);
    }
  }, [user?.id]);
  
  const onRefresh = useCallback(async () => {
    if (!user?.id) return;
    
    setRefreshing(true);
    await loadBookmarkedPosts(user.id);
    setRefreshing(false);
  }, [user?.id, loadBookmarkedPosts]);
  
  const handlePostPress = (post: Post) => {
    router.push(`/posts/${post.id}`);
  };
  
  const handleBookmarkPress = (post: Post) => {
    showSnackbar('Post removed from bookmarks');
  };
  
  const handleChatPress = (post: Post) => {
    if (post.user) {
      router.push({
        pathname: '/chat',
        params: {
          userId: post.user.id,
          userName: post.user.name,
          userRole: post.user.role,
          userAvatar: post.user.avatar
        }
      });
    }
  };
  
  const handleBookPress = (post: Post) => {
    router.push(`/posts/${post.id}/book`);
  };
  
  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };
  
  const renderItem = ({ item }: { item: Post }) => (
    <PostCard
      post={item}
      onPress={handlePostPress}
      onBookmark={handleBookmarkPress}
      onChat={handleChatPress}
      onBook={handleBookPress}
    />
  );
  
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <FileText size={64} color="#9CA3AF" />
      <Text style={styles.emptyTitle}>No Bookmarked Posts</Text>
      <Text style={styles.emptySubtitle}>
        Posts you bookmark will appear here for easy access
      </Text>
    </View>
  );
  
  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={bookmarkedPosts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={!isLoading ? renderEmpty : null}
      />
      
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        {snackbarMessage}
      </Snackbar>
    </SafeAreaView>
  );
}

import { router } from 'expo-router';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    textAlign: 'center',
    color: '#6B7280',
  },
});