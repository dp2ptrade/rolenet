import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Card, Button, Surface, Avatar, Chip, IconButton, Snackbar } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Clock, Check, X, MessageSquare, Phone, Menu as MenuIcon } from 'lucide-react-native';
import { router } from 'expo-router';
import { usePingStore } from '@/stores/usePingStore';
import { useUserStore } from '@/stores/useUserStore';
import { UserService } from '@/lib/supabaseService';
import { Ping, User } from '@/lib/types';
import { ASSETS } from '@/constants/assets';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, Easing } from 'react-native-reanimated';
import { COLORS } from '@/constants/theme';
import { getAnimationConfig } from '@/utils/platform';

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
  const [drawerOpen, setDrawerOpen] = useState(false);

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
        <View style={styles.headerRow}>
          <IconButton
            icon={() => <MenuIcon size={24} color="#FFFFFF" />}
            onPress={() => setDrawerOpen(!drawerOpen)}
            style={styles.menuButton}
          />
          <View style={styles.headerTitleContainer}>
            <Text variant="headlineMedium" style={styles.headerTitle}>
              Activity
            </Text>
            <Text variant="bodyMedium" style={styles.headerSubtitle}>
              Manage your professional connections
            </Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.tabContainer}>
          <Surface style={styles.tabBar} elevation={4}>
            <TabSelector 
              tabs={['received', 'sent', 'responded']} 
              selectedTab={selectedTab} 
              onSelectTab={setSelectedTab} 
              labels={['Received', 'Sent', 'Responded']} 
              pendingCount={receivedPings.filter(p => p.status === 'pending').length}
            />
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
    padding: 12,
    paddingTop: 12,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    margin: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
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
    height: 42, // Constrain the height to prevent excessive growth
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
    paddingVertical: 8, // Reduced padding to fit within constrained height
    paddingHorizontal: 4,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
    textAlign: 'center',
  },
  selectedTabText: {
    color: '#1E40AF',
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  emptyCard: {
    backgroundColor: 'white',
    marginTop: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4.65,
    elevation: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    marginBottom: 8,
    color: '#374151',
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptySubtitle: {
    color: '#6B7280',
    textAlign: 'center',
    fontSize: 14,
    paddingHorizontal: 20,
  },
  pingCard: {
    marginBottom: 16,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.15)',
    overflow: 'hidden',
  },
  pingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    padding: 12,
    borderRadius: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(59, 130, 246, 0.1)',
  },
  userInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  userDetails: {
    marginLeft: 12,
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    fontWeight: 'bold',
    marginBottom: 2,
    fontSize: 16,
    color: '#1F2937',
  },
  userRole: {
    color: '#6B7280',
    fontSize: 14,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timeText: {
    marginLeft: 4,
    color: '#6B7280',
    fontSize: 12,
  },
  message: {
    fontStyle: 'italic',
    color: '#374151',
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#38BDF8',
    fontSize: 14,
    lineHeight: 20,
  },
  statusContainer: {
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  statusChip: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  pendingChip: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  respondedChip: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  ignoredChip: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  pendingText: {
    color: '#38BDF8',
  },
  respondedText: {
    color: '#10B981',
  },
  ignoredText: {
    color: '#EF4444',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    padding: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.03)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(59, 130, 246, 0.1)',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  callButton: {
    flex: 1,
    backgroundColor: '#38BDF8',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  chatButton: {
    flex: 1,
    backgroundColor: 'rgba(56, 189, 248, 0.3)',
    borderRadius: 8,
  },
  ignoreButton: {
    flex: 1,
    borderColor: '#0EA5E9',
    borderWidth: 1,
    borderRadius: 8,
  },
  actionButtonContent: {
    paddingVertical: 6,
  },
  snackbar: {
    backgroundColor: 'rgba(31, 41, 55, 0.9)',
    borderRadius: 8,
  },
});

// Custom animated tab selector component
interface TabSelectorProps {
  tabs: string[];
  selectedTab: string;
  onSelectTab: React.Dispatch<React.SetStateAction<'received' | 'sent' | 'responded'>>;
  labels: string[];
  pendingCount: number;
}

function TabSelector({ tabs, selectedTab, onSelectTab, labels, pendingCount }: TabSelectorProps) {
  // Create animated values for the indicator
  const indicatorPosition = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);
  
  // References to measure tab widths
  const tabRefs = useRef<React.RefObject<View | null>[]>(tabs.map(() => React.createRef<View>()));
  const tabWidths = useRef<number[]>(tabs.map(() => 0));
  const tabPositions = useRef<number[]>(tabs.map(() => 0));
  const isLayoutCalculated = useRef<boolean>(false);
  
  // Update indicator position when tab changes
  useEffect(() => {
    if (isLayoutCalculated.current) {
      const index = tabs.indexOf(selectedTab);
      if (index !== -1) {
        indicatorPosition.value = withTiming(tabPositions.current[index], {
          duration: 300,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        });
        indicatorWidth.value = withTiming(tabWidths.current[index], {
          duration: 300,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        });
      }
    }
  }, [selectedTab]);

  // Function to handle layout calculation
  const handleTabLayout = (index: number) => (event: any) => {
    const { width, x } = event.nativeEvent.layout;
    tabWidths.current[index] = width;
    tabPositions.current[index] = x;
    // Check if all tabs have been measured
    if (tabWidths.current.every(w => w > 0)) {
      isLayoutCalculated.current = true;
      // Initialize indicator position for the selected tab
      const selectedIndex = tabs.indexOf(selectedTab);
      if (selectedIndex !== -1) {
        indicatorPosition.value = tabPositions.current[selectedIndex];
        indicatorWidth.value = tabWidths.current[selectedIndex];
      }
    }
  };
  
  // Animated style for the indicator
  const indicatorStyle = useAnimatedStyle(() => {
    return {
      position: 'absolute',
      bottom: 0,
      left: indicatorPosition.value,
      width: indicatorWidth.value,
      height: 3,
      backgroundColor: '#38BDF8',
      borderRadius: 1.5,
    };
  });
  
  return (
    <View style={styles.tabSelectorContainer}>
      {tabs.map((tab: string, index: number) => {
        const isSelected = tab === selectedTab;
        
        // Create animated styles for each tab
        const tabAnimatedStyle = useAnimatedStyle(() => {
          return {
            opacity: withTiming(isSelected ? 1 : 0.7, { duration: 200 }),
            transform: [
              { 
                scale: withTiming(isSelected ? 1.05 : 1, { 
                  duration: 200,
                  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
                })
              }
            ],
          };
        });
        
        return (
          <Pressable
            key={tab}
            ref={tabRefs.current[index]}
            style={styles.tabItem}
            onLayout={handleTabLayout(index)}
            onPress={() => {
              // Add a small bounce effect when pressed
              if (tab !== selectedTab) {
                onSelectTab(tab as 'received' | 'sent' | 'responded');
              }
            }}
          >
            <Animated.View style={[styles.tabItemContent, tabAnimatedStyle]}>
              <Text 
                style={[styles.tabText, isSelected && styles.selectedTabText]}
              >
                {labels[index]}
                {tab === 'received' && pendingCount > 0 && 
                  ` (${pendingCount})`
                }
              </Text>
            </Animated.View>
          </Pressable>
        );
      })}
      <Animated.View style={indicatorStyle} />
    </View>
  );
}