import React, { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Dimensions, Platform } from 'react-native';
import { Search, Activity, Users, User, Bell, MessageCircle, Phone, FileText } from 'lucide-react-native';
import { useTheme, Badge } from 'react-native-paper';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { useChatStore } from '@/stores/useChatStore';
import { useCallStore } from '@/stores/useCallStore';
import { getPlatformStyles, isWeb } from '@/utils/platform';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [initialRoute, setInitialRoute] = useState<string>('discover');
  const [screenData, setScreenData] = useState(() => {
    const { width, height } = Dimensions.get('window');
    return { width, height };
  });

  // Responsive breakpoints
  const isTablet = screenData.width >= 768;
  const isDesktop = screenData.width >= 1024;
  const isLandscape = screenData.width > screenData.height;
  const isSmallScreen = screenData.width < 375;

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenData({ width: window.width, height: window.height });
    });

    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    const loadInitialTab = async () => {
      try {
        const savedTab = await AsyncStorage.getItem('lastActiveTab');
        if (savedTab) {
          setInitialRoute(savedTab);
        }
      } catch (error) {
        console.error('Failed to load initial tab:', error);
      }
    };
    loadInitialTab();
  }, []);

  // Dynamic sizing based on screen size
  const getTabBarHeight = () => {
    if (isWeb) {
      return isDesktop ? 70 : isTablet ? 65 : 60;
    }
    return isTablet ? 70 : 60;
  };

  const getIconSize = () => {
    if (isSmallScreen) return 22;
    if (isTablet) return 28;
    if (isDesktop) return 24;
    return Platform.OS === 'android' ? 26 : 24;
  };

  const getPaddingBottom = () => {
    if (isWeb) return 8;
    // Use full bottom inset plus a larger offset on Android to position tab bar higher above system navigation
    return Platform.OS === 'android' ? insets.bottom + 48 : Math.max(8, insets.bottom / 2);
  };

  return (
    <Tabs
      initialRouteName={initialRoute}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarShowLabel: isTablet || isDesktop || isLandscape,
        tabBarLabelStyle: {
          fontSize: isDesktop ? 12 : isTablet ? 11 : 9,
          fontWeight: '600',
          marginTop: 4,
        },
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopColor: 'transparent',
          borderTopWidth: 0,
          paddingBottom: getPaddingBottom(),
          paddingTop: isSmallScreen ? 4 : 6,
          paddingHorizontal: isTablet ? 16 : 6,
          height: getTabBarHeight() + (isSmallScreen ? 0 : 10),
          elevation: isWeb ? 0 : 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 5,
          borderTopLeftRadius: isWeb ? 0 : 10,
          borderTopRightRadius: isWeb ? 0 : 10,
          overflow: 'hidden',
          ...getPlatformStyles({
            web: {
              marginHorizontal: isDesktop ? 20 : isTablet ? 15 : 10,
              marginBottom: isDesktop ? 15 : 10,
              borderRadius: isDesktop ? 16 : 12,
              marginLeft: 'auto',
              marginRight: 'auto',
              maxWidth: isDesktop ? 800 : '100%',
              boxShadow: '0 -2px 20px rgba(0, 0, 0, 0.1)',
              border: `1px solid ${theme.colors.outline}`,
            },
            ios: {
              borderTopWidth: 0,
            },
            android: {
              elevation: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -6 },
              shadowOpacity: 0.25,
              shadowRadius: 15,
            }
          }),
        },
        tabBarItemStyle: {
          paddingVertical: 6,
          minHeight: 50, // Larger touch target for better UX
          justifyContent: 'center',
          alignItems: 'center',
          borderRadius: 12,
          marginHorizontal: isSmallScreen ? 2 : 4,
          position: 'relative',
        },
        tabBarActiveBackgroundColor: theme.colors.primaryContainer,
      }}
      screenListeners={{
        state: (e) => {
          const currentRoute = e.data.state.routes[e.data.state.index].name;
          AsyncStorage.setItem('lastActiveTab', currentRoute).catch(error => {
            console.error('Failed to save active tab:', error);
          });
        },
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color, focused }) => (
            <Search 
              size={getIconSize()} 
              color={color} 
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarIcon: ({ color, focused }) => (
            <Activity 
              size={getIconSize()} 
              color={color} 
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Chats',
          tabBarIcon: ({ color, focused }) => {
            const { unreadChatsCount } = useChatStore();
            const iconSize = getIconSize();
            const badgeSize = Math.max(16, iconSize * 0.7);
            
            return (
              <>
                <MessageCircle 
                  size={iconSize} 
                  color={color} 
                  strokeWidth={focused ? 2.5 : 2} 
                />
                {unreadChatsCount > 0 && (
                  <Badge
                    style={{
                      position: 'absolute',
                      top: -4,
                      right: isTablet ? -12 : -8,
                      backgroundColor: theme.colors.error,
                      color: 'white',
                      fontSize: isTablet ? 11 : 9,
                      minWidth: badgeSize,
                      height: badgeSize,
                      borderRadius: badgeSize / 2,
                      borderWidth: 2,
                      borderColor: theme.colors.surface,
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
        name="calls"
        options={{
          title: 'Calls',
          tabBarIcon: ({ color, focused }) => {
            const { isInCall, missedCallsCount } = useCallStore();
            const iconSize = getIconSize();
            const badgeSize = Math.max(16, iconSize * 0.7);
            
            return (
              <>
                <Phone 
                  size={iconSize} 
                  color={isInCall ? theme.colors.primary : color} 
                  strokeWidth={focused ? 2.5 : 2} 
                />
                {missedCallsCount > 0 && (
                  <Badge
                    style={{
                      position: 'absolute',
                      top: -4,
                      right: isTablet ? -12 : -8,
                      backgroundColor: theme.colors.error,
                      color: 'white',
                      fontSize: isTablet ? 11 : 9,
                      minWidth: badgeSize,
                      height: badgeSize,
                      borderRadius: badgeSize / 2,
                      borderWidth: 2,
                      borderColor: theme.colors.surface,
                    }}
                  >
                    {missedCallsCount > 99 ? '99+' : missedCallsCount}
                  </Badge>
                )}
              </>
            );
          },
        }}
      />
      <Tabs.Screen
        name="posts"
        options={{
          title: 'Posts',
          tabBarIcon: ({ color, focused }) => (
            <FileText 
              size={getIconSize()} 
              color={color} 
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Friends',
          tabBarIcon: ({ color, focused }) => (
            <Users 
              size={getIconSize()} 
              color={color} 
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarIcon: ({ color, focused }) => {
            const { unreadCount } = useNotificationStore();
            const iconSize = getIconSize();
            const badgeSize = Math.max(16, iconSize * 0.7);
            
            return (
              <>
                <Bell 
                  size={iconSize} 
                  color={color} 
                  strokeWidth={focused ? 2.5 : 2}
                />
                {unreadCount > 0 && (
                  <Badge
                    style={{
                      position: 'absolute',
                      top: -4,
                      right: isTablet ? -12 : -8,
                      backgroundColor: theme.colors.error,
                      color: 'white',
                      fontSize: isTablet ? 11 : 9,
                      minWidth: badgeSize,
                      height: badgeSize,
                      borderRadius: badgeSize / 2,
                      borderWidth: 2,
                      borderColor: theme.colors.surface,
                    }}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
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
          tabBarIcon: ({ color, focused }) => (
            <User 
              size={getIconSize()} 
              color={color} 
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
    </Tabs>
  );
}
