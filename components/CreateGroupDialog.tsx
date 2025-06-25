import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Dialog, TextInput, Button, Chip, Text, Avatar } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'lucide-react-native';
import { useUserStore } from '@/stores/useUserStore';
import { useFriendStore } from '@/stores/useFriendStore';
import { useChatStore } from '@/stores/useChatStore';
import { ChatService } from '@/lib/supabaseService';
import { supabase } from '@/lib/supabase';

export const CreateGroupDialog = ({ visible, onDismiss }: { visible: boolean; onDismiss: () => void }) => {
  const [groupName, setGroupName] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [groupAvatar, setGroupAvatar] = useState<string | null>(null);
  const { user } = useUserStore();
  const { friends } = useFriendStore();
  const { loadUserChats } = useChatStore();

  const handleCreateGroup = async () => {
    if (!user?.id || !groupName.trim() || selectedParticipants.length < 2) return;
    const participants = [user.id, ...selectedParticipants];
    try {
      // Create the group chat first
      const chat = await useChatStore.getState().createGroupChat(groupName.trim(), participants, user.id);
      
      // If there's a group avatar, upload it
      if (groupAvatar && chat) {
        try {
          const avatarUrl = await ChatService.uploadMedia(groupAvatar, 'chat-avatars');
          
          // Update the chat with the avatar URL
          await supabase
            .from('chats')
            .update({ avatar_url: avatarUrl })
            .eq('id', chat.id);
        } catch (avatarError) {
          console.error('Error uploading group avatar:', avatarError);
          // Continue even if avatar upload fails
        }
      }
      
      onDismiss();
      setGroupName('');
      setSelectedParticipants([]);
      setGroupAvatar(null);
      if (user?.id) {
        await loadUserChats(user.id);
      }
    } catch (error) {
      console.error('Error creating group chat:', error);
    }
  };

  const pickGroupAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permission to access media library denied');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setGroupAvatar(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking group avatar:', error);
    }
  };

  const toggleParticipant = (userId: string) => {
    setSelectedParticipants(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId) 
        : [...prev, userId]
    );
  };

  return (
    <Dialog
      visible={visible}
      onDismiss={onDismiss}
    >
      <Dialog.Title>Create Group Chat</Dialog.Title>
      <Dialog.Content>
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={pickGroupAvatar} style={styles.avatarContainer}>
            {groupAvatar ? (
              <Avatar.Image size={80} source={{ uri: groupAvatar }} />
            ) : (
              <Avatar.Icon 
                size={80} 
                icon={({ size, color }) => <Camera size={size * 0.5} color={color} />} 
              />
            )}
          </TouchableOpacity>
          <Text variant="bodySmall" style={styles.avatarHint}>
            Tap to add group photo
          </Text>
        </View>
        
        <TextInput
          label="Group Name"
          value={groupName}
          onChangeText={setGroupName}
          style={styles.groupNameInput}
        />
        <Text variant="titleMedium" style={styles.selectParticipantsTitle}>
          Select Participants
        </Text>
        <View style={styles.participantsContainer}>
          {friends.length > 0 ? (
            friends.map((friend, index) => (
              <Chip
                key={`friend-chip-${friend.id}`}
                mode="outlined"
                selected={selectedParticipants.includes(friend.id)}
                onPress={() => toggleParticipant(friend.id)}
                style={styles.participantChip}
              >
                {friend.name}
              </Chip>
            ))
          ) : (
            <Text>No friends available to add to group.</Text>
          )}
        </View>
      </Dialog.Content>
      <Dialog.Actions>
        <Button onPress={onDismiss}>Cancel</Button>
        <Button
          onPress={handleCreateGroup}
          disabled={!groupName.trim() || selectedParticipants.length < 2}
        >
          Create
        </Button>
      </Dialog.Actions>
    </Dialog>
  );
};

const styles = StyleSheet.create({
  avatarSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    marginBottom: 8,
  },
  avatarHint: {
    color: '#666',
    textAlign: 'center',
  },
  groupNameInput: {
    marginBottom: 16,
  },
  selectParticipantsTitle: {
    marginBottom: 8,
  },
  participantsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  participantChip: {
    marginRight: 8,
    marginBottom: 8,
  },
});
