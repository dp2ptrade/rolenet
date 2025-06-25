import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Appbar, Button, Card, TextInput, Chip, Divider, RadioButton, Surface, Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { usePostStore } from '@/stores/usePostStore';
import { useUserStore } from '@/stores/useUserStore';
import { Calendar, Clock, CreditCard, MessageSquare } from 'lucide-react-native';
import AvailabilityCalendar from '@/components/AvailabilityCalendar';
import { AvailabilitySlot } from '@/lib/types';

export default function BookPostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { loadPost, currentPost, isLoading } = usePostStore();
  const { user } = useUserStore();
  
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [message, setMessage] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  useEffect(() => {
    if (id) {
      loadPost(id);
    }
  }, [id]);
  
  const handleSlotSelected = (slot: AvailabilitySlot) => {
    setSelectedSlot(slot);
  };
  
  const handleSubmit = () => {
    if (!user) {
      showSnackbar('Please sign in to book this service');
      return;
    }
    
    if (!selectedSlot) {
      showSnackbar('Please select a time slot');
      return;
    }
    
    setIsSubmitting(true);
    
    // Simulate booking process
    setTimeout(() => {
      setIsSubmitting(false);
      showSnackbar('Booking successful!');
      
      // Navigate back to post detail after a delay
      setTimeout(() => {
        router.back();
      }, 1500);
    }, 2000);
  };
  
  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };
  
  const formatPrice = () => {
    if (!currentPost) return '';
    
    if (currentPost.price_type === 'free') return 'Free';
    if (currentPost.price_type === 'contact') return 'Contact for Price';
    
    const formattedPrice = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currentPost.currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(currentPost.price || 0);
    
    return `${formattedPrice}${currentPost.price_type === 'hourly' ? '/hr' : ''}`;
  };
  
  if (isLoading || !currentPost) {
    return (
      <SafeAreaView style={styles.container}>
        <Appbar.Header style={styles.header}>
          <Appbar.BackAction onPress={() => router.back()} />
          <Appbar.Content title="Book Service" />
        </Appbar.Header>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading booking details...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Book Service" />
      </Appbar.Header>
      
      <ScrollView style={styles.scrollView}>
        <Card style={styles.serviceCard}>
          <Card.Content>
            <Text style={styles.serviceTitle}>{currentPost.title}</Text>
            <View style={styles.serviceDetails}>
              <Text style={styles.serviceProvider}>
                By {currentPost.user?.name || 'Unknown Provider'}
              </Text>
              <Text style={styles.servicePrice}>{formatPrice()}</Text>
            </View>
          </Card.Content>
        </Card>
        
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>
            <Calendar size={20} color="#374151" /> Select Date & Time
          </Text>
          <AvailabilityCalendar 
            postId={currentPost.id} 
            onSlotBooked={handleSlotSelected}
          />
        </View>
        
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>
            <MessageSquare size={20} color="#374151" /> Message to Provider
          </Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Describe your requirements or ask questions..."
            mode="outlined"
            multiline
            numberOfLines={4}
            style={styles.messageInput}
          />
        </View>
        
        {currentPost.price_type !== 'free' && currentPost.price_type !== 'contact' && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>
              <CreditCard size={20} color="#374151" /> Payment Method
            </Text>
            <RadioButton.Group onValueChange={value => setPaymentMethod(value)} value={paymentMethod}>
              <View style={styles.paymentOption}>
                <RadioButton value="card" />
                <Text>Credit/Debit Card</Text>
              </View>
              <View style={styles.paymentOption}>
                <RadioButton value="paypal" />
                <Text>PayPal</Text>
              </View>
              <View style={styles.paymentOption}>
                <RadioButton value="bank" />
                <Text>Bank Transfer</Text>
              </View>
            </RadioButton.Group>
          </View>
        )}
        
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Booking Summary</Text>
          <Divider style={styles.divider} />
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Service:</Text>
            <Text style={styles.summaryValue}>{currentPost.title}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Price:</Text>
            <Text style={styles.summaryValue}>{formatPrice()}</Text>
          </View>
          
          {selectedSlot && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Time Slot:</Text>
              <Text style={styles.summaryValue}>
                {new Date(selectedSlot.start_time).toLocaleDateString()} at {new Date(selectedSlot.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          )}
          
          <Divider style={styles.divider} />
          
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalValue}>{formatPrice()}</Text>
          </View>
        </View>
        
        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={isSubmitting}
          disabled={isSubmitting || !selectedSlot}
          style={styles.bookButton}
          contentStyle={styles.bookButtonContent}
        >
          Confirm Booking
        </Button>
        
        <Text style={styles.disclaimer}>
          By confirming, you agree to our Terms of Service and Booking Policy.
        </Text>
      </ScrollView>
      
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        {snackbarMessage}
      </Snackbar>
    </SafeAreaView>
  );
}

// Import ActivityIndicator
import { ActivityIndicator } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: 'transparent',
    elevation: 0,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  serviceCard: {
    marginBottom: 24,
    borderRadius: 12,
    elevation: 2,
  },
  serviceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  serviceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceProvider: {
    fontSize: 14,
    color: '#6B7280',
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1F2937',
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageInput: {
    backgroundColor: 'white',
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    elevation: 1,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1F2937',
  },
  divider: {
    marginVertical: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 14,
    color: '#1F2937',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  bookButton: {
    marginBottom: 16,
    backgroundColor: '#3B82F6',
    paddingVertical: 8,
  },
  bookButtonContent: {
    paddingVertical: 4,
  },
  disclaimer: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#6B7280',
  },
});