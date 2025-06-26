import React from 'react';
import { View, StyleSheet, ScrollView, Image, Pressable } from 'react-native';
import { Text, Divider, Surface, Avatar } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, usePathname } from 'expo-router';
import { 
  Search, 
  Activity, 
  MessageSquare, 
  Phone, 
  FileText, 
  Users, 
  Bell, 
  User, 
  Settings,
  LogOut
} from 'lucide-react-native';
import { ASSETS } from '@/constants/assets';
import { useUserStore } from '@/stores/useUserStore';
import AnimatedStatusDot from './AnimatedStatusDot';

interface AppSidebarProps {
  onClose?: () => void;
}

export default function AppSidebar({ onClose }: AppSidebarProps) {
  const pathname = usePathname();
  const { user, signOut } = useUserStore();
  
  const isActive = (path: string) => {
    return pathname === `/${path}` || pathname.startsWith(`/${path}/`);
  };
  
  const handleNavigation = (path: string) => {
    router.push(`/${path}`);
    if (onClose) onClose();
  };
  
  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/auth/signin');
      if (onClose) onClose();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <LinearGradient
        colors={['#3B82F6', '#06B6D4']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.logoContainer}>
          <Image 
            source={ASSETS.IMAGES.LOGO} 
            style={styles.logo} 
            resizeMode="contain" 
            tintColor="white"
          />
          <Text variant="headlineMedium" style={styles.appName}>
            RoleNet
          </Text>
        </View>
        <Text variant="bodyMedium" style={styles.tagline}>
          Every Role. One Network.
        </Text>
      </LinearGradient>
      
      {user && (
        <Surface style={styles.profileCard} elevation={1}>
          <View style={styles.profileInfo}>
            <View style={styles.avatarContainer}>
              <Avatar.Image 
                size={50} 
                source={user.avatar ? { uri: user.avatar } : ASSETS.IMAGES.LOGO} 
              />
              <View style={styles.statusDotContainer}>
                <AnimatedStatusDot 
                  status={user.online_status || 'online'} 
                  size={12} 
                />
              </View>
            </View>
            <View style={styles.userInfo}>
              <Text variant="titleMedium" style={styles.userName} numberOfLines={1}>
                {user.name}
              </Text>
              <Text variant="bodySmall" style={styles.userRole} numberOfLines={1}>
                {user.role}
              </Text>
            </View>
          </View>
        </Surface>
      )}
      
      <ScrollView style={styles.menuContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.menuGroup}>
          <NavItem 
            icon={Search} 
            label="Discover" 
            active={isActive('discover')} 
            onPress={() => handleNavigation('discover')}
          />
          <NavItem 
            icon={Activity} 
            label="Activity" 
            active={isActive('activity')} 
            onPress={() => handleNavigation('activity')}
          />
          <NavItem 
            icon={MessageSquare} 
            label="Chats" 
            active={isActive('chats')} 
            onPress={() => handleNavigation('chats')}
          />
          <NavItem 
            icon={Phone} 
            label="Calls" 
            active={isActive('calls')} 
            onPress={() => handleNavigation('calls')}
          />
          <NavItem 
            icon={FileText} 
            label="Posts" 
            active={isActive('posts')} 
            onPress={() => handleNavigation('posts')}
          />
          <NavItem 
            icon={Users} 
            label="Friends" 
            active={isActive('friends')} 
            onPress={() => handleNavigation('friends')}
          />
          <NavItem 
            icon={Bell} 
            label="Notifications" 
            active={isActive('notifications')} 
            onPress={() => handleNavigation('notifications')}
          />
        </View>
        
        <Divider style={styles.divider} />
        
        <View style={styles.menuGroup}>
          <NavItem 
            icon={User} 
            label="Profile" 
            active={isActive('profile')} 
            onPress={() => handleNavigation('profile')}
          />
          <NavItem 
            icon={Settings} 
            label="Settings" 
            active={isActive('settings')} 
            onPress={() => handleNavigation('settings')}
          />
        </View>
      </ScrollView>
      
      <View style={styles.footer}>
        <Pressable style={styles.signOutButton} onPress={handleSignOut}>
          <LogOut size={20} color="#EF4444" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

interface NavItemProps {
  icon: React.ComponentType<any>;
  label: string;
  active: boolean;
  onPress: () => void;
  badge?: number;
}

function NavItem({ icon: Icon, label, active, onPress, badge }: NavItemProps) {
  return (
    <Pressable
      style={[styles.navItem, active && styles.activeNavItem]}
      onPress={onPress}
      android_ripple={{ color: 'rgba(59, 130, 246, 0.1)' }}
    >
      <View style={styles.navItemContent}>
        <Icon 
          size={22} 
          color={active ? '#3B82F6' : '#6B7280'} 
          strokeWidth={active ? 2.5 : 2}
        />
        <Text 
          style={[
            styles.navItemLabel, 
            active && styles.activeNavItemLabel
          ]}
        >
          {label}
        </Text>
      </View>
      
      {active && <View style={styles.activeIndicator} />}
      
      {badge !== undefined && badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {badge > 99 ? '99+' : badge}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: 16,
    paddingTop: 20,
    paddingBottom: 24,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  logo: {
    width: 40,
    height: 40,
    marginRight: 12,
  },
  appName: {
    color: 'white',
    fontWeight: 'bold',
  },
  tagline: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontStyle: 'italic',
  },
  profileCard: {
    margin: 16,
    marginTop: -20,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'white',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  statusDotContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 2,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontWeight: 'bold',
    color: '#1F2937',
  },
  userRole: {
    color: '#6B7280',
  },
  menuContainer: {
    flex: 1,
    paddingHorizontal: 8,
  },
  menuGroup: {
    marginBottom: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginVertical: 2,
  },
  activeNavItem: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  navItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navItemLabel: {
    marginLeft: 12,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  activeNavItemLabel: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  activeIndicator: {
    width: 4,
    height: 24,
    backgroundColor: '#3B82F6',
    borderRadius: 2,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: 12,
    marginHorizontal: 16,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  signOutText: {
    marginLeft: 8,
    color: '#EF4444',
    fontWeight: '600',
  },
});