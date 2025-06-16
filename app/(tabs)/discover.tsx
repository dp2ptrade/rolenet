import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Alert, TextInput, ActivityIndicator, TouchableOpacity } from 'react-native';
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
import { User } from '@/lib/types';
import { userService } from '@/lib/supabaseService';
import { SmartSearchEngine, SearchFilters, SearchResult } from '@/lib/searchEngine';
import { VoiceSearchService } from '@/lib/voiceSearch';
import { VoiceSearchProcessor } from '@/lib/searchEngine';
import SearchFiltersModal from '@/components/SearchFilters';
import VoiceSearchButton from '@/components/VoiceSearchButton';
import { router } from 'expo-router';

const MOCK_USERS: User[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    email: 'sarah@example.com',
    role: 'Teacher',
    tags: ['Education', 'Mentorship', 'Learning'],
    location: { latitude: 37.7749, longitude: -122.4194, address: 'San Francisco, CA' },
    avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=400',
    bio: 'Passionate educator with 10+ years experience',
    online_status: 'online',
    is_available: true,
    rating: 4.8,
    rating_count: 23,
    created_at: new Date(),
    last_seen: new Date(),
    profile_visible: true,
    allow_messages: true,
    allow_pings: true,
    blocked_users: [],
  },
  {
    id: '2',
    name: 'Michael Chen',
    email: 'michael@example.com',
    role: 'Developer',
    tags: ['Technology', 'Programming', 'Innovation'],
    location: { latitude: 37.7849, longitude: -122.4094, address: 'San Francisco, CA' },
    avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400',
    bio: 'Full-stack developer passionate about clean code',
    online_status: 'online',
    is_available: true,
    rating: 4.6,
    rating_count: 45,
    created_at: new Date(),
    last_seen: new Date(),
    profile_visible: true,
    allow_messages: true,
    allow_pings: true,
    blocked_users: [],
  },
  {
    id: '3',
    name: 'Dr. Amanda Rodriguez',
    email: 'amanda@example.com',
    role: 'Doctor',
    tags: ['Healthcare', 'Wellness', 'Consultation'],
    location: { latitude: 37.7649, longitude: -122.4294, address: 'San Francisco, CA' },
    avatar: 'https://images.pexels.com/photos/5215024/pexels-photo-5215024.jpeg?auto=compress&cs=tinysrgb&w=400',
    bio: 'Family physician with expertise in preventive care',
    online_status: 'away',
    is_available: false,
    rating: 4.9,
    rating_count: 67,
    created_at: new Date(),
    last_seen: new Date(),
    profile_visible: true,
    allow_messages: true,
    allow_pings: true,
    blocked_users: [],
  },
  {
    id: '4',
    name: 'James Wilson',
    email: 'james@example.com',
    role: 'Designer',
    tags: ['Creative', 'UI/UX', 'Branding'],
    location: { latitude: 37.7549, longitude: -122.4394, address: 'San Francisco, CA' },
    avatar: 'https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=400',
    bio: 'Creative designer specializing in user experience',
    online_status: 'online',
    is_available: true,
    rating: 4.7,
    rating_count: 34,
    created_at: new Date(),
    last_seen: new Date(),
    profile_visible: true,
    allow_messages: true,
    allow_pings: true,
    blocked_users: [],
  },
  {
    id: '5',
    name: 'Lisa Thompson',
    email: 'lisa@example.com',
    role: 'Chef',
    tags: ['Culinary', 'Nutrition', 'Training'],
    location: { latitude: 37.7449, longitude: -122.4494, address: 'San Francisco, CA' },
    avatar: 'https://images.pexels.com/photos/1181690/pexels-photo-1181690.jpeg?auto=compress&cs=tinysrgb&w=400',
    bio: 'Professional chef with expertise in healthy cooking',
    online_status: 'offline',
    is_available: false,
    rating: 4.5,
    rating_count: 56,
    created_at: new Date(),
    last_seen: new Date(Date.now() - 2 * 60 * 60 * 1000),
    profile_visible: true,
    allow_messages: true,
    allow_pings: true,
    blocked_users: [],
  },
];

export default function DiscoverScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [popularRoles, setPopularRoles] = useState<string[]>([]);
  const [popularTags, setPopularTags] = useState<string[]>([]);
  const [activeSuggestionTab, setActiveSuggestionTab] = useState<'suggestions' | 'roles' | 'tags'>('suggestions');
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [pingModalVisible, setPingModalVisible] = useState(false);
  const [pingMessage, setPingMessage] = useState('');

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const currentUser = useUserStore((state) => state.user);
  const { sendPing } = usePingStore();

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
  }, []);

  const loadUsers = async (appliedFilters: SearchFilters | null = null) => {
    try {
      setLoading(true);
      const searchParams: any = { limit: 50 };

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
        if (__DEV__) {
          console.warn('Using mock data in development mode');
          setUsers(MOCK_USERS);
        } else {
          setUsers([]);
        }
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
        if (__DEV__) {
          console.warn('Using mock data in development mode');
          setUsers(MOCK_USERS);
        } else {
          setUsers([]);
        }
        setPopularRoles([]);
        setPopularTags([]);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      setSnackbarMessage('Error connecting to database');
      setSnackbarVisible(true);
      if (__DEV__) {
        console.warn('Using mock data in development mode');
        setUsers(MOCK_USERS);
      } else {
        setUsers([]);
      }
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
  }, [filters]);

  useEffect(() => {
    if (searchQuery.length > 2) {
      const newSuggestions = SmartSearchEngine.generateQuerySuggestions(searchQuery, users);
      setSuggestions(newSuggestions);
    } else {
      setSuggestions([]);
    }
  }, [searchQuery, users]);

  const performSearch = () => {
    // Since filtering is now done at database level, we can directly use the loaded users as search results
    // But we still calculate relevance score and distance for display purposes
    const searchFilters = { ...filters, query: searchQuery };
    const userLocation = currentUser?.location;
    
    const results = SmartSearchEngine.search(users, searchFilters, userLocation);
    setSearchResults(results);
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  }, [currentUser?.id]);

  const handleSearch = (query: string) => {
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
  }, [selectedUserId]);

  const handleSendPing = async () => {
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
    if (filters.distance !== 50) count++;
    if (filters.sortBy !== 'relevance') count++;
    return count;
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#3B82F6', '#06B6D4']}
        style={styles.header}
      >
        <Text variant="headlineMedium" style={[styles.headerTitle, { textAlign: 'center' }]}>
          ROLE NET
        </Text>
        <Text variant="bodyMedium" style={styles.headerSubtitle}>
          Discover every profession of people by rule with AI
        </Text>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.searchContainer}>
          <Searchbar
            placeholder="Search by role, name, tags..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            onSubmitEditing={() => handleSearch(searchQuery)}
            style={styles.searchbar}
            icon={() => <Sparkles size={20} color="#6B7280" />}
            right={(props: { color: string }) => (
              <View style={styles.searchOptions}>
                <TouchableOpacity onPress={handleVoiceSearchClick} style={styles.optionIcon}>
                  <Icon source="microphone" size={20} color={props.color} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowFilters(true)} style={styles.optionIcon}>
                  <Filter size={20} color={getActiveFiltersCount() > 0 ? "#3B82F6" : props.color} />
                </TouchableOpacity>
              </View>
            )}
          />
          
          <View style={styles.searchActions}>
            {/* Removed separate Voice Search and Filters buttons */}
          </View>

          {/* Removed standalone suggestions section as it's now integrated with tabs */}

          {/* Quick Filters */}
          <View style={styles.quickFilters}>
            <Chip
              selected={filters.location === 'nearby'}
              onPress={() => setFilters(prev => ({ ...prev, location: 'nearby' }))}
              icon="map-marker"
              style={styles.quickFilterChip}
            >
              Nearby
            </Chip>
            <Chip
              selected={filters.location === 'global'}
              onPress={() => setFilters(prev => ({ ...prev, location: 'global' }))}
              icon="earth"
              style={styles.quickFilterChip}
            >
              Global
            </Chip>
            <Chip
              selected={filters.availability === 'available'}
              onPress={() => setFilters(prev => ({ 
                ...prev, 
                availability: prev.availability === 'available' ? 'all' : 'available' 
              }))}
              icon="account-check"
              style={styles.quickFilterChip}
            >
              Available
            </Chip>
          </View>

          {/* Search Suggestions with Tabs */}
          {(suggestions.length > 0 || popularRoles.length > 0 || popularTags.length > 0) && (
            <Surface style={styles.suggestionsContainer} elevation={2}>
              <View style={styles.tabContainer}>
                {suggestions.length > 0 && (
                  <TouchableOpacity
                    style={[styles.tab, activeSuggestionTab === 'suggestions' && styles.activeTab]}
                    onPress={() => setActiveSuggestionTab('suggestions')}
                  >
                    <Text variant="bodySmall" style={[styles.tabText, activeSuggestionTab === 'suggestions' && styles.activeTabText]}>
                      <TrendingUp size={16} color={activeSuggestionTab === 'suggestions' ? "#3B82F6" : "#6B7280"} /> Smart Suggestions
                    </Text>
                  </TouchableOpacity>
                )}
                {popularRoles.length > 0 && (
                  <TouchableOpacity
                    style={[styles.tab, activeSuggestionTab === 'roles' && styles.activeTab]}
                    onPress={() => setActiveSuggestionTab('roles')}
                  >
                    <Text variant="bodySmall" style={[styles.tabText, activeSuggestionTab === 'roles' && styles.activeTabText]}>
                      <TrendingUp size={16} color={activeSuggestionTab === 'roles' ? "#3B82F6" : "#6B7280"} /> Popular Roles
                    </Text>
                  </TouchableOpacity>
                )}
                {popularTags.length > 0 && (
                  <TouchableOpacity
                    style={[styles.tab, activeSuggestionTab === 'tags' && styles.activeTab]}
                    onPress={() => setActiveSuggestionTab('tags')}
                  >
                    <Text variant="bodySmall" style={[styles.tabText, activeSuggestionTab === 'tags' && styles.activeTabText]}>
                      <Tag size={16} color={activeSuggestionTab === 'tags' ? "#3B82F6" : "#6B7280"} /> Popular Tags
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.suggestions}>
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
                </View>
              </ScrollView>
            </Surface>
          )}

          {/* Loading Indicator */}
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.loadingText}>Searching for professionals...</Text>
            </View>
          )}
        </View>

        {/* Search Results */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.scrollContent}
        >
          {/* Search Stats */}
          {searchResults.length > 0 && (
            <Surface style={styles.statsContainer} elevation={1}>
              <Text variant="bodyMedium" style={styles.statsText}>
                Found {searchResults.length} professionals
                {filters.location === 'nearby' && ' nearby'}
                {searchQuery && ` matching "${searchQuery}"`}
              </Text>
            </Surface>
          )}

          {searchResults.length === 0 ? (
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
          ) : (
            searchResults.map((result) => {
              const { user, relevanceScore, distance } = result;
              return (
                <Card key={user.id} style={styles.userCard}>
                  <Card.Content>
                    <View style={styles.userHeader}>
                      <View style={styles.userInfo}>
                        <Avatar.Image 
                          size={60} 
                          source={{ uri: user.avatar }} 
                        />
                        <View style={styles.statusIndicator}>
                          <View style={[
                            styles.statusDot,
                            { backgroundColor: user.online_status === 'online' ? '#10B981' : '#EF4444' }
                          ]} />
                        </View>
                      </View>
                      
                      <View style={styles.userDetails}>
                        <View style={styles.nameRow}>
                          <Text variant="titleMedium" style={styles.userName}>
                            {user.name}
                          </Text>
                          <Text style={styles.roleEmoji}>
                            {getRoleEmoji(user.role)}
                          </Text>
                        </View>
                        
                        <Text variant="bodyMedium" style={styles.userRole}>
                          {user.role}
                        </Text>
                        
                        <View style={styles.ratingRow}>
                          <Star size={16} color="#F59E0B" fill="#F59E0B" />
                          <Text variant="bodySmall" style={styles.rating}>
                            {user.rating} ({user.rating_count} reviews)
                          </Text>
                          {relevanceScore > 80 && (
                            <Chip compact style={styles.relevanceChip}>
                              <Sparkles size={12} color="#3B82F6" /> High Match
                            </Chip>
                          )}
                        </View>
                        
                        <View style={styles.locationRow}>
                          <MapPin size={14} color="#6B7280" />
                          <Text variant="bodySmall" style={styles.location}>
                            {user.location.address}
                            {distance && ` • ${distance.toFixed(1)} km away`}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {user.bio && (
                      <Text variant="bodySmall" style={styles.bio}>
                        {user.bio}
                      </Text>
                    )}

                    <View style={styles.tagsContainer}>
                      {user.tags.slice(0, 3).map((tag, index) => (
                        <Chip key={index} compact style={styles.tag}>
                          {tag}
                        </Chip>
                      ))}
                    </View>

                    <View style={styles.actionButtons}>
                      <Button
                        mode="contained"
                        onPress={() => handlePingUser(user.id)}
                        style={styles.pingButton}
                        contentStyle={styles.buttonContent}
                      >
                        Ping
                      </Button>
                      <Button
                        mode="outlined"
                        onPress={() => handleViewProfile(user.id)}
                        style={styles.profileButton}
                        contentStyle={styles.buttonContent}
                      >
                        Profile
                      </Button>
                    </View>
                  </Card.Content>
                </Card>
              );
            })
          )}
        </ScrollView>
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
                  maxLength={500}
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
          {snackbarMessage}
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
    padding: 24,
    paddingTop: 16,
  },
  headerTitle: {
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  searchContainer: {
    marginTop: -20,
    marginBottom: 16,
  },
  searchbar: {
    backgroundColor: 'white',
    elevation: 4,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    marginBottom: 12,
  },
  searchActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  searchOptions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIcon: {
    padding: 8,
  },
  filterButton: {
    flex: 1,
    backgroundColor: 'white',
  },
  activeFilterButton: {
    borderColor: '#3B82F6',
    borderWidth: 2,
  },
  filterButtonContent: {
    paddingVertical: 4,
  },
  suggestionsContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: '#3B82F6',
  },
  tabText: {
    color: '#6B7280',
  },
  activeTabText: {
    color: 'white',
    fontWeight: 'bold',
  },
  suggestions: {
    flexDirection: 'row',
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: '#EFF6FF',
  },
  quickFilters: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  quickFilterChip: {
    backgroundColor: 'white',
  },
  statsContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  statsText: {
    color: '#374151',
    textAlign: 'center',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  // Removed as no longer needed with tabbed interface
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
  userCard: {
    marginBottom: 16,
    backgroundColor: 'white',
    elevation: 2,
    boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1)',
  },
  userHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  userInfo: {
    position: 'relative',
    marginRight: 16,
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'white',
  },
  userDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontWeight: 'bold',
    flex: 1,
  },
  roleEmoji: {
    fontSize: 20,
    marginLeft: 8,
  },
  userRole: {
    color: '#6B7280',
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  rating: {
    marginLeft: 4,
    color: '#6B7280',
    marginRight: 8,
  },
  relevanceChip: {
    backgroundColor: '#EFF6FF',
    height: 24,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  location: {
    marginLeft: 4,
    color: '#6B7280',
  },
  bio: {
    color: '#374151',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  tag: {
    backgroundColor: '#EFF6FF',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  pingButton: {
    flex: 1,
  },
  profileButton: {
    flex: 1,
  },
  buttonContent: {
    paddingVertical: 4,
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
  messageInputContainer: {
    marginBottom: 24,
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
