import React, { useState, useRef } from 'react';
import { View, StyleSheet, FlatList, Animated, Dimensions, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const slides = [
  {
    id: 1,
    title: 'Welcome to RoleNet',
    subtitle: 'Every Role. One Network.',
    description: 'Connect with professionals across diverse fields in one unified platform.',
    image: require('../assets/images/icon.png'),
  },
  {
    id: 2,
    title: 'Discover & Connect',
    subtitle: 'Find the right expertise',
    description: 'Search for professionals by role, tags, or location to build meaningful connections.',
    image: require('../assets/images/icon.png'),
  },
  {
    id: 3,
    title: 'Real-Time Collaboration',
    subtitle: 'Communicate instantly',
    description: 'Engage through chats, calls, and pings with seamless WebRTC integration.',
    image: require('../assets/images/icon.png'),
  },
  {
    id: 4,
    title: 'Our Vision',
    subtitle: 'Bridging professional gaps',
    description: 'We aim to create a world where every professional role is accessible within one network.',
    image: require('../assets/images/icon.png'),
  },
];

interface SlideItem {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  image: any;
}

const Slide = ({ item, index, scrollX }: { item: SlideItem; index: number; scrollX: Animated.Value }) => {
  const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
  const translateX = scrollX.interpolate({
    inputRange,
    outputRange: [-width * 0.1, 0, width * 0.1],
  });
  const opacity = scrollX.interpolate({
    inputRange,
    outputRange: [0.7, 1, 0.7],
  });

  return (
    <Animated.View style={[styles.slide, { transform: [{ translateX }], opacity }]}>
      <View style={styles.imageContainer}>
        {/* Placeholder for image or icon */}
        <View style={styles.iconPlaceholder}>
          <Text style={styles.iconText}>RN</Text>
        </View>
      </View>
      <Text variant="headlineLarge" style={styles.title}>
        {item.title}
      </Text>
      <Text variant="titleMedium" style={styles.subtitle}>
        {item.subtitle}
      </Text>
      <Text variant="bodyLarge" style={styles.description}>
        {item.description}
      </Text>
    </Animated.View>
  );
};

export default function WelcomeGuideScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList<SlideItem>>(null);

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      completeGuide();
    }
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem('hasSeenWelcomeGuide', 'true');
    router.replace('/auth/signin');
  };

  const completeGuide = async () => {
    await AsyncStorage.setItem('hasSeenWelcomeGuide', 'true');
    router.replace('/auth/signin');
  };

  const AnimatedFlatList = Animated.createAnimatedComponent(FlatList) as any;
  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: true }
  );

  const renderItem = ({ item, index }: { item: SlideItem; index: number }) => <Slide item={item} index={index} scrollX={scrollX} />;

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#3B82F6', '#06B6D4']} style={styles.gradient}>
        <AnimatedFlatList
          ref={flatListRef}
          data={slides}
          renderItem={renderItem}
          keyExtractor={(item: SlideItem) => item.id.toString()}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          bounces={false}
          scrollEventThrottle={16}
        />
        <View style={styles.pagination}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex && styles.activeDot,
              ]}
            />
          ))}
        </View>
        <View style={styles.buttonsContainer}>
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
          <Button
            mode="contained"
            onPress={handleNext}
            style={styles.nextButton}
            buttonColor="white"
            textColor="#3B82F6"
            icon={currentIndex === slides.length - 1 ? undefined : "arrow-right"}
          >
            {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
          </Button>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slide: {
    width: width,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  iconPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 50,
    fontWeight: 'bold',
    color: 'white',
  },
  title: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 20,
  },
  description: {
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  pagination: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
  },
  dot: {
    height: 10,
    width: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 5,
    borderRadius: 5,
  },
  activeDot: {
    backgroundColor: 'white',
    width: 20,
  },
  buttonsContainer: {
    position: 'absolute',
    bottom: 20,
    width: '100%',
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipButton: {
    padding: 10,
  },
  skipText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
  },
  nextButton: {
    minWidth: 120,
    borderRadius: 30,
    paddingHorizontal: 20,
  },
});
