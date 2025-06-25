import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Card, Button, Surface } from 'react-native-paper';
import { Clock, DollarSign, Check } from 'lucide-react-native';
import { ServiceBundle } from '@/lib/types';

interface ServiceBundleCardProps {
  bundle: ServiceBundle;
  onPress?: (bundle: ServiceBundle) => void;
  onBook?: (bundle: ServiceBundle) => void;
}

const ServiceBundleCard: React.FC<ServiceBundleCardProps> = ({ bundle, onPress, onBook }) => {
  const formatPrice = () => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: bundle.currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(bundle.price);
  };
  
  const handlePress = () => {
    if (onPress) {
      onPress(bundle);
    }
  };
  
  const handleBook = () => {
    if (onBook) {
      onBook(bundle);
    }
  };
  
  return (
    <Card style={styles.card} onPress={handlePress}>
      <Card.Content style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{bundle.title}</Text>
          <Surface style={styles.priceBadge}>
            <Text style={styles.priceText}>{formatPrice()}</Text>
          </Surface>
        </View>
        
        <Text style={styles.description}>{bundle.description}</Text>
        
        {bundle.delivery_time && (
          <View style={styles.deliveryContainer}>
            <Clock size={16} color="#6B7280" />
            <Text style={styles.deliveryText}>
              Delivery in {bundle.delivery_time} {bundle.delivery_time === 1 ? 'day' : 'days'}
            </Text>
          </View>
        )}
        
        <Button 
          mode="contained" 
          onPress={handleBook}
          style={styles.bookButton}
          icon={({ size, color }) => <Check size={size} color={color} />}
        >
          Book This Package
        </Button>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    backgroundColor: 'white',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  priceBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    elevation: 0,
  },
  priceText: {
    color: '#3B82F6',
    fontWeight: 'bold',
  },
  description: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 12,
    lineHeight: 20,
  },
  deliveryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  deliveryText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  bookButton: {
    backgroundColor: '#3B82F6',
  },
});

export default ServiceBundleCard;