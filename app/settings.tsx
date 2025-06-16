import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { List, Switch, Divider, Button, Text, Appbar } from 'react-native-paper';
import { useUserStore } from '@/stores/useUserStore';
import { useRouter } from 'expo-router';
import { UserService } from '@/lib/supabaseService';

export default function SettingsScreen() {
  const { user, setCurrentUser } = useUserStore();
  const router = useRouter();
  const [profileVisible, setProfileVisible] = useState(user?.profile_visible ?? true);
  const [allowMessages, setAllowMessages] = useState(user?.allow_messages ?? true);
  const [allowPings, setAllowPings] = useState(user?.allow_pings ?? true);
  const [blockedUsers, setBlockedUsers] = useState(user?.blocked_users ?? []);

  const handleToggleProfileVisible = async () => {
    try {
      setProfileVisible(!profileVisible);
      const { user, setUser } = useUserStore.getState();
      if (user) {
        const updates = { profile_visible: !profileVisible };
        const { data, error } = await UserService.updateUserProfile(user.id, updates);
        if (error) throw error;
        setUser({ ...user, ...updates });
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to update profile visibility.');
    }
  };

  const handleToggleAllowMessages = async () => {
    try {
      setAllowMessages(!allowMessages);
      const { user, setUser } = useUserStore.getState();
      if (user) {
        const updates = { allow_messages: !allowMessages };
        const { data, error } = await UserService.updateUserProfile(user.id, updates);
        if (error) throw error;
        setUser({ ...user, ...updates });
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to update message permissions.');
    }
  };

  const handleToggleAllowPings = async () => {
    try {
      setAllowPings(!allowPings);
      const { user, setUser } = useUserStore.getState();
      if (user) {
        const updates = { allow_pings: !allowPings };
        const { data, error } = await UserService.updateUserProfile(user.id, updates);
        if (error) throw error;
        setUser({ ...user, ...updates });
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to update ping permissions.');
    }
  };

  const handleManageBlockedUsers = async () => {
    try {
      // Example: Prompt for user ID to block/unblock (replace with a better UI in production)
      Alert.prompt(
        'Manage Blocked Users',
        'Enter the user ID to block or unblock:',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Block',
            onPress: async (userId) => {
              if (!userId) return;
              if (blockedUsers.includes(userId)) {
                Alert.alert('Already blocked', 'This user is already blocked.');
                return;
              }
              const updatedBlocked = [...blockedUsers, userId];
              setBlockedUsers(updatedBlocked);
              const { user, setUser } = useUserStore.getState();
              if (user) {
                const updates = { blocked_users: updatedBlocked };
                const { data, error } = await UserService.updateUserProfile(user.id, updates);
                if (error) throw error;
                setUser({ ...user, ...updates });
              }
            },
          },
          {
            text: 'Unblock',
            onPress: async (userId) => {
              if (!userId) return;
              if (!blockedUsers.includes(userId)) {
                Alert.alert('Not blocked', 'This user is not in your blocked list.');
                return;
              }
              const updatedBlocked = blockedUsers.filter((id) => id !== userId);
              setBlockedUsers(updatedBlocked);
              const { user, setUser } = useUserStore.getState();
              if (user) {
                const updates = { blocked_users: updatedBlocked };
                const { data, error } = await UserService.updateUserProfile(user.id, updates);
                if (error) throw error;
                setUser({ ...user, ...updates });
              }
            },
          },
        ],
        'plain-text'
      );
    } catch (err) {
      Alert.alert('Error', 'Failed to manage blocked users.');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <Appbar.Header style={{ backgroundColor: '#F8FAFC', elevation: 0 }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Privacy & Security" />
      </Appbar.Header>
      <ScrollView style={{ flex: 1 }}>
        <List.Section>
          <List.Subheader>Privacy Controls</List.Subheader>
          <List.Item
            title="Profile Visibility"
            description="Control who can see your profile"
            right={() => (
              <Switch value={profileVisible} onValueChange={handleToggleProfileVisible} />
            )}
          />
          <Divider />
          <List.Item
            title="Allow Messages"
            description="Allow others to send you messages"
            right={() => (
              <Switch value={allowMessages} onValueChange={handleToggleAllowMessages} />
            )}
          />
          <Divider />
          <List.Item
            title="Allow Pings"
            description="Allow others to send you pings"
            right={() => (
              <Switch value={allowPings} onValueChange={handleToggleAllowPings} />
            )}
          />
          <Divider />
          <List.Item
            title="Blocked Users"
            description="Manage users you have blocked"
            onPress={handleManageBlockedUsers}
            right={() => <Text>{blockedUsers.length}</Text>}
          />
        </List.Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({});