import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Card, Text, Surface, Searchbar, FAB, Portal } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MessageSquare, Plus } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useUserStore } from '@/stores/useUserStore';
import { useChatStore } from '@/stores/useChatStore';
import { useFriendStore } from '@/stores/useFriendStore';
import { Chat } from '@/lib/types';
import { ChatItem } from '@/components/ChatItem';
import { CreateGroupDialog } from '@/components/CreateGroupDialog';

export default function ChatsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useUserStore();
  const { chats, loadUserChats, isLoading } = useChatStore();
  const { friends } = useFriendStore();
  const [refreshing, setRefreshing] = useState(false);
  const [createGroupDialogVisible, setCreateGroupDialogVisible] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadUserChats(user.id);
    }
  }, [user?.id]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    if (user?.id) {
      await loadUserChats(user.id);
    }
    setRefreshing(false);
  }, [user?.id]);

  const filteredChats = chats.filter(chat => {
    const chatName = chat.participants.length > 2 
      ? `Group Chat (${chat.participants.length})`
      : friends.find(f => f.id === chat.participants.find(p => p !== user?.id))?.name || 'Unknown';
    return chatName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#3B82F6', '#06B6D4']}
        style={styles.header}
      >
        <Text variant="headlineMedium" style={styles.headerTitle}>
          Chats
        </Text>
        <Text variant="bodyMedium" style={styles.headerSubtitle}>
          Connect with your network
        </Text>
      </LinearGradient>

      <View style={styles.content}>
        <Searchbar
          placeholder="Search chats..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.scrollContent}
        >
          {isLoading ? (
            <Text style={{ textAlign: 'center', marginTop: 40 }}>Loading chats...</Text>
          ) : filteredChats.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content style={styles.emptyContent}>
                <MessageSquare size={48} color="#6B7280" />
                <Text variant="titleMedium" style={styles.emptyTitle}>
                  No chats yet
                </Text>
                <Text variant="bodyMedium" style={styles.emptySubtitle}>
                  Start a conversation with your friends or create a group
                </Text>
              </Card.Content>
            </Card>
          ) : (
            filteredChats.map((chat, index) => (
              <ChatItem key={`${chat.id}-${index}`} chat={chat} />
            ))
          )}
        </ScrollView>
      </View>

      <FAB
        icon={({ size, color }) => <Plus size={size} color={color} />}
        style={styles.fab}
        onPress={() => setCreateGroupDialogVisible(true)}
        label="New Group"
      />

      <Portal>
        <CreateGroupDialog 
          visible={createGroupDialogVisible} 
          onDismiss={() => setCreateGroupDialogVisible(false)} 
        />
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
  searchbar: {
    backgroundColor: 'white',
    marginTop: -20,
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
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#3B82F6',
  },
});
