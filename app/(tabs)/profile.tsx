import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Card, Text, Avatar, Button, Switch, List, Divider, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CreditCard as Edit3, Settings, Star, MapPin, Phone, Mail, Tag, LogOut } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useUserStore } from '@/stores/useUserStore';

export default function ProfileScreen() {
  const currentUser = useUserStore((state) => state.currentUser);
  const [isAvailable, setIsAvailable] = useState(currentUser?.isAvailable || false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Mock user data if no current user
  const user = currentUser || {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'Software Engineer',
    tags: ['Technology', 'Programming', 'Innovation'],
    location: { latitude: 37.7749, longitude: -122.4194, address: 'San Francisco, CA' },
    avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400',
    bio: 'Passionate software engineer with 5+ years of experience building scalable applications.',
    onlineStatus: 'online' as const,
    isAvailable: true,
    rating: 4.8,
    ratingCount: 32,
    createdAt: new Date(),
    lastSeen: new Date(),
  };

  const handleEditProfile = () => {
    console.log('Edit profile');
    // TODO: Navigate to edit profile screen
  };

  const handleViewProfile = () => {
    console.log('View public profile');
    // TODO: Navigate to public profile view
  };

  const handleSettings = () => {
    console.log('Open settings');
    // TODO: Navigate to settings screen
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: () => console.log('Sign out') },
      ]
    );
  };

  const handleAvailabilityToggle = (value: boolean) => {
    setIsAvailable(value);
    // TODO: Update user availability in store/API
  };

  const getRoleEmoji = (role: string) => {
    const roleEmojis: { [key: string]: string } = {
      'Software Engineer': '👨‍💻',
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
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#3B82F6', '#06B6D4']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              <Avatar.Image 
                size={80} 
                source={{ uri: user.avatar }} 
              />
              <View style={[
                styles.statusDot,
                { backgroundColor: user.onlineStatus === 'online' ? '#10B981' : '#EF4444' }
              ]} />
            </View>
            
            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text variant="headlineSmall" style={styles.name}>
                  {user.name}
                </Text>
                <Text style={styles.roleEmoji}>
                  {getRoleEmoji(user.role)}
                </Text>
              </View>
              <Text variant="titleMedium" style={styles.role}>
                {user.role}
              </Text>
              <View style={styles.ratingRow}>
                <Star size={16} color="#FFD700" fill="#FFD700" />
                <Text variant="bodyMedium" style={styles.rating}>
                  {user.rating} ({user.ratingCount} reviews)
                </Text>
              </View>
            </View>
          </View>
          
          <View style={styles.headerButtons}>
            <Button
              mode="contained-tonal"
              onPress={handleEditProfile}
              icon={({ size, color }) => <Edit3 size={size} color={color} />}
              style={styles.editButton}
              buttonColor="rgba(255, 255, 255, 0.2)"
              textColor="white"
            >
              Edit
            </Button>
            <Button
              mode="outlined"
              onPress={handleViewProfile}
              style={styles.viewButton}
              textColor="white"
            >
              View Public
            </Button>
          </View>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Bio Section */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              About
            </Text>
            <Text variant="bodyMedium" style={styles.bio}>
              {user.bio}
            </Text>
          </Card.Content>
        </Card>

        {/* Contact Info */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Contact Information
            </Text>
            
            <View style={styles.contactRow}>
              <Mail size={20} color="#6B7280" />
              <Text variant="bodyMedium" style={styles.contactText}>
                {user.email}
              </Text>
            </View>
            
            <View style={styles.contactRow}>
              <MapPin size={20} color="#6B7280" />
              <Text variant="bodyMedium" style={styles.contactText}>
                {user.location.address}
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Tags */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Professional Tags
            </Text>
            <View style={styles.tagsContainer}>
              {user.tags.map((tag, index) => (
                <Surface key={index} style={styles.tag} elevation={1}>
                  <Tag size={14} color="#3B82F6" />
                  <Text variant="bodySmall" style={styles.tagText}>
                    {tag}
                  </Text>
                </Surface>
              ))}
            </View>
          </Card.Content>
        </Card>

        {/* Settings */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Settings
            </Text>
            
            <List.Item
              title="Available for connections"
              description="Allow others to send you pings"
              left={() => <List.Icon icon="account-check" />}
              right={() => (
                <Switch
                  value={isAvailable}
                  onValueChange={handleAvailabilityToggle}
                />
              )}
            />
            
            <Divider />
            
            <List.Item
              title="Push notifications"
              description="Receive notifications for pings and messages"
              left={() => <List.Icon icon="bell" />}
              right={() => (
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                />
              )}
            />
            
            <Divider />
            
            <List.Item
              title="Privacy & Security"
              description="Manage your privacy settings"
              left={() => <List.Icon icon="shield-check" />}
              right={() => <List.Icon icon="chevron-right" />}
              onPress={handleSettings}
            />
            
            <Divider />
            
            <List.Item
              title="Help & Support"
              description="Get help or contact support"
              left={() => <List.Icon icon="help-circle" />}
              right={() => <List.Icon icon="chevron-right" />}
              onPress={() => console.log('Help & Support')}
            />
          </Card.Content>
        </Card>

        {/* Sign Out */}
        <Card style={styles.card}>
          <Card.Content>
            <Button
              mode="contained"
              onPress={handleSignOut}
              icon={({ size, color }) => <LogOut size={size} color={color} />}
              style={styles.signOutButton}
              buttonColor="#EF4444"
            >
              Sign Out
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  headerContent: {
    gap: 20,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  statusDot: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: 'white',
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    color: 'white',
    fontWeight: 'bold',
    flex: 1,
  },
  roleEmoji: {
    fontSize: 24,
    marginLeft: 8,
  },
  role: {
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    color: 'rgba(255, 255, 255, 0.9)',
    marginLeft: 4,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    flex: 1,
  },
  viewButton: {
    flex: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 100,
  },
  card: {
    marginBottom: 16,
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#374151',
  },
  bio: {
    color: '#6B7280',
    lineHeight: 22,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactText: {
    marginLeft: 12,
    color: '#374151',
    flex: 1,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  tagText: {
    color: '#1E40AF',
    fontWeight: '500',
  },
  signOutButton: {
    marginTop: 8,
  },
});