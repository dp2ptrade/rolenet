import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Appbar, FAB, Snackbar, SegmentedButtons } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { usePostStore } from '@/stores/usePostStore';
import { useUserStore } from '@/stores/useUserStore';
import PostCard from '@/components/PostCard';
import { Post } from '@/lib/types';
import { FileText, Plus } from 'lucide-react-native';

export default function MyPostsScreen() {
  const { user } = useUserStore();
  const { 
    userPosts, 
    bookmarkedPosts, 
    isLoading, 
    loadUserPosts, 
    loadBookmarkedPosts,
    subscribeToUserPosts,
    unsubscribeFromUserPosts,
    subscribeToPostBookmarks,
    unsubscribeFromPostBookmarks
  } = usePostStore();
  
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('my-posts');
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  // Load posts on mount
  useEffect(() => {
    if (user?.id) {
      loadUserPosts(user.id);
      loadBookmarkedPosts(user.id);
      
      // Subscribe to real-time updates
      subscribeToUserPosts(user.id);
      subscribeToPostBookmarks(user.id);
    }
    
    return () => {
      unsubscribeFromUserPosts();
      unsubscribeFromPostBookmarks();
    };
  }, [user?.id]);
  
  const onRefresh = useCallback(async () => {
    if (!user?.id) return;
    
    setRefreshing(true);
    
    if (activeTab === 'my-posts') {
      await loadUserPosts(user.id);
    } else {
      await loadBookmarkedPosts(user.id);
    }
    
    setRefreshing(false);
  }, [activeTab, user?.id]);
  
  const handlePostPress = (post: Post) => {
    router.push(`/posts/${post.id}`);
  };
  
  const handleEditPost = (post: Post) => {
    router.push({
      pathname: '/posts/edit',
      params: { id: post.id }
    });
  };
  
  const handleCreatePost = () => {
    router.push('/posts/create');
  };
  
  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };
  
  const renderItem = ({ item }: { item: Post }) => (
    <PostCard
      post={item}
      onPress={handlePostPress}
    />
  );
  
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <FileText size={64} color="#9CA3AF" />
      <Text style={styles.emptyTitle}>
        {activeTab === 'my-posts' ? 'No Posts Yet' : 'No Bookmarked Posts'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {activeTab === 'my-posts' 
          ? 'Create your first service post to showcase your skills' 
          : 'Bookmark posts to save them for later'}
      </Text>
    </View>
  );
  
  const displayedPosts = activeTab === 'my-posts' ? userPosts : bookmarkedPosts;
  
  return (
    <SafeAreaView style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="My Posts" />
      </Appbar.Header>
      
      <View style={styles.tabContainer}>
        <SegmentedButtons
          value={activeTab}
          onValueChange={setActiveTab}
          buttons={[
            { value: 'my-posts', label: 'My Posts' },
            { value: 'bookmarked', label: 'Bookmarked' }
          ]}
          style={styles.segmentedButtons}
        />
      </View>
      
      <FlatList
        data={displayedPosts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={!isLoading ? renderEmpty : null}
      />
      
      {activeTab === 'my-posts' && (
        <FAB
          icon={({ size, color }) => <Plus size={size} color={color} />}
          style={styles.fab}
          onPress={handleCreatePost}
          label="Create Post"
        />
      )}
      
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: 'transparent',
    elevation: 0,
  },
  tabContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  segmentedButtons: {
    backgroundColor: '#F1F5F9',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#3B82F6',
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