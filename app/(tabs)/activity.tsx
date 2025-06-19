import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Card, Button, Surface, Avatar, Chip, IconButton, Snackbar } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Clock } from 'lucide-react-native';
import { router } from 'expo-router';
import { usePingStore } from '@/stores/usePingStore';
import { useUserStore } from '@/stores/useUserStore';
import { UserService } from '@/lib/supabaseService';
import { Ping, User } from '@/lib/types';
import { ASSETS } from '@/constants/assets';

// PingItem Component
interface PingItemProps {
  ping: Ping;
  isReceived: boolean;
  getUserInfo: (ping: Ping, isReceived: boolean) => Promise<{ name: string; avatar: string; role: string }>;
  getTimeAgo: (date: Date | string) => string;
  handleRespond: (pingId: string, action: 'call' | 'chat' | 'ignore') => Promise<void>;
  selectedTab: string;
}

const PingItem: React.FC<PingItemProps> = ({ ping, isReceived, getUserInfo, getTimeAgo, handleRespond, selectedTab }) => {
  const [user, setUser] = useState<{ name: string; avatar: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const userInfo = await getUserInfo(ping, isReceived);
        setUser(userInfo);
      } catch (error) {
        console.error('Error loading user info:', error);
        setUser({ name: 'Unknown User', avatar: '', role: 'Professional' });
      } finally {
        setLoading(false);
      }
    };

    loadUserInfo();
  }, [ping, isReceived, getUserInfo]);

  if (loading || !user) {
    return (
      <Card style={styles.pingCard}>
        <Card.Content>
          <View style={styles.pingHeader}>
            <View style={styles.userInfo}>
              <Avatar.Image 
                size={50} 
                source={ASSETS.IMAGES.LOGO}
              />
              <View style={styles.userDetails}>
                <Text variant="titleMedium" style={styles.userName}>
                  Loading...
                </Text>
                <Text variant="bodySmall" style={styles.userRole}>
                  Professional
                </Text>
              </View>
            </View>
            <View style={styles.timeContainer}>
              <Clock size={14} color="#6B7280" />
              <Text variant="bodySmall" style={styles.timeText}>
                {getTimeAgo(ping.created_at)}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card style={styles.pingCard}>
      <Card.Content>
        <View style={styles.pingHeader}>
          <View style={styles.userInfo}>
            <Avatar.Image 
              size={50} 
              source={user.avatar ? { uri: user.avatar } : ASSETS.IMAGES.LOGO}
            />
            <View style={styles.userDetails}>
              <Text variant="titleMedium" style={styles.userName}>
                {user.name}
              </Text>
              <Text variant="bodySmall" style={styles.userRole}>
                {user.role}
              </Text>
            </View>
          </View>
          
          <View style={styles.timeContainer}>
            <Clock size={14} color="#6B7280" />
            <Text variant="bodySmall" style={styles.timeText}>
              {getTimeAgo(ping.created_at)}
            </Text>
          </View>
        </View>

        <Text variant="bodyMedium" style={styles.message}>
          "{ping.message}"
        </Text>

        <View style={styles.statusContainer}>
          <Chip
            icon={
              ping.status === 'pending' ? 'clock' : 
              ping.status === 'responded' ? 'check' : 'close'
            }
            style={[
              styles.statusChip,
              ping.status === 'pending' ? styles.pendingChip : 
              ping.status === 'responded' ? styles.respondedChip : styles.ignoredChip
            ]}
            textStyle={[
              styles.statusText,
              ping.status === 'pending' ? styles.pendingText : 
              ping.status === 'responded' ? styles.respondedText : styles.ignoredText
            ]}
          >
            {ping.status === 'pending' ? 'Pending' : 
             ping.status === 'responded' ? 'Responded' : 'Ignored'}
          </Chip>
        </View>

        {selectedTab === 'received' && ping.status === 'pending' && (
          <View style={styles.actionButtons}>
            <Button
              mode="contained"
              icon="phone"
              onPress={() => handleRespond(ping.id, 'call')}
              style={styles.callButton}
              contentStyle={styles.actionButtonContent}
            >
              Call
            </Button>
            <Button
              mode="contained-tonal"
              icon="chat"
              onPress={() => handleRespond(ping.id, 'chat')}
              style={styles.chatButton}
              contentStyle={styles.actionButtonContent}
            >
              Chat
            </Button>
            <Button
              mode="outlined"
              onPress={() => handleRespond(ping.id, 'ignore')}
              style={styles.ignoreButton}
              contentStyle={styles.actionButtonContent}
            >
              Ignore
            </Button>
          </View>
        )}
      </Card.Content>
    </Card>
  );
};

const MOCK_PINGS: Ping[] = [
  {
    id: '1',
    sender_id: '2',
    receiver_id: '1',
    message: 'Hi! I would love to connect and discuss potential collaboration opportunities.',
    status: 'pending',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
  },
  {
    id: '2',
    sender_id: '1',
    receiver_id: '3',
    message: 'Hello Dr. Rodriguez, I would appreciate your advice on career transition.',
    status: 'responded',
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
    responded_at: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
  },
  {
    id: '3',
    sender_id: '4',
    receiver_id: '1',
    message: 'Would you be interested in a quick chat about teaching methodologies?',
    status: 'pending',
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
  },
];

export default function ActivityScreen() {
  const [selectedTab, setSelectedTab] = useState<'received' | 'sent' | 'responded'>('received');
  const [refreshing, setRefreshing] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  const currentUser = useUserStore((state: any) => state.user);

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };
  const {
    receivedPings,
    sentPings,
    respondedPings,
    isLoading,
    loadReceivedPings,
    loadSentPings,
    respondToPing,
    subscribeToPings,
    unsubscribeFromPings
  } = usePingStore();

  useEffect(() => {
    if (currentUser?.id) {
      loadReceivedPings(currentUser.id);
      loadSentPings(currentUser.id);
      subscribeToPings(currentUser.id);
    }

    return () => {
      unsubscribeFromPings();
    };
  }, [currentUser?.id]);

  const onRefresh = React.useCallback(async () => {
    if (!currentUser?.id) return;
    
    setRefreshing(true);
    try {
      await Promise.all([
        loadReceivedPings(currentUser.id),
        loadSentPings(currentUser.id)
      ]);
    } catch (error) {
      console.error('Error refreshing pings:', error);
    } finally {
      setRefreshing(false);
    }
  }, [currentUser?.id, loadReceivedPings, loadSentPings]);

  const getFilteredPings = () => {
    switch (selectedTab) {
      case 'received':
        return receivedPings;
      case 'sent':
        return sentPings;
      case 'responded':
        return respondedPings;
      default:
        return [];
    }
  };

  const getTimeAgo = (date: Date | string) => {
    const now = new Date();
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (!dateObj || isNaN(dateObj.getTime())) {
      return 'Unknown';
    }
    
    const diff = now.getTime() - dateObj.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const handleRespond = async (pingId: string, action: 'call' | 'chat' | 'ignore') => {
    try {
      if (action === 'ignore') {
        await respondToPing(pingId, 'ignored');
        showSnackbar('Ping ignored');
      } else {
        await respondToPing(pingId, 'responded');
        
        // Find the ping to get user info for navigation
        const ping = receivedPings.find(p => p.id === pingId);
        // Note: In a real implementation, you would need to fetch user data
        // based on sender_id since the Ping interface doesn't include sender object
        const senderInfo = {
          id: ping?.sender_id || '',
          name: 'User', // This should be fetched from user service
          role: 'Professional',
          avatar: ''
        };
        
        if (action === 'call' && senderInfo) {
          // Navigate to call screen with user info
          router.push({
            pathname: '/call',
            params: {
              userId: senderInfo.id,
              userName: senderInfo.name,
              userRole: senderInfo.role,
              userAvatar: senderInfo.avatar || '',
              pingId: pingId
            }
          });
        } else if (action === 'chat' && senderInfo) {
          // Navigate to chat screen with user info
          router.push({
            pathname: '/chat',
            params: {
              userId: senderInfo.id,
              userName: senderInfo.name,
              userRole: senderInfo.role,
              userAvatar: senderInfo.avatar || '',
              pingId: pingId
            }
          });
        }
        
        showSnackbar(`Starting ${action} with ${senderInfo?.name || 'user'}`);
      }
    } catch (error) {
      console.error('Error responding to ping:', error);
      showSnackbar('Failed to respond to ping. Please try again.');
    }
  };

  const [userCache, setUserCache] = useState<Record<string, { name: string; avatar: string; role: string }>>({});

  const getUserInfo = async (ping: Ping, isReceived: boolean) => {
    const userId = isReceived ? ping.sender_id : ping.receiver_id;
    
    // Check cache first
    if (userCache[userId]) {
      return userCache[userId];
    }
    
    try {
      const { data: userData, error } = await UserService.getUserProfile(userId);
      if (error) {
        console.error('Error fetching user data:', error);
        return {
          name: 'Unknown User',
          avatar: '',
          role: 'Professional'
        };
      }
      
      const userInfo = {
        name: userData?.name || 'Unknown User',
        avatar: userData?.avatar || '',
        role: userData?.role || 'Professional'
      };
      
      // Cache the user data
      setUserCache(prev => ({ ...prev, [userId]: userInfo }));
      
      return userInfo;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return {
        name: 'Unknown User',
        avatar: '',
        role: 'Professional'
      };
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#3B82F6', '#06B6D4']}
        style={styles.header}
      >
        <Text variant="headlineMedium" style={styles.headerTitle}>
          Activity
        </Text>
        <Text variant="bodyMedium" style={styles.headerSubtitle}>
          Manage your professional connections
        </Text>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.tabContainer}>
          <Surface style={styles.tabBar} elevation={2}>
            <Button
              mode={selectedTab === 'received' ? 'contained' : 'text'}
              onPress={() => setSelectedTab('received')}
              style={styles.tabButton}
              compact
            >
              Received ({receivedPings.filter(p => p.status === 'pending').length})
            </Button>
            <Button
              mode={selectedTab === 'sent' ? 'contained' : 'text'}
              onPress={() => setSelectedTab('sent')}
              style={styles.tabButton}
              compact
            >
              Sent
            </Button>
            <Button
              mode={selectedTab === 'responded' ? 'contained' : 'text'}
              onPress={() => setSelectedTab('responded')}
              style={styles.tabButton}
              compact
            >
              Responded
            </Button>
          </Surface>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.scrollContent}
        >
          {getFilteredPings().length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content style={styles.emptyContent}>
                <Text variant="titleMedium" style={styles.emptyTitle}>
                  No {selectedTab} pings
                </Text>
                <Text variant="bodyMedium" style={styles.emptySubtitle}>
                  {selectedTab === 'received' 
                    ? "You'll see connection requests here" 
                    : selectedTab === 'sent'
                    ? "Your sent pings will appear here"
                    : "Your responded pings will show here"}
                </Text>
              </Card.Content>
            </Card>
          ) : (
            getFilteredPings().map((ping) => {
              const isReceived = selectedTab === 'received';
              return (
                <PingItem 
                  key={ping.id} 
                  ping={ping} 
                  isReceived={isReceived}
                  getUserInfo={getUserInfo}
                  getTimeAgo={getTimeAgo}
                  handleRespond={handleRespond}
                  selectedTab={selectedTab}
                />
              );
            })
          )}
        </ScrollView>
      </View>
      
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={styles.snackbar}
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
    color: '#374151',
  },
  emptySubtitle: {
    color: '#6B7280',
    textAlign: 'center',
  },
  pingCard: {
    marginBottom: 16,
    backgroundColor: 'white',
    elevation: 2,
    boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1)',
  },
  pingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  userDetails: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontWeight: 'bold',
    marginBottom: 2,
  },
  userRole: {
    color: '#6B7280',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    marginLeft: 4,
    color: '#6B7280',
  },
  message: {
    fontStyle: 'italic',
    color: '#374151',
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  statusContainer: {
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  statusChip: {
    alignSelf: 'flex-start',
  },
  pendingChip: {
    backgroundColor: '#FEF3C7',
  },
  respondedChip: {
    backgroundColor: '#D1FAE5',
  },
  ignoredChip: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 12,
  },
  pendingText: {
    color: '#92400E',
  },
  respondedText: {
    color: '#065F46',
  },
  ignoredText: {
    color: '#991B1B',
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
  ignoreButton: {
    flex: 1,
  },
  actionButtonContent: {
    paddingVertical: 4,
  },
  snackbar: {
    backgroundColor: '#1F2937',
  },
});