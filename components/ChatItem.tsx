import React from 'react';
import { Card, Text, Avatar, IconButton } from 'react-native-paper';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Chat } from '@/lib/types';
import { useUserStore } from '@/stores/useUserStore';
import { useFriendStore } from '@/stores/useFriendStore';
import { useChatStore } from '@/stores/useChatStore';
import { Users, Pin } from 'lucide-react-native';

export const ChatItem = ({ chat, userChats, temporaryUsers }: { chat: Chat; userChats?: Chat[]; temporaryUsers?: { id: string; name: string; avatar: string }[] }) => {
  const { user } = useUserStore();
  const { friends } = useFriendStore();

  const handleChatPress = () => {
    const isGroup = chat.is_group || chat.participants.length > 2;
    if (isGroup) {
      const groupName = chat.name || `Group Chat (${chat.participants.length})`;
      router.push({
        pathname: '/groupChat',
        params: {
          chatId: chat.id,
          chatName: groupName,
          isGroup: 'true',
          participants: JSON.stringify(chat.participants)
        }
      });
    } else {
      const otherUser = chat.participants.find(p => p !== user?.id);
      if (otherUser) {
        const userData = friends.find(f => f.id === otherUser) || { 
          id: otherUser, 
          name: 'Unknown', 
          role: '', 
          avatar: '' 
        };
        router.push({
          pathname: '/chat',
          params: {
            userId: userData.id,
            userName: userData.name,
            userRole: userData.role,
            userAvatar: userData.avatar
          }
        });
      }
    }
  };

  const getChatAvatar = () => {
    const isGroup = chat.is_group || chat.participants.length > 2;
    if (isGroup) {
      // Show group avatar if available, otherwise show group icon
      if (chat.avatar_url) {
        return <Avatar.Image size={50} source={{ uri: chat.avatar_url }} />;
      }
      return <Avatar.Icon size={50} icon={({ size, color }) => <Users size={size} color={color} />} />;
    } else {
      const otherUserId = chat.participants.find(p => p !== user?.id);
      const otherUser = friends.find(f => f.id === otherUserId) || (temporaryUsers || []).find(u => u.id === otherUserId);
      
      // If user data is not loaded yet, show a placeholder avatar
      if (!otherUser || !otherUser.avatar) {
        return <Avatar.Text size={50} label={otherUser?.name?.charAt(0) || '?'} />;
      }
      
      return <Avatar.Image size={50} source={{ uri: otherUser.avatar }} />;
    }
  };

  const getChatName = () => {
    const isGroup = chat.is_group || chat.participants.length > 2;
    if (isGroup) {
      return chat.name || `Group Chat (${chat.participants.length})`;
    } else {
      const otherUserId = chat.participants.find(p => p !== user?.id);
      const otherUser = friends.find(f => f.id === otherUserId) || (temporaryUsers || []).find(u => u.id === otherUserId);
      return otherUser?.name || 'Unknown';
    }
  };

  const getChatSubtitle = () => {
    const isGroup = chat.is_group || chat.participants.length > 2;
    if (isGroup) {
      return `${chat.participants.length} members • ${chat.last_message || 'No messages yet'}`;
    } else {
      const otherUserId = chat.participants.find(p => p !== user?.id);
      const otherUser = friends.find(f => f.id === otherUserId);
      const chatCount = userChats ? userChats.length : 1;
      return `${otherUser?.role || ''} • ${chatCount} chat${chatCount > 1 ? 's' : ''}`;
    }
  };

  const { togglePinChat } = useChatStore();

  const handlePinToggle = async () => {
    try {
      await togglePinChat(chat.id, !(chat.isPinned || false));
    } catch (error) {
      console.error('Error toggling pin for chat:', error);
    }
  };

  return (
    <Card style={styles.chatCard} onPress={handleChatPress}>
      <Card.Content style={styles.chatContent}>
        {getChatAvatar()}
        <View style={styles.chatDetails}>
          <View style={styles.chatNameContainer}>
            <Text variant="titleMedium" style={styles.chatName}>
              {getChatName()}
            </Text>
            {chat.isFromPing && (
              <View style={styles.pingTag}>
                <Text style={styles.pingTagText}>Ping</Text>
              </View>
            )}
          </View>
          <Text variant="bodyMedium" style={styles.chatSubtitle} numberOfLines={1}>
            {getChatSubtitle()}
          </Text>
        </View>
        <IconButton
          icon={({ size, color }: { size: number; color: string }) => <Pin size={size} color={chat.isPinned ? '#F59E0B' : color} />}
          size={20}
          onPress={handlePinToggle}
          style={styles.pinButton}
        />
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  chatCard: {
    marginBottom: 16,
    backgroundColor: 'white',
    elevation: 2,
  },
  chatContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatDetails: {
    marginLeft: 16,
    flex: 1,
  },
  chatNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontWeight: 'bold',
  },
  pingTag: {
    marginLeft: 8,
    backgroundColor: '#38BDF8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pingTagText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  chatSubtitle: {
    color: '#6B7280',
  },
  pinButton: {
    margin: 0,
  },
});
