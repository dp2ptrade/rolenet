import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Image, Animated, Dimensions, Platform, TouchableOpacity, Linking, Easing } from 'react-native';
import { Users, Search, MessageSquare, Bell, Star } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, Button, Card, Title, Paragraph } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ASSETS } from '../constants/assets';
import { COLORS, TYPOGRAPHY, SPACING, DIMENSIONS, ANIMATIONS } from '../constants/theme';
import { getAnimationConfig } from '../utils/platform';

const WelcomeGuideScreen = () => {
  const { width, height } = Dimensions.get('window');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Platform-specific animation configuration to avoid native driver warnings
    const fadeConfig = getAnimationConfig({
      toValue: 1,
      duration: ANIMATIONS.DURATION.EXTRA_SLOW,
    });
    
    const scaleConfig = getAnimationConfig({
      toValue: 1,
      tension: ANIMATIONS.SPRING.TENSION,
      friction: ANIMATIONS.SPRING.FRICTION,
    });

    // Start initial animations
    Animated.parallel([
      Animated.timing(fadeAnim, fadeConfig),
      Animated.spring(scaleAnim, scaleConfig),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  const handleGetStarted = async () => {
    await AsyncStorage.setItem('hasSeenWelcomeGuide', 'true');
    router.replace('/auth/signin');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={['#7dd3fc', '#38bdf8', '#0ea5e9', '#0284c7']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollViewContent}>
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
          </View>

          <View style={styles.footer}>
            <Button
              mode="contained"
              onPress={handleGetStarted}
              style={styles.getStartedButton}
              buttonColor={COLORS.WHITE}
              textColor="#0ea5e9"
            >
              Get Started
            </Button>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  safeArea: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    padding: SPACING.MD,
    paddingBottom: SPACING.XL,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.LG,
    marginTop: SPACING.MD,
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
  getStartedButton: {
    width: '80%',
    paddingVertical: SPACING.SM,
    borderRadius: DIMENSIONS.BUTTON.BORDER_RADIUS,
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
});

export default WelcomeGuideScreen;
