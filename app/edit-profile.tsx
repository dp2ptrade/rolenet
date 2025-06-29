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
  const [location, setLocation] = useState(user?.location?.address || '');
  const [tags, setTags] = useState<string[]>(user?.tags || []);
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates = { name, bio, role, location: { address: location, latitude: 0, longitude: 0 }, tags, avatar };
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
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

      if (!result.canceled && result.assets.length > 0) {
      const selectedImage = result.assets[0];
      const fileExt = selectedImage.uri.split('.').pop() || 'jpg'; // Default to jpg if no extension
      const fileName = `${user!.id}-avatar.${fileExt}`;
      const filePath = `${user!.id}/${fileName}`;

        // Upload image to Supabase storage
        try {
          let uploadData: any;
          // Check if running on web or native
          if (selectedImage.uri.startsWith('data:')) {
            // For data URIs (base64), convert directly to Blob without fetching
            try {
              const base64Data = selectedImage.uri.split(',')[1];
              console.log('Base64 data length:', base64Data.length);
              const byteCharacters = atob(base64Data);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              const blob = new Blob([byteArray], { type: `image/${fileExt}` });
              console.log('Blob size:', blob.size);
              uploadData = blob;
            } catch (error) {
              console.error('Base64 to Blob conversion error:', error);
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              throw new Error(`Failed to convert base64 data to Blob: ${errorMessage}`);
            }
          } else if (!selectedImage.uri.startsWith('file://')) {
            // For other non-file URIs, attempt to fetch and convert to Blob
            try {
              const response = await fetch(selectedImage.uri);
              if (!response.ok) {
                throw new Error(`Fetch failed with status ${response.status}: ${response.statusText}`);
              }
              const blob = await response.blob();
              console.log('Fetched Blob size:', blob.size);
              uploadData = blob;
            } catch (fetchError) {
              console.error('Fetch error:', fetchError);
              const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown fetch error';
              throw new Error(`Failed to fetch image data: ${errorMessage}`);
            }
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

          console.log('Starting upload to Supabase storage...');
          let uploadAttempts = 0;
          let data, error;
          const maxRetries = 3;
          
          while (uploadAttempts < maxRetries) {
            uploadAttempts++;
            console.log(`Upload attempt ${uploadAttempts} of ${maxRetries}...`);
            const result = await supabase.storage
              .from('avatars')
              .upload(filePath, uploadData, { upsert: true, contentType: `image/${fileExt}` });
            
            data = result.data;
            error = result.error;
            
            if (!error) {
              console.log('Upload successful on attempt', uploadAttempts, 'Data:', data);
              break;
            } else {
              console.log('Upload failed on attempt', uploadAttempts, 'Error:', error);
              if (uploadAttempts < maxRetries) {
                console.log('Retrying upload...');
                // Wait for a short delay before retrying
                await new Promise(resolve => setTimeout(resolve, 2000 * uploadAttempts));
              }
            }
          }
          console.log('Upload process completed. Data:', data, 'Error:', error);

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
          console.error('Error updating avatar in profile:', updateError.message || updateError);
        } else {
          setCurrentUser({ ...user!, avatar: newAvatarUrl });
          Alert.alert('Success', 'Avatar updated successfully!');
        }
      } catch (error) {
        console.error('Error uploading avatar:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        Alert.alert('Error', `Failed to upload avatar: ${errorMessage}. Please try again. Detailed error logged to console.`);
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
        <TextInput
          label="Location"
          value={location}
          onChangeText={setLocation}
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
