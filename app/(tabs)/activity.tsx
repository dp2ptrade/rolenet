import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Card, Text, Avatar, Button, Chip, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Clock, MessageSquare, Phone, UserCheck } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { usePingStore } from '@/stores/usePingStore';
import { Ping } from '@/lib/types';

const MOCK_PINGS: Ping[] = [
  {
    id: '1',
    senderId: '2',
    receiverId: '1',
    message: 'Hi! I would love to connect and discuss potential collaboration opportunities.',
    status: 'pending',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
  },
  {
    id: '2',
    senderId: '1',
    receiverId: '3',
    message: 'Hello Dr. Rodriguez, I would appreciate your advice on career transition.',
    status: 'responded',
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
    respondedAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
  },
  {
    id: '3',
    senderId: '4',
    receiverId: '1',
    message: 'Would you be interested in a quick chat about teaching methodologies?',
    status: 'pending',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
  },
];

export default function ActivityScreen() {
  const [selectedTab, setSelectedTab] = useState<'received' | 'sent' | 'responded'>('received');
  const [refreshing, setRefreshing] = useState(false);
  const [pings] = useState<Ping[]>(MOCK_PINGS);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  }, []);

  const getFilteredPings = () => {
    switch (selectedTab) {
      case 'received':
        return pings.filter(ping => ping.status === 'pending');
      case 'sent':
        return pings.filter(ping => ping.senderId === '1'); // Current user ID
      case 'responded':
        return pings.filter(ping => ping.status === 'responded');
      default:
        return [];
    }
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const handleRespond = (pingId: string, action: 'call' | 'chat' | 'ignore') => {
    console.log('Respond to ping:', pingId, 'with action:', action);
    // TODO: Implement response logic
  };

  const getUserInfo = (userId: string) => {
    // Mock user data - in real app, fetch from store or API
    const users: { [key: string]: { name: string; avatar: string; role: string } } = {
      '2': {
        name: 'Michael Chen',
        avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400',
        role: 'Developer'
      },
      '3': {
        name: 'Dr. Amanda Rodriguez',
        avatar: 'https://images.pexels.com/photos/5215024/pexels-photo-5215024.jpeg?auto=compress&cs=tinysrgb&w=400',
        role: 'Doctor'
      },
      '4': {
        name: 'Sarah Johnson',
        avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=400',
        role: 'Teacher'
      },
    };
    return users[userId] || { name: 'Unknown User', avatar: '', role: 'Professional' };
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
              Received ({pings.filter(p => p.status === 'pending').length})
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
              const user = getUserInfo(selectedTab === 'sent' ? ping.receiverId : ping.senderId);
              return (
                <Card key={ping.id} style={styles.pingCard}>
                  <Card.Content>
                    <View style={styles.pingHeader}>
                      <View style={styles.userInfo}>
                        <Avatar.Image 
                          size={50} 
                          source={{ uri: user.avatar }} 
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
                          {getTimeAgo(ping.createdAt)}
                        </Text>
                      </View>
                    </View>

                    <Text variant="bodyMedium" style={styles.message}>
                      "{ping.message}"
                    </Text>

                    <View style={styles.statusContainer}>
                      <Chip
                        icon={ping.status === 'pending' ? 'clock' : 'check'}
                        style={[
                          styles.statusChip,
                          ping.status === 'pending' ? styles.pendingChip : styles.respondedChip
                        ]}
                        textStyle={[
                          styles.statusText,
                          ping.status === 'pending' ? styles.pendingText : styles.respondedText
                        ]}
                      >
                        {ping.status === 'pending' ? 'Pending' : 'Responded'}
                      </Chip>
                    </View>

                    {selectedTab === 'received' && ping.status === 'pending' && (
                      <View style={styles.actionButtons}>
                        <Button
                          mode="contained"
                          icon={({ size, color }) => <Phone size={size} color={color} />}
                          onPress={() => handleRespond(ping.id, 'call')}
                          style={styles.callButton}
                          contentStyle={styles.actionButtonContent}
                        >
                          Call
                        </Button>
                        <Button
                          mode="contained-tonal"
                          icon={({ size, color }) => <MessageSquare size={size} color={color} />}
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
            })
          )}
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
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
  statusText: {
    fontSize: 12,
  },
  pendingText: {
    color: '#92400E',
  },
  respondedText: {
    color: '#065F46',
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
});