import React from 'react';
import { View, StyleSheet, Image, Dimensions, Platform, TouchableOpacity, Linking } from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { ASSETS } from '../constants/assets';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 375;
const isTablet = width >= 768;

export default function TechPartners() {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(59, 130, 246, 0.1)', 'rgba(6, 182, 212, 0.1)']}
        style={styles.gradientContainer}
      >
        <Text style={styles.title}>Trusted Technology Partners</Text>
        <Text style={styles.subtitle}>
          RoleNet is built with cutting-edge technologies from industry leaders
        </Text>
        
        <View style={styles.logosContainer}>
          <TouchableOpacity 
            style={styles.logoWrapper}
            onPress={() => Linking.openURL('https://supabase.com/')}
          >
            <Image 
              source={require('../assets/images/supabase.svg')} 
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.logoText}>Supabase</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.logoWrapper}
            onPress={() => Linking.openURL('https://www.netlify.com/')}
          >
            <Image 
              source={require('../assets/images/netlify.svg')} 
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.logoText}>Netlify</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.logoWrapper}
            onPress={() => Linking.openURL('https://www.anthropic.com/')}
          >
            <Image 
              source={require('../assets/images/anthropic-white.svg')} 
              style={[styles.logo, { height: isTablet ? 30 : 24 }]}
              resizeMode="contain"
            />
            <Text style={styles.logoText}>Anthropic</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.logoWrapper}
            onPress={() => Linking.openURL('https://entri.com/')}
          >
            <Image 
              source={require('../assets/images/entri.svg')} 
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.logoText}>Entri</Text>
          </TouchableOpacity>
          
          {/* Expo Logo with Hyperlink */}
          <TouchableOpacity 
            style={styles.logoWrapper}
            onPress={() => Linking.openURL('https://expo.dev/')}
          >
            <Image 
              source={require('../assets/images/expo-logo.png')} 
              style={[styles.logo, { tintColor: undefined }]}
              resizeMode="contain"
            />
            <Text style={styles.logoText}>Expo</Text>
          </TouchableOpacity>
          

        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  gradientContainer: {
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    overflow: 'hidden',
  },
  title: {
    fontSize: isTablet ? 24 : isSmallScreen ? 18 : 20,
    fontWeight: 'bold',
    color: '#3B82F6',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: isTablet ? 16 : 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: isTablet ? 40 : 0,
  },
  logosContainer: {
    flexDirection: isTablet ? 'row' : 'column',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    alignItems: 'center',
    gap: isTablet ? 24 : 20,
  },
  logoWrapper: {
    alignItems: 'center',
    width: isTablet ? '30%' : '100%',
    marginBottom: isTablet ? 0 : 16,
    backgroundColor: 'rgba(31, 41, 55, 0.7)',
    borderRadius: 12,
    padding: 16,
    paddingVertical: 20,
    ...Platform.select({
      web: {
        transition: 'transform 0.2s ease-in-out',
        ':hover': {
          transform: 'scale(1.05)'
        }
      }
    })
  },
  logo: {
    height: isTablet ? 40 : 32,
    width: '100%',
    marginBottom: 12,
    tintColor: '#ffffff',
  },
  logoText: {
    fontSize: isTablet ? 14 : 12,
    color: '#E5E7EB',
    fontWeight: '500',
    marginTop: 8,
  },
});
