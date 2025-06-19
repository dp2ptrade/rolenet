import React from 'react';
import { Card, Text, Avatar } from 'react-native-paper';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Chat } from '@/lib/types';
import { useUserStore } from '@/stores/useUserStore';
import { useFriendStore } from '@/stores/useFriendStore';
import { Users } from 'lucide-react-native';

export const ChatItem = ({ chat }: { chat: Chat }) => {
  const { user } = useUserStore();
  const { friends } = useFriendStore();

  const handleChatPress = () => {
    const isGroup = chat.participants.length > 2;
    if (isGroup) {
      router.push({
        pathname: '/chat',
        params: {
          chatId: chat.id,
          chatName: `Group Chat (${chat.participants.length})`,
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
    if (chat.participants.length > 2) {
      return <Avatar.Icon size={50} icon={({ size, color }) => <Users size={size} color={color} />} />;
    } else {
      const otherUserId = chat.participants.find(p => p !== user?.id);
      const otherUser = friends.find(f => f.id === otherUserId);
      return <Avatar.Image size={50} source={{ uri: otherUser?.avatar || undefined }} />;
    }
  };

  const getChatName = () => {
    if (chat.participants.length > 2) {
      return `Group Chat (${chat.participants.length})`;
    } else {
      const otherUserId = chat.participants.find(p => p !== user?.id);
      const otherUser = friends.find(f => f.id === otherUserId);
      return otherUser?.name || 'Unknown';
    }
  };

  const getChatSubtitle = () => {
    if (chat.participants.length > 2) {
      return `${chat.participants.length} members • ${chat.last_message || 'No messages yet'}`;
    } else {
      const otherUserId = chat.participants.find(p => p !== user?.id);
      const otherUser = friends.find(f => f.id === otherUserId);
      return otherUser?.role || '';
    }
  };

  return (
    <Card style={styles.chatCard} onPress={handleChatPress}>
      <Card.Content style={styles.chatContent}>
        {getChatAvatar()}
        <View style={styles.chatDetails}>
          <Text variant="titleMedium" style={styles.chatName}>
            {getChatName()}
          </Text>
          <Text variant="bodyMedium" style={styles.chatSubtitle} numberOfLines={1}>
            {getChatSubtitle()}
          </Text>
        </View>
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
  chatName: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  chatSubtitle: {
    color: '#6B7280',
  },
});
