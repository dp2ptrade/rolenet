import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Alert } from 'react-native';
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
  Portal
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, Star, Phone, Filter, Sparkles, TrendingUp } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useUserStore } from '@/stores/useUserStore';
import { User } from '@/lib/types';
import { SmartSearchEngine, SearchFilters, SearchResult } from '@/lib/searchEngine';
import { VoiceSearchService, VoiceSearchProcessor } from '@/lib/voiceSearch';
import SearchFiltersModal from '@/components/SearchFilters';
import VoiceSearchButton from '@/components/VoiceSearchButton';

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
    onlineStatus: 'online',
    isAvailable: true,
    rating: 4.8,
    ratingCount: 23,
    createdAt: new Date(),
    lastSeen: new Date(),
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
    onlineStatus: 'online',
    isAvailable: true,
    rating: 4.9,
    ratingCount: 45,
    createdAt: new Date(),
    lastSeen: new Date(),
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
    onlineStatus: 'busy',
    isAvailable: false,
    rating: 4.7,
    ratingCount: 67,
    createdAt: new Date(),
    lastSeen: new Date(),
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
    onlineStatus: 'online',
    isAvailable: true,
    rating: 4.6,
    ratingCount: 34,
    createdAt: new Date(),
    lastSeen: new Date(),
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
    onlineStatus: 'offline',
    isAvailable: false,
    rating: 4.9,
    ratingCount: 56,
    createdAt: new Date(),
    lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
];

export default function DiscoverScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  const currentUser = useUserStore((state) => state.currentUser);

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

    performSearch();
  }, []);

  useEffect(() => {
    performSearch();
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
    const searchFilters = { ...filters, query: searchQuery };
    const userLocation = currentUser?.location;
    
    const results = SmartSearchEngine.search(users, searchFilters, userLocation);
    setSearchResults(results);
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setRefreshing(false);
      performSearch();
    }, 2000);
  }, []);

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

  const handlePingUser = (userId: string) => {
    console.log('Ping user:', userId);
    setSnackbarMessage('Ping sent successfully!');
    setSnackbarVisible(true);
  };

  const handleViewProfile = (userId: string) => {
    console.log('View profile:', userId);
  };

  const handleSuggestionPress = (suggestion: string) => {
    handleSearch(suggestion);
  };

  const handleFiltersChange = (newFilters: SearchFilters) => {
    setFilters(newFilters);
  };

  const handleApplyFilters = () => {
    performSearch();
    setSnackbarMessage('Filters applied successfully!');
    setSnackbarVisible(true);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSuggestions([]);
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
        <Text variant="headlineMedium" style={styles.headerTitle}>
          Discover Professionals
        </Text>
        <Text variant="bodyMedium" style={styles.headerSubtitle}>
          AI-powered search with voice commands
        </Text>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.searchContainer}>
          <Searchbar
            placeholder="Search by role, name, tags, or speak your query..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            onSubmitEditing={() => handleSearch(searchQuery)}
            style={styles.searchbar}
            icon={() => <Sparkles size={20} color="#6B7280" />}
          />
          
          <View style={styles.searchActions}>
            <VoiceSearchButton
              onTranscript={handleVoiceTranscript}
              onError={handleVoiceError}
            />
            
            <Button
              mode="outlined"
              onPress={() => setShowFilters(true)}
              icon={({ size, color }) => <Filter size={size} color={color} />}
              style={[
                styles.filterButton,
                getActiveFiltersCount() > 0 && styles.activeFilterButton
              ]}
              contentStyle={styles.filterButtonContent}
            >
              Filters {getActiveFiltersCount() > 0 && `(${getActiveFiltersCount()})`}
            </Button>
          </View>

          {/* Search Suggestions */}
          {suggestions.length > 0 && (
            <Surface style={styles.suggestionsContainer} elevation={2}>
              <Text variant="bodySmall" style={styles.suggestionsTitle}>
                <TrendingUp size={16} color="#6B7280" /> Smart Suggestions
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.suggestions}>
                  {suggestions.map((suggestion, index) => (
                    <Chip
                      key={index}
                      onPress={() => handleSuggestionPress(suggestion)}
                      style={styles.suggestionChip}
                      icon="lightbulb-outline"
                    >
                      {suggestion}
                    </Chip>
                  ))}
                </View>
              </ScrollView>
            </Surface>
          )}

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
                            { backgroundColor: user.onlineStatus === 'online' ? '#10B981' : '#EF4444' }
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
                            {user.rating} ({user.ratingCount} reviews)
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 12,
  },
  searchActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
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
  suggestionsTitle: {
    color: '#6B7280',
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
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
});