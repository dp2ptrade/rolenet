import React, { useEffect, useState } from 'react';
import { View, SafeAreaView } from 'react-native';
import { Text, Button, TextInput } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { AuthService } from '../../lib/supabaseService';

export default function ResetPasswordScreen() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const params = useLocalSearchParams<{ token: string; type: string }>();

  useEffect(() => {
    const validateLink = async () => {
      const { token, type } = params;

      if (!token || type !== 'recovery') {
        setStatus('error');
        setMessage('Invalid reset password link. Please check the URL or request a new reset email.');
        return;
      }

      setStatus('ready');
      setMessage('Enter your new password below to reset your account access.');
    };

    validateLink();
  }, [params]);

  const handleResetPassword = async () => {
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      return;
    }

    setStatus('loading');
    setPasswordError('');

    try {
      const { data, error } = await AuthService.resetPassword(params.token, password);

      if (error) {
        setStatus('error');
        setMessage(error.message || 'Failed to reset your password. Please try again or request a new link.');
        return;
      }

      if (data) {
        setStatus('success');
        setMessage('Your password has been successfully reset. You can now sign in with your new password.');
      }
    } catch (err) {
      console.error('Password reset error:', err);
      setStatus('error');
      setMessage('An unexpected error occurred. Please try again or contact support.');
    }
  };

  const handleGoToSignIn = () => {
    router.replace('/auth/signin');
  };

  return (
    <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
      <View style={{ padding: 20, width: '90%', maxWidth: 400 }}>
        <Text variant="headlineMedium" style={{ textAlign: 'center', marginBottom: 20 }}>
          {status === 'loading' ? 'Processing...' : status === 'ready' ? 'Reset Password' : status === 'success' ? 'Password Reset!' : 'Error'}
        </Text>
        <Text variant="bodyLarge" style={{ textAlign: 'center', marginBottom: 30, color: '#666' }}>
          {message}
        </Text>
        {status === 'ready' && (
          <>
            <TextInput
              label="New Password"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              secureTextEntry
              style={{ marginBottom: 15 }}
            />
            <TextInput
              label="Confirm New Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              mode="outlined"
              secureTextEntry
              style={{ marginBottom: 15 }}
              error={!!passwordError}
            />
            {passwordError ? (
              <Text style={{ color: 'red', textAlign: 'center', marginBottom: 15 }}>{passwordError}</Text>
            ) : null}
            <Button
              mode="contained"
              onPress={handleResetPassword}
              style={{ width: '100%', paddingVertical: 5, marginTop: 10 }}
            >
              Reset Password
            </Button>
          </>
        )}
        {status === 'success' || status === 'error' ? (
          <Button
            mode="contained"
            onPress={handleGoToSignIn}
            style={{ width: '100%', paddingVertical: 5, marginTop: 10 }}
          >
            Go to Sign In
          </Button>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
