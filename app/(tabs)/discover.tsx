import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Searchbar, Card, Avatar, Button, Text, Chip, Surface, FAB } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, Star, Phone } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useUserStore } from '@/stores/useUserStore';
import { User } from '@/lib/types';

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
];

export default function DiscoverScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'nearby' | 'global'>('nearby');
  const currentUser = useUserStore((state) => state.currentUser);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  }, []);

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handlePingUser = (userId: string) => {
    // TODO: Implement ping functionality
    console.log('Ping user:', userId);
  };

  const handleViewProfile = (userId: string) => {
    // TODO: Navigate to profile
    console.log('View profile:', userId);
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
          Connect with professionals worldwide
        </Text>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.searchContainer}>
          <Searchbar
            placeholder="Search by role, name, or tags..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchbar}
          />
          
          <View style={styles.filterContainer}>
            <Chip
              selected={selectedFilter === 'nearby'}
              onPress={() => setSelectedFilter('nearby')}
              icon="map-marker"
              style={styles.filterChip}
            >
              Nearby
            </Chip>
            <Chip
              selected={selectedFilter === 'global'}
              onPress={() => setSelectedFilter('global')}
              icon="earth"
              style={styles.filterChip}
            >
              Global
            </Chip>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.scrollContent}
        >
          {filteredUsers.map((user) => (
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
                    </View>
                    
                    <View style={styles.locationRow}>
                      <MapPin size={14} color="#6B7280" />
                      <Text variant="bodySmall" style={styles.location}>
                        {user.location.address}
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
          ))}
        </ScrollView>
      </View>
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
  },
  filterContainer: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  filterChip: {
    backgroundColor: 'white',
  },
  scrollContent: {
    paddingBottom: 100,
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
  },
  rating: {
    marginLeft: 4,
    color: '#6B7280',
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
});