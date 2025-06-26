import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Surface, Button, Card, Divider } from 'react-native-paper';
import { AvailabilitySlot, Post } from '@/lib/types';
import { usePostStore } from '@/stores/usePostStore';
import { useUserStore } from '@/stores/useUserStore';
import { format, addDays, isSameDay, isAfter, isBefore, startOfDay } from 'date-fns';
import { Calendar, Clock, Check } from 'lucide-react-native';

interface AvailabilityCalendarProps {
  postId: string;
  onSlotBooked?: (slot: AvailabilitySlot) => void;
}

const AvailabilityCalendar: React.FC<AvailabilityCalendarProps> = ({ postId, onSlotBooked }) => {
  const { user } = useUserStore();
  const { bookAvailabilitySlot } = usePostStore();
  
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [bookingSlot, setBookingSlot] = useState<string | null>(null);
  
  // Generate next 7 days for the calendar
  const days = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));
  
  // Load availability slots
  useEffect(() => {
    const loadSlots = async () => {
      setLoading(true);
      try {
        // In a real app, this would fetch from the API
        // For demo purposes, we'll generate some sample slots
        const sampleSlots: AvailabilitySlot[] = [];
        
        // Generate slots for the next 7 days
        for (let i = 0; i < 7; i++) {
          const date = addDays(new Date(), i);
          
          // Generate 3 slots per day
          for (let hour = 9; hour < 17; hour += 3) {
            const startTime = new Date(date);
            startTime.setHours(hour, 0, 0, 0);
            
            const endTime = new Date(date);
            endTime.setHours(hour + 1, 0, 0, 0);
            
            // Randomly mark some as booked
            const isBooked = Math.random() > 0.7;
            
            sampleSlots.push({
              id: `slot-${i}-${hour}`,
              post_id: postId,
              start_time: startTime,
              end_time: endTime,
              is_booked: isBooked,
              booked_by: isBooked ? 'some-user-id' : undefined,
              created_at: new Date(),
              updated_at: new Date()
            });
          }
        }
        
        setAvailabilitySlots(sampleSlots);
      } catch (error) {
        console.error('Error loading availability slots:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadSlots();
  }, [postId]);
  
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };
  
  const handleBookSlot = async (slotId: string) => {
    if (!user) {
      alert('Please sign in to book a slot');
      return;
    }
    
    setBookingSlot(slotId);
    
    try {
      const bookedSlot = await bookAvailabilitySlot(slotId, user.id);
      
      if (bookedSlot) {
        // Update local state
        setAvailabilitySlots(slots => 
          slots.map(slot => 
            slot.id === slotId 
              ? { ...slot, is_booked: true, booked_by: user.id } 
              : slot
          )
        );
        
        if (onSlotBooked) {
          onSlotBooked(bookedSlot);
        }
        
        alert('Slot booked successfully!');
      }
    } catch (error) {
      console.error('Error booking slot:', error);
      alert('Failed to book slot. Please try again.');
    } finally {
      setBookingSlot(null);
    }
  };
  
  // Filter slots for selected date
  const filteredSlots = availabilitySlots.filter(slot => 
    isSameDay(new Date(slot.start_time), selectedDate)
  );
  
  // Sort slots by start time
  const sortedSlots = filteredSlots.sort((a, b) => 
    new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );
  
  return (
    <View style={styles.container}>
      <Text variant="titleMedium" style={styles.title}>
        <Calendar size={18} color="#3B82F6" /> Available Time Slots
      </Text>
      
      {/* Date selector */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.dateScrollView}
        contentContainerStyle={styles.dateScrollContent}
      >
        {days.map((day, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.dateItem,
              isSameDay(day, selectedDate) && styles.selectedDateItem
            ]}
            onPress={() => handleDateSelect(day)}
          >
            <Text style={[
              styles.dayName,
              isSameDay(day, selectedDate) && styles.selectedDateText
            ]}>
              {format(day, 'EEE')}
            </Text>
            <Text style={[
              styles.dayNumber,
              isSameDay(day, selectedDate) && styles.selectedDateText
            ]}>
              {format(day, 'd')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      {/* Time slots */}
      <Card style={styles.slotsCard}>
        <Card.Content>
          <Text style={styles.selectedDateTitle}>
            {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </Text>
          
          <Divider style={styles.divider} />
          
          {loading ? (
            <Text style={styles.loadingText}>Loading availability...</Text>
          ) : sortedSlots.length === 0 ? (
            <Text style={styles.noSlotsText}>No available slots for this date</Text>
          ) : (
            <View style={styles.slotsContainer}>
              {sortedSlots.map((slot) => (
                <Surface 
                  key={slot.id} 
                  style={[
                    styles.slotItem,
                    slot.is_booked && styles.bookedSlot
                  ]}
                  elevation={1}
                >
                  <View style={styles.slotTimeContainer}>
                    <Clock size={16} color="#6B7280" />
                    <Text style={styles.slotTime}>
                      {format(new Date(slot.start_time), 'h:mm a')} - {format(new Date(slot.end_time), 'h:mm a')}
                    </Text>
                  </View>
                  
                  {slot.is_booked ? (
                    <Text style={styles.bookedText}>Booked</Text>
                  ) : (
                    <Button
                      mode="contained"
                      onPress={() => handleBookSlot(slot.id)}
                      loading={bookingSlot === slot.id}
                      disabled={bookingSlot === slot.id}
                      style={styles.bookButton}
                      contentStyle={styles.bookButtonContent}
                      icon={({ size, color }) => <Check size={size} color={color} />}
                    >
                      Book
                    </Button>
                  )}
                </Surface>
              ))}
            </View>
          )}
        </Card.Content>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  title: {
    marginBottom: 16,
    fontWeight: '600',
  },
  dateScrollView: {
    marginBottom: 16,
  },
  dateScrollContent: {
    paddingHorizontal: 4,
  },
  dateItem: {
    width: 60,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  selectedDateItem: {
    backgroundColor: '#3B82F6',
  },
  dayName: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
  },
  selectedDateText: {
    color: 'white',
  },
  slotsCard: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    backgroundColor: 'white',
  },
  selectedDateTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  divider: {
    marginBottom: 16,
  },
  loadingText: {
    textAlign: 'center',
    padding: 16,
    color: '#6B7280',
  },
  noSlotsText: {
    textAlign: 'center',
    padding: 16,
    color: '#6B7280',
  },
  slotsContainer: {
    gap: 8,
  },
  slotItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  bookedSlot: {
    backgroundColor: '#F3F4F6',
    opacity: 0.7,
  },
  slotTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  slotTime: {
    marginLeft: 8,
    fontSize: 14,
    color: '#374151',
  },
  bookedText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  bookButton: {
    backgroundColor: '#3B82F6',
  },
  bookButtonContent: {
    paddingHorizontal: 8,
  },
});

export default AvailabilityCalendar;