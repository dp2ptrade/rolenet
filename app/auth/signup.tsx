import React, { useState } from 'react';
import {
  View,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { AuthService } from '../../lib/supabaseService';
import { Text, TextInput, Button, Card, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);

  const validateInputs = () => {
    let isValid = true;
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');

    if (!email) {
      setEmailError('Email is required');
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Invalid email format');
      isValid = false;
    }

    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      isValid = false;
    }

    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your password');
      isValid = false;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      isValid = false;
    }

    return isValid;
  };

  const handleSignUp = async () => {
    if (!validateInputs()) {
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await AuthService.signUp(email, password);

      if (error) {
        setEmailError(error.message.includes('email') ? error.message : '');
        setPasswordError(error.message.includes('password') ? error.message : '');
        return;
      }

      if (data.user) {
        if (Platform.OS === 'web') {
          // For web, directly navigate to a confirmation message or page
          router.push('/auth/signin?confirmation=true');
        } else {
          setShowConfirmationModal(true);
        }
      }
    } catch (error) {
      console.error('Sign up error:', error);
      setEmailError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToSignIn = () => {
    router.push('/auth/signin');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <LinearGradient
        colors={['#3B82F6', '#06B6D4']}
        style={{ padding: 24, paddingTop: 16 }}
      >
        <Text variant="headlineMedium" style={{ color: 'white', fontWeight: 'bold', marginBottom: 4 }}>
          Join RoleNet
        </Text>
        <Text variant="bodyMedium" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
          Create your account to get started
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
                style={{ marginBottom: 10 }}
                left={<TextInput.Icon icon="email" />}
                accessibilityLabel="Email input"
              />
              {emailError ? (
                <Text style={styles.errorText}>{emailError}</Text>
              ) : null}
              <TextInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                mode="outlined"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                style={{ marginBottom: 10 }}
                left={<TextInput.Icon icon="lock" />}
                accessibilityLabel="Password input"
              />
              {passwordError ? (
                <Text style={styles.errorText}>{passwordError}</Text>
              ) : null}
              <TextInput
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                mode="outlined"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                style={{ marginBottom: 10 }}
                left={<TextInput.Icon icon="lock-check" />}
                accessibilityLabel="Confirm password input"
              />
              {confirmPasswordError ? (
                <Text style={styles.errorText}>{confirmPasswordError}</Text>
              ) : null}
              <Button
                mode="contained"
                onPress={handleSignUp}
                loading={isLoading}
                disabled={isLoading}
                style={{ marginBottom: 20, paddingVertical: 8 }}
                accessibilityLabel="Sign up button"
              >
                Sign Up
              </Button>
              <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: '#666' }}>Already have an account?</Text>
                <Button
                  mode="text"
                  onPress={navigateToSignIn}
                  style={{ padding: 0 }}
                  textColor="#3B82F6"
                  accessibilityLabel="Navigate to sign in"
                >
                  Sign In
                </Button>
              </View>
            </Card.Content>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>

      {Platform.OS !== 'web' && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={showConfirmationModal}
          onRequestClose={() => setShowConfirmationModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text variant="headlineSmall" style={styles.modalTitle}>
                Verify Your Email
              </Text>
              <Text variant="bodyMedium" style={styles.modalMessage}>
                We've sent a confirmation link to your email address. Please check your inbox and verify your account before signing in.
              </Text>
              <Button
                mode="contained"
                onPress={() => {
                  setShowConfirmationModal(false);
                  router.replace('/auth/signin');
                }}
                style={styles.modalButton}
              >
                Go to Sign In
              </Button>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  errorText: {
    color: '#B00020',
    marginBottom: 10,
    marginLeft: 5,
    fontSize: 12,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    marginBottom: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalMessage: {
    marginBottom: 20,
    textAlign: 'center',
    color: '#666',
  },
  modalButton: {
    width: '100%',
    paddingVertical: 5,
  },
});
