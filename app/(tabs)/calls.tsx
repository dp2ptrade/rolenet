import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Text,
  Card,
  Avatar,
  IconButton,
  Chip,
  Searchbar,
  FAB,
  Surface,
  Divider,
  Button
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Phone, PhoneCall, PhoneMissed, PhoneIncoming, PhoneOutgoing, Video, Search } from 'lucide-react-native';
import { router } from 'expo-router';
import { useCallStore } from '@/stores/useCallStore';
import { useUserStore } from '@/stores/useUserStore';
import { Call } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

interface CallHistoryItem {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  userRole?: string;
  type: 'incoming' | 'outgoing' | 'missed';
  duration?: number;
  timestamp: Date;
  isVideo?: boolean;
}

export default function CallsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'missed' | 'incoming' | 'outgoing'>('all');
  
  const { callHistory, isInCall, currentCall, loadCallHistory } = useCallStore();
  const { user } = useUserStore();

  useEffect(() => {
    loadCallHistory();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCallHistory();
    setRefreshing(false);
  };

  // Transform Call objects to CallHistoryItem format
  const transformedCalls: CallHistoryItem[] = (callHistory || []).map((call: Call) => {
    const isIncoming = call.callee_id === user?.id;
    const otherUserId = isIncoming ? call.caller_id : call.callee_id;
    const otherUser = call.caller || call.callee; // Assuming these are populated from the join
    
    let type: 'incoming' | 'outgoing' | 'missed';
    if (call.status === 'missed') {
      type = 'missed';
    } else if (isIncoming) {
      type = 'incoming';
    } else {
      type = 'outgoing';
    }
    
    return {
      id: call.id,
      userId: otherUserId,
      userName: otherUser?.name || 'Unknown User',
      userAvatar: otherUser?.avatar,
      userRole: otherUser?.role,
      type,
      duration: call.duration,
      timestamp: new Date(call.created_at),
      isVideo: false // Add video support later if needed
    };
  });

  const filteredCalls = transformedCalls.filter((call: CallHistoryItem) => {
    const matchesSearch = call.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         call.userRole?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeFilter === 'all') return matchesSearch;
    return matchesSearch && call.type === activeFilter;
  });

  const getCallIcon = (type: string, isVideo?: boolean) => {
    const iconProps = { size: 20, color: getCallIconColor(type) };
    
    if (isVideo) {
      return <Video {...iconProps} />;
    }
    
    switch (type) {
      case 'incoming':
        return <PhoneIncoming {...iconProps} />;
      case 'outgoing':
        return <PhoneOutgoing {...iconProps} />;
      case 'missed':
        return <PhoneMissed {...iconProps} />;
      default:
        return <Phone {...iconProps} />;
    }
  };

  const getCallIconColor = (type: string) => {
    switch (type) {
      case 'incoming':
        return '#4CAF50';
      case 'outgoing':
        return '#2196F3';
      case 'missed':
        return '#F44336';
      default:
        return '#757575';
    }
  };

  const formatCallDuration = (duration?: number) => {
    if (!duration) return 'No answer';
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleCallUser = (userId: string, isVideo: boolean = false) => {
    router.push({
      pathname: '/call',
      params: {
        userId,
        isVideo: isVideo.toString()
      }
    });
  };

  const renderCallItem = (call: CallHistoryItem) => (
    <Card key={call.id} style={styles.callCard} mode="outlined">
      <Card.Content style={styles.callContent}>
        <View style={styles.callInfo}>
          <Avatar.Image
            size={48}
            source={{ uri: call.userAvatar || 'https://via.placeholder.com/48' }}
            style={styles.avatar}
          />
          <View style={styles.callDetails}>
            <Text variant="titleMedium" style={styles.userName}>
              {call.userName}
            </Text>
            <View style={styles.callMeta}>
              {getCallIcon(call.type, call.isVideo)}
              <Text variant="bodySmall" style={styles.callTime}>
                {formatDistanceToNow(call.timestamp, { addSuffix: true })}
              </Text>
              {call.userRole && (
                <Chip mode="outlined" compact style={styles.roleChip}>
                  {call.userRole}
                </Chip>
              )}
            </View>
            <Text variant="bodySmall" style={styles.duration}>
              {formatCallDuration(call.duration)}
            </Text>
          </View>
        </View>
        <View style={styles.callActions}>
          <IconButton
            icon="phone"
            size={24}
            onPress={() => handleCallUser(call.userId, false)}
            style={styles.actionButton}
          />
          <IconButton
            icon="video"
            size={24}
            onPress={() => handleCallUser(call.userId, true)}
            style={styles.actionButton}
          />
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#3B82F6', '#06B6D4']}
        style={styles.header}
      >
        <Text variant="headlineMedium" style={styles.headerTitle}>
          Calls
        </Text>
        <Text variant="bodyMedium" style={styles.headerSubtitle}>
          Connect with your network
        </Text>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.searchContainer}>
          <View style={styles.searchShapeOverlay} />
          <Searchbar
            placeholder="Search calls..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchbar}
            icon={({ size, color }) => <Search size={size} color={color} />}
          />
        </View>

        {/* Active Call Banner */}
        {isInCall && currentCall && (
          <Surface style={styles.activeCallBanner} elevation={4}>
            <View style={styles.activeCallContent}>
              <Avatar.Image
                size={40}
                source={{ uri: 'https://via.placeholder.com/40' }}
              />
              <View style={styles.activeCallInfo}>
                <Text variant="titleSmall">Call in progress</Text>
                <Text variant="bodySmall">Active Call</Text>
              </View>
              <Button
                mode="contained"
                onPress={() => router.push('/call')}
                style={styles.returnButton}
              >
                Return
              </Button>
            </View>
          </Surface>
        )}

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
          contentContainerStyle={styles.filterContent}
        >
          {['all', 'missed', 'incoming', 'outgoing'].map((filter) => (
            <Chip
              key={filter}
              selected={activeFilter === filter}
              onPress={() => setActiveFilter(filter as any)}
              style={styles.filterChip}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Chip>
          ))}
        </ScrollView>

        {/* Call History */}
        <ScrollView
          style={styles.callsList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {filteredCalls.length > 0 ? (
            filteredCalls.map(renderCallItem)
          ) : (
            <View style={styles.emptyState}>
              <PhoneCall size={64} color="#666" />
              <Text variant="titleMedium" style={styles.emptyTitle}>
                No calls found
              </Text>
              <Text variant="bodyMedium" style={styles.emptySubtitle}>
                {searchQuery ? 'Try adjusting your search' : 'Start making calls to see your history'}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Floating Action Button */}
        <FAB
          icon="phone-plus"
          style={styles.fab}
          onPress={() => router.push('/discover')}
          label="New Call"
        />
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
    padding: 12,
    paddingTop: 12,
    paddingBottom: 16,
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
    paddingHorizontal: 16,
  },
  searchContainer: {
    marginBottom: 12,
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
    position: 'relative',
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  searchShapeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderRadius: 16,
    borderTopLeftRadius: 30,
    borderBottomRightRadius: 30,
    borderBottomLeftRadius: 10,
    borderTopRightRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(56, 189, 248, 0.8)',
    zIndex: 1,
  },
  searchbar: {
    backgroundColor: '#F8FAFC',
    height: 42,
    borderRadius: 14,
    borderTopLeftRadius: 28,
    borderBottomRightRadius: 28,
    borderBottomLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    paddingHorizontal: 16,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    zIndex: 2,
  },
  activeCallBanner: {
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: '#E8F5E8',
  },
  activeCallContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  activeCallInfo: {
    flex: 1,
    marginLeft: 12,
  },
  returnButton: {
    borderRadius: 20,
  },
  filterContainer: {
    maxHeight: 50,
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterChip: {
    marginRight: 8,
  },
  callsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  callCard: {
    marginBottom: 8,
    borderRadius: 12,
  },
  callContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  callInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    marginRight: 12,
  },
  callDetails: {
    flex: 1,
  },
  userName: {
    fontWeight: '600',
    marginBottom: 4,
  },
  callMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  callTime: {
    marginLeft: 8,
    color: '#666',
  },
  roleChip: {
    marginLeft: 8,
    height: 24,
  },
  duration: {
    color: '#666',
  },
  callActions: {
    flexDirection: 'row',
  },
  actionButton: {
    marginLeft: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
    fontWeight: '600',
  },
  emptySubtitle: {
    textAlign: 'center',
    color: '#666',
    paddingHorizontal: 32,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    borderRadius: 28,
  },
});
