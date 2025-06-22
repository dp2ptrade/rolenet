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
  const { chats, loadUserChats, isLoading, subscribeToAllChats, unsubscribeFromAllChats } = useChatStore();
  const { friends } = useFriendStore();
  const [refreshing, setRefreshing] = useState(false);
  const [createGroupDialogVisible, setCreateGroupDialogVisible] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadUserChats(user.id, 20);
      // Load friends data when the chats page is accessed
      useFriendStore.getState().loadFriends(user.id);
      // Subscribe to global chat updates for real-time chat list updates
      subscribeToAllChats(user.id);
    }

    // Cleanup subscription when component unmounts or user changes
    return () => {
      unsubscribeFromAllChats();
    };
  }, [user?.id, subscribeToAllChats, unsubscribeFromAllChats]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    if (user?.id) {
      // Load both chats and friends data in parallel
      await Promise.all([
        loadUserChats(user.id, 20),
        useFriendStore.getState().loadFriends(user.id)
      ]);
    }
    setRefreshing(false);
  }, [user?.id]);

  // Group one-on-one chats by the other participant
  const groupedChats: { [key: string]: Chat[] } = {};
  const groupChats: Chat[] = [];

  chats.forEach(chat => {
    if (chat.participants.length > 2) {
      groupChats.push(chat);
    } else {
      const otherUserId = chat.participants.find(p => p !== user?.id);
      if (otherUserId) {
        if (!groupedChats[otherUserId]) {
          groupedChats[otherUserId] = [];
        }
        groupedChats[otherUserId].push(chat);
      }
    }
  });

  // Sort chats by most recent activity (last_message_time or updated_at)
  const sortChatsByActivity = (chats: Chat[]) => {
    return chats.sort((a, b) => {
      const timeA = a.last_message_time || a.updated_at;
      const timeB = b.last_message_time || b.updated_at;
      return new Date(timeB).getTime() - new Date(timeA).getTime();
    });
  };

  // Separate pinned chats
  const pinnedUserChats: [string, Chat[]][] = [];
  const unpinnedUserChats: [string, Chat[]][] = [];
  Object.entries(groupedChats).forEach(([userId, chats]) => {
    const friend = friends.find(f => f.id === userId);
    const chatName = friend?.name || 'Unknown';
    if (chatName.toLowerCase().includes(searchQuery.toLowerCase())) {
      // Sort chats for this user by activity
      const sortedChats = sortChatsByActivity([...chats]);
      if (sortedChats.some(chat => chat.isPinned)) {
        pinnedUserChats.push([userId, sortedChats]);
      } else {
        unpinnedUserChats.push([userId, sortedChats]);
      }
    }
  });

  // Sort group chats by activity
  const sortedGroupChats = sortChatsByActivity([...groupChats]);
  const pinnedGroupChats = sortedGroupChats.filter(chat => chat.isPinned && `Group Chat (${chat.participants.length})`.toLowerCase().includes(searchQuery.toLowerCase()));
  const unpinnedGroupChats = sortedGroupChats.filter(chat => !chat.isPinned && `Group Chat (${chat.participants.length})`.toLowerCase().includes(searchQuery.toLowerCase()));

  // Sort pinned and unpinned user chats by most recent activity
  pinnedUserChats.sort(([, chatsA], [, chatsB]) => {
    const timeA = chatsA[0].last_message_time || chatsA[0].updated_at;
    const timeB = chatsB[0].last_message_time || chatsB[0].updated_at;
    return new Date(timeB).getTime() - new Date(timeA).getTime();
  });

  unpinnedUserChats.sort(([, chatsA], [, chatsB]) => {
    const timeA = chatsA[0].last_message_time || chatsA[0].updated_at;
    const timeB = chatsB[0].last_message_time || chatsB[0].updated_at;
    return new Date(timeB).getTime() - new Date(timeA).getTime();
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
          ) : (pinnedUserChats.length === 0 && pinnedGroupChats.length === 0 && unpinnedUserChats.length === 0 && unpinnedGroupChats.length === 0) ? (
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
            <>
              {(pinnedUserChats.length > 0 || pinnedGroupChats.length > 0) && (
                <>
                  <Text variant="titleMedium" style={styles.sectionTitle}>Pinned Chats</Text>
                  {pinnedUserChats.map(([userId, userChats], index) => (
                    <ChatItem key={`pinned-user-${userId}-${userChats[0].id}`} chat={userChats[0]} userChats={userChats} />
                  ))}
                  {pinnedGroupChats.map((chat, index) => (
                    <ChatItem key={`pinned-group-${chat.id}`} chat={chat} />
                  ))}
                </>
              )}
              {(unpinnedUserChats.length > 0 || unpinnedGroupChats.length > 0) && (
                <>
                  <Text variant="titleMedium" style={styles.sectionTitle}>Recent Chats</Text>
                  {unpinnedUserChats.map(([userId, userChats], index) => (
                    <ChatItem key={`unpinned-user-${userId}-${userChats[0].id}`} chat={userChats[0]} userChats={userChats} />
                  ))}
                  {unpinnedGroupChats.map((chat, index) => (
                    <ChatItem key={`unpinned-group-${chat.id}`} chat={chat} />
                  ))}
                </>
              )}
            </>
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
  searchbar: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    marginTop: 10,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3B82F6',
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
    backgroundColor: '#38BDF8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  sectionTitle: {
    marginTop: 16,
    marginBottom: 8,
    paddingLeft: 16,
    color: '#6B7280',
    fontWeight: 'bold',
  },
});
