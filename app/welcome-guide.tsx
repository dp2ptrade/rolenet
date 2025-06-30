import React, { useEffect, useState, useRef } from 'react';
import { View, ScrollView, StyleSheet, Alert, Platform, TouchableOpacity, Linking, Dimensions, Animated } from 'react-native';
import { Text, Button, Card, Title, Paragraph, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Users, Search, MessageSquare, Bell, Star } from 'lucide-react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ASSETS } from '../constants/assets';
import { COLORS, TYPOGRAPHY, SPACING, DIMENSIONS, ANIMATIONS } from '../constants/theme';
import { getAnimationConfig } from '../utils/platform';
import TechPartners from '../components/TechPartners';
import { useState as useAnimatedState } from 'react';
import { Image } from 'react-native';
import { VoiceSearchService } from '../lib/voiceSearch';
import { SmartSearchEngine, SearchFilters, SearchResult } from '../lib/searchEngine';
import { userService } from '../lib/supabaseService';
import { CONFIG } from '../lib/config/chatConfig';
import { User } from '../lib/types';

const { width, height } = Dimensions.get('window');

export default function WelcomeGuideScreen() {
  const rotateValue = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const scaleValue = useRef(new Animated.Value(1)).current;
  const [isPressed, setIsPressed] = useState(false);
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  
  // Animation for floating button
  const floatingButtonAnim = useRef(new Animated.Value(0)).current;

  // Add missing state variables
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [popularRoles, setPopularRoles] = useState<string[]>([]);
  const [popularTags, setPopularTags] = useState<string[]>([]);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    location: 'nearby',
    roles: [],
    tags: [],
    availability: 'all',
    rating: 0,
    experience: 'all',
    distance: 50,
    sortBy: 'relevance'
  });
  const currentUser = null; // Since this is welcome screen, no current user

  useEffect(() => {
    // Initialize voice search service
    VoiceSearchService.configure({
      elevenLabsApiKey: '', // Add your ElevenLabs API key here
      voiceId: 'pNInz6obpgDQGcFmaJgB' // Optional: specific voice ID
    });

    let animationTimeout: any;
  
  // Start the rotation animation
  const startRotation = () => {
    rotateValue.setValue(0);
    const animation = Animated.timing(rotateValue, {
      toValue: 1,
      duration: 3000, // 3 seconds for one full rotation
      useNativeDriver: false,
    });
    animationRef.current = animation;
    animation.start(({ finished }) => {
      if (finished && !isPressed) {
        // Wait 5 seconds before starting the next rotation
        animationTimeout = setTimeout(() => {
          startRotation(); // Loop the animation only if not pressed
        }, 5000);
      }
    });
  };
  startRotation();
  
  loadUsers();
  
  return () => {
    if (animationRef.current) {
      animationRef.current.stop();
    }
    if (animationTimeout) {
      clearTimeout(animationTimeout);
    }
  };
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  // Handle press interactions for the logo
  const handlePressIn = () => {
    setIsPressed(true);
    // Stop the rotation animation
    if (animationRef.current) {
      animationRef.current.stop();
    }
    // Scale up the logo
    Animated.spring(scaleValue, {
      toValue: 1.2,
      useNativeDriver: false,
    }).start();
  };

  const handlePressOut = () => {
    setIsPressed(false);
    // Scale back to normal
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: false,
    }).start(() => {
      // Restart rotation animation
      const startRotation = () => {
        const animation = Animated.timing(rotateValue, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: false,
        });
        animationRef.current = animation;
        animation.start(() => {
          if (!isPressed) {
            startRotation();
          }
        });
      };
      startRotation();
    });
  };

  const loadUsers = async (appliedFilters: SearchFilters | null = null) => {
    try {
      setLoading(true);
      const searchParams: any = { limit: CONFIG.SEARCH.DEFAULT_LIMIT };

      // Apply filters if provided or if we have active filters
      const filtersToApply = appliedFilters || filters;
      if (filtersToApply.query) {
        searchParams.query = filtersToApply.query;
      }
      if (filtersToApply.roles && filtersToApply.roles.length > 0) {
        searchParams.roles = filtersToApply.roles;
      }
      if (filtersToApply.tags && filtersToApply.tags.length > 0) {
        searchParams.tags = filtersToApply.tags;
      }
      if (filtersToApply.availability === 'available') {
        searchParams.is_available = true;
      }
      if (filtersToApply.rating > 0) {
        searchParams.min_rating = filtersToApply.rating;
      }
      if (filtersToApply.location === 'nearby' && currentUser?.location) {
        searchParams.latitude = currentUser.location.latitude;
        searchParams.longitude = currentUser.location.longitude;
        searchParams.max_distance = filtersToApply.distance;
      }
      if (filtersToApply.sortBy) {
        searchParams.sort_by = filtersToApply.sortBy;
      }

      const { data: usersData, error } = await userService.searchUsers(searchParams);
      
      if (error) {
        console.error('Error loading users:', error);
        setSnackbarMessage('Failed to load users from database');
        setSnackbarVisible(true);
        setUsers([]);
      } else if (usersData && usersData.length > 0) {
        console.log(`Successfully loaded ${usersData.length} users from database`);
        const filteredUsers = usersData.filter(user => user.id !== currentUser?.id);
        setUsers(filteredUsers);
        setSnackbarMessage(`Found ${filteredUsers.length} professionals`);
        setSnackbarVisible(true);
        
        // Extract popular roles and tags for quick filters
        const roleCounts: { [key: string]: number } = {};
        const tagCounts: { [key: string]: number } = {};
        filteredUsers.forEach(user => {
          roleCounts[user.role] = (roleCounts[user.role] || 0) + 1;
          user.tags.forEach((tag: string) => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          });
        });
        
        const sortedRoles = Object.entries(roleCounts)
          .sort((a, b) => b[1] - a[1])
          .map(entry => entry[0])
          .slice(0, 5);
        setPopularRoles(sortedRoles);
        
        const sortedTags = Object.entries(tagCounts)
          .sort((a, b) => b[1] - a[1])
          .map(entry => entry[0])
          .slice(0, 10);
        setPopularTags(sortedTags);
      } else {
        console.warn('No users found in database');
        setSnackbarMessage('No users found in database');
        setSnackbarVisible(true);
        setUsers([]);
        setPopularRoles([]);
        setPopularTags([]);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      setSnackbarMessage('Error connecting to database');
      setSnackbarVisible(true);
      setUsers([]);
      setPopularRoles([]);
      setPopularTags([]);
    } finally {
      setLoading(false);
    }
  };

  const performSearch = () => {
    // Since filtering is now done at database level, we can directly use the loaded users as search results
    // But we still calculate relevance score and distance for display purposes
    const searchFilters = { ...filters };
    const userLocation = currentUser?.location;
    
    const results = SmartSearchEngine.search(users, searchFilters, userLocation);
    return results;
  };

  const handleGetStarted = async () => {
    await AsyncStorage.setItem('hasSeenWelcomeGuide', 'true');
    router.replace('/auth/signin');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={['#0284c7', '#38bdf8', '#7dd3fc']}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollViewContent}
        >
        <View style={styles.header}>
          <View style={{
            shadowColor: '#0ea5e9',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8,
            shadowRadius: 20,
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            borderRadius: 40,
            padding: 10,
          }}>
            <Image
              source={ASSETS.IMAGES.LOGO}
              style={[styles.logo, { tintColor: '#ffffff' }]}
            />
          </View>
          <Title style={styles.title}>Welcome to RoleNet</Title>

          <Animated.View style={[
            styles.poweredByContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}>
            <TouchableOpacity onPress={() => Linking.openURL('https://bolt.new/')}>
              <Image
                source={ASSETS.IMAGES.POWERED_BY_BOLT}
                style={styles.poweredByLogo}
              />
            </TouchableOpacity>
          </Animated.View>
        </View>
        
        <View style={styles.content}>
            <Card style={[styles.card, styles.featureCard]} elevation={5}>
              <LinearGradient
                colors={['#ffffff', '#e0f7ff', '#bae6fd']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
              >
                <Card.Content style={styles.cardContent}>
                  <View style={styles.iconContainer}>
                    <View style={[styles.iconBackground, {backgroundColor: COLORS.WHITE}]}>
                      <Users size={32} color="#0ea5e9" />
                    </View>
                  </View>
                  <Title style={styles.cardTitle}>Target Audience</Title>
                  <View style={styles.divider} />
                  <Paragraph style={styles.cardDescription}>
                    Connect with professionals across all industries including healthcare workers, educators, engineers, business professionals, entrepreneurs, consultants, creative professionals, technicians, service providers, students, researchers, and industry experts seeking collaboration.
                  </Paragraph>
                  <View style={styles.cardFooter}>
                    <Text style={styles.cardHighlight}>🎯 Role-Based Networking</Text>
                  </View>
                </Card.Content>
              </LinearGradient>
            </Card>

            <Card style={[styles.card, styles.featureCard]} elevation={5}>
              <LinearGradient
                colors={['#ffffff', '#e0f2fe', '#bae6fd']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
              >
                <Card.Content style={styles.cardContent}>
                  <View style={styles.iconContainer}>
                    <View style={[styles.iconBackground, {backgroundColor: COLORS.WHITE}]}>
                      <Search size={32} color="#3b82f6" />
                    </View>
                  </View>
                  <Title style={styles.cardTitle}>Discover & Connect</Title>
                  <View style={styles.divider} />
                  <Paragraph style={styles.cardDescription}>
                    Search for people and experts by role, tags, or location with AI-powered search and intelligent filters for precise matching.
                  </Paragraph>
                  <View style={styles.cardFooter}>
                    <Text style={styles.cardHighlight}>🤖 AI-Powered</Text>
                  </View>
                </Card.Content>
              </LinearGradient>
            </Card>

            <Card style={[styles.card, styles.featureCard]} elevation={5}>
              <LinearGradient
                colors={['#ffffff', '#dcfce7', '#bbf7d0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
              >
                <Card.Content style={styles.cardContent}>
                  <View style={styles.iconContainer}>
                    <View style={[styles.iconBackground, {backgroundColor: COLORS.WHITE}]}>
                      <MessageSquare size={32} color="#10b981" />
                    </View>
                  </View>
                  <Title style={styles.cardTitle}>Real-Time Collaboration</Title>
                  <View style={styles.divider} />
                  <Paragraph style={styles.cardDescription}>
                    Engage through instant chats, HD calls, and smart pings with seamless WebRTC integration for crystal-clear communication.
                  </Paragraph>
                  <View style={styles.cardFooter}>
                    <Text style={styles.cardHighlight}>⚡ Instant Connect</Text>
                  </View>
                </Card.Content>
              </LinearGradient>
            </Card>

            <Card style={[styles.card, styles.featureCard]} elevation={5}>
              <LinearGradient
                colors={['#ffffff', '#fef9c3', '#fde68a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
              >
                <Card.Content style={styles.cardContent}>
                  <View style={styles.iconContainer}>
                    <View style={[styles.iconBackground, {backgroundColor: COLORS.WHITE}]}>
                      <Bell size={32} color="#f59e0b" />
                    </View>
                  </View>
                  <Title style={styles.cardTitle}>Smart Ping System</Title>
                  <View style={styles.divider} />
                  <Paragraph style={styles.cardDescription}>
                    Send targeted connection requests with personalized notes to the right professionals and people of various professions instantly.
                  </Paragraph>
                  <View style={styles.cardFooter}>
                    <Text style={styles.cardHighlight}>🎯 Targeted Reach</Text>
                  </View>
                </Card.Content>
              </LinearGradient>
            </Card>

            <Card style={[styles.card, styles.featureCard]} elevation={5}>
              <LinearGradient
                colors={['#ffffff', '#fce7f3', '#fbcfe8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
              >
                <Card.Content style={styles.cardContent}>
                  <View style={styles.iconContainer}>
                    <View style={[styles.iconBackground, {backgroundColor: COLORS.WHITE}]}>
                      <Star size={32} color="#8b5cf6" />
                    </View>
                  </View>
                  <Title style={styles.cardTitle}>Trust & Reviews</Title>
                  <View style={styles.divider} />
                  <Paragraph style={styles.cardDescription}>
                    Rate interactions and provide feedback to build trust. Help others find reliable professionals/people by profession through verified reviews.
                  </Paragraph>
                  <View style={styles.cardFooter}>
                    <Text style={styles.cardHighlight}>⭐ Verified Trust</Text>
                  </View>
                </Card.Content>
              </LinearGradient>
            </Card>

            <Card style={[styles.card, styles.visionCard]} elevation={5}>
              <LinearGradient
                colors={['#7dd3fc', '#38bdf8', '#0ea5e9', '#0284c7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
              >
                <Card.Content style={styles.cardContent}>
                  <View style={styles.visionIconContainer}>
                    <Text style={styles.visionEmoji}>🌍</Text>
                  </View>
                  <Title style={styles.visionCardTitle}>Our Vision</Title>
                  <View style={styles.visionDivider} />
                  <Paragraph style={styles.visionCardDescription}>
                    We envision a world where every person is easily accessible within one unified network by their role, bridging professional gaps and fostering global collaboration.
                  </Paragraph>
                  <View style={styles.visionCardFooter}>
                    <Text style={styles.visionHighlight}>"Every Role. One Network."</Text>
                  </View>
                </Card.Content>
              </LinearGradient>
            </Card>
            
            {/* Tech Partners Section */}
            <TechPartners />

            {/* Get Started Button (now at the bottom of the content) */}
            <View style={styles.getStartedContainer}>
              <LinearGradient
                colors={['#3B82F6', '#0EA5E9']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.getStartedGradient}
              >
                <TouchableOpacity
                  style={styles.getStartedButton}
                  onPress={handleGetStarted}
                  activeOpacity={0.8}
                >
                  <Text style={styles.getStartedText}>Get Started</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0284c7', // Fallback color to match the darkest gradient color
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#0284c7', // Ensure the safe area also has a consistent background
  },
  gradient: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    padding: SPACING.MD,
    paddingBottom: SPACING.MD, // Reduced padding to minimize extra space at the bottom
  },
  header: {
    alignItems: 'center',
    marginTop: SPACING.MD,
    marginBottom: SPACING.LG,
  },
  logo: {
    width: DIMENSIONS.LOGO.WIDTH,
    height: DIMENSIONS.LOGO.HEIGHT,
    marginBottom: SPACING.SM,
    resizeMode: 'contain',
  },
  title: {
    fontSize: TYPOGRAPHY.SIZES.TITLE,
    fontWeight: TYPOGRAPHY.WEIGHTS.BOLD,
    color: COLORS.WHITE,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: TYPOGRAPHY.SIZES.BODY,
    color: COLORS.OVERLAY.LIGHT,
    textAlign: 'center',
    marginTop: SPACING.SM,
    paddingHorizontal: SPACING.SCREEN_PADDING * 2,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    marginBottom: SPACING.LG,
    borderRadius: 30,
    marginHorizontal: SPACING.SM,
    overflow: 'hidden',
  },
  featureCard: {
    shadowColor: '#0ea5e9',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  visionCard: {
    shadowColor: '#0ea5e9',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  cardGradient: {
    borderRadius: 30,
    overflow: 'hidden',
  },
  cardContent: {
    paddingVertical: SPACING.LG,
    paddingHorizontal: SPACING.MD,
  },
  cardTitle: {
    color: '#0ea5e9',
    fontSize: 18,
    fontWeight: TYPOGRAPHY.WEIGHTS.BOLD,
    marginBottom: SPACING.SM,
    textAlign: 'center',
  },
  cardDescription: {
    color: COLORS.TEXT.SECONDARY,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: SPACING.MD,
  },
  divider: {
    height: 2,
    backgroundColor: 'rgba(14, 165, 233, 0.3)',
    width: 40,
    alignSelf: 'center',
    marginBottom: SPACING.MD,
    borderRadius: 1,
  },
  cardFooter: {
    alignItems: 'center',
    marginTop: SPACING.SM,
  },
  cardHighlight: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0ea5e9',
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    paddingHorizontal: SPACING.SM,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  visionCardTitle: {
    color: COLORS.WHITE,
    fontSize: 20,
    fontWeight: TYPOGRAPHY.WEIGHTS.BOLD,
    marginBottom: SPACING.SM,
    textAlign: 'center',
  },
  visionCardDescription: {
    color: COLORS.WHITE + 'E6',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: SPACING.MD,
  },
  visionDivider: {
    height: 2,
    backgroundColor: COLORS.WHITE + '40',
    width: 50,
    alignSelf: 'center',
    marginBottom: SPACING.MD,
    borderRadius: 1,
  },
  visionCardFooter: {
    alignItems: 'center',
    marginTop: SPACING.SM,
  },
  visionHighlight: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.WHITE,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  footer: {
    marginTop: SPACING.LG,
    alignItems: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  iconBackground: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },

  visionIconContainer: {
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  visionEmoji: {
    fontSize: 48,
    textAlign: 'center',
  },
  poweredByContainer: {
    position: 'absolute',
    top: '8%',
    right: '5%',
    zIndex: 10,
  },
  poweredByLogo: {
    width: DIMENSIONS.POWERED_BY.WIDTH,
    height: DIMENSIONS.POWERED_BY.HEIGHT,
    resizeMode: 'contain',
  },
  
  // New Get Started Button styles (at the bottom of content)
  getStartedContainer: {
    marginTop: SPACING.LG,
    marginBottom: SPACING.XL,
    alignItems: 'center',
    width: '100%',
  },
  getStartedGradient: {
    borderRadius: 30,
    padding: 2,
    width: '80%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  getStartedButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  getStartedText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 18,
  },
});