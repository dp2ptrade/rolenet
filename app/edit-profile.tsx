import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Text, Avatar, Chip, Appbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUserStore } from '@/stores/useUserStore';
import { UserService } from '@/lib/supabaseService';
import { POPULAR_TAGS } from '@/lib/types';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';

export default function EditProfileScreen() {
  const { user, setCurrentUser } = useUserStore();
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [role, setRole] = useState(user?.role || '');
  const [tags, setTags] = useState<string[]>(user?.tags || []);
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates = { name, bio, role, tags, avatar };
      const { data, error } = await UserService.updateUserProfile(user!.id, updates);
      if (error) {
        Alert.alert('Error', 'Failed to update profile.');
        setIsSaving(false);
        return;
      }
      setCurrentUser(data);
      Alert.alert('Success', 'Profile updated successfully.');
      router.back();
    } catch (err) {
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangeAvatar = async () => {
    // Request permission to access media library
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets.length > 0) {
      const selectedImage = result.assets[0];
      const fileExt = selectedImage.uri.split('.').pop();
      const fileName = `${user!.id}-avatar.${fileExt}`;
      const filePath = `${user!.id}/${fileName}`;

      // Upload image to Supabase storage
      try {
        let uploadData: any;
        // Check if running on web or native
        if (selectedImage.uri.startsWith('data:') || !selectedImage.uri.startsWith('file://')) {
          // For web or non-file URIs, fetch and convert to Blob
          const response = await fetch(selectedImage.uri);
          const blob = await response.blob();
          uploadData = blob;
        } else {
          // For native file URIs, use FormData
          const formData = new FormData();
          formData.append('file', {
            uri: selectedImage.uri,
            name: fileName,
            type: `image/${fileExt}`,
          } as any);
          uploadData = formData;
        }

        const { data, error } = await supabase.storage
          .from('avatars')
          .upload(filePath, uploadData, { upsert: true });

        if (error) {
          throw new Error(`Upload error: ${error.message || 'Unknown error'}`);
        }

        // Get public URL for the uploaded image
        const { data: publicUrlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        const newAvatarUrl = publicUrlData.publicUrl + `?t=${Date.now()}`;
        setAvatar(newAvatarUrl);
        // Immediately update the avatar in the backend
        const { error: updateError } = await UserService.updateUserProfile(user!.id, { avatar: newAvatarUrl });
        if (updateError) {
          Alert.alert('Error', 'Failed to update avatar in profile. Please save changes manually.');
          console.error('Error updating avatar in profile:', updateError);
        } else {
          setCurrentUser({ ...user!, avatar: newAvatarUrl });
          Alert.alert('Success', 'Avatar updated successfully!');
        }
      } catch (error) {
        console.error('Error uploading avatar:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        Alert.alert('Error', `Failed to upload avatar: ${errorMessage}. Please try again.`);
      }
    }
  };

  const handleTagToggle = (tag: string) => {
    setTags((prev) => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Appbar.Header style={{ backgroundColor: '#F8FAFC', elevation: 0 }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Edit Profile" />
      </Appbar.Header>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatarSection}>
          <Avatar.Image size={80} source={{ uri: avatar || undefined }} />
          <Button
            mode="outlined"
            onPress={handleChangeAvatar}
            style={styles.changeAvatarButton}
          >
            Change Avatar
          </Button>
        </View>
        <TextInput
          label="Name"
          value={name}
          onChangeText={setName}
          style={styles.input}
        />
        <TextInput
          label="Bio"
          value={bio}
          onChangeText={setBio}
          style={styles.input}
          multiline
        />
        <TextInput
          label="Role"
          value={role}
          onChangeText={setRole}
          style={styles.input}
        />
        <Text style={styles.sectionTitle}>Tags</Text>
        <View style={styles.tagsContainer}>
          {POPULAR_TAGS.map((tag) => (
            <Chip
              key={tag}
              selected={tags.includes(tag)}
              onPress={() => handleTagToggle(tag)}
              style={styles.tag}
            >
              {tag}
            </Chip>
          ))}
        </View>
        <Button
          mode="contained"
          onPress={handleSave}
          loading={isSaving}
          style={styles.saveButton}
        >
          Save Changes
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 24 },
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  changeAvatarButton: { marginTop: 12 },
  input: { marginBottom: 16 },
  sectionTitle: { fontWeight: 'bold', marginBottom: 8, color: '#374151' },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  tag: { marginRight: 8, marginBottom: 8 },
  saveButton: { marginTop: 16 },
});
