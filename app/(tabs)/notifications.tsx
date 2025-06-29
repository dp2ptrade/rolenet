import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Appbar, Text, Button, Card, Title, Paragraph, Badge, IconButton } from 'react-native-paper';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { useUserStore } from '@/stores/useUserStore';
import { useRouter } from 'expo-router';
import { Bell, MessageSquare, UserPlus, Phone } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useUserStore();
  const { notifications, unreadCount, isLoading, fetchNotifications, markAsRead, markAllAsRead, subscribeToNotifications } = useNotificationStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchNotifications(user.id);
      const unsubscribe = subscribeToNotifications(user.id);
      return () => unsubscribe();
    }
  }, [user?.id, fetchNotifications, subscribeToNotifications]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    if (user?.id) {
      await fetchNotifications(user.id);
    }
    setRefreshing(false);
  }, [user?.id, fetchNotifications]);

  const handleNotificationPress = async (notification: any) => {
    if (!notification.read_at) {
      await markAsRead(notification.id);
    }
    
    switch (notification.type) {
      case 'friend_request':
        router.push(`/public-profile?userId=${notification.data?.sender_id}`);
        break;
      case 'message':
        router.push(`/chat?chatId=${notification.data?.chat_id}`);
        break;
      case 'ping':
        // Navigate to chat screen for ping response, passing sender data
        router.push({
          pathname: '/chat',
          params: {
            userId: notification.data?.sender_id,
            pingId: notification.id
          }
        });
        break;
      case 'call':
        router.push(`/call?callId=${notification.data?.call_id}`);
        break;
      default:
        break;
    }
  };

  const handleMarkAllAsRead = async () => {
    if (user?.id) {
      await markAllAsRead(user.id);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'friend_request':
        return <UserPlus size={24} color="#3B82F6" />;
      case 'message':
        return <MessageSquare size={24} color="#10B981" />;
      case 'ping':
        return <Bell size={24} color="#F59E0B" />;
      case 'call':
        return <Phone size={24} color="#EF4444" />;
      default:
        return <Bell size={24} color="#6B7280" />;
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <Card
      style={[styles.card, !item.read_at && styles.unreadCard]}
      onPress={() => handleNotificationPress(item)}
    >
      <Card.Content style={styles.cardContent}>
        <View style={styles.iconContainer}>
          {getNotificationIcon(item.type)}
        </View>
        <View style={styles.textContainer}>
          <Title style={styles.title}>{item.title}</Title>
          <Paragraph style={styles.body}>{item.body}</Paragraph>
          <Text style={styles.time}>{new Date(item.created_at).toLocaleString()}</Text>
        </View>
      </Card.Content>
    </Card>
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <Text>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#3B82F6', '#06B6D4']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <Badge style={styles.badge}>{unreadCount}</Badge>
        )}
      </LinearGradient>
      <View style={styles.content}>
        {unreadCount > 0 && (
          <Button
            mode="text"
            onPress={handleMarkAllAsRead}
            style={styles.markAllButton}
            icon="check-all"
          >
            Mark All as Read
          </Button>
        )}
        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Bell size={48} color="#6B7280" />
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySubtitle}>We'll notify you when something arrives</Text>
            <Button
              mode="contained"
              onPress={() => router.push('/discover')}
              style={styles.exploreButton}
            >
              Explore Network
            </Button>
          </View>
        ) : (
          <FlatList
            data={notifications}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  badge: {
    marginLeft: 12,
    backgroundColor: '#EF4444',
    color: 'white',
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  content: {
    flex: 1,
  },
  markAllButton: {
    alignSelf: 'flex-end',
    marginRight: 16,
    marginTop: -8,
    marginBottom: 8,
    color: '#38BDF8',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  exploreButton: {
    backgroundColor: '#38BDF8',
  },
  list: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4.65,
    elevation: 5,
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  unreadCard: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    padding: 10,
    borderRadius: 12,
  },
  iconContainer: {
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  body: {
    fontSize: 14,
    color: '#374151',
  },
  time: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
  },
});
