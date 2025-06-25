import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Card, Text, Surface, Searchbar, FAB, Portal } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MessageSquare, Plus, Search } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useUserStore } from '../../stores/useUserStore';
import { useChatStore } from '../../stores/useChatStore';
import { useFriendStore } from '../../stores/useFriendStore';
import { Chat } from '@/lib/types';
import { ChatItem } from '../../components/ChatItem';
import { CreateGroupDialog } from '../../components/CreateGroupDialog';

export default function ChatsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'recent' | 'groups'>('recent');
  const { user } = useUserStore();
  const { chats, loadUserChats, isLoading, subscribeToAllChats, unsubscribeFromAllChats, initializeOfflineSupport } = useChatStore();
  const { friends } = useFriendStore();
  const [refreshing, setRefreshing] = useState(false);
  const [createGroupDialogVisible, setCreateGroupDialogVisible] = useState(false);

  useEffect(() => {
    if (user?.id) {
      // Initialize offline support and pagination first
      initializeOfflineSupport(user.id);
      loadUserChats(user.id, true);
      // Load friends data when the chats page is accessed
      useFriendStore.getState().loadFriends(user.id);
      // Subscribe to global chat updates for real-time chat list updates
      subscribeToAllChats(user.id);
    }

    // Cleanup subscription when component unmounts or user changes
    return () => {
      unsubscribeFromAllChats();
    };
  }, [user?.id, subscribeToAllChats, unsubscribeFromAllChats, initializeOfflineSupport]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    if (user?.id) {
      // Load both chats and friends data in parallel
      await Promise.all([
        loadUserChats(user.id, true),
        useFriendStore.getState().loadFriends(user.id)
      ]);
    }
    setRefreshing(false);
  }, [user?.id]);

  // Group one-on-one chats by the other participant
  const groupedChats: { [key: string]: Chat[] } = {};
  const groupChats: Chat[] = [];

  console.log('🔍 Processing all chats:', {
    totalChats: chats.length,
    currentUserId: user?.id,
    chats: chats.map(c => ({ 
      id: c.id, 
      name: c.name, 
      is_group: c.is_group, 
      participants: c.participants,
      created_by: c.created_by 
    }))
  });

  chats.forEach(chat => {
    // Use is_group field to determine if it's a group chat
    if (chat.is_group || chat.participants.length > 2) {
      // Only include groups where the user is a participant
      if (chat.participants.includes(user?.id || '')) {
        console.log('✅ Adding group chat:', { id: chat.id, name: chat.name, created_by: chat.created_by });
        groupChats.push(chat);
      } else {
        console.log('❌ User not in group participants:', { id: chat.id, name: chat.name, participants: chat.participants });
      }
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
    if (searchQuery === '' || chatName.toLowerCase().includes(searchQuery.toLowerCase())) {
      // Sort chats for this user by activity
      const sortedChats = sortChatsByActivity([...chats]);
      if (sortedChats.some(chat => chat.isPinned)) {
        pinnedUserChats.push([userId, sortedChats]);
      } else {
        unpinnedUserChats.push([userId, sortedChats]);
      }
    }
  });

  // Categorize and sort group chats
  const categorizeGroupChats = (chats: Chat[]) => {
    const createdGroups: Chat[] = [];
    const joinedGroups: Chat[] = [];
    
    console.log('🔍 Categorizing group chats:', {
      totalGroupChats: chats.length,
      currentUserId: user?.id,
      chats: chats.map(c => ({ id: c.id, name: c.name, created_by: c.created_by, is_group: c.is_group }))
    });
    
    chats.forEach(chat => {
      const groupName = chat.name || `Group Chat (${chat.participants.length})`;
      const matchesSearch = searchQuery === '' || groupName.toLowerCase().includes(searchQuery.toLowerCase());
      
      console.log('📊 Processing chat:', {
        chatId: chat.id,
        chatName: groupName,
        created_by: chat.created_by,
        currentUserId: user?.id,
        isCreatedByUser: chat.created_by === user?.id,
        matchesSearch
      });
      
      if (matchesSearch) {
        if (chat.created_by === user?.id) {
          console.log('✅ Adding to createdGroups:', chat.id);
          createdGroups.push(chat);
        } else {
          console.log('✅ Adding to joinedGroups:', chat.id);
          joinedGroups.push(chat);
        }
      }
    });
    
    console.log('📈 Categorization result:', {
      createdGroups: createdGroups.length,
      joinedGroups: joinedGroups.length
    });
    
    return { createdGroups, joinedGroups };
  };
  
  const sortedGroupChats = sortChatsByActivity([...groupChats]);
  const { createdGroups, joinedGroups } = categorizeGroupChats(sortedGroupChats);
  
  // Sort created and joined groups by activity, then separate pinned/unpinned
  const sortedCreatedGroups = sortChatsByActivity([...createdGroups]);
  const sortedJoinedGroups = sortChatsByActivity([...joinedGroups]);
  
  const pinnedCreatedGroups = sortedCreatedGroups.filter(chat => chat.isPinned);
  const unpinnedCreatedGroups = sortedCreatedGroups.filter(chat => !chat.isPinned);
  const pinnedJoinedGroups = sortedJoinedGroups.filter(chat => chat.isPinned);
  const unpinnedJoinedGroups = sortedJoinedGroups.filter(chat => !chat.isPinned);
  
  // Combine all groups in priority order: pinned created, unpinned created, pinned joined, unpinned joined
  const allGroupChats = [
    ...pinnedCreatedGroups,
    ...unpinnedCreatedGroups,
    ...pinnedJoinedGroups,
    ...unpinnedJoinedGroups
  ];
  
  // For backward compatibility, keep the old variables but use new logic
  const pinnedGroupChats = [...pinnedCreatedGroups, ...pinnedJoinedGroups];
  const unpinnedGroupChats = [...unpinnedCreatedGroups, ...unpinnedJoinedGroups];

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
        <View style={styles.searchContainer}>
          <View style={styles.searchShapeOverlay} />
          <Searchbar
            placeholder="Search chats..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchbar}
            icon={({ size, color }) => <Search size={size} color={color} />}
          />
        </View>

        <View style={styles.tabContainer}>
          <Surface style={styles.tabBar}>
            <View style={styles.tabItem}>
              <Text 
                style={[styles.tabText, activeTab === 'recent' && styles.activeTabText]} 
                onPress={() => setActiveTab('recent')}
              >
                Recent Chats
              </Text>
              {activeTab === 'recent' && <View style={styles.activeTabIndicator} />}
            </View>
            <View style={styles.tabItem}>
              <Text 
                style={[styles.tabText, activeTab === 'groups' && styles.activeTabText]} 
                onPress={() => setActiveTab('groups')}
              >
                Groups
              </Text>
              {activeTab === 'groups' && <View style={styles.activeTabIndicator} />}
            </View>
          </Surface>
          
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={styles.scrollContent}
          >
            {isLoading ? (
              <Text style={{ textAlign: 'center', marginTop: 40 }}>Loading chats...</Text>
            ) : activeTab === 'recent' ? (
              (pinnedUserChats.length === 0 && unpinnedUserChats.length === 0) ? (
                <Card style={styles.emptyCard}>
                  <Card.Content style={styles.emptyContent}>
                    <MessageSquare size={48} color="#6B7280" />
                    <Text variant="titleMedium" style={styles.emptyTitle}>
                      No recent chats
                    </Text>
                    <Text variant="bodyMedium" style={styles.emptySubtitle}>
                      Start a conversation with your friends
                    </Text>
                  </Card.Content>
                </Card>
              ) : (
                <>
                  {pinnedUserChats.length > 0 && (
                    <>
                      <Text variant="titleMedium" style={styles.sectionTitle}>Pinned Chats</Text>
                      {pinnedUserChats.map(([userId, userChats], index) => (
                        <ChatItem key={`pinned-user-${userId}-${userChats[0].id}`} chat={userChats[0]} userChats={userChats} />
                      ))}
                    </>
                  )}
                  {unpinnedUserChats.length > 0 && (
                    <>
                      <Text variant="titleMedium" style={styles.sectionTitle}>Recent Chats</Text>
                      {unpinnedUserChats.map(([userId, userChats], index) => (
                        <ChatItem key={`unpinned-user-${userId}-${userChats[0].id}`} chat={userChats[0]} userChats={userChats} />
                      ))}
                    </>
                  )}
                </>
              )
            ) : (
              (allGroupChats.length === 0) ? (
                <Card style={styles.emptyCard}>
                  <Card.Content style={styles.emptyContent}>
                    <MessageSquare size={48} color="#6B7280" />
                    <Text variant="titleMedium" style={styles.emptyTitle}>
                      No groups yet
                    </Text>
                    <Text variant="bodyMedium" style={styles.emptySubtitle}>
                      Create a group to start chatting
                    </Text>
                  </Card.Content>
                </Card>
              ) : (
                <>
                  {/* Created Groups Section */}
                  {(pinnedCreatedGroups.length > 0 || unpinnedCreatedGroups.length > 0) && (
                    <>
                      <Text variant="titleMedium" style={styles.sectionTitle}>My Groups</Text>
                      {pinnedCreatedGroups.map((chat, index) => (
                        <ChatItem key={`pinned-created-${chat.id}`} chat={chat} />
                      ))}
                      {unpinnedCreatedGroups.map((chat, index) => (
                        <ChatItem key={`unpinned-created-${chat.id}`} chat={chat} />
                      ))}
                    </>
                  )}
                  
                  {/* Joined Groups Section */}
                  {(pinnedJoinedGroups.length > 0 || unpinnedJoinedGroups.length > 0) && (
                    <>
                      <Text variant="titleMedium" style={styles.sectionTitle}>Joined Groups</Text>
                      {pinnedJoinedGroups.map((chat, index) => (
                        <ChatItem key={`pinned-joined-${chat.id}`} chat={chat} />
                      ))}
                      {unpinnedJoinedGroups.map((chat, index) => (
                        <ChatItem key={`unpinned-joined-${chat.id}`} chat={chat} />
                      ))}
                    </>
                  )}
                </>
              )
            )}
          </ScrollView>
        </View>
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
  tabContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 8,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    position: 'relative',
  },
  tabText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#3B82F6',
    fontWeight: 'bold',
  },
  activeTabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: 2,
    backgroundColor: '#3B82F6',
    borderRadius: 2,
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
