import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Dialog, TextInput, Button, Chip, Text } from 'react-native-paper';
import { useUserStore } from '@/stores/useUserStore';
import { useFriendStore } from '@/stores/useFriendStore';
import { useChatStore } from '@/stores/useChatStore';

export const CreateGroupDialog = ({ visible, onDismiss }: { visible: boolean; onDismiss: () => void }) => {
  const [groupName, setGroupName] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const { user } = useUserStore();
  const { friends } = useFriendStore();
  const { loadUserChats } = useChatStore();

  const handleCreateGroup = async () => {
    if (!user?.id || !groupName.trim() || selectedParticipants.length < 2) return;
    const participants = [user.id, ...selectedParticipants];
    try {
      // Use the getOrCreateChat function from useChatStore to create a group chat
      await useChatStore.getState().getOrCreateChat(participants);
      onDismiss();
      setGroupName('');
      setSelectedParticipants([]);
      if (user?.id) {
        await loadUserChats(user.id);
      }
    } catch (error) {
      console.error('Error creating group chat:', error);
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
