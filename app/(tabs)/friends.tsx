import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Card, Text, Avatar, Button, Surface, Searchbar, FAB } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Phone, MessageSquare, Star, UserPlus } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Friend } from '@/lib/types';

const MOCK_FRIENDS: User[] = [
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
    onlineStatus: 'offline',
    isAvailable: false,
    rating: 4.7,
    ratingCount: 67,
    createdAt: new Date(),
    lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
  },
];

const MOCK_FRIEND_REQUESTS: Friend[] = [
  {
    id: '1',
    userA: '4',
    userB: '1',
    status: 'pending',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
  },
  {
    id: '2',
    userA: '5',
    userB: '1',
    status: 'pending',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
];

export default function FriendsScreen() {
  const [selectedTab, setSelectedTab] = useState<'friends' | 'requests'>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [friends] = useState<User[]>(MOCK_FRIENDS);
  const [friendRequests] = useState<Friend[]>(MOCK_FRIEND_REQUESTS);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  }, []);

  const filteredFriends = friends.filter(friend =>
    friend.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCall = (userId: string) => {
    console.log('Call user:', userId);
    // TODO: Implement call functionality
  };

  const handleChat = (userId: string) => {
    console.log('Chat with user:', userId);
    // TODO: Navigate to chat
  };

  const handleRate = (userId: string) => {
    console.log('Rate user:', userId);
    // TODO: Show rating modal
  };

  const handleAcceptRequest = (requestId: string) => {
    console.log('Accept friend request:', requestId);
    // TODO: Accept friend request
  };

  const handleDeclineRequest = (requestId: string) => {
    console.log('Decline friend request:', requestId);
    // TODO: Decline friend request
  };

  const getUserInfo = (userId: string) => {
    const users: { [key: string]: { name: string; avatar: string; role: string } } = {
      '4': {
        name: 'Emma Thompson',
        avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=400',
        role: 'Designer'
      },
      '5': {
        name: 'David Wilson',
        avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400',
        role: 'Architect'
      },
    };
    return users[userId] || { name: 'Unknown User', avatar: '', role: 'Professional' };
  };

  const getLastSeenText = (lastSeen: Date) => {
    const now = new Date();
    const diff = now.getTime() - lastSeen.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `Last seen ${days}d ago`;
    if (hours > 0) return `Last seen ${hours}h ago`;
    if (minutes > 0) return `Last seen ${minutes}m ago`;
    return 'Active now';
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#3B82F6', '#06B6D4']}
        style={styles.header}
      >
        <Text variant="headlineMedium" style={styles.headerTitle}>
          Friends
        </Text>
        <Text variant="bodyMedium" style={styles.headerSubtitle}>
          Your professional network
        </Text>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.tabContainer}>
          <Surface style={styles.tabBar} elevation={2}>
            <Button
              mode={selectedTab === 'friends' ? 'contained' : 'text'}
              onPress={() => setSelectedTab('friends')}
              style={styles.tabButton}
              compact
            >
              Friends ({friends.length})
            </Button>
            <Button
              mode={selectedTab === 'requests' ? 'contained' : 'text'}
              onPress={() => setSelectedTab('requests')}
              style={styles.tabButton}
              compact
            >
              Requests ({friendRequests.length})
            </Button>
          </Surface>
        </View>

        {selectedTab === 'friends' && (
          <Searchbar
            placeholder="Search friends..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchbar}
          />
        )}

        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.scrollContent}
        >
          {selectedTab === 'friends' ? (
            filteredFriends.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Card.Content style={styles.emptyContent}>
                  <UserPlus size={48} color="#6B7280" />
                  <Text variant="titleMedium" style={styles.emptyTitle}>
                    No friends yet
                  </Text>
                  <Text variant="bodyMedium" style={styles.emptySubtitle}>
                    Start connecting with professionals to build your network
                  </Text>
                </Card.Content>
              </Card>
            ) : (
              filteredFriends.map((friend) => (
                <Card key={friend.id} style={styles.friendCard}>
                  <Card.Content>
                    <View style={styles.friendHeader}>
                      <View style={styles.userInfo}>
                        <View style={styles.avatarContainer}>
                          <Avatar.Image 
                            size={60} 
                            source={{ uri: friend.avatar }} 
                          />
                          <View style={[
                            styles.statusDot,
                            { backgroundColor: friend.onlineStatus === 'online' ? '#10B981' : '#EF4444' }
                          ]} />
                        </View>
                        
                        <View style={styles.userDetails}>
                          <Text variant="titleMedium" style={styles.userName}>
                            {friend.name}
                          </Text>
                          <Text variant="bodyMedium" style={styles.userRole}>
                            {friend.role}
                          </Text>
                          <View style={styles.ratingRow}>
                            <Star size={16} color="#F59E0B" fill="#F59E0B" />
                            <Text variant="bodySmall" style={styles.rating}>
                              {friend.rating} ({friend.ratingCount})
                            </Text>
                          </View>
                          <Text variant="bodySmall" style={styles.lastSeen}>
                            {getLastSeenText(friend.lastSeen)}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.actionButtons}>
                      <Button
                        mode="contained"
                        icon={({ size, color }) => <Phone size={size} color={color} />}
                        onPress={() => handleCall(friend.id)}
                        style={styles.callButton}
                        contentStyle={styles.actionButtonContent}
                      >
                        Call
                      </Button>
                      <Button
                        mode="contained-tonal"
                        icon={({ size, color }) => <MessageSquare size={size} color={color} />}
                        onPress={() => handleChat(friend.id)}
                        style={styles.chatButton}
                        contentStyle={styles.actionButtonContent}
                      >
                        Chat
                      </Button>
                      <Button
                        mode="outlined"
                        icon={({ size, color }) => <Star size={size} color={color} />}
                        onPress={() => handleRate(friend.id)}
                        style={styles.rateButton}
                        contentStyle={styles.actionButtonContent}
                      >
                        Rate
                      </Button>
                    </View>
                  </Card.Content>
                </Card>
              ))
            )
          ) : (
            friendRequests.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Card.Content style={styles.emptyContent}>
                  <UserPlus size={48} color="#6B7280" />
                  <Text variant="titleMedium" style={styles.emptyTitle}>
                    No friend requests
                  </Text>
                  <Text variant="bodyMedium" style={styles.emptySubtitle}>
                    New friend requests will appear here
                  </Text>
                </Card.Content>
              </Card>
            ) : (
              friendRequests.map((request) => {
                const user = getUserInfo(request.userA);
                return (
                  <Card key={request.id} style={styles.requestCard}>
                    <Card.Content>
                      <View style={styles.requestHeader}>
                        <Avatar.Image 
                          size={50} 
                          source={{ uri: user.avatar }} 
                        />
                        <View style={styles.requestDetails}>
                          <Text variant="titleMedium" style={styles.requestName}>
                            {user.name}
                          </Text>
                          <Text variant="bodyMedium" style={styles.requestRole}>
                            {user.role}
                          </Text>
                          <Text variant="bodySmall" style={styles.requestTime}>
                            {Math.floor((Date.now() - request.createdAt.getTime()) / (24 * 60 * 60 * 1000))} days ago
                          </Text>
                        </View>
                      </View>

                      <View style={styles.requestActions}>
                        <Button
                          mode="contained"
                          onPress={() => handleAcceptRequest(request.id)}
                          style={styles.acceptButton}
                          contentStyle={styles.requestButtonContent}
                        >
                          Accept
                        </Button>
                        <Button
                          mode="outlined"
                          onPress={() => handleDeclineRequest(request.id)}
                          style={styles.declineButton}
                          contentStyle={styles.requestButtonContent}
                        >
                          Decline
                        </Button>
                      </View>
                    </Card.Content>
                  </Card>
                );
              })
            )
          )}
        </ScrollView>
      </View>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => console.log('Add friend')}
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
  tabContainer: {
    marginTop: -20,
    marginBottom: 16,
  },
  tabBar: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 4,
    flexDirection: 'row',
  },
  tabButton: {
    flex: 1,
    marginHorizontal: 2,
  },
  searchbar: {
    backgroundColor: 'white',
    marginBottom: 16,
    elevation: 2,
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
  friendCard: {
    marginBottom: 16,
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  friendHeader: {
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: 'white',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontWeight: 'bold',
    marginBottom: 4,
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
  lastSeen: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  callButton: {
    flex: 1,
  },
  chatButton: {
    flex: 1,
  },
  rateButton: {
    flex: 1,
  },
  actionButtonContent: {
    paddingVertical: 4,
  },
  requestCard: {
    marginBottom: 16,
    backgroundColor: 'white',
    elevation: 2,
  },
  requestHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  requestDetails: {
    marginLeft: 12,
    flex: 1,
  },
  requestName: {
    fontWeight: 'bold',
    marginBottom: 2,
  },
  requestRole: {
    color: '#6B7280',
    marginBottom: 4,
  },
  requestTime: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 12,
  },
  acceptButton: {
    flex: 1,
  },
  declineButton: {
    flex: 1,
  },
  requestButtonContent: {
    paddingVertical: 4,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#3B82F6',
  },
});