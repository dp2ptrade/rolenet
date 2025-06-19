import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Card, Text, Avatar, Button, Surface, Searchbar, FAB, Portal, Dialog, Paragraph, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Phone, MessageSquare, Star, UserPlus } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { User, Friend } from '@/lib/types';
import { useUserStore } from '@/stores/useUserStore';
import { useFriendStore } from '@/stores/useFriendStore';
import { UserService } from '@/lib/supabaseService';

export default function FriendsScreen() {
  const [selectedTab, setSelectedTab] = useState<'friends' | 'requests'>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useUserStore();
  const {
    friends,
    friendRequests,
    isLoading,
    loadFriends,
    loadFriendRequests,
    acceptFriendRequest,
    declineFriendRequest
  } = useFriendStore();
  const [refreshing, setRefreshing] = useState(false);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [ratingTarget, setRatingTarget] = useState<User | null>(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const [requestUsers, setRequestUsers] = useState<{[id: string]: User}>({});

  useEffect(() => {
    if (user?.id) {
      loadFriends(user.id);
      loadFriendRequests(user.id);
    }
  }, [user?.id]);

  useEffect(() => {
    // Fetch user info for all friend requests
    async function fetchRequestUsers() {
      const ids = friendRequests.map(r => r.user_a).filter(id => !(id in requestUsers));
      if (ids.length > 0) {
        const users: {[id: string]: User} = {...requestUsers};
        for (const id of ids) {
          const { data, error } = await UserService.getUserProfile(id);
          if (data && !error) {
            users[id] = data as User;
          }
        }
        setRequestUsers(users);
      }
    }
    fetchRequestUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friendRequests]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    if (user?.id) {
      await Promise.all([
        loadFriends(user.id),
        loadFriendRequests(user.id)
      ]);
    }
    setRefreshing(false);
  }, [user?.id]);

  const filteredFriends = friends.filter(friend => 
    friend && 
    typeof friend.name === 'string' && 
    typeof friend.role === 'string' && 
    (friend.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    friend.role.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleCall = (userId: string) => {
    const friend = friends.find(f => f.id === userId);
    if (friend) {
      router.push({
        pathname: '/call',
        params: {
          userId: friend.id,
          userName: friend.name,
          userRole: friend.role,
          userAvatar: friend.avatar || ''
        }
      });
    }
  };

  const handleChat = (userId: string) => {
    const friend = friends.find(f => f.id === userId);
    if (friend) {
      router.push({
        pathname: '/chat',
        params: {
          userId: friend.id,
          userName: friend.name,
          userRole: friend.role,
          userAvatar: friend.avatar || ''
        }
      });
    }
  };

  const handleRate = (userId: string) => {
    const friend = friends.find(f => f.id === userId);
    if (friend) {
      setRatingTarget(friend);
      setRatingValue(5);
      setRatingFeedback('');
      setRatingModalVisible(true);
    }
  };

  const submitRating = async () => {
    if (ratingTarget && user) {
      // TODO: Integrate with RatingService to submit rating
      setRatingModalVisible(false);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await acceptFriendRequest(requestId);
      if (user?.id) {
        await loadFriends(user.id);
        await loadFriendRequests(user.id);
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
      // Optionally show error to user
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      await declineFriendRequest(requestId);
      if (user?.id) {
        await loadFriendRequests(user.id);
      }
    } catch (error) {
      // Optionally show error to user
    }
  };

  const getLastSeenText = (last_seen: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(last_seen).getTime();
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
              Friends ({friends.filter(friend => friend && friend.name && friend.role).length})
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
            isLoading ? (
              <Text style={{ textAlign: 'center', marginTop: 40 }}>Loading friends...</Text>
            ) : filteredFriends.length === 0 ? (
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
              filteredFriends.map((friend, index) => (
                <Card key={`${friend.id}-${index}`} style={styles.friendCard}>
                  <Card.Content>
                    <View style={styles.friendHeader}>
                      <View style={styles.userInfo}>
                        <View style={styles.avatarContainer}>
                          <Avatar.Image 
                            size={60} 
                            source={{ uri: friend.avatar || undefined }} 
                          />
                          <View style={[
                            styles.statusDot,
                            { backgroundColor: friend.online_status === 'online' ? '#10B981' : '#EF4444' }
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
                              {friend.rating} ({friend.rating_count})
                            </Text>
                          </View>
                          <Text variant="bodySmall" style={styles.lastSeen}>
                            {getLastSeenText(friend.last_seen)}
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
            isLoading ? (
              <Text style={{ textAlign: 'center', marginTop: 40 }}>Loading requests...</Text>
            ) : friendRequests.length === 0 ? (
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
              friendRequests.map((request, index) => {
                const requestUser = requestUsers[request.user_a];
                return (
                  <Card key={`${request.id}-${index}`} style={styles.requestCard}>
                    <Card.Content>
                      <View style={styles.requestHeader}>
                        <Avatar.Image 
                          size={50} 
                          source={{ uri: requestUser?.avatar || undefined }}
                        />
                        <View style={styles.requestDetails}>
                          <Text variant="titleMedium" style={styles.requestName}>
                            {requestUser?.name || request.user_a}
                          </Text>
                          <Text variant="bodyMedium" style={styles.requestRole}>
                            {requestUser?.role || ''}
                          </Text>
                          <Text variant="bodySmall" style={styles.requestTime}>
                            {Math.floor((Date.now() - new Date(request.created_at).getTime()) / (24 * 60 * 60 * 1000))} days ago
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

      <Portal>
        <Dialog visible={ratingModalVisible} onDismiss={() => setRatingModalVisible(false)}>
          <Dialog.Title>Rate {ratingTarget?.name}</Dialog.Title>
          <Dialog.Content>
            <Paragraph>How was your experience?</Paragraph>
            <TextInput
              label="Feedback (optional)"
              value={ratingFeedback}
              onChangeText={setRatingFeedback}
              multiline
              style={{ marginTop: 8 }}
            />
            <View style={{ flexDirection: 'row', marginTop: 16, justifyContent: 'center' }}>
              {[1,2,3,4,5].map(val => (
                <Button
                  key={val}
                  mode={ratingValue === val ? 'contained' : 'outlined'}
                  onPress={() => setRatingValue(val)}
                  style={{ marginHorizontal: 2 }}
                >
                  {val}
                </Button>
              ))}
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setRatingModalVisible(false)}>Cancel</Button>
            <Button onPress={submitRating}>Submit</Button>
          </Dialog.Actions>
        </Dialog>
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
