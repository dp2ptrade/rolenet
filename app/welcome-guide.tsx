import React from 'react';
import { View, StyleSheet, ScrollView, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, Button, Card, Title, Paragraph } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WelcomeGuideScreen = () => {
  const handleGetStarted = async () => {
    await AsyncStorage.setItem('hasSeenWelcomeGuide', 'true');
    router.replace('/auth/signin');
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#3B82F6', '#06B6D4']} style={styles.gradient}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Image
              source={require('../assets/images/icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>Welcome to RoleNet</Text>
            <Text style={styles.subtitle}>Every Role. One Network.</Text>
          </View>

          <View style={styles.content}>
            <Card style={styles.card} elevation={3}>
              <Card.Content>
                <Title style={styles.cardTitle}>Connect with Professionals</Title>
                <Paragraph style={styles.cardDescription}>
                  Join a unified platform to connect with experts across diverse fields. Build your network and collaborate seamlessly.
                </Paragraph>
              </Card.Content>
            </Card>

            <Card style={styles.card} elevation={3}>
              <Card.Content>
                <Title style={styles.cardTitle}>Discover & Connect</Title>
                <Paragraph style={styles.cardDescription}>
                  Search for professionals by role, tags, or location to find the right expertise and build meaningful connections.
                </Paragraph>
              </Card.Content>
            </Card>

            <Card style={styles.card} elevation={3}>
              <Card.Content>
                <Title style={styles.cardTitle}>Real-Time Collaboration</Title>
                <Paragraph style={styles.cardDescription}>
                  Engage through instant chats, calls, and pings with seamless WebRTC integration for effective communication.
                </Paragraph>
              </Card.Content>
            </Card>

            <Card style={styles.card} elevation={3}>
              <Card.Content>
                <Title style={styles.cardTitle}>Our Vision</Title>
                <Paragraph style={styles.cardDescription}>
                  We aim to create a world where every professional role is accessible within one network, bridging professional gaps.
                </Paragraph>
              </Card.Content>
            </Card>
          </View>

          <View style={styles.footer}>
            <Button
              mode="contained"
              onPress={handleGetStarted}
              style={styles.getStartedButton}
              buttonColor="white"
              textColor="#3B82F6"
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
    backgroundColor: '#F8FAFC',
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginTop: 5,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    marginBottom: 20,
    borderRadius: 12,
    backgroundColor: 'white',
  },
  cardTitle: {
    color: '#3B82F6',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  cardDescription: {
    color: '#4B5563',
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  footer: {
    marginTop: 30,
    alignItems: 'center',
  },
  getStartedButton: {
    width: '80%',
    paddingVertical: 10,
    borderRadius: 30,
  },
});

export default WelcomeGuideScreen;
