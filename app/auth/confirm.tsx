import React, { useEffect, useState } from 'react';
import { View, SafeAreaView } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { AuthService } from '../../lib/supabaseService';

export default function ConfirmScreen() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const params = useLocalSearchParams<{ token: string; type: string }>();

  useEffect(() => {
    const confirmUser = async () => {
      const { token, type } = params;

      if (!token || type !== 'signup') {
        setStatus('error');
        setMessage('Invalid confirmation link. Please check the URL or request a new confirmation email.');
        return;
      }

      try {
        const { data, error } = await AuthService.confirmSignUp(token);

        if (error) {
          setStatus('error');
          setMessage(error.message || 'Failed to confirm your account. Please try again or request a new link.');
          return;
        }

        if (data) {
          setStatus('success');
          setMessage('Your account has been successfully confirmed. You can now sign in.');
        }
      } catch (err) {
        console.error('Confirmation error:', err);
        setStatus('error');
        setMessage('An unexpected error occurred. Please try again or contact support.');
      }
    };

    confirmUser();
  }, [params]);

  const handleGoToSignIn = () => {
    router.replace('/auth/signin');
  };

  return (
    <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
      <View style={{ padding: 20, width: '90%', maxWidth: 400 }}>
        <Text variant="headlineMedium" style={{ textAlign: 'center', marginBottom: 20 }}>
          {status === 'loading' ? 'Verifying...' : status === 'success' ? 'Account Confirmed!' : 'Error'}
        </Text>
        <Text variant="bodyLarge" style={{ textAlign: 'center', marginBottom: 30, color: '#666' }}>
          {message}
        </Text>
        {status !== 'loading' && (
          <Button
            mode="contained"
            onPress={handleGoToSignIn}
            style={{ width: '100%', paddingVertical: 5 }}
          >
            Go to Sign In
          </Button>
        )}
      </View>
    </SafeAreaView>
  );
}
