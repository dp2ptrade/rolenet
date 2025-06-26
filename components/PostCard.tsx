import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Text, Card, Button, Chip, Badge, Surface, IconButton } from 'react-native-paper';
import { Star, MapPin, Clock, Briefcase, Tag, Bookmark, BookmarkCheck, MessageSquare, Calendar, Award, Zap } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Post, User } from '@/lib/types';
import { useUserStore } from '@/stores/useUserStore';
import { usePostStore } from '@/stores/usePostStore';
import { router } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import AnimatedStatusDot from './AnimatedStatusDot';

interface PostCardProps {
  post: Post;
  onPress?: (post: Post) => void;
  onBookmark?: (post: Post) => void;
  onChat?: (post: Post) => void;
  onBook?: (post: Post) => void;
  compact?: boolean;
}

const PostCard: React.FC<PostCardProps> = ({ 
  post, 
  onPress, 
  onBookmark, 
  onChat, 
  onBook,
  compact = false
}) => {
  const { user: currentUser } = useUserStore();
  const { isPostBookmarked, bookmarkPost, unbookmarkPost } = usePostStore();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Check if post is bookmarked
  useEffect(() => {
    const checkBookmark = async () => {
      if (currentUser?.id && post.id) {
        const bookmarked = await isPostBookmarked(currentUser.id, post.id);
        setIsBookmarked(bookmarked);
      }
    };
    
    checkBookmark();
  }, [currentUser?.id, post.id]);
  
  const handleBookmarkToggle = async () => {
    if (!currentUser?.id) return;
    
    setLoading(true);
    try {
      if (isBookmarked) {
        await unbookmarkPost(currentUser.id, post.id);
        setIsBookmarked(false);
      } else {
        await bookmarkPost(currentUser.id, post.id);
        setIsBookmarked(true);
      }
      
      if (onBookmark) {
        onBookmark(post);
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handlePress = () => {
    if (onPress) {
      onPress(post);
    } else {
      router.push(`/posts/${post.id}`);
    }
  };
  
  const handleChatPress = () => {
    if (onChat) {
      onChat(post);
    } else if (post.user) {
      router.push({
        pathname: '/chat',
        params: {
          userId: post.user.id,
          userName: post.user.name,
          userRole: post.user.role,
          userAvatar: post.user.avatar
        }
      });
    }
  };
  
  const handleBookPress = () => {
    if (onBook) {
      onBook(post);
    } else {
      router.push(`/posts/${post.id}/book`);
    }
  };
  
  const formatPrice = () => {
    if (post.price_type === 'free') return 'Free';
    if (post.price_type === 'contact') return 'Contact for Price';
    
    const formattedPrice = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: post.currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(post.price || 0);
    
    return `${formattedPrice}${post.price_type === 'hourly' ? '/hr' : ''}`;
  };
  
  const getExperienceBadgeColor = () => {
    switch (post.experience_level) {
      case 'junior': return '#10B981';
      case 'mid': return '#3B82F6';
      case 'senior': return '#8B5CF6';
      default: return '#3B82F6';
    }
  };
  
  const getServiceTypeBadgeColor = () => {
    switch (post.service_type) {
      case 'one-time': return '#F59E0B';
      case 'long-term': return '#EF4444';
      case 'consulting': return '#06B6D4';
      case 'coaching': return '#EC4899';
      default: return '#F59E0B';
    }
  };
  
  const getAvailabilityStatusColor = () => {
    switch (post.availability_status) {
      case 'available': return '#10B981';
      case 'limited': return '#F59E0B';
      case 'unavailable': return '#EF4444';
      default: return '#10B981';
    }
  };
  
  // Format creation date
  const formattedDate = formatDistanceToNow(new Date(post.created_at), { addSuffix: true });
  
  if (compact) {
    return (
      <Card style={styles.compactCard} onPress={handlePress}>
        <Card.Content style={styles.compactContent}>
          <View style={styles.compactHeader}>
            <View style={styles.compactTitleContainer}>
              <Text numberOfLines={1} style={styles.compactTitle}>{post.title}</Text>
              {post.is_verified && (
                <View style={styles.verifiedBadge}>
                  <Award size={12} color="#3B82F6" />
                </View>
              )}
            </View>
            <Text style={styles.compactPrice}>{formatPrice()}</Text>
          </View>
          
          <View style={styles.compactTagsRow}>
            <Chip 
              style={[styles.compactChip, { backgroundColor: getExperienceBadgeColor() + '20' }]} 
              textStyle={{ color: getExperienceBadgeColor(), fontSize: 10 }}
            >
              {post.experience_level}
            </Chip>
            <Chip 
              style={[styles.compactChip, { backgroundColor: getServiceTypeBadgeColor() + '20' }]}
              textStyle={{ color: getServiceTypeBadgeColor(), fontSize: 10 }}
            >
              {post.service_type}
            </Chip>
          </View>
          
          <View style={styles.compactFooter}>
            <View style={styles.compactRating}>
              <Star size={12} color="#F59E0B" fill="#F59E0B" />
              <Text style={styles.compactRatingText}>{post.rating} ({post.rating_count})</Text>
            </View>
            <Text style={styles.compactDate}>{formattedDate}</Text>
          </View>
        </Card.Content>
      </Card>
    );
  }
  
  return (
    <Card style={styles.card} onPress={handlePress}>
      {post.is_featured && (
        <LinearGradient
          colors={['#3B82F6', '#06B6D4']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.featuredBanner}
        >
          <Zap size={12} color="white" />
          <Text style={styles.featuredText}>Featured</Text>
        </LinearGradient>
      )}
      
      <Card.Content style={styles.content}>
        {/* Header with user info */}
        <View style={styles.header}>
          <View style={styles.userInfo}>
            {post.user && (
              <TouchableOpacity 
                style={styles.avatarContainer}
                onPress={() => router.push(`/public-profile?userId=${post.user?.id}`)}
              >
                <Image 
                  source={{ uri: post.user.avatar || 'https://via.placeholder.com/50' }} 
                  style={styles.avatar} 
                />
                <View style={styles.statusIndicator}>
                  <AnimatedStatusDot 
                    status={post.user.online_status || 'offline'} 
                    size={8} 
                  />
                </View>
              </TouchableOpacity>
            )}
            
            <View style={styles.userDetails}>
              <View style={styles.userNameRow}>
                <Text style={styles.userName}>{post.user?.name || 'Unknown User'}</Text>
                {post.is_verified && (
                  <View style={styles.verifiedBadge}>
                    <Award size={14} color="#3B82F6" />
                  </View>
                )}
              </View>
              <Text style={styles.userRole}>{post.user?.role || post.category}</Text>
            </View>
          </View>
          
          <IconButton
            icon={({ size, color }) => 
              isBookmarked ? 
                <BookmarkCheck size={size} color="#3B82F6" /> : 
                <Bookmark size={size} color={color} />
            }
            size={20}
            onPress={handleBookmarkToggle}
            disabled={loading}
            style={styles.bookmarkButton}
          />
        </View>
        
        {/* Post title and match score */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{post.title}</Text>
          
          {post.ai_match_score && (
            <View style={styles.matchScoreContainer}>
              <LinearGradient
                colors={['#3B82F6', '#06B6D4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.matchScoreBadge}
              >
                <Text style={styles.matchScoreText}>{post.ai_match_score}% Match</Text>
              </LinearGradient>
            </View>
          )}
        </View>
        
        {/* Location and availability */}
        <View style={styles.locationContainer}>
          <View style={styles.locationRow}>
            <MapPin size={14} color="#6B7280" />
            <Text style={styles.locationText}>
              {post.is_remote ? 'Remote' : post.location?.address || 'Location not specified'}
              {post.is_remote && post.location?.address && ` / ${post.location.address}`}
            </Text>
          </View>
          
          <View style={styles.availabilityRow}>
            <Clock size={14} color={getAvailabilityStatusColor()} />
            <Text style={[styles.availabilityText, { color: getAvailabilityStatusColor() }]}>
              {post.availability_status === 'available' ? 'Available now' : 
               post.availability_status === 'limited' ? 'Limited availability' : 
               'Currently unavailable'}
            </Text>
          </View>
        </View>
        
        {/* Description */}
        <Text numberOfLines={3} style={styles.description}>
          {post.description}
        </Text>
        
        {/* Tags */}
        <View style={styles.tagsContainer}>
          <Tag size={14} color="#6B7280" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsScrollView}>
            {post.tags.map((tag, index) => (
              <Chip 
                key={index} 
                style={styles.tag}
                textStyle={styles.tagText}
              >
                {tag}
              </Chip>
            ))}
          </ScrollView>
        </View>
        
        {/* Price and experience level */}
        <View style={styles.detailsContainer}>
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Price:</Text>
            <Text style={styles.price}>{formatPrice()}</Text>
          </View>
          
          <View style={styles.badgesContainer}>
            <Chip 
              style={[styles.badge, { backgroundColor: getExperienceBadgeColor() + '20' }]}
              textStyle={{ color: getExperienceBadgeColor() }}
            >
              {post.experience_level}
            </Chip>
            <Chip 
              style={[styles.badge, { backgroundColor: getServiceTypeBadgeColor() + '20' }]}
              textStyle={{ color: getServiceTypeBadgeColor() }}
            >
              {post.service_type}
            </Chip>
          </View>
        </View>
        
        {/* Rating and projects */}
        <View style={styles.statsContainer}>
          <View style={styles.ratingContainer}>
            <Star size={16} color="#F59E0B" fill="#F59E0B" />
            <Text style={styles.ratingText}>{post.rating} ({post.rating_count})</Text>
          </View>
          
          {post.projects_completed > 0 && (
            <View style={styles.projectsContainer}>
              <Briefcase size={14} color="#6B7280" />
              <Text style={styles.projectsText}>{post.projects_completed} projects</Text>
            </View>
          )}
          
          <Text style={styles.dateText}>{formattedDate}</Text>
        </View>
        
        {/* Action buttons */}
        <View style={styles.actionsContainer}>
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
            style={styles.chatButton}
            icon={({ size, color }) => <MessageSquare size={size} color={color} />}
          >
            Chat
          </Button>
        </View>
      </Card.Content>
    </Card>
  );
};

const { width } = Dimensions.get('window');
const isSmallScreen = width < 380;

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
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  userRole: {
    fontSize: 12,
    color: '#6B7280',
  },
  verifiedBadge: {
    marginLeft: 4,
  },
  bookmarkButton: {
    marginLeft: 0,
  },
  titleContainer: {
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  matchScoreContainer: {
    marginTop: 4,
  },
  matchScoreBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  matchScoreText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  locationContainer: {
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  availabilityText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  description: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 12,
    lineHeight: 20,
  },
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tagsScrollView: {
    marginLeft: 8,
  },
  tag: {
    marginRight: 8,
    backgroundColor: '#EFF6FF',
  },
  tagText: {
    fontSize: 12,
    color: '#3B82F6',
  },
  detailsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  badgesContainer: {
    flexDirection: 'row',
  },
  badge: {
    marginLeft: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  ratingText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  projectsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  projectsText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 'auto',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bookButton: {
    flex: 1,
    marginRight: 8,
    backgroundColor: '#3B82F6',
  },
  chatButton: {
    flex: 1,
    marginLeft: 8,
    borderColor: '#3B82F6',
  },
  featuredBanner: {
    position: 'absolute',
    top: 12,
    right: -30,
    paddingHorizontal: 30,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    transform: [{ rotate: '45deg' }],
    zIndex: 1,
  },
  featuredText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  
  // Compact card styles
  compactCard: {
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 1,
    backgroundColor: 'white',
  },
  compactContent: {
    padding: 12,
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  compactTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  compactPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  compactTagsRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  compactChip: {
    marginRight: 8,
    height: 20,
  },
  compactFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactRatingText: {
    fontSize: 10,
    color: '#6B7280',
    marginLeft: 4,
  },
  compactDate: {
    fontSize: 10,
    color: '#9CA3AF',
  },
});

// Import ScrollView
import { ScrollView } from 'react-native';

export default PostCard;
