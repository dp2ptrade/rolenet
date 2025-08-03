import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Alert, TextInput, ActivityIndicator, TouchableOpacity, Image, Linking, Animated, FlatList } from 'react-native';
import { 
  Searchbar, 
  Card, 
  Avatar, 
  Button, 
  Text, 
  Chip, 
  Surface, 
  FAB,
  Snackbar,
  Portal,
  Modal,
  Icon
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, Star, Phone, Filter, Sparkles, TrendingUp, Tag } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useUserStore } from '@/stores/useUserStore';
import { usePingStore } from '@/stores/usePingStore';
import { useStatusStore } from '@/stores/useStatusStore';
import { useAppStateStore } from '@/stores/useAppStateStore';
import { useResponsive } from '@/hooks/useResponsive';
import AnimatedStatusDot from '@/components/AnimatedStatusDot';
import { ASSETS } from '@/constants/assets';
import { User } from '@/lib/types';
import { userService } from '@/lib/supabaseService';
import { SmartSearchEngine, SearchFilters, SearchResult } from '@/lib/searchEngine';
import { VoiceSearchService } from '@/lib/voiceSearch';
import { VoiceSearchProcessor } from '@/lib/searchEngine';
import SearchFiltersModal from '@/components/SearchFilters';
import VoiceSearchButton from '@/components/VoiceSearchButton';
import { router } from 'expo-router';
import { CONFIG } from '@/lib/config/chatConfig';


export default function DiscoverTestScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [popularRoles, setPopularRoles] = useState<string[]>([]);
  const [popularTags, setPopularTags] = useState<string[]>([]);
  const [activeSuggestionTab, setActiveSuggestionTab] = useState<'suggestions' | 'roles' | 'tags'>('suggestions');
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [pingModalVisible, setPingModalVisible] = useState(false);
  const [pingMessage, setPingMessage] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const currentUser = useUserStore((state) => state.user);
  const { sendPing } = usePingStore();
  const { userStatuses, subscribeToUserStatuses, unsubscribeFromUserStatuses } = useStatusStore();
  const { updateActivity } = useAppStateStore();



  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    location: 'nearby',
    roles: [],
    tags: [],
    availability: 'all',
    rating: 0,
    experience: 'all',
    distance: 50,
    sortBy: 'relevance'
  });

  useEffect(() => {
    // Initialize voice search service
    VoiceSearchService.configure({
      elevenLabsApiKey: '', // Add your ElevenLabs API key here
      voiceId: 'pNInz6obpgDQGcFmaJgB' // Optional: specific voice ID
    });

    loadUsers();
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);



  const loadUsers = async (appliedFilters: SearchFilters | null = null) => {
    try {
      setLoading(true);
      const searchParams: any = { limit: CONFIG.SEARCH.DEFAULT_LIMIT };

      // Apply filters if provided or if we have active filters
      const filtersToApply = appliedFilters || filters;
      if (filtersToApply.query) {
        searchParams.query = filtersToApply.query;
      }
      if (filtersToApply.roles && filtersToApply.roles.length > 0) {
        searchParams.roles = filtersToApply.roles;
      }
      if (filtersToApply.tags && filtersToApply.tags.length > 0) {
        searchParams.tags = filtersToApply.tags;
      }
      if (filtersToApply.availability === 'available') {
        searchParams.is_available = true;
      }
      if (filtersToApply.rating > 0) {
        searchParams.min_rating = filtersToApply.rating;
      }
      if (filtersToApply.location === 'nearby' && currentUser?.location) {
        searchParams.latitude = currentUser.location.latitude;
        searchParams.longitude = currentUser.location.longitude;
        searchParams.max_distance = filtersToApply.distance;
      }
      if (filtersToApply.sortBy) {
        searchParams.sort_by = filtersToApply.sortBy;
      }

      const { data: usersData, error } = await userService.searchUsers(searchParams);
      
      if (error) {
        console.error('Error loading users:', error);
        setSnackbarMessage('Failed to load users from database');
        setSnackbarVisible(true);
        setUsers([]);
      } else if (usersData && usersData.length > 0) {
        console.log(`Successfully loaded ${usersData.length} users from database`);
        const filteredUsers = usersData.filter(user => user.id !== currentUser?.id);
        setUsers(filteredUsers);
        setSnackbarMessage(`Found ${filteredUsers.length} professionals`);
        setSnackbarVisible(true);
        
        // Extract popular roles and tags for quick filters
        const roleCounts: { [key: string]: number } = {};
        const tagCounts: { [key: string]: number } = {};
        filteredUsers.forEach(user => {
          roleCounts[user.role] = (roleCounts[user.role] || 0) + 1;
          user.tags.forEach((tag: string) => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          });
        });
        
        const sortedRoles = Object.entries(roleCounts)
          .sort((a, b) => b[1] - a[1])
          .map(entry => entry[0])
          .slice(0, 5);
        setPopularRoles(sortedRoles);
        
        const sortedTags = Object.entries(tagCounts)
          .sort((a, b) => b[1] - a[1])
          .map(entry => entry[0])
          .slice(0, 10);
        setPopularTags(sortedTags);
      } else {
        console.warn('No users found in database');
        setSnackbarMessage('No users found in database');
        setSnackbarVisible(true);
        setUsers([]);
        setPopularRoles([]);
        setPopularTags([]);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      setSnackbarMessage('Error connecting to database');
      setSnackbarVisible(true);
      setUsers([]);
      setPopularRoles([]);
      setPopularTags([]);
    } finally {
      setLoading(false);
      if (appliedFilters) {
        performSearch();
      }
    }
  };

  useEffect(() => {
    if (!loading) {
      loadUsers(filters);
    }
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [filters]);

  useEffect(() => {
    if (searchQuery.length > 2) {
      const newSuggestions = SmartSearchEngine.generateQuerySuggestions(searchQuery, users);
      setSuggestions(newSuggestions);
    } else {
      setSuggestions([]);
    }
  }, [searchQuery, users]);

  useEffect(() => {
    if (searchResults.length > 0) {
      const userIds = searchResults.map(result => result.user.id);
      subscribeToUserStatuses(userIds);
    }
    
    return () => {
      unsubscribeFromUserStatuses();
    };
  }, [searchResults]);

  const performSearch = () => {
    // Since filtering is now done at database level, we can directly use the loaded users as search results
    // But we still calculate relevance score and distance for display purposes
    const searchFilters = { ...filters, query: searchQuery };
    const userLocation = currentUser?.location;
    
    const results = SmartSearchEngine.search(users, searchFilters, userLocation);
    setSearchResults(results);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
// eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  const handleSearch = (query: string) => {
    updateActivity(); // Track user activity
    setSearchQuery(query);
    setFilters(prev => ({ ...prev, query }));
    setSuggestions([]);
  };

  const handleVoiceTranscript = (transcript: string) => {
    const voiceFilters = VoiceSearchProcessor.processVoiceQuery(transcript);
    setFilters(prev => ({ ...prev, ...voiceFilters }));
    setSearchQuery(transcript);
    setSnackbarMessage(`Voice search: "${transcript}"`);
    setSnackbarVisible(true);
  };

  const handleVoiceError = (error: string) => {
    setSnackbarMessage(error);
    setSnackbarVisible(true);
  };

  const handleVoiceSearchClick = () => {
    // Simulate VoiceSearchButton click behavior
    // In a real implementation, this would trigger the voice search functionality
    // For now, we'll show a message
    setSnackbarMessage("Voice search activated. Speak now...");
    setSnackbarVisible(true);
    // Note: Actual voice search implementation would be triggered here
    // You might need to integrate with VoiceSearchService directly or show a modal
  };

  const handlePingUser = (userId: string) => {
    if (!currentUser?.id) {
      setSnackbarMessage('Please sign in to send pings');
      setSnackbarVisible(true);
      return;
    }

    setSelectedUserId(userId);
    setPingMessage('');

    setPingModalVisible(true);
  };

  // Simple text input handler
  const handleTextChange = (text: string) => {
    setPingMessage(text);
  };

  // Reset input when modal opens for new user
  useEffect(() => {
    if (pingModalVisible && selectedUserId) {
      setPingMessage('');
    }
// eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId]);

  const handleSendPing = async () => {
    updateActivity(); // Track user activity
    if (!currentUser?.id || !selectedUserId || !pingMessage.trim()) {
      setSnackbarMessage('Please enter a message');
      setSnackbarVisible(true);
      return;
    }

    try {
      await sendPing(currentUser.id, selectedUserId, pingMessage.trim());
      setSnackbarMessage('Ping sent successfully!');
      setSnackbarVisible(true);
      setPingModalVisible(false);
      setPingMessage('');
      setSelectedUserId(null);
    } catch (error) {
      console.error('Error sending ping:', error);
      setSnackbarMessage('Failed to send ping. Please try again.');
      setSnackbarVisible(true);
    }
  };

  const handleCancelPing = () => {
    setPingModalVisible(false);
    setPingMessage('');

    setSelectedUserId(null);
  };

  const handleViewProfile = (userId: string) => {
    router.push({
      pathname: '/public-profile',
      params: { userId }
    });
  };

  const handleSuggestionPress = (suggestion: string) => {
    handleSearch(suggestion);
  };

  const handleFiltersChange = (newFilters: SearchFilters) => {
    setFilters(newFilters);
  };

  const handleApplyFilters = () => {
    setSnackbarMessage('Filters applied successfully!');
    setSnackbarVisible(true);
    loadUsers(filters);
    setShowFilters(false);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSuggestions([]);
    setFilters({
      query: '',
      location: 'nearby',
      roles: [],
      tags: [],
      availability: 'all',
      rating: 0,
      experience: 'all',
      distance: 50,
      sortBy: 'relevance'
    });
    setSnackbarMessage('Filters reset');
    setSnackbarVisible(true);
  };

  const getRoleEmoji = (role: string) => {
    const roleEmojis: { [key: string]: string } = {
      'Teacher': '👩‍🏫',
      'Doctor': '👨‍⚕️',
      'Developer': '👨‍💻',
      'Designer': '👨‍🎨',
      'Chef': '👨‍🍳',
      'Engineer': '👨‍🔧',
      'Artist': '👨‍🎨',
      'Writer': '✍️',
    };
    return roleEmojis[role] || '👤';
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.roles.length > 0) count++;
    if (filters.tags.length > 0) count++;
    if (filters.availability !== 'all') count++;
    if (filters.rating > 0) count++;
    if (filters.experience !== 'all') count++;
    if (filters.distance !== CONFIG.SEARCH.DEFAULT_RADIUS_KM) count++;
    if (filters.sortBy !== 'relevance') count++;
    return count;
  };

  const UserListItem = ({ item, onViewProfile, onPing }: { item: SearchResult; onViewProfile: (userId: string) => void; onPing: (userId: string) => void }) => {
    const { user, relevanceScore, distance } = item;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
      if (user.online_status === 'online') {
        const pulse = Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.2,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
          ])
        );
        pulse.start();
        return () => pulse.stop();
      }
    }, [user.online_status]);

    const userStatus = userStatuses[user.id] || { status: user.online_status, lastSeen: null };
    return (
      <TouchableOpacity 
        style={styles.userListItem}
        onPress={() => onViewProfile(user.id)}
      >
        <View style={styles.userInfo}>
          <LinearGradient
            colors={['#38BDF8', '#0EA5E9']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatarGradient}
          >
            <Avatar.Image 
              size={50} 
              source={{ uri: user.avatar || undefined }} 
              style={{ backgroundColor: 'white' }}
            />
          </LinearGradient>
        </View>
        <View style={styles.userListDetails}>
          <View style={styles.nameRow}>
            <Text style={styles.userListName}>{user.name}</Text>
            <View style={styles.statusIndicator}>
              <AnimatedStatusDot
                status={userStatus.status}
                size={8}
                style={styles.statusDot}
              />
              <Text style={[
                styles.statusText,
                { color: userStatus.status === 'online' ? '#10B981' : '#EF4444' }
              ]}>
                {userStatus.status === 'online' ? 'Online' : 'Offline'}
              </Text>
            </View>
          </View>
          <Text style={styles.userListRole}>{user.role} {getRoleEmoji(user.role)}</Text>
          <View style={styles.userListRating}>
            <Star size={14} color="#F59E0B" fill="#F59E0B" />
            <Text style={styles.userListRatingText}>{user.rating} ({user.rating_count})</Text>
          </View>
          <View style={styles.userListLocation}>
            <MapPin size={12} color="#6B7280" />
            <Text style={styles.userListLocationText}>
              {`${user.location.address}${distance ? ` • ${distance.toFixed(1)} km` : ''}`}
            </Text>
          </View>
        </View>
        <Button
          mode="contained"
          onPress={() => onPing(user.id)}
          style={styles.pingListButton}
          compact
        >
          Ping
        </Button>
      </TouchableOpacity>
    );
  };

  const renderUserItem = ({ item }: { item: SearchResult }) => {
    return (
      <UserListItem 
        item={item} 
        onViewProfile={handleViewProfile} 
        onPing={handlePingUser} 
      />
    );
  };

  const { getResponsiveValue, responsive } = useResponsive();

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#3B82F6', '#06B6D4']}
        style={styles.header}
      >
        <View style={styles.headerTitleContainer}>
          <View style={styles.headerLeftSection}>
            <Image 
              source={ASSETS.IMAGES.LOGO} 
              style={styles.headerLogo} 
              resizeMode="contain" 
              tintColor="white"
            />
            <Text variant="headlineMedium" style={styles.headerTitle}>
              ROLE NET
            </Text>
          </View>
        </View>
        <View style={styles.searchBarContainer}>
          <TouchableOpacity onPress={() => setShowFilters(true)} style={styles.filterTab}>
            <LinearGradient
              colors={['#38BDF8', '#0EA5E9']}
              style={styles.filterGradient}
            >
              <Filter size={20} color="white" />
              <Text style={styles.filterTabText}>Filters {getActiveFiltersCount() > 0 ? `(${getActiveFiltersCount()})` : ''}</Text>
            </LinearGradient>
          </TouchableOpacity>
          <Searchbar
            placeholder="Search by role, name, tags..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            onSubmitEditing={() => handleSearch(searchQuery)}
            style={[styles.searchbar, { flex: 1 }]}
            icon={() => <Sparkles size={20} color="#6B7280" />}
            right={() => (
              <View style={styles.optionIcon}>
                <TouchableOpacity onPress={handleVoiceSearchClick}>
                  <LinearGradient
                    colors={['#38BDF8', '#0EA5E9']}
                    style={styles.voiceGradient}
                  >
                    <Icon source="microphone" size={20} color="white" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          />
        </View>
        {/* Quick Filters Removed */}
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.tabContainer}>
          <Surface style={styles.tabBar} elevation={4}>
            <View style={styles.tabSelectorContainer}>
              <TouchableOpacity
                style={[styles.tabItem, activeSuggestionTab === 'suggestions' && styles.activeTabItem]}
                onPress={() => setActiveSuggestionTab('suggestions')}
              >
                <View style={styles.tabItemContent}>
                  <TrendingUp size={16} color={activeSuggestionTab === 'suggestions' ? "#3B82F6" : "#6B7280"} />
                  <Text style={[styles.tabText, activeSuggestionTab === 'suggestions' && styles.activeTabText]}>
                    Suggestions
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabItem, activeSuggestionTab === 'roles' && styles.activeTabItem]}
                onPress={() => setActiveSuggestionTab('roles')}
              >
                <View style={styles.tabItemContent}>
                  <TrendingUp size={16} color={activeSuggestionTab === 'roles' ? "#3B82F6" : "#6B7280"} />
                  <Text style={[styles.tabText, activeSuggestionTab === 'roles' && styles.activeTabText]}>
                    Popular Roles
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabItem, activeSuggestionTab === 'tags' && styles.activeTabItem]}
                onPress={() => setActiveSuggestionTab('tags')}
              >
                <View style={styles.tabItemContent}>
                  <Tag size={16} color={activeSuggestionTab === 'tags' ? "#3B82F6" : "#6B7280"} />
                  <Text style={[styles.tabText, activeSuggestionTab === 'tags' && styles.activeTabText]}>
                    Popular Tags
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
            <View style={[styles.tabIndicator, { left: activeSuggestionTab === 'suggestions' ? '0%' : activeSuggestionTab === 'roles' ? '33.33%' : '66.67%' }]} />
          </Surface>
          {showSuggestions && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabContent}>
              {activeSuggestionTab === 'suggestions' && suggestions.map((suggestion, index) => (
                <Chip
                  key={index}
                  onPress={() => handleSuggestionPress(suggestion)}
                  style={styles.suggestionChip}
                  icon="lightbulb-outline"
                >
                  {suggestion}
                </Chip>
              ))}
              {activeSuggestionTab === 'roles' && popularRoles.map((role, index) => (
                <Chip
                  key={index}
                  onPress={() => setFilters(prev => ({ 
                    ...prev, 
                    roles: prev.roles.includes(role) ? prev.roles.filter(r => r !== role) : [...prev.roles, role]
                  }))}
                  selected={filters.roles.includes(role)}
                  style={styles.popularChip}
                >
                  {role}
                </Chip>
              ))}
              {activeSuggestionTab === 'tags' && popularTags.map((tag, index) => (
                <Chip
                  key={index}
                  onPress={() => setFilters(prev => ({ 
                    ...prev, 
                    tags: prev.tags.includes(tag) ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag]
                  }))}
                  selected={filters.tags.includes(tag)}
                  style={styles.popularChip}
                >
                  {tag}
                </Chip>
              ))}
            </ScrollView>
          )}
        </View>
        <View style={styles.searchContainer}>
          <View style={styles.searchActions}>
            {/* Removed separate Voice Search and Filters buttons */}
          </View>

          {/* Removed standalone suggestions section as it's now integrated with tabs */}

          {/* Removed as tab bar is now under header */}

          {/* Loading Indicator */}
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#3B82F6" />
            </View>
          )}
        </View>

        {/* Search Results */}
        <FlatList
          data={searchResults}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.user.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: responsive.isTablet ? 70 : 60 }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <Card style={styles.emptyCard}>
              <Card.Content style={styles.emptyContent}>
                <Sparkles size={48} color="#6B7280" />
                <Text variant="titleMedium" style={styles.emptyTitle}>
                  No professionals found
                </Text>
                <Text variant="bodyMedium" style={styles.emptySubtitle}>
                  Try adjusting your search filters or use voice search to find professionals
                </Text>
              </Card.Content>
            </Card>
          }
          ListHeaderComponent={
            searchResults.length > 0 ? (
              <Surface style={styles.statsContainer} elevation={1}>
                <Text variant="bodyMedium" style={styles.statsText}>
                  Found {searchResults.length} professionals
                  {filters.location === 'nearby' && ' nearby'}
                  {searchQuery && ` matching "${searchQuery}"`}
                </Text>
              </Surface>
            ) : null
          }
        />
      </View>

      {/* Search Filters Modal */}
      <SearchFiltersModal
        visible={showFilters}
        onDismiss={() => setShowFilters(false)}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
      />

      {/* Ping Message Modal */}
      <Portal>
        <Modal
          visible={pingModalVisible}
          onDismiss={handleCancelPing}
          contentContainerStyle={styles.modalContainer}
        >
          <Card style={styles.pingModal}>
            <Card.Content style={styles.pingModalContent}>
              <View style={styles.pingModalHeader}>
                <View style={styles.pingIconContainer}>
                  <Icon source="send" size={24} color="#3B82F6" />
                </View>
                <Text variant="headlineSmall" style={styles.pingModalTitle}>
                  Send Connection Request
                </Text>
                <Text variant="bodyMedium" style={styles.pingModalSubtitle}>
                  Send a message to connect with this professional
                </Text>
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Your message</Text>
                <TextInput
                  value={pingMessage}
                  onChangeText={handleTextChange}
                  multiline
                  numberOfLines={4}
                  placeholder="Write your ping message here..."
                  style={styles.pingInput}
                  maxLength={CONFIG.UI.MESSAGE_MAX_LENGTH}
                  autoCapitalize="sentences"
                  textAlignVertical="top"
                />
                <View style={styles.characterCount}>
                  <Text variant="bodySmall" style={styles.characterCountText}>
                    {pingMessage.length}/500 characters
                  </Text>
                </View>
              </View>
            </Card.Content>
            
            <Card.Actions style={styles.pingModalActions}>
              <Button 
                onPress={handleCancelPing}
                style={styles.cancelButton}
                labelStyle={styles.cancelButtonLabel}
              >
                Cancel
              </Button>
              <Button 
                mode="contained" 
                onPress={handleSendPing}
                disabled={!pingMessage.trim() || pingMessage.length > 500}
                style={[styles.sendButton, (!pingMessage.trim() || pingMessage.length > 500) && styles.sendButtonDisabled]}
                labelStyle={styles.sendButtonLabel}
                icon="send"
              >
                Send Request
              </Button>
            </Card.Actions>
          </Card>
        </Modal>
      </Portal>

      {/* Snackbar for notifications */}
      <Portal>
        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => setSnackbarVisible(false)}
          duration={3000}
          style={styles.snackbar}
        >
          <Text style={{ color: 'white' }}>{snackbarMessage}</Text>
        </Snackbar>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    padding: 8,
    paddingTop: 8,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'hidden',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  headerLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 50,
    height: 50,
    marginRight: 10,
  },
  headerTitle: {
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  searchbar: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    marginBottom: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3B82F6',
    height: 48,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  filterTab: {
    marginRight: 8,
  },
  filterGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    height: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  filterTabText: {
    color: 'white',
    marginLeft: 6,
    fontWeight: 'bold',
  },
  voiceGradient: {
    padding: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 0, // Adjusted to ensure content is not obscured by bottom navigation bar
  },
  searchContainer: {
    marginTop: -20,
    paddingTop: 5,
    paddingBottom: 5,
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  searchActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 1,
  },
  optionIcon: {
    padding: 8,
  },
  tabContainer: {
    marginTop: 10,
    marginBottom: 16,
    paddingHorizontal: 8,
    zIndex: 0,
  },
  tabBar: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    height: 50,
    overflow: 'hidden',
  },
  tabSelectorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    height: 42,
    position: 'relative',
  },
  tabItem: {
    flex: 1,
    height: 42,
  },
  tabItemContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    flexDirection: 'row',
  },
  activeTabItem: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
    textAlign: 'center',
    marginLeft: 4,
  },
  activeTabText: {
    color: '#1E40AF',
    fontWeight: 'bold',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    width: '33.33%',
    height: 3,
    backgroundColor: '#38BDF8',
    borderRadius: 1.5,
  },
  tabContent: {
    marginTop: 8,
    maxHeight: 40,
  },
  suggestionChip: {
    backgroundColor: '#EFF6FF',
  },
  quickFilters: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 8,
    marginTop: 8,
    marginBottom: 2,
    justifyContent: 'flex-start',
  },
  quickFilterChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    flexShrink: 1,
    minWidth: 60,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  quickFilterChipIconOnly: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    minWidth: 25,
    flexShrink: 1,
    paddingHorizontal: 0,
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
  },
  statsContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  statsText: {
    color: '#374151',
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 60, // Default value, will be overridden dynamically in component
  },
  popularChip: {
    backgroundColor: '#F8FAFC',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 8,
    color: '#374151',
  },
  emptyCard: {
    backgroundColor: 'white',
    marginTop: 40,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    marginBottom: 8,
    marginTop: 16,
    color: '#374151',
  },
  emptySubtitle: {
    color: '#6B7280',
    textAlign: 'center',
  },
  userListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    marginBottom: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.1)',
  },
  avatarGradient: {
    borderRadius: 25,
    overflow: 'hidden',
    width: 54,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.8,
    borderWidth: 0,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
    marginRight: 12,
  },
  userListDetails: {
    flex: 1,
  },
  userListName: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 2,
  },
  userListRole: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  userListRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userListRatingText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#6B7280',
  },
  userListLocation: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userListLocationText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#6B7280',
  },
  pingListButton: {
    backgroundColor: '#38BDF8',
    paddingHorizontal: 8,
  },
  userInfo: {
    marginRight: 12,
    borderWidth: 0,
    borderColor: 'transparent',
    borderRadius: 50,
    overflow: 'hidden',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
    marginTop: 2,
  },
  snackbar: {
    backgroundColor: '#374151',
  },
  modalContainer: {
    padding: 20,
  },
  pingModal: {
    backgroundColor: 'white',
  },
  pingModalContent: {
    padding: 0,
  },
  pingModalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  pingIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  pingModalTitle: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#1F2937',
  },
  pingModalSubtitle: {
    textAlign: 'center',
    color: '#6B7280',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#374151',
  },
  pingInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  characterCount: {
    alignItems: 'flex-end',
    marginTop: 8,
  },
  characterCountText: {
    color: '#6B7280',
  },
  pingModalActions: {
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 12,
  },
  cancelButton: {
    borderColor: '#D1D5DB',
  },
  cancelButtonLabel: {
    color: '#6B7280',
  },
  sendButton: {
    backgroundColor: '#3B82F6',
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  sendButtonLabel: {
    color: 'white',
  },
});