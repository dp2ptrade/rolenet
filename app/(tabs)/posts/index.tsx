import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { Text, FAB, Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { usePostStore } from '@/stores/usePostStore';
import { useUserStore } from '@/stores/useUserStore';
import { useResponsive } from '@/hooks/useResponsive';
import PostCard from '@/components/PostCard';
import PostFilters from '@/components/PostFilters';
import { Post } from '@/lib/types';
import { FileText, Plus } from 'lucide-react-native';

export default function PostsScreen() {
  const { 
    posts, 
    isLoading, 
    error, 
    loadPosts, 
    loadMorePosts,
    hasMore,
    searchQuery,
    selectedCategory,
    selectedTags,
    priceRange,
    experienceLevel,
    serviceType,
    isRemoteOnly,
    minRating,
    sortBy
  } = usePostStore();
  
  const { user } = useUserStore();
  
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  // Load posts on mount
  useEffect(() => {
    loadPosts();
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
  
  const { responsive } = useResponsive();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <PostFilters
          onApplyFilters={handleApplyFilters}
          onResetFilters={handleResetFilters}
          showModal={showFilters}
          setShowModal={setShowFilters}
        />
        
        <FlatList
          data={posts}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: responsive.isTablet ? 70 : 60 }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onEndReached={loadMorePosts}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={!isLoading ? renderEmpty : null}
        />
      </View>
      
      <FAB
        icon={({ size, color }) => <Plus size={size} color={color} />}
        style={styles.fab}
        onPress={handleCreatePost}
        small
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
    padding: 0,
    paddingTop: 2,
    paddingBottom: 0,
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
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 12,
  },
  content: {
    flex: 1,
    paddingBottom: 0, // Adjusted to ensure content is not obscured by bottom navigation bar
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
    backgroundColor: '#38BDF8',
  },
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  footerText: {
    marginLeft: 8,
    color: '#6B7280',
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
