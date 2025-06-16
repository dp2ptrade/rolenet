import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, Button, TextInput, Card, Chip, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, User, Tag, ArrowRight, Globe } from 'lucide-react-native';
import { router } from 'expo-router';
import { useUserStore } from '@/stores/useUserStore';
import { POPULAR_ROLES, POPULAR_TAGS } from '@/lib/types';
import { AuthService, UserService } from '@/lib/supabaseService';
import * as Location from 'expo-location';

export default function OnboardingScreen() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [customRole, setCustomRole] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [location, setLocation] = useState<any>(null);
  const [manualLocation, setManualLocation] = useState({ city: '', country: '' });
  const [locationMethod, setLocationMethod] = useState<'auto' | 'manual' | 'skip'>('auto');
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  const { setCurrentUser, setAuthenticated } = useUserStore();

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      completeOnboarding();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const requestLocation = async () => {
    setIsLoadingLocation(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to find nearby professionals.');
        setIsLoadingLocation(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      let address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const locationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: address[0] ? `${address[0].city}, ${address[0].region}` : 'Unknown location',
      };

      setLocation(locationData);
      setLocationMethod('auto');
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert('Error', 'Failed to get your location. Please try again.');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleManualLocation = () => {
    if (manualLocation.city.trim() && manualLocation.country.trim()) {
      const locationData = {
        latitude: 0,
        longitude: 0,
        address: `${manualLocation.city}, ${manualLocation.country}`,
      };
      setLocation(locationData);
      setLocationMethod('manual');
    }
  };

  const handleSkipLocation = () => {
    const locationData = {
      latitude: 0,
      longitude: 0,
      address: 'Location not shared',
    };
    setLocation(locationData);
    setLocationMethod('skip');
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const addCustomTag = () => {
    if (newTag.trim() && !customTags.includes(newTag.trim())) {
      setCustomTags(prev => [...prev, newTag.trim()]);
      setSelectedTags(prev => [...prev, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeCustomTag = (tag: string) => {
    setCustomTags(prev => prev.filter(t => t !== tag));
    setSelectedTags(prev => prev.filter(t => t !== tag));
  };

  const completeOnboarding = async () => {
    try {
      const finalRole = selectedRole === 'Custom' ? customRole : selectedRole;
      const finalTags = [...selectedTags];
      
      // Get current session to get user ID
      const { session, error: sessionError } = await AuthService.getCurrentSession();
      
      if (sessionError || !session?.user) {
        Alert.alert('Error', 'Please sign in first to complete onboarding.');
        router.replace('/auth/signin');
        return;
      }
      
      // Check if user profile already exists
      const { data: existingProfile, error: profileCheckError } = await UserService.getUserProfile(session.user.id);
      
      // Create user profile data
      const profileData = {
        name,
        role: finalRole,
        tags: finalTags,
        location: location || { latitude: 0, longitude: 0, address: 'Unknown' },
        bio: '',
        avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400',
        online_status: 'online' as const,
        is_available: true,
        rating: 0,
        rating_count: 0,
        email: session.user.email,
      };
      
      let userData, profileError;
      
      if (existingProfile && !profileCheckError) {
        // Update existing profile
        const result = await UserService.updateUserProfile(session.user.id, profileData);
        userData = result.data;
        profileError = result.error;
      } else {
        // Create new profile (only if profile doesn't exist or there was an error checking)
        const result = await UserService.createUserProfile(session.user.id, profileData);
        userData = result.data;
        profileError = result.error;
      }
      
      if (profileError) {
        console.error('Error saving user profile:', profileError);
        Alert.alert('Error', 'Failed to save profile. Please try again.');
        return;
      }

      setCurrentUser(userData);
      setAuthenticated(true);
      router.replace('/(tabs)/discover');
    } catch (error) {
      console.error('Onboarding error:', error);
      Alert.alert('Error', 'Failed to complete setup. Please try again.');
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: return name.trim().length > 0;
      case 2: return selectedRole.length > 0 && (selectedRole !== 'Custom' || customRole.trim().length > 0);
      case 3: return selectedTags.length > 0;
      case 4: return location !== null;
      default: return false;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContent}>
            <User size={64} color="white" style={styles.stepIcon} />
            <Text variant="headlineMedium" style={styles.stepTitle}>
              What's your name?
            </Text>
            <Text variant="bodyLarge" style={styles.stepSubtitle}>
              Let's start with how you'd like to be known
            </Text>
            <TextInput
              mode="outlined"
              placeholder="Enter your full name"
              value={name}
              onChangeText={setName}
              style={styles.input}
              outlineColor="rgba(255, 255, 255, 0.3)"
              activeOutlineColor="white"
              textColor="white"
              placeholderTextColor="rgba(255, 255, 255, 0.7)"
              theme={{ colors: { onSurfaceVariant: 'rgba(255, 255, 255, 0.7)' } }}
            />
          </View>
        );

      case 2:
        return (
          <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
            <Text variant="headlineMedium" style={styles.stepTitle}>
              What's your role?
            </Text>
            <Text variant="bodyLarge" style={styles.stepSubtitle}>
              Select your professional role or create a custom one
            </Text>
            
            <View style={styles.rolesGrid}>
              {POPULAR_ROLES.map((role) => (
                <Chip
                  key={role}
                  selected={selectedRole === role}
                  onPress={() => setSelectedRole(role)}
                  style={[
                    styles.roleChip,
                    selectedRole === role && styles.selectedChip
                  ]}
                  textStyle={[
                    styles.chipText,
                    selectedRole === role && styles.selectedChipText
                  ]}
                >
                  {role}
                </Chip>
              ))}
              <Chip
                selected={selectedRole === 'Custom'}
                onPress={() => setSelectedRole('Custom')}
                style={[
                  styles.roleChip,
                  selectedRole === 'Custom' && styles.selectedChip
                ]}
                textStyle={[
                  styles.chipText,
                  selectedRole === 'Custom' && styles.selectedChipText
                ]}
              >
                Custom Role
              </Chip>
            </View>

            {selectedRole === 'Custom' && (
              <TextInput
                mode="outlined"
                placeholder="Enter your custom role"
                value={customRole}
                onChangeText={setCustomRole}
                style={styles.input}
                outlineColor="rgba(255, 255, 255, 0.3)"
                activeOutlineColor="white"
                textColor="white"
                placeholderTextColor="rgba(255, 255, 255, 0.7)"
                theme={{ colors: { onSurfaceVariant: 'rgba(255, 255, 255, 0.7)' } }}
              />
            )}
          </ScrollView>
        );

      case 3:
        return (
          <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
            <Tag size={64} color="white" style={styles.stepIcon} />
            <Text variant="headlineMedium" style={styles.stepTitle}>
              Add your tags
            </Text>
            <Text variant="bodyLarge" style={styles.stepSubtitle}>
              Help others discover you with relevant professional tags
            </Text>
            
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Popular Tags
            </Text>
            <View style={styles.tagsGrid}>
              {POPULAR_TAGS.map((tag) => (
                <Chip
                  key={tag}
                  selected={selectedTags.includes(tag)}
                  onPress={() => toggleTag(tag)}
                  style={[
                    styles.tagChip,
                    selectedTags.includes(tag) && styles.selectedChip
                  ]}
                  textStyle={[
                    styles.chipText,
                    selectedTags.includes(tag) && styles.selectedChipText
                  ]}
                >
                  {tag}
                </Chip>
              ))}
            </View>

            <Text variant="titleMedium" style={styles.sectionTitle}>
              Custom Tags
            </Text>
            <View style={styles.customTagContainer}>
              <TextInput
                mode="outlined"
                placeholder="Add a custom tag"
                value={newTag}
                onChangeText={setNewTag}
                style={styles.tagInput}
                outlineColor="rgba(255, 255, 255, 0.3)"
                activeOutlineColor="white"
                textColor="white"
                placeholderTextColor="rgba(255, 255, 255, 0.7)"
                theme={{ colors: { onSurfaceVariant: 'rgba(255, 255, 255, 0.7)' } }}
                onSubmitEditing={addCustomTag}
              />
              <Button
                mode="contained"
                onPress={addCustomTag}
                disabled={!newTag.trim()}
                style={styles.addTagButton}
                buttonColor="rgba(255, 255, 255, 0.2)"
              >
                Add
              </Button>
            </View>

            {customTags.length > 0 && (
              <View style={styles.customTagsList}>
                {customTags.map((tag) => (
                  <Chip
                    key={tag}
                    selected
                    onClose={() => removeCustomTag(tag)}
                    style={styles.selectedChip}
                    textStyle={styles.selectedChipText}
                  >
                    {tag}
                  </Chip>
                ))}
              </View>
            )}
          </ScrollView>
        );

      case 4:
        return (
          <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
            <MapPin size={64} color="white" style={styles.stepIcon} />
            <Text variant="headlineMedium" style={styles.stepTitle}>
              Share your location
            </Text>
            <Text variant="bodyLarge" style={styles.stepSubtitle}>
              Help others find you and discover nearby professionals (optional)
            </Text>
            
            {!location && (
              <View style={styles.locationOptions}>
                <Button
                  mode="contained"
                  onPress={requestLocation}
                  loading={isLoadingLocation}
                  disabled={isLoadingLocation}
                  style={styles.locationButton}
                  buttonColor="rgba(255, 255, 255, 0.2)"
                  icon={({ size, color }) => <MapPin size={size} color={color} />}
                >
                  {isLoadingLocation ? 'Getting Location...' : 'Use Current Location'}
                </Button>

                <Text variant="bodyMedium" style={styles.orText}>
                  or
                </Text>

                <Card style={styles.manualLocationCard}>
                  <Card.Content>
                    <Text variant="titleMedium" style={styles.manualLocationTitle}>
                      Enter Location Manually
                    </Text>
                    <TextInput
                      mode="outlined"
                      placeholder="City"
                      value={manualLocation.city}
                      onChangeText={(text) => setManualLocation(prev => ({ ...prev, city: text }))}
                      style={styles.manualInput}
                    />
                    <TextInput
                      mode="outlined"
                      placeholder="Country"
                      value={manualLocation.country}
                      onChangeText={(text) => setManualLocation(prev => ({ ...prev, country: text }))}
                      style={styles.manualInput}
                    />
                    <Button
                      mode="contained"
                      onPress={handleManualLocation}
                      disabled={!manualLocation.city.trim() || !manualLocation.country.trim()}
                      style={styles.setLocationButton}
                      icon={({ size, color }) => <Globe size={size} color={color} />}
                    >
                      Set Location
                    </Button>
                  </Card.Content>
                </Card>

                <Button
                  mode="text"
                  onPress={handleSkipLocation}
                  style={styles.skipButton}
                  textColor="rgba(255, 255, 255, 0.8)"
                >
                  Skip for now
                </Button>
              </View>
            )}

            {location && (
              <Card style={styles.locationCard}>
                <Card.Content>
                  <View style={styles.locationInfo}>
                    <MapPin size={24} color="#3B82F6" />
                    <View style={styles.locationDetails}>
                      <Text variant="bodyLarge" style={styles.locationText}>
                        {location.address}
                      </Text>
                      <Text variant="bodySmall" style={styles.locationMethod}>
                        {locationMethod === 'auto' && 'Detected automatically'}
                        {locationMethod === 'manual' && 'Entered manually'}
                        {locationMethod === 'skip' && 'Location sharing disabled'}
                      </Text>
                    </View>
                  </View>
                  <Button
                    mode="outlined"
                    onPress={() => {
                      setLocation(null);
                      setLocationMethod('auto');
                      setManualLocation({ city: '', country: '' });
                    }}
                    style={styles.changeLocationButton}
                  >
                    Change Location
                  </Button>
                </Card.Content>
              </Card>
            )}
          </ScrollView>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#3B82F6', '#06B6D4']}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <Text variant="displaySmall" style={styles.appName}>
            RoleNet
          </Text>
          <Text variant="bodyMedium" style={styles.tagline}>
            Every Role. One Network.
          </Text>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            {[1, 2, 3, 4].map((i) => (
              <View
                key={i}
                style={[
                  styles.progressDot,
                  i <= step && styles.progressDotActive
                ]}
              />
            ))}
          </View>
          <Text variant="bodySmall" style={styles.stepCounter}>
            Step {step} of 4
          </Text>
        </View>

        <View style={styles.content}>
          {renderStep()}
        </View>

        <View style={styles.footer}>
          <View style={styles.footerButtons}>
            {step > 1 && (
              <Button
                mode="outlined"
                onPress={handleBack}
                style={styles.backButton}
                textColor="white"
              >
                Back
              </Button>
            )}
            <Button
              mode="contained"
              onPress={handleNext}
              disabled={!canProceed()}
              style={styles.nextButton}
              buttonColor="white"
              textColor="#3B82F6"
              icon={({ size, color }) => <ArrowRight size={size} color={color} />}
              contentStyle={styles.nextButtonContent}
            >
              {step === 4 ? 'Complete Setup' : 'Next'}
            </Button>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 20,
  },
  appName: {
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  tagline: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  introduction: {
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  progressBar: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 4,
  },
  progressDotActive: {
    backgroundColor: 'white',
  },
  stepCounter: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  stepContent: {
    flex: 1,
  },
  stepIcon: {
    alignSelf: 'center',
    marginBottom: 24,
  },
  stepTitle: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  stepSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 32,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 16,
  },
  rolesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  roleChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 8,
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  tagChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 8,
  },
  selectedChip: {
    backgroundColor: 'white',
  },
  chipText: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  selectedChipText: {
    color: '#3B82F6',
  },
  sectionTitle: {
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 16,
    marginTop: 16,
  },
  customTagContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  tagInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  addTagButton: {
    alignSelf: 'flex-end',
  },
  customTagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  locationOptions: {
    gap: 16,
  },
  locationButton: {
    marginBottom: 8,
  },
  orText: {
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginVertical: 8,
  },
  manualLocationCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 16,
  },
  manualLocationTitle: {
    marginBottom: 16,
    color: '#374151',
    fontWeight: 'bold',
  },
  manualInput: {
    marginBottom: 12,
  },
  setLocationButton: {
    marginTop: 8,
  },
  skipButton: {
    alignSelf: 'center',
  },
  locationCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 24,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  locationDetails: {
    marginLeft: 12,
    flex: 1,
  },
  locationText: {
    color: '#374151',
    marginBottom: 4,
  },
  locationMethod: {
    color: '#6B7280',
    fontStyle: 'italic',
  },
  changeLocationButton: {
    borderColor: '#3B82F6',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  backButton: {
    flex: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  nextButton: {
    flex: 2,
  },
  nextButtonContent: {
    flexDirection: 'row-reverse',
  },
});