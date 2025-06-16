import React, { useEffect } from 'react';
import { View, FlatList, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Appbar, Text, Button, Card, Title, Paragraph } from 'react-native-paper';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { useUserStore } from '@/stores/useUserStore';
import { useRouter } from 'expo-router';

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useUserStore();
  const { notifications, unreadCount, isLoading, fetchNotifications, markAsRead, markAllAsRead, subscribeToNotifications } = useNotificationStore();

  useEffect(() => {
    if (user?.id) {
      fetchNotifications(user.id);
      const unsubscribe = subscribeToNotifications(user.id);
      return () => unsubscribe();
    }
  }, [user?.id, fetchNotifications, subscribeToNotifications]);

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
        router.push(`/public-profile?userId=${notification.data?.sender_id}`);
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

  const renderItem = ({ item }: { item: any }) => (
    <Card
      style={[styles.card, !item.read_at && styles.unreadCard]}
      onPress={() => handleNotificationPress(item)}
    >
      <Card.Content>
        <Title>{item.title}</Title>
        <Paragraph>{item.body}</Paragraph>
        <Text style={styles.time}>{new Date(item.created_at).toLocaleString()}</Text>
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
      <Appbar.Header style={{ backgroundColor: '#F8FAFC', elevation: 0 }}>
        <Appbar.Content title="Notifications" />
        {unreadCount > 0 && (
          <Appbar.Action
            icon="check-all"
            onPress={handleMarkAllAsRead}
          />
        )}
      </Appbar.Header>
      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No notifications yet.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#888' },
  list: { padding: 16 },
  card: { marginBottom: 16, elevation: 2 },
  unreadCard: { backgroundColor: '#E3F2FD' },
  time: { fontSize: 12, color: '#888', marginTop: 8 },
});
