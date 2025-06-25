import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Alert, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { UserService } from '@/lib/supabaseService';
import UserCard from '@/components/UserCard';
import { useRouter } from 'expo-router';
import { Appbar, Snackbar } from 'react-native-paper';
import { useFriendStore } from '@/stores/useFriendStore';
import { useUserStore } from '@/stores/useUserStore';
import { useStatusStore } from '@/stores/useStatusStore';

export default function PublicProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const { user: currentUser } = useUserStore();
  const { sendFriendRequest, unfriend } = useFriendStore();
  const { subscribeToUserStatuses, unsubscribeFromUserStatuses } = useStatusStore();

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  useEffect(() => {
    if (!userId) return;
    
    // Subscribe to status updates for this user immediately
    subscribeToUserStatuses([userId]);
    
    UserService.getUserProfile(userId as string)
      .then(({ data, error }) => {
        if (error) {
          showSnackbar('Failed to load user profile.');
        } else {
          setUser(data);
        }
      })
      .finally(() => setLoading(false));
      
    return () => {
      unsubscribeFromUserStatuses();
    };
  }, [userId]);

  const handleSendFriendRequest = async (userId: string) => {
    if (!currentUser?.id) {
      showSnackbar('You must be logged in to send a friend request.');
      return;
    }
    try {
      await sendFriendRequest(currentUser.id, userId);
      showSnackbar('Friend request sent successfully!');
    } catch (error) {
      showSnackbar('Failed to send friend request. Please try again.');
      console.error('Error sending friend request:', error);
    }
  };

  const handleUnfriend = async (friendId: string) => {
    if (!currentUser?.id) {
      showSnackbar('You must be logged in to unfriend someone.');
      return;
    }
    try {
      await unfriend(currentUser.id, friendId);
      showSnackbar('User has been unfriended.');
    } catch (error) {
      showSnackbar('Failed to unfriend user. Please try again.');
      console.error('Error unfriending user:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.centered}>
        <UserCard 
          user={{
            id: '',
            name: 'User not found',
            email: '',
            role: '',
            tags: [],
            location: { latitude: 0, longitude: 0, address: '' },
            avatar: '',
            bio: '',
            online_status: 'offline',
            is_available: false,
            rating: 0,
            rating_count: 0,
            created_at: new Date(),
            last_seen: new Date(),
            profile_visible: false,
            allow_messages: false,
            allow_pings: false,
            blocked_users: [],
          }}
          onPing={() => {}}
          onViewProfile={() => {}} 
          onSendFriendRequest={handleSendFriendRequest}
          onUnfriend={handleUnfriend}
        />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <Appbar.Header style={{ backgroundColor: '#F8FAFC', elevation: 0 }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Public Profile" />
      </Appbar.Header>
      <UserCard 
        user={user} 
        onPing={() => {}} 
        onViewProfile={() => {}} 
        onSendFriendRequest={handleSendFriendRequest} 
        onUnfriend={handleUnfriend}
      />
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={styles.snackbar}
      >
        <Text style={{ color: 'white' }}>{snackbarMessage}</Text>
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  snackbar: {
    backgroundColor: '#323232',
    marginBottom: 20,
  },
});
