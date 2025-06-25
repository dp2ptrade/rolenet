import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useChatStore } from '@/stores/useChatStore';
import { useUserStore } from '@/stores/useUserStore';
import { AppError } from '@/lib/errors';

/**
 * Example component demonstrating the new error handling patterns
 * and enhanced type safety from Phase 1 improvements
 */
export const EnhancedChatExample: React.FC = () => {
  const [messageText, setMessageText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const chatStore = useChatStore();
  const currentUser = useUserStore((state) => state.user);
  
  const handleSendMessage = async () => {
    if (!messageText.trim() || !currentUser?.id) {
      Alert.alert('Validation Error', 'Please enter a message and ensure you are logged in.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Using the enhanced sendMessage method with proper error handling
      await chatStore.sendMessage({
        chatId: 'example-chat-id', // In real usage, this would come from props or context
        senderId: currentUser.id,
        text: messageText.trim(),
        type: 'text'
      });
      
      // Message sent successfully - updates handled through store
      setMessageText('');
      Alert.alert('Success', 'Message sent successfully!');
    } catch (error) {
      // Handle unexpected errors
      console.error('Unexpected error in handleSendMessage:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleLoadMessages = async () => {
    if (!currentUser?.id) {
      Alert.alert('Error', 'Please log in to load messages.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      await chatStore.loadChatMessages('example-chat-id');
      
      Alert.alert('Success', 'Messages loaded successfully!');
    } catch (error) {
      console.error('Unexpected error in handleLoadMessages:', error);
      Alert.alert('Error', 'An unexpected error occurred while loading messages.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Display current error state from the store
  const currentError = chatStore.error;
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enhanced Chat Example</Text>
      <Text style={styles.subtitle}>Demonstrating Phase 1 Improvements</Text>
      
      {/* Error Display */}
      {currentError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Error: {currentError}
          </Text>
          <TouchableOpacity 
            style={styles.clearErrorButton}
            onPress={() => chatStore.clearError()}
          >
            <Text style={styles.clearErrorText}>Clear Error</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Message Input */}
      <TextInput
        style={styles.input}
        value={messageText}
        onChangeText={setMessageText}
        placeholder="Type your message..."
        multiline
        editable={!isLoading}
      />
      
      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleSendMessage}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Sending...' : 'Send Message'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton, isLoading && styles.buttonDisabled]}
          onPress={handleLoadMessages}
          disabled={isLoading}
        >
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>
            {isLoading ? 'Loading...' : 'Load Messages'}
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Loading State */}
      {chatStore.isLoading && (
        <Text style={styles.loadingText}>Store is loading...</Text>
      )}
      
      {/* Feature List */}
      <View style={styles.featureList}>
        <Text style={styles.featureTitle}>Phase 1 Features Demonstrated:</Text>
        <Text style={styles.featureItem}>• Enhanced error handling with AppError class</Text>
        <Text style={styles.featureItem}>• Type-safe API responses with ApiResult</Text>
        <Text style={styles.featureItem}>• Input validation with user-friendly messages</Text>
        <Text style={styles.featureItem}>• Centralized error state management</Text>
        <Text style={styles.featureItem}>• Proper error logging and debugging</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
    marginBottom: 8,
  },
  clearErrorButton: {
    alignSelf: 'flex-start',
  },
  clearErrorText: {
    color: '#1976d2',
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    marginBottom: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  button: {
    flex: 1,
    backgroundColor: '#1976d2',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#1976d2',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#1976d2',
  },
  loadingText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  featureList: {
    backgroundColor: '#e8f5e8',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 8,
  },
  featureItem: {
    fontSize: 14,
    color: '#388e3c',
    marginBottom: 4,
  },
});

export default EnhancedChatExample;