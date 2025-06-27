import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useEffect } from 'react';

export default function PostsTab() {
  useEffect(() => {
    // Redirect to the main posts screen
    router.replace('/posts');
  }, []);
  
  // Refresh posts when filters change
  useEffect(() => {
    usePostStore.setState({ currentPage: 1 });
    loadPosts();
  }, [
    searchQuery,
    selectedCategory,
    selectedTags,
    experienceLevel,
    serviceType,
    isRemoteOnly,
    minRating,
    sortBy
  ]);
  
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  }, [loadPosts]);
  
  const handlePostPress = (post: Post) => {
    router.push(`/posts/${post.id}`);
  };
  
  const handleBookmarkPress = (post: Post) => {
    showSnackbar('Post bookmarked');
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
  
  const handleCreatePost = () => {
    if (!user) {
      showSnackbar('Please sign in to create a post');
      return;
    }
    
    router.push('/posts/create');
  };
  
  const handleApplyFilters = () => {
    usePostStore.setState({ currentPage: 1 });
    loadPosts();
  };
  
  const handleResetFilters = () => {
    usePostStore.setState({ currentPage: 1 });
    loadPosts();
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
  
  const renderFooter = () => {
    if (!hasMore) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#3B82F6" />
        <Text style={styles.footerText}>Loading more posts...</Text>
      </View>
    );
  };
  
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <FileText size={64} color="#9CA3AF" />
      <Text style={styles.emptyTitle}>No Posts Found</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery || selectedCategory || selectedTags.length > 0 ? 
          'Try adjusting your filters or search query' : 
          'Be the first to create a service post'}
      </Text>
    </View>
  );
  
  return (
    <View style={styles.container}>
      <Text>Redirecting to Posts...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  customHeader: {
    padding: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  header: {
    padding: 2,
    paddingTop: 2,
    paddingBottom: 2,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'hidden',
  },
  headerTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 12,
  },
  content: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 80,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#3B82F6',
  },
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});