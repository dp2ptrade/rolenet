import React, { useState } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { Drawer } from 'react-native-drawer-layout';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, IconButton, List, Divider, Surface } from 'react-native-paper';
import { FileText, CirclePlus as PlusCircle, Bookmark, User, Settings, ChevronLeft, Menu } from 'lucide-react-native';
import { router, usePathname } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const isLargeScreen = width >= 768;

export default function PostsLayout() {
  const [open, setOpen] = useState(isLargeScreen);
  const pathname = usePathname();
  
  const isActive = (path: string) => {
    return pathname.includes(path);
  };
  
  const renderDrawerContent = () => (
    <SafeAreaView style={styles.drawerContent} edges={['top', 'bottom']}>
      <LinearGradient
        colors={['#3B82F6', '#06B6D4']}
        style={styles.drawerHeader}
      >
        <Text variant="headlineMedium" style={styles.drawerTitle}>
          Service Posts
        </Text>
        <Text variant="bodyMedium" style={styles.drawerSubtitle}>
          Find and offer professional services
        </Text>
      </LinearGradient>
      
      <View style={styles.drawerBody}>
        <List.Section>
          <List.Item
            title="Browse Posts"
            left={props => <FileText {...props} size={22} color={isActive('index') ? '#3B82F6' : '#6B7280'} />}
            onPress={() => {
              router.push('/posts');
              if (!isLargeScreen) setOpen(false);
            }}
            style={[styles.menuItem, isActive('index') && styles.activeMenuItem]}
            titleStyle={[styles.menuItemTitle, isActive('index') && styles.activeMenuItemTitle]}
          />
          
          <List.Item
            title="Create Post"
            left={props => <PlusCircle {...props} size={22} color={isActive('create') ? '#3B82F6' : '#6B7280'} />}
            onPress={() => {
              router.push('/posts/create');
              if (!isLargeScreen) setOpen(false);
            }}
            style={[styles.menuItem, isActive('create') && styles.activeMenuItem]}
            titleStyle={[styles.menuItemTitle, isActive('create') && styles.activeMenuItemTitle]}
          />
          
          <List.Item
            title="My Posts"
            left={props => <User {...props} size={22} color={isActive('my-posts') ? '#3B82F6' : '#6B7280'} />}
            onPress={() => {
              router.push('/posts/my-posts');
              if (!isLargeScreen) setOpen(false);
            }}
            style={[styles.menuItem, isActive('my-posts') && styles.activeMenuItem]}
            titleStyle={[styles.menuItemTitle, isActive('my-posts') && styles.activeMenuItemTitle]}
          />
          
          <List.Item
            title="Bookmarked Posts"
            left={props => <Bookmark {...props} size={22} color={isActive('bookmarks') ? '#3B82F6' : '#6B7280'} />}
            onPress={() => {
              router.push('/posts/bookmarks');
              if (!isLargeScreen) setOpen(false);
            }}
            style={[styles.menuItem, isActive('bookmarks') && styles.activeMenuItem]}
            titleStyle={[styles.menuItemTitle, isActive('bookmarks') && styles.activeMenuItemTitle]}
          />
        </List.Section>
        
        <Divider style={styles.divider} />
        
        <List.Section>
          <List.Item
            title="Settings"
            left={props => <Settings {...props} size={22} color="#6B7280" />}
            onPress={() => {
              router.push('/settings');
              if (!isLargeScreen) setOpen(false);
            }}
            style={styles.menuItem}
            titleStyle={styles.menuItemTitle}
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
        isLargeScreen && styles.permanentDrawer
      ]}
    >
      <Stack
        screenOptions={{
<<<<<<< HEAD
          headerShown: false,
=======
          headerShown: true,
>>>>>>> 05f919e6fe06698506e65aeedb7b1bc62c11c1a7
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
<<<<<<< HEAD
            headerShown: true,
=======
>>>>>>> 05f919e6fe06698506e65aeedb7b1bc62c11c1a7
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
<<<<<<< HEAD

=======
        <Stack.Screen
          name="[id]/index"
          options={{
            title: "Post Details",
            headerTitle: "Service Details",
            headerBackTitle: "Back",
          }}
        />
        <Stack.Screen
          name="[id]/book"
          options={{
            title: "Book Service",
            headerTitle: "Book Service",
            headerBackTitle: "Back",
          }}
        />
>>>>>>> 05f919e6fe06698506e65aeedb7b1bc62c11c1a7
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
  drawerContent: {
    flex: 1,
  },
  drawerHeader: {
    padding: 16,
    paddingTop: 20,
    paddingBottom: 24,
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
  menuItem: {
    borderRadius: 8,
    marginHorizontal: 8,
    marginVertical: 2,
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
<<<<<<< HEAD
});
=======
});
>>>>>>> 05f919e6fe06698506e65aeedb7b1bc62c11c1a7
