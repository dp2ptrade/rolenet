import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { Text, TextInput, Button, Chip, Switch, HelperText, Divider, Surface, SegmentedButtons } from 'react-native-paper';
import { Post, PostCategory, User } from '@/lib/types';
import { usePostStore } from '@/stores/usePostStore';
import { useUserStore } from '@/stores/useUserStore';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { chatService } from '@/lib/supabaseService';
import { Image } from 'react-native';
import { Calendar, Clock, MapPin, Tag, Briefcase, DollarSign, Upload, X } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

interface CreatePostFormProps {
  onSuccess?: (post: Post) => void;
  onCancel?: () => void;
  initialValues?: Partial<Post>;
  isEditing?: boolean;
}

const CreatePostForm: React.FC<CreatePostFormProps> = ({ 
  onSuccess, 
  onCancel,
  initialValues,
  isEditing = false
}) => {
  const { user } = useUserStore();
  const { createPost, updatePost, categories, loadCategories } = usePostStore();
  
  const [title, setTitle] = useState(initialValues?.title || '');
  const [category, setCategory] = useState(initialValues?.category || '');
  const [description, setDescription] = useState(initialValues?.description || '');
  const [tags, setTags] = useState<string[]>(initialValues?.tags || []);
  const [newTag, setNewTag] = useState('');
  const [priceType, setPriceType] = useState<'fixed' | 'hourly' | 'free' | 'contact'>(
    initialValues?.price_type || 'fixed'
  );
  const [price, setPrice] = useState(initialValues?.price?.toString() || '');
  const [currency, setCurrency] = useState(initialValues?.currency || 'USD');
  const [isRemote, setIsRemote] = useState(initialValues?.is_remote || false);
  const [location, setLocation] = useState(initialValues?.location?.address || '');
  const [experienceLevel, setExperienceLevel] = useState<'junior' | 'mid' | 'senior'>(
    initialValues?.experience_level || 'mid'
  );
  const [serviceType, setServiceType] = useState<'one-time' | 'long-term' | 'consulting' | 'coaching'>(
    initialValues?.service_type || 'one-time'
  );
  const [availabilityStatus, setAvailabilityStatus] = useState<'available' | 'limited' | 'unavailable'>(
    initialValues?.availability_status || 'available'
  );
  const [availabilityDate, setAvailabilityDate] = useState<Date | null>(
    initialValues?.availability_date ? new Date(initialValues.availability_date) : null
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [mediaUrls, setMediaUrls] = useState<string[]>(initialValues?.media_urls || []);
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Load categories on mount
  useEffect(() => {
    loadCategories();
  }, []);
  
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!category.trim()) {
      newErrors.category = 'Category is required';
    }
    
    if (!description.trim()) {
      newErrors.description = 'Description is required';
    } else if (description.length > 1000) {
      newErrors.description = 'Description must be less than 1000 characters';
    }
    
    if (priceType !== 'free' && priceType !== 'contact' && (!price.trim() || isNaN(Number(price)))) {
      newErrors.price = 'Valid price is required';
    }
    
    if (!isRemote && !location.trim()) {
      newErrors.location = 'Location is required for non-remote services';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to create a post');
      return;
    }
    
    if (!validate()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const postData: Partial<Post> = {
        title,
        category,
        description,
        tags,
        price_type: priceType,
        price: priceType !== 'free' && priceType !== 'contact' ? Number(price) : undefined,
        currency,
        is_remote: isRemote,
        location: isRemote ? undefined : {
          latitude: 0, // Would be set from actual location in a real app
          longitude: 0,
          address: location
        },
        experience_level: experienceLevel,
        service_type: serviceType,
        availability_status: availabilityStatus,
        availability_date: availabilityDate ? availabilityDate.toISOString() : undefined,
        media_urls: mediaUrls,
      };
      
      if (isEditing && initialValues?.id) {
        // Update existing post
        const updatedPost = await updatePost(initialValues.id, postData);
        
        if (updatedPost) {
          if (onSuccess) {
            onSuccess(updatedPost);
          } else {
            Alert.alert('Success', 'Post updated successfully');
            router.back();
          }
        }
      } else {
        // Create new post
        postData.user_id = user.id;
        
        const newPost = await createPost(postData);
        
        if (newPost) {
          if (onSuccess) {
            onSuccess(newPost);
          } else {
            Alert.alert('Success', 'Post created successfully');
            router.replace('/posts');
          }
        }
      }
    } catch (error) {
      console.error('Error creating/updating post:', error);
      Alert.alert('Error', 'Failed to save post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };
  
  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };
  
  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please grant access to your photo library to upload images.');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        
        setIsUploading(true);
        
        try {
          // Upload image to Supabase Storage
          const publicUrl = await chatService.uploadMedia(selectedImage.uri, 'post-media');
          
          // Add URL to media URLs
          setMediaUrls([...mediaUrls, publicUrl]);
        } catch (error) {
          console.error('Error uploading image:', error);
          Alert.alert('Upload Error', 'Failed to upload image. Please try again.');
        } finally {
          setIsUploading(false);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };
  
  const handleRemoveImage = (url: string) => {
    setMediaUrls(mediaUrls.filter(u => u !== url));
  };
  
  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setAvailabilityDate(selectedDate);
    }
  };
  
  return (
    <ScrollView style={styles.container}>
      <Surface style={styles.formContainer}>
        <Text variant="headlineSmall" style={styles.formTitle}>
          {isEditing ? 'Edit Service Post' : 'Create Service Post'}
        </Text>
        
        {/* Title */}
        <View style={styles.inputContainer}>
          <Text variant="titleMedium" style={styles.inputLabel}>Service Title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g., Full-stack Web Development, Logo Design"
            mode="outlined"
            error={!!errors.title}
            style={styles.input}
          />
          {errors.title && <HelperText type="error">{errors.title}</HelperText>}
        </View>
        
        {/* Category */}
        <View style={styles.inputContainer}>
          <Text variant="titleMedium" style={styles.inputLabel}>Category</Text>
          <View style={styles.categoriesContainer}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesContent}
            >
              {categories.map(cat => (
                <Chip
                  key={cat.id}
                  selected={category === cat.name}
                  onPress={() => setCategory(cat.name)}
                  style={styles.categoryChip}
                >
                  {cat.name}
                </Chip>
              ))}
            </ScrollView>
          </View>
          {errors.category && <HelperText type="error">{errors.category}</HelperText>}
        </View>
        
        {/* Description */}
        <View style={styles.inputContainer}>
          <Text variant="titleMedium" style={styles.inputLabel}>Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Describe your service in detail..."
            mode="outlined"
            multiline
            numberOfLines={5}
            error={!!errors.description}
            style={styles.textArea}
          />
          <Text style={styles.characterCount}>
            {description.length}/1000 characters
          </Text>
          {errors.description && <HelperText type="error">{errors.description}</HelperText>}
        </View>
        
        {/* Tags */}
        <View style={styles.inputContainer}>
          <Text variant="titleMedium" style={styles.inputLabel}>Tags</Text>
          <View style={styles.tagInputContainer}>
            <TextInput
              value={newTag}
              onChangeText={setNewTag}
              placeholder="Add a tag"
              mode="outlined"
              style={styles.tagInput}
              right={
                <TextInput.Icon 
                  icon="plus" 
                  onPress={handleAddTag} 
                  disabled={!newTag.trim()}
                />
              }
              onSubmitEditing={handleAddTag}
            />
          </View>
          
          <View style={styles.tagsContainer}>
            {tags.map(tag => (
              <Chip
                key={tag}
                onClose={() => handleRemoveTag(tag)}
                style={styles.tagChip}
              >
                {tag}
              </Chip>
            ))}
          </View>
        </View>
        
        <Divider style={styles.divider} />
        
        {/* Price */}
        <View style={styles.inputContainer}>
          <Text variant="titleMedium" style={styles.inputLabel}>Pricing</Text>
          
          <SegmentedButtons
            value={priceType}
            onValueChange={(value) => setPriceType(value as any)}
            buttons={[
              { value: 'fixed', label: 'Fixed' },
              { value: 'hourly', label: 'Hourly' },
              { value: 'free', label: 'Free' },
              { value: 'contact', label: 'Contact' }
            ]}
            style={styles.segmentedButtons}
          />
          
          {(priceType === 'fixed' || priceType === 'hourly') && (
            <View style={styles.priceInputContainer}>
              <TextInput
                value={price}
                onChangeText={setPrice}
                placeholder="Price"
                mode="outlined"
                keyboardType="numeric"
                error={!!errors.price}
                style={styles.priceInput}
                left={<TextInput.Icon icon={() => <DollarSign size={20} color="#6B7280" />} />}
              />
              
              <SegmentedButtons
                value={currency}
                onValueChange={setCurrency}
                buttons={[
                  { value: 'USD', label: 'USD' },
                  { value: 'EUR', label: 'EUR' },
                  { value: 'GBP', label: 'GBP' }
                ]}
                style={styles.currencyButtons}
              />
            </View>
          )}
          
          {errors.price && <HelperText type="error">{errors.price}</HelperText>}
        </View>
        
        <Divider style={styles.divider} />
        
        {/* Location */}
        <View style={styles.inputContainer}>
          <Text variant="titleMedium" style={styles.inputLabel}>Location</Text>
          
          <View style={styles.switchContainer}>
            <Text>Remote Service</Text>
            <Switch
              value={isRemote}
              onValueChange={setIsRemote}
            />
          </View>
          
          {!isRemote && (
            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder="Enter your location"
              mode="outlined"
              error={!!errors.location}
              style={styles.input}
              left={<TextInput.Icon icon={() => <MapPin size={20} color="#6B7280" />} />}
            />
          )}
          
          {errors.location && <HelperText type="error">{errors.location}</HelperText>}
        </View>
        
        <Divider style={styles.divider} />
        
        {/* Experience Level */}
        <View style={styles.inputContainer}>
          <Text variant="titleMedium" style={styles.inputLabel}>Experience Level</Text>
          
          <SegmentedButtons
            value={experienceLevel}
            onValueChange={(value) => setExperienceLevel(value as any)}
            buttons={[
              { value: 'junior', label: 'Junior' },
              { value: 'mid', label: 'Mid-Level' },
              { value: 'senior', label: 'Senior' }
            ]}
            style={styles.segmentedButtons}
          />
        </View>
        
        {/* Service Type */}
        <View style={styles.inputContainer}>
          <Text variant="titleMedium" style={styles.inputLabel}>Service Type</Text>
          
          <SegmentedButtons
            value={serviceType}
            onValueChange={(value) => setServiceType(value as any)}
            buttons={[
              { value: 'one-time', label: 'One-time' },
              { value: 'long-term', label: 'Long-term' },
              { value: 'consulting', label: 'Consulting' },
              { value: 'coaching', label: 'Coaching' }
            ]}
            style={styles.segmentedButtons}
          />
        </View>
        
        {/* Availability */}
        <View style={styles.inputContainer}>
          <Text variant="titleMedium" style={styles.inputLabel}>Availability</Text>
          
          <SegmentedButtons
            value={availabilityStatus}
            onValueChange={(value) => setAvailabilityStatus(value as any)}
            buttons={[
              { value: 'available', label: 'Available' },
              { value: 'limited', label: 'Limited' },
              { value: 'unavailable', label: 'Unavailable' }
            ]}
            style={styles.segmentedButtons}
          />
          
          <View style={styles.datePickerContainer}>
            <Text>Available From:</Text>
            <Button 
              mode="outlined" 
              onPress={() => setShowDatePicker(true)}
              icon={() => <Calendar size={20} color="#3B82F6" />}
              style={styles.datePickerButton}
            >
              {availabilityDate ? availabilityDate.toLocaleDateString() : 'Select Date'}
            </Button>
            
            {showDatePicker && (
              <DateTimePicker
                value={availabilityDate || new Date()}
                mode="date"
                display="default"
                onChange={onDateChange}
                minimumDate={new Date()}
              />
            )}
          </View>
        </View>
        
        <Divider style={styles.divider} />
        
        {/* Media */}
        <View style={styles.inputContainer}>
          <Text variant="titleMedium" style={styles.inputLabel}>Media</Text>
          
          <Button 
            mode="outlined" 
            onPress={handlePickImage}
            loading={isUploading}
            disabled={isUploading}
            icon={() => <Upload size={20} color="#3B82F6" />}
            style={styles.uploadButton}
          >
            Upload Image
          </Button>
          
          <View style={styles.mediaPreviewContainer}>
            {mediaUrls.map((url, index) => (
              <View key={index} style={styles.mediaPreview}>
                <Image source={{ uri: url }} style={styles.mediaImage} />
                <IconButton
                  icon={() => <X size={16} color="white" />}
                  size={16}
                  onPress={() => handleRemoveImage(url)}
                  style={styles.removeMediaButton}
                />
              </View>
            ))}
          </View>
        </View>
        
        {/* Submit Buttons */}
        <View style={styles.buttonContainer}>
          <Button 
            mode="outlined" 
            onPress={onCancel || (() => router.back())}
            style={styles.cancelButton}
          >
            Cancel
          </Button>
          <Button 
            mode="contained" 
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting}
            style={styles.submitButton}
          >
            {isEditing ? 'Update Post' : 'Create Post'}
          </Button>
        </View>
      </Surface>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  formContainer: {
    padding: 16,
    margin: 16,
    borderRadius: 12,
    elevation: 2,
  },
  formTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: 'white',
  },
  textArea: {
    backgroundColor: 'white',
    minHeight: 120,
  },
  characterCount: {
    textAlign: 'right',
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  categoriesContainer: {
    marginBottom: 8,
  },
  categoriesContent: {
    paddingVertical: 4,
  },
  categoryChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  tagInputContainer: {
    marginBottom: 8,
  },
  tagInput: {
    backgroundColor: 'white',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  divider: {
    marginVertical: 16,
  },
  segmentedButtons: {
    marginBottom: 8,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceInput: {
    flex: 1,
    backgroundColor: 'white',
    marginRight: 8,
  },
  currencyButtons: {
    width: 150,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  datePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  datePickerButton: {
    flex: 1,
    marginLeft: 16,
  },
  uploadButton: {
    marginBottom: 16,
  },
  mediaPreviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  mediaPreview: {
    width: 100,
    height: 100,
    marginRight: 8,
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  removeMediaButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    margin: 0,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
  },
  submitButton: {
    flex: 1,
    marginLeft: 8,
    backgroundColor: '#3B82F6',
  },
});

// Import IconButton
import { IconButton } from 'react-native-paper';

export default CreatePostForm;