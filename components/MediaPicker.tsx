import React, { useState } from 'react';
import { View, StyleSheet, Alert, Platform } from 'react-native';
import { IconButton, Menu, ActivityIndicator } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

interface MediaPickerProps {
  onMediaSelected: (media: { uri: string; type: string; name?: string; size?: number }) => void;
  disabled?: boolean;
}

export default function MediaPicker({ onMediaSelected, disabled = false }: MediaPickerProps) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Sorry, we need camera roll permissions to upload images.'
        );
        return false;
      }
    }
    return true;
  };

  const pickImage = async () => {
    setMenuVisible(false);
    
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    console.log('📸 Starting image picker...');
    try {
      setIsUploading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
        base64: false,
      });

      console.log('📸 Image picker result:', {
        canceled: result.canceled,
        assetsCount: result.assets?.length || 0
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        console.log('📸 Selected asset:', {
          uri: asset.uri,
          type: asset.type,
          fileName: asset.fileName,
          fileSize: asset.fileSize,
          width: asset.width,
          height: asset.height
        });
        
        const mediaData = {
          uri: asset.uri,
          type: asset.type || 'image',
          name: asset.fileName || `image_${Date.now()}.jpg`,
          size: asset.fileSize || 0,
        };
        
        console.log('📸 Calling onMediaSelected with:', mediaData);
        onMediaSelected(mediaData);
      } else {
        console.log('📸 Image selection canceled by user');
      }
    } catch (error) {
      console.error('💥 Error picking image:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const takePhoto = async () => {
    setMenuVisible(false);
    
    console.log('📷 Starting camera...');
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        console.log('📷 Camera permission denied');
        Alert.alert(
          'Permission Required',
          'Sorry, we need camera permissions to take photos.'
        );
        return;
      }
    }

    try {
      setIsUploading(true);
      console.log('📷 Launching camera...');
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false,
      });

      console.log('📷 Camera result:', {
        canceled: result.canceled,
        assetsCount: result.assets?.length || 0
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        console.log('📷 Captured photo:', {
          uri: asset.uri,
          type: asset.type,
          fileName: asset.fileName,
          fileSize: asset.fileSize,
          width: asset.width,
          height: asset.height
        });
        
        const mediaData = {
          uri: asset.uri,
          type: asset.type || 'image',
          name: asset.fileName || `photo_${Date.now()}.jpg`,
          size: asset.fileSize || 0,
        };
        
        console.log('📷 Calling onMediaSelected with:', mediaData);
        onMediaSelected(mediaData);
      } else {
        console.log('📷 Photo capture canceled by user');
      }
    } catch (error) {
      console.error('💥 Error taking photo:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const pickDocument = async () => {
    setMenuVisible(false);
    
    try {
      setIsUploading(true);
      // Using the updated API format for expo-document-picker
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        onMediaSelected({
          uri: asset.uri,
          type: 'file',
          name: asset.name,
          size: asset.size,
        });
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  if (isUploading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#3B82F6" />
      </View>
    );
  }

  return (
    <Menu
      visible={menuVisible}
      onDismiss={() => setMenuVisible(false)}
      anchor={
        <IconButton
          icon="attachment"
          size={24}
          iconColor="#6B7280"
          onPress={() => setMenuVisible(true)}
          disabled={disabled}
          style={styles.attachButton}
        />
      }
      contentStyle={styles.menuContent}
    >
      <Menu.Item
        onPress={pickImage}
        title="Photo Library"
        leadingIcon="image"
        titleStyle={styles.menuItemTitle}
      />
      <Menu.Item
        onPress={takePhoto}
        title="Take Photo"
        leadingIcon="camera"
        titleStyle={styles.menuItemTitle}
      />
      <Menu.Item
        onPress={pickDocument}
        title="Document"
        leadingIcon="file-document"
        titleStyle={styles.menuItemTitle}
      />
    </Menu>
  );
}

const styles = StyleSheet.create({
  attachButton: {
    margin: 0,
  },
  menuContent: {
    backgroundColor: 'white',
    borderRadius: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  menuItemTitle: {
    fontSize: 16,
    color: '#374151',
  },
  loadingContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});