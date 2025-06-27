import React, { useState } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { Drawer } from 'react-native-drawer-layout';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, IconButton, List, Divider, Surface, Icon } from 'react-native-paper';
import { FileText, CirclePlus as PlusCircle, Bookmark, User, Settings, ChevronLeft, Menu, ChevronRight } from 'lucide-react-native';
import { router, usePathname } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const isLargeScreen = width >= 768;

export default function PostsLayout() {
  const [open, setOpen] = useState(isLargeScreen);
  const [isMini, setIsMini] = useState(false);
  const pathname = usePathname();
  
  const isActive = (path: string) => {
    return pathname.includes(path);
  };
  
  const renderDrawerContent = () => (
    <SafeAreaView style={[styles.drawerContent, isMini && styles.miniDrawerContent]} edges={['top', 'bottom']}>
      <LinearGradient
        colors={['#3B82F6', '#06B6D4']}
        style={[styles.drawerHeader, isMini && styles.miniDrawerHeader]}
      >
        <Text variant="headlineMedium" style={[styles.drawerTitle, isMini && { display: 'none' }]}>
          Service Posts
        </Text>
        <Text variant="bodyMedium" style={[styles.drawerSubtitle, isMini && { display: 'none' }]}>
          Find and offer professional services
        </Text>
        <IconButton
          icon={({ size, color }) => isMini ? <ChevronRight size={size} color={color} /> : <ChevronLeft size={size} color={color} />}
          onPress={() => setIsMini(!isMini)}
          style={styles.toggleButton}
          iconColor="#FFFFFF"
        />
      </LinearGradient>
      
      <View style={[styles.drawerBody, isMini && styles.miniDrawerBody]}>
        <List.Section>
          <List.Item
            title={isMini ? "" : "Browse Posts"}
            left={props => Platform.OS === 'web' ? <Icon source="file-text" size={28} color={isActive('index') ? '#1E88E5' : '#424242'} /> : <FileText {...props} size={28} color={isActive('index') ? '#1E88E5' : '#424242'} />}
            onPress={() => {
              router.push('/posts');
              if (!isLargeScreen) setOpen(false);
            }}
            style={[styles.menuItem, isMini && styles.miniMenuItem, isActive('index') && styles.activeMenuItem]}
            titleStyle={[styles.menuItemTitle, isMini && { display: 'none' }, isActive('index') && styles.activeMenuItemTitle]}
          />
          
          <List.Item
            title={isMini ? "" : "Create Post"}
            left={props => Platform.OS === 'web' ? <Icon source="plus-circle" size={28} color={isActive('create') ? '#1E88E5' : '#424242'} /> : <PlusCircle {...props} size={28} color={isActive('create') ? '#1E88E5' : '#424242'} />}
            onPress={() => {
              router.push('/posts/create');
              if (!isLargeScreen) setOpen(false);
            }}
            style={[styles.menuItem, isMini && styles.miniMenuItem, isActive('create') && styles.activeMenuItem]}
            titleStyle={[styles.menuItemTitle, isMini && { display: 'none' }, isActive('create') && styles.activeMenuItemTitle]}
          />
          
          <List.Item
            title={isMini ? "" : "My Posts"}
            left={props => Platform.OS === 'web' ? <Icon source="account" size={28} color={isActive('my-posts') ? '#1E88E5' : '#424242'} /> : <User {...props} size={28} color={isActive('my-posts') ? '#1E88E5' : '#424242'} />}
            onPress={() => {
              router.push('/posts/my-posts');
              if (!isLargeScreen) setOpen(false);
            }}
            style={[styles.menuItem, isMini && styles.miniMenuItem, isActive('my-posts') && styles.activeMenuItem]}
            titleStyle={[styles.menuItemTitle, isMini && { display: 'none' }, isActive('my-posts') && styles.activeMenuItemTitle]}
          />
          
          <List.Item
            title={isMini ? "" : "Bookmarked Posts"}
            left={props => Platform.OS === 'web' ? <Icon source="bookmark" size={28} color={isActive('bookmarks') ? '#1E88E5' : '#424242'} /> : <Bookmark {...props} size={28} color={isActive('bookmarks') ? '#1E88E5' : '#424242'} />}
            onPress={() => {
              router.push('/posts/bookmarks');
              if (!isLargeScreen) setOpen(false);
            }}
            style={[styles.menuItem, isMini && styles.miniMenuItem, isActive('bookmarks') && styles.activeMenuItem]}
            titleStyle={[styles.menuItemTitle, isMini && { display: 'none' }, isActive('bookmarks') && styles.activeMenuItemTitle]}
          />
        </List.Section>
        
        <Divider style={styles.divider} />
        
        <List.Section>
          <List.Item
            title={isMini ? "" : "Settings"}
            left={props => Platform.OS === 'web' ? <Icon source="cog" size={28} color="#424242" /> : <Settings {...props} size={28} color="#424242" />}
            onPress={() => {
              router.push('/settings');
              if (!isLargeScreen) setOpen(false);
            }}
            style={[styles.menuItem, isMini && styles.miniMenuItem]}
            titleStyle={[styles.menuItemTitle, isMini && { display: 'none' }]}
          />
        </List.Section>
      </View>
    </SafeAreaView>
  );
  
  return (
    <Drawer
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      renderDrawerContent={renderDrawerContent}
      drawerType={isLargeScreen ? 'permanent' : 'front'}
      drawerStyle={[
        styles.drawer,
        isLargeScreen && styles.permanentDrawer,
        isMini && styles.miniDrawer
      ]}
    >
      <Stack
        screenOptions={{
          headerShown: false,
          headerStyle: { backgroundColor: '#F8FAFC' },
          headerShadowVisible: false,
          headerLeft: () => (
            isLargeScreen ? null : (
              <IconButton
                icon={({ size, color }) => <Menu size={size} color={color} />}
                onPress={() => setOpen(true)}
              />
            )
          ),
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerShown: true,
            title: "Service Posts",
            headerTitle: "Service Posts",
          }}
        />
        <Stack.Screen
          name="create"
          options={{
            title: "Create Post",
            headerTitle: "Create Service Post",
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="my-posts"
          options={{
            title: "My Posts",
            headerTitle: "My Service Posts",
          }}
        />
        <Stack.Screen
          name="bookmarks"
          options={{
            title: "Bookmarked Posts",
            headerTitle: "Bookmarked Posts",
          }}
        />
        <Stack.Screen
          name="edit"
          options={{
            title: "Edit Post",
            headerTitle: "Edit Service Post",
            presentation: 'modal',
          }}
        />

      </Stack>
    </Drawer>
  );
}

const styles = StyleSheet.create({
  drawer: {
    width: 280,
    backgroundColor: '#FFFFFF',
  },
  permanentDrawer: {
    width: 280,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  miniDrawer: {
    width: 60,
    backgroundColor: '#F8F9FA',
  },
  drawerContent: {
    flex: 1,
  },
  miniDrawerContent: {
    flex: 1,
  },
  drawerHeader: {
    padding: 5,
    paddingTop: 5,
    paddingBottom: 5,
    position: 'relative',
  },
  miniDrawerHeader: {
    padding: 15,
    paddingTop: 25,
    paddingBottom: 15,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 60,
  },
  drawerTitle: {
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  drawerSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  drawerBody: {
    flex: 1,
    paddingTop: 8,
  },
  miniDrawerBody: {
    flex: 1,
    paddingTop: 8,
    alignItems: 'center',
  },
  menuItem: {
    borderRadius: 8,
    marginHorizontal: 8,
    marginVertical: 2,
  },
  miniMenuItem: {
    marginHorizontal: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: 50,
    height: 50,
  },
  activeMenuItem: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  menuItemTitle: {
    fontSize: 16,
    color: '#4B5563',
  },
  activeMenuItemTitle: {
    color: '#3B82F6',
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: 16,
    marginHorizontal: 16,
  },
  toggleButton: {
    position: 'absolute',
    right: 5,
    top: 5,
  },
});
