import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Avatar, Button, Text, Chip } from 'react-native-paper';
import { Star, MapPin, UserPlus, UserMinus } from 'lucide-react-native';
import { User } from '@/lib/types';
import { useFriendStore } from '@/stores/useFriendStore';
import { useUserStore } from '@/stores/useUserStore';

interface UserCardProps {
  user: User;
  onPing: (userId: string) => void;
  onViewProfile: (userId: string) => void;
  onSendFriendRequest?: (userId: string) => void;
  onUnfriend?: (userId: string) => void;
}

export default function UserCard({ user, onPing, onViewProfile, onSendFriendRequest, onUnfriend }: UserCardProps) {
  const { user: currentUser } = useUserStore();
  const { friends } = useFriendStore();
  const isCurrentUser = currentUser?.id === user.id;
  const isFriend = friends.some(friend => friend.id === user.id);

  const getRoleEmoji = (role: string) => {
    const roleEmojis: { [key: string]: string } = {
      'Teacher': '👩‍🏫',
      'Doctor': '👨‍⚕️',
      'Developer': '👨‍💻',
      'Designer': '👨‍🎨',
      'Chef': '👨‍🍳',
      'Engineer': '👨‍🔧',
      'Artist': '👨‍🎨',
      'Writer': '✍️',
    };
    return roleEmojis[role] || '👤';
  };

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <Avatar.Image 
              size={60} 
              source={{ uri: user.avatar }} 
            />
            <View style={styles.statusIndicator}>
              <View style={[
                styles.statusDot,
                { backgroundColor: user.online_status === 'online' ? '#10B981' : '#EF4444' }
              ]} />
            </View>
          </View>
          
          <View style={styles.details}>
            <View style={styles.nameRow}>
              <Text variant="titleMedium" style={styles.name}>
                {user.name}
              </Text>
              <Text style={styles.roleEmoji}>
                {getRoleEmoji(user.role)}
              </Text>
            </View>
            
            <Text variant="bodyMedium" style={styles.role}>
              {user.role}
            </Text>
            
            <View style={styles.ratingRow}>
              <Star size={16} color="#F59E0B" fill="#F59E0B" />
              <Text variant="bodySmall" style={styles.rating}>
                {user.rating} ({user.rating_count} reviews)
              </Text>
            </View>
            
            <View style={styles.locationRow}>
              <MapPin size={14} color="#6B7280" />
              <Text variant="bodySmall" style={styles.location}>
                {user.location.address}
              </Text>
            </View>
          </View>
        </View>

        {user.bio && (
          <Text variant="bodySmall" style={styles.bio}>
            {user.bio}
          </Text>
        )}

        <View style={styles.tagsContainer}>
          {user.tags.slice(0, 3).map((tag, index) => (
            <Chip key={index} compact style={styles.tag}>
              {tag}
            </Chip>
          ))}
        </View>

        <View style={styles.actions}>
          <Button
            mode="contained"
            onPress={() => onPing(user.id)}
            style={styles.pingButton}
            contentStyle={styles.buttonContent}
          >
            Ping
          </Button>
          {!isCurrentUser && onSendFriendRequest && !isFriend && (
            <Button
              mode="contained-tonal"
              onPress={() => onSendFriendRequest(user.id)}
              style={styles.friendRequestButton}
              contentStyle={styles.buttonContent}
              icon={({ size, color }) => <UserPlus size={size} color={color} />}
            >
              Friend Request
            </Button>
          )}
          {!isCurrentUser && onUnfriend && isFriend && (
            <Button
              mode="contained-tonal"
              onPress={() => onUnfriend(user.id)}
              style={styles.friendRequestButton}
              contentStyle={styles.buttonContent}
              icon={({ size, color }) => <UserMinus size={size} color={color} />}
            >
              Unfriend
            </Button>
          )}
          <Button
            mode="outlined"
            onPress={() => onViewProfile(user.id)}
            style={styles.profileButton}
            contentStyle={styles.buttonContent}
          >
            Profile
          </Button>
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    backgroundColor: 'white',
    elevation: 2,
    boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1)',
  },
  header: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  userInfo: {
    position: 'relative',
    marginRight: 16,
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'white',
  },
  details: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontWeight: 'bold',
    flex: 1,
  },
  roleEmoji: {
    fontSize: 20,
    marginLeft: 8,
  },
  role: {
    color: '#6B7280',
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  rating: {
    marginLeft: 4,
    color: '#6B7280',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  location: {
    marginLeft: 4,
    color: '#6B7280',
  },
  bio: {
    color: '#374151',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  tag: {
    backgroundColor: '#EFF6FF',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  pingButton: {
    flex: 1,
    minWidth: 100,
  },
  friendRequestButton: {
    flex: 1,
    minWidth: 100,
  },
  profileButton: {
    flex: 1,
    minWidth: 100,
  },
  buttonContent: {
    paddingVertical: 4,
  },
});
