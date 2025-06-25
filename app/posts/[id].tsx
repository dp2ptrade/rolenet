import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Image, Dimensions, TouchableOpacity } from 'react-native';
import { Text, Button, Chip, Divider, IconButton, Surface, FAB, Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { usePostStore } from '@/stores/usePostStore';
import { useUserStore } from '@/stores/useUserStore';
import { Star, MapPin, Clock, Briefcase, Tag, Bookmark, BookmarkCheck, MessageSquare, Calendar, Award, Zap, CreditCard as Edit, Share2, ChevronLeft, Heart } from 'lucide-react-native';
import ServiceBundleCard from '@/components/ServiceBundleCard';
import CaseStudyCard from '@/components/CaseStudyCard';
import AvailabilityCalendar from '@/components/AvailabilityCalendar';
import AnimatedStatusDot from '@/components/AnimatedStatusDot';
import { formatDistanceToNow } from 'date-fns';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { loadPost, currentPost, isLoading, isPostBookmarked, bookmarkPost, unbookmarkPost } = usePostStore();
  const { user } = useUserStore();
  
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  useEffect(() => {
    if (id) {
      loadPost(id);
    }
  }, [id]);
  
  useEffect(() => {
    const checkBookmark = async () => {
      if (user?.id && currentPost?.id) {
        const bookmarked = await isPostBookmarked(user.id, currentPost.id);
        setIsBookmarked(bookmarked);
      }
    };
    
    checkBookmark();
  }, [user?.id, currentPost?.id]);
  
  const handleBookmarkToggle = async () => {
    if (!user?.id || !currentPost?.id) return;
    
    setBookmarkLoading(true);
    try {
      if (isBookmarked) {
        await unbookmarkPost(user.id, currentPost.id);
        setIsBookmarked(false);
        showSnackbar('Post removed from bookmarks');
      } else {
        await bookmarkPost(user.id, currentPost.id);
        setIsBookmarked(true);
        showSnackbar('Post bookmarked');
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      showSnackbar('Failed to update bookmark');
    } finally {
      setBookmarkLoading(false);
    }
  };
  
  const handleChatPress = () => {
    if (currentPost?.user) {
      router.push({
        pathname: '/chat',
        params: {
          userId: currentPost.user.id,
          userName: currentPost.user.name,
          userRole: currentPost.user.role,
          userAvatar: currentPost.user.avatar
        }
      });
    }
  };
  
  const handleBookPress = () => {
    // Scroll to availability calendar
    // In a real app, this would navigate to a booking screen
    showSnackbar('Scroll down to see availability');
  };
  
  const handleEditPost = () => {
    router.push({
      pathname: '/posts/edit',
      params: { id: currentPost?.id }
    });
  };
  
  const handleSharePost = () => {
    // In a real app, this would use the Share API
    showSnackbar('Sharing functionality would be implemented here');
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
  
  const getExperienceBadgeColor = () => {
    if (!currentPost) return '#3B82F6';
    
    switch (currentPost.experience_level) {
      case 'junior': return '#10B981';
      case 'mid': return '#3B82F6';
      case 'senior': return '#8B5CF6';
      default: return '#3B82F6';
    }
  };
  
  const getServiceTypeBadgeColor = () => {
    if (!currentPost) return '#F59E0B';
    
    switch (currentPost.service_type) {
      case 'one-time': return '#F59E0B';
      case 'long-term': return '#EF4444';
      case 'consulting': return '#06B6D4';
      case 'coaching': return '#EC4899';
      default: return '#F59E0B';
    }
  };
  
  const getAvailabilityStatusColor = () => {
    if (!currentPost) return '#10B981';
    
    switch (currentPost.availability_status) {
      case 'available': return '#10B981';
      case 'limited': return '#F59E0B';
      case 'unavailable': return '#EF4444';
      default: return '#10B981';
    }
  };
  
  if (isLoading || !currentPost) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading post...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  const isOwner = user?.id === currentPost.user_id;
  const formattedDate = formatDistanceToNow(new Date(currentPost.created_at), { addSuffix: true });
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header with back button and actions */}
        <View style={styles.headerActions}>
          <IconButton
            icon={({ size, color }) => <ChevronLeft size={size} color={color} />}
            size={24}
            onPress={() => router.back()}
            style={styles.backButton}
          />
          
          <View style={styles.headerButtons}>
            <IconButton
              icon={({ size, color }) => 
                isBookmarked ? 
                  <BookmarkCheck size={size} color="#3B82F6" /> : 
                  <Bookmark size={size} color={color} />
              }
              size={24}
              onPress={handleBookmarkToggle}
              disabled={bookmarkLoading}
              style={styles.actionButton}
            />
            
            <IconButton
              icon={({ size, color }) => <Share2 size={size} color={color} />}
              size={24}
              onPress={handleSharePost}
              style={styles.actionButton}
            />
            
            {isOwner && (
              <IconButton
                icon={({ size, color }) => <Edit size={size} color={color} />}
                size={24}
                onPress={handleEditPost}
                style={styles.actionButton}
              />
            )}
          </View>
        </View>
        
        {/* Featured badge */}
        {currentPost.is_featured && (
          <View style={styles.featuredContainer}>
            <LinearGradient
              colors={['#3B82F6', '#06B6D4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.featuredBadge}
            >
              <Zap size={16} color="white" />
              <Text style={styles.featuredText}>Featured</Text>
            </LinearGradient>
          </View>
        )}
        
        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{currentPost.title}</Text>
          
          {currentPost.ai_match_score && (
            <View style={styles.matchScoreContainer}>
              <LinearGradient
                colors={['#3B82F6', '#06B6D4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.matchScoreBadge}
              >
                <Text style={styles.matchScoreText}>{currentPost.ai_match_score}% Match</Text>
              </LinearGradient>
            </View>
          )}
        </View>
        
        {/* User info */}
        <Surface style={styles.userCard}>
          <View style={styles.userInfo}>
            {currentPost.user && (
              <TouchableOpacity 
                style={styles.avatarContainer}
                onPress={() => router.push(`/public-profile?userId=${currentPost.user?.id}`)}
              >
                <Image 
                  source={{ uri: currentPost.user.avatar || 'https://via.placeholder.com/50' }} 
                  style={styles.avatar} 
                />
                <View style={styles.statusIndicator}>
                  <AnimatedStatusDot 
                    status={currentPost.user.online_status || 'offline'} 
                    size={10} 
                  />
                </View>
              </TouchableOpacity>
            )}
            
            <View style={styles.userDetails}>
              <View style={styles.userNameRow}>
                <Text style={styles.userName}>{currentPost.user?.name || 'Unknown User'}</Text>
                {currentPost.is_verified && (
                  <View style={styles.verifiedBadge}>
                    <Award size={16} color="#3B82F6" />
                  </View>
                )}
              </View>
              <Text style={styles.userRole}>{currentPost.user?.role || currentPost.category}</Text>
              
              <View style={styles.userStats}>
                <View style={styles.ratingContainer}>
                  <Star size={16} color="#F59E0B" fill="#F59E0B" />
                  <Text style={styles.ratingText}>
                    {currentPost.user?.rating || 0} ({currentPost.user?.rating_count || 0})
                  </Text>
                </View>
                
                {currentPost.projects_completed > 0 && (
                  <View style={styles.projectsContainer}>
                    <Briefcase size={14} color="#6B7280" />
                    <Text style={styles.projectsText}>{currentPost.projects_completed} projects</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
          
          <View style={styles.userActions}>
            <Button 
              mode="contained" 
              onPress={handleChatPress}
              style={styles.chatButton}
              icon={({ size, color }) => <MessageSquare size={size} color={color} />}
            >
              Chat
            </Button>
          </View>
        </Surface>
        
        {/* Media gallery */}
        {currentPost.media_urls && currentPost.media_urls.length > 0 && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.mediaGallery}
            contentContainerStyle={styles.mediaGalleryContent}
          >
            {currentPost.media_urls.map((url, index) => (
              <Image 
                key={index} 
                source={{ uri: url }} 
                style={styles.mediaImage} 
              />
            ))}
          </ScrollView>
        )}
        
        {/* Details */}
        <View style={styles.detailsContainer}>
          {/* Location and availability */}
          <View style={styles.locationContainer}>
            <View style={styles.locationRow}>
              <MapPin size={16} color="#6B7280" />
              <Text style={styles.locationText}>
                {currentPost.is_remote ? 'Remote' : currentPost.location?.address || 'Location not specified'}
                {currentPost.is_remote && currentPost.location?.address && ` / ${currentPost.location.address}`}
              </Text>
            </View>
            
            <View style={styles.availabilityRow}>
              <Clock size={16} color={getAvailabilityStatusColor()} />
              <Text style={[styles.availabilityText, { color: getAvailabilityStatusColor() }]}>
                {currentPost.availability_status === 'available' ? 'Available now' : 
                 currentPost.availability_status === 'limited' ? 'Limited availability' : 
                 'Currently unavailable'}
                {currentPost.availability_date && ` (from ${new Date(currentPost.availability_date).toLocaleDateString()})`}
              </Text>
            </View>
          </View>
          
          {/* Price and badges */}
          <View style={styles.priceAndBadges}>
            <Surface style={styles.priceCard}>
              <Text style={styles.priceLabel}>Price:</Text>
              <Text style={styles.price}>{formatPrice()}</Text>
            </Surface>
            
            <View style={styles.badgesContainer}>
              <Chip 
                style={[styles.badge, { backgroundColor: getExperienceBadgeColor() + '20' }]}
                textStyle={{ color: getExperienceBadgeColor() }}
              >
                {currentPost.experience_level}
              </Chip>
              <Chip 
                style={[styles.badge, { backgroundColor: getServiceTypeBadgeColor() + '20' }]}
                textStyle={{ color: getServiceTypeBadgeColor() }}
              >
                {currentPost.service_type}
              </Chip>
            </View>
          </View>
          
          {/* Description */}
          <View style={styles.descriptionContainer}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{currentPost.description}</Text>
          </View>
          
          {/* Tags */}
          <View style={styles.tagsContainer}>
            <Text style={styles.sectionTitle}>
              <Tag size={16} color="#374151" /> Tags
            </Text>
            <View style={styles.tagsList}>
              {currentPost.tags.map((tag, index) => (
                <Chip 
                  key={index} 
                  style={styles.tag}
                  textStyle={styles.tagText}
                >
                  {tag}
                </Chip>
              ))}
            </View>
          </View>
          
          {/* Service bundles */}
          {currentPost.service_bundles && currentPost.service_bundles.length > 0 && (
            <View style={styles.bundlesContainer}>
              <Text style={styles.sectionTitle}>Service Packages</Text>
              {currentPost.service_bundles.map((bundle) => (
                <ServiceBundleCard 
                  key={bundle.id} 
                  bundle={bundle} 
                  onBook={() => showSnackbar('Package booking would be implemented here')}
                />
              ))}
            </View>
          )}
          
          {/* Case studies */}
          {currentPost.case_studies && currentPost.case_studies.length > 0 && (
            <View style={styles.caseStudiesContainer}>
              <Text style={styles.sectionTitle}>Case Studies</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.caseStudiesContent}
              >
                {currentPost.case_studies.map((caseStudy) => (
                  <CaseStudyCard 
                    key={caseStudy.id} 
                    caseStudy={caseStudy} 
                    onPress={() => showSnackbar('Case study details would be shown here')}
                  />
                ))}
              </ScrollView>
            </View>
          )}
          
          {/* Availability calendar */}
          <View style={styles.availabilityContainer}>
            <Text style={styles.sectionTitle}>Availability</Text>
            <AvailabilityCalendar 
              postId={currentPost.id} 
              onSlotBooked={() => showSnackbar('Slot booked successfully!')}
            />
          </View>
          
          {/* Post info */}
          <View style={styles.postInfoContainer}>
            <Text style={styles.postInfoText}>
              Posted {formattedDate} • Viewed {currentPost.view_count} times
            </Text>
          </View>
        </View>
      </ScrollView>
      
      {/* Floating action buttons */}
      <View style={styles.fabContainer}>
        <Button 
          mode="contained" 
          onPress={handleBookPress}
          style={styles.bookButton}
          icon={({ size, color }) => <Calendar size={size} color={color} />}
        >
          Book Now
        </Button>
        
        <Button 
          mode="outlined" 
          onPress={handleChatPress}
          style={styles.messageButton}
          icon={({ size, color }) => <MessageSquare size={size} color={color} />}
        >
          Message
        </Button>
      </View>
      
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

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  headerButtons: {
    flexDirection: 'row',
  },
  actionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    margin: 4,
  },
  featuredContainer: {
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    marginTop: 8,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  featuredText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  titleContainer: {
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  matchScoreContainer: {
    marginTop: 8,
  },
  matchScoreBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  matchScoreText: {
    color: 'white',
    fontWeight: 'bold',
  },
  userCard: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'white',
    elevation: 2,
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  userDetails: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  verifiedBadge: {
    marginLeft: 4,
  },
  userRole: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  userStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  ratingText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  projectsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  projectsText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  userActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  chatButton: {
    backgroundColor: '#3B82F6',
  },
  mediaGallery: {
    marginBottom: 16,
  },
  mediaGalleryContent: {
    paddingHorizontal: 16,
  },
  mediaImage: {
    width: width * 0.8,
    height: 200,
    borderRadius: 12,
    marginRight: 16,
  },
  detailsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100, // Space for FAB
  },
  locationContainer: {
    marginBottom: 16,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  availabilityText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  priceAndBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  priceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    elevation: 1,
  },
  priceLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 8,
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  badgesContainer: {
    flexDirection: 'row',
    marginLeft: 'auto',
  },
  badge: {
    marginLeft: 8,
  },
  descriptionContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1F2937',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#4B5563',
  },
  tagsContainer: {
    marginBottom: 24,
  },
  tagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#EFF6FF',
  },
  tagText: {
    color: '#3B82F6',
  },
  bundlesContainer: {
    marginBottom: 24,
  },
  caseStudiesContainer: {
    marginBottom: 24,
  },
  caseStudiesContent: {
    paddingVertical: 8,
  },
  availabilityContainer: {
    marginBottom: 24,
  },
  postInfoContainer: {
    marginTop: 8,
    marginBottom: 24,
  },
  postInfoText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  bookButton: {
    flex: 2,
    marginRight: 8,
    backgroundColor: '#3B82F6',
  },
  messageButton: {
    flex: 1,
    marginLeft: 8,
    borderColor: '#3B82F6',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#6B7280',
  },
});