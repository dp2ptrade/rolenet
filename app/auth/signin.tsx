import React, { useState } from 'react';
import {
  View,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { AuthService, UserService } from '../../lib/supabaseService';
import { supabase } from '../../lib/supabase';
import { useUserStore } from '../../stores/useUserStore';
import { Text, TextInput, Button, Card } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const { setIsAuthenticated, loadUserProfile } = useUserStore();

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await AuthService.signIn(email, password);

      if (error) {
        Alert.alert('Sign In Failed', error.message);
        return;
      }

      if (data.user) {
        setIsAuthenticated(true);
        
        // Load user profile into store
        await loadUserProfile(data.user.id);
        
        // Check if user has completed profile setup
        const { data: userProfile } = await UserService.getUserProfile(data.user.id);
        
        if (userProfile) {
          // User has completed onboarding, go to main app
          router.replace('/(tabs)/discover');
        } else {
          // User needs to complete onboarding
          router.replace('/onboarding');
        }
      }
    } catch (error) {
      console.error('Sign in error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToSignUp = () => {
    router.push('/auth/signup');
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    try {
      setResetPasswordLoading(true);
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'exp+rolenet-app://expo-development-client/?url=http%3A%2F%2F192.168.0.199%3A8081/reset-password', // Adjust redirect URL as needed for your app
      });

      if (error) {
        Alert.alert('Password Reset Failed', error.message);
        return;
      }

      Alert.alert('Password Reset', 'Check your email for a password reset link.');
    } catch (error) {
      console.error('Password reset error:', error);
      Alert.alert('Error', 'An unexpected error occurred while resetting your password.');
    } finally {
      setResetPasswordLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <LinearGradient
        colors={['#3B82F6', '#06B6D4']}
        style={{ padding: 24, paddingTop: 16 }}
      >
        <Text variant="headlineMedium" style={{ color: 'white', fontWeight: 'bold', marginBottom: 4 }}>
          Welcome Back
        </Text>
        <Text variant="bodyMedium" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
          Sign in to continue to RoleNet
        </Text>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <Card style={{ backgroundColor: 'white', elevation: 4, marginTop: -20 }}>
            <Card.Content style={{ padding: 30 }}>
              <TextInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={{ marginBottom: 20 }}
              />
              <TextInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                mode="outlined"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                style={{ marginBottom: 20 }}
              />
              <Button
                mode="contained"
                onPress={handleSignIn}
                loading={isLoading}
                disabled={isLoading}
                style={{ marginBottom: 20, paddingVertical: 8 }}
              >
                Sign In
              </Button>
              <Button
                mode="text"
                onPress={handleForgotPassword}
                loading={resetPasswordLoading}
                disabled={resetPasswordLoading || !email}
                style={{ marginBottom: 20 }}
                textColor="#3B82F6"
              >
                Forgot Password?
              </Button>
              <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: '#666' }}>Don't have an account?</Text>
                <Button
                  mode="text"
                  onPress={navigateToSignUp}
                  style={{ padding: 0 }}
                  textColor="#3B82F6"
                >
                  Sign Up
                </Button>
              </View>
            </Card.Content>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
