import { Tabs } from 'expo-router';
import { Search, Activity, Users, User, Bell, MessageCircle } from 'lucide-react-native';
import { useTheme, Badge } from 'react-native-paper';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { useChatStore } from '@/stores/useChatStore';
import { getPlatformStyles, isWeb } from '@/utils/platform';

export default function TabLayout() {
  const theme = useTheme();
  
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outline,
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
          ...getPlatformStyles({
            web: {
              marginHorizontal: 20,
              marginBottom: 10,
              borderRadius: 10,
              maxWidth: 800,
              marginLeft: 'auto',
              marginRight: 'auto',
            }
          }),
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ size, color }) => (
            <Search size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarIcon: ({ size, color }) => (
            <Activity size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Chats',
          tabBarIcon: ({ size, color }) => {
            const { unreadChatsCount } = useChatStore();
            return (
              <>
                <MessageCircle size={size} color={color} strokeWidth={2.5} />
                {unreadChatsCount > 0 && (
                  <Badge
                    style={{
                      position: 'absolute',
                      top: -5,
                      right: -10,
                      backgroundColor: theme.colors.error,
                      color: 'white',
                      fontSize: 10,
                      minWidth: 18,
                      height: 18,
                      borderRadius: 9,
                    }}
                  >
                    {unreadChatsCount > 99 ? '99+' : unreadChatsCount}
                  </Badge>
                )}
              </>
            );
          },
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Friends',
          tabBarIcon: ({ size, color }) => (
            <Users size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarIcon: ({ size, color }) => {
            const { unreadCount } = useNotificationStore();
            return (
              <>
                <Bell size={size} color={color} />
                {unreadCount > 0 && (
                  <Badge
                    style={{
                      position: 'absolute',
                      top: -5,
                      right: -10,
                      backgroundColor: theme.colors.error,
                      color: 'white',
                      fontSize: 10,
                    }}
                  >
                    {unreadCount}
                  </Badge>
                )}
              </>
            );
          },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ size, color }) => (
            <User size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
