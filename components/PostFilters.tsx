import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Chip, Searchbar, Surface, Divider, Portal, Modal, Switch, RadioButton } from 'react-native-paper';
import Slider from '@react-native-community/slider';
import { Filter, Star, MapPin, Clock, Briefcase, Tag, X, Check, SlidersHorizontal } from 'lucide-react-native';
import { PostCategory, PostTag } from '@/lib/types';
import { usePostStore } from '@/stores/usePostStore';

interface PostFiltersProps {
  onApplyFilters: () => void;
  onResetFilters: () => void;
  showModal: boolean;
  setShowModal: (show: boolean) => void;
}

const PostFilters: React.FC<PostFiltersProps> = ({ 
  onApplyFilters, 
  onResetFilters,
  showModal,
  setShowModal
}) => {
  const { 
    categories,
    tags,
    searchQuery,
    selectedCategory,
    selectedTags,
    priceRange,
    experienceLevel,
    serviceType,
    isRemoteOnly,
    minRating,
    sortBy,
    setSearchQuery,
    setSelectedCategory,
    setSelectedTags,
    setPriceRange,
    setExperienceLevel,
    setServiceType,
    setIsRemoteOnly,
    setMinRating,
    setSortBy,
    resetFilters,
    loadCategories,
    loadTags
  } = usePostStore();
  
  const [localPriceRange, setLocalPriceRange] = useState<[number, number]>(priceRange);
  const [localMinRating, setLocalMinRating] = useState(minRating);
  
  // Load categories and tags
  useEffect(() => {
    loadCategories();
  }, []);
  
  useEffect(() => {
    if (selectedCategory) {
      loadTags(selectedCategory);
    } else {
      loadTags();
    }
  }, [selectedCategory]);
  
  const handleApply = () => {
    // Apply local state to global state
    setPriceRange(localPriceRange);
    setMinRating(localMinRating);
    
    onApplyFilters();
    setShowModal(false);
  };
  
  const handleReset = () => {
    resetFilters();
    setLocalPriceRange([0, 10000]);
    setLocalMinRating(0);
    
    onResetFilters();
    setShowModal(false);
  };
  
  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };
  
  const getActiveFiltersCount = () => {
    let count = 0;
    if (selectedCategory) count++;
    if (selectedTags.length > 0) count++;
    if (priceRange[0] > 0 || priceRange[1] < 10000) count++;
    if (experienceLevel) count++;
    if (serviceType) count++;
    if (isRemoteOnly) count++;
    if (minRating > 0) count++;
    if (sortBy !== 'newest') count++;
    
    return count;
  };
  
  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };
  
  return (
    <>
      {/* Search and filter bar */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search services..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          icon={({ size, color }) => <Filter size={size} color={color} />}
        />
        
        <Button
          mode="contained"
          onPress={() => setShowModal(true)}
          style={styles.filterButton}
          contentStyle={styles.filterButtonContent}
          icon={({ size, color }) => <SlidersHorizontal size={size} color={color} />}
        >
          {getActiveFiltersCount() > 0 ? `Filters (${getActiveFiltersCount()})` : 'Filters'}
        </Button>
      </View>
      
      {/* Active filters chips */}
      {getActiveFiltersCount() > 0 && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.activeFiltersContainer}
          contentContainerStyle={styles.activeFiltersContent}
        >
          {selectedCategory && (
            <Chip 
              style={styles.activeFilterChip}
              onClose={() => setSelectedCategory(null)}
              closeIcon={X}
            >
              {categories.find(c => c.id === selectedCategory)?.name || selectedCategory}
            </Chip>
          )}
          
          {selectedTags.map(tag => (
            <Chip 
              key={tag}
              style={styles.activeFilterChip}
              onClose={() => toggleTag(tag)}
              closeIcon={X}
            >
              {tag}
            </Chip>
          ))}
          
          {experienceLevel && (
            <Chip 
              style={styles.activeFilterChip}
              onClose={() => setExperienceLevel(null)}
              closeIcon={X}
            >
              {experienceLevel}
            </Chip>
          )}
          
          {serviceType && (
            <Chip 
              style={styles.activeFilterChip}
              onClose={() => setServiceType(null)}
              closeIcon={X}
            >
              {serviceType}
            </Chip>
          )}
          
          {isRemoteOnly && (
            <Chip 
              style={styles.activeFilterChip}
              onClose={() => setIsRemoteOnly(false)}
              closeIcon={X}
            >
              Remote Only
            </Chip>
          )}
          
          {minRating > 0 && (
            <Chip 
              style={styles.activeFilterChip}
              onClose={() => setMinRating(0)}
              closeIcon={X}
            >
              {minRating}+ Stars
            </Chip>
          )}
          
          {sortBy !== 'newest' && (
            <Chip 
              style={styles.activeFilterChip}
              onClose={() => setSortBy('newest')}
              closeIcon={X}
            >
              Sort: {sortBy.replace('_', ' ')}
            </Chip>
          )}
          
          {getActiveFiltersCount() > 0 && (
            <Chip 
              style={[styles.activeFilterChip, styles.clearAllChip]}
              onPress={handleReset}
            >
              Clear All
            </Chip>
          )}
        </ScrollView>
      )}
      
      {/* Sort options as Tab Bar */}
      <View style={styles.tabContainer}>
        <Surface style={styles.tabBar} elevation={4}>
          <TabSelector 
            tabs={['newest', 'price_low', 'price_high', 'rating']} 
            selectedTab={sortBy} 
            onSelectTab={setSortBy} 
            labels={['Newest', 'Price: Low to High', 'Price: High to Low', 'Top Rated']} 
          />
        </Surface>
      </View>
      
      {/* Filters Modal */}
      <Portal>
        <Modal
          visible={showModal}
          onDismiss={() => setShowModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Surface style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text variant="titleLarge" style={styles.modalTitle}>Filters</Text>
              <Button 
                mode="text" 
                onPress={() => setShowModal(false)}
                icon={({ size, color }) => <X size={size} color={color} />}
              >
                Close
              </Button>
            </View>
            
            <ScrollView style={styles.modalScrollView}>
              {/* Categories */}
              <Text variant="titleMedium" style={styles.sectionTitle}>Categories</Text>
              <View style={styles.categoriesContainer}>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoriesContent}
                >
                  {categories.map(category => (
                    <Chip
                      key={category.id}
                      selected={selectedCategory === category.id}
                      onPress={() => setSelectedCategory(selectedCategory === category.id ? null : category.id)}
                      style={styles.categoryChip}
                    >
                      {category.name}
                    </Chip>
                  ))}
                </ScrollView>
              </View>
              
              <Divider style={styles.divider} />
              
              {/* Tags */}
              <Text variant="titleMedium" style={styles.sectionTitle}>Tags</Text>
              <View style={styles.tagsContainer}>
                {tags.map(tag => (
                  <Chip
                    key={tag.id}
                    selected={selectedTags.includes(tag.name)}
                    onPress={() => toggleTag(tag.name)}
                    style={styles.tagChip}
                  >
                    {tag.name}
                  </Chip>
                ))}
              </View>
              
              <Divider style={styles.divider} />
              
              {/* Price Range */}
              <Text variant="titleMedium" style={styles.sectionTitle}>Price Range</Text>
              <View style={styles.priceRangeContainer}>
                <View style={styles.priceLabels}>
                  <Text>{formatPrice(localPriceRange[0])}</Text>
                  <Text>{formatPrice(localPriceRange[1])}</Text>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={10000}
                  step={100}
                  value={localPriceRange[0]}
                  onValueChange={(value) => setLocalPriceRange([value, localPriceRange[1]])}
                  minimumTrackTintColor="#3B82F6"
                  maximumTrackTintColor="#E5E7EB"
                  thumbTintColor="#3B82F6"
                />
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={10000}
                  step={100}
                  value={localPriceRange[1]}
                  onValueChange={(value) => setLocalPriceRange([localPriceRange[0], value])}
                  minimumTrackTintColor="#3B82F6"
                  maximumTrackTintColor="#E5E7EB"
                  thumbTintColor="#3B82F6"
                />
              </View>
              
              <Divider style={styles.divider} />
              
              {/* Experience Level */}
              <Text variant="titleMedium" style={styles.sectionTitle}>Experience Level</Text>
              <View style={styles.radioGroup}>
                <RadioButton.Group
                  value={experienceLevel || ''}
                  onValueChange={(value) => setExperienceLevel(value || null)}
                >
                  <View style={styles.radioItem}>
                    <RadioButton value="" />
                    <Text>Any</Text>
                  </View>
                  <View style={styles.radioItem}>
                    <RadioButton value="junior" />
                    <Text>Junior</Text>
                  </View>
                  <View style={styles.radioItem}>
                    <RadioButton value="mid" />
                    <Text>Mid-Level</Text>
                  </View>
                  <View style={styles.radioItem}>
                    <RadioButton value="senior" />
                    <Text>Senior</Text>
                  </View>
                </RadioButton.Group>
              </View>
              
              <Divider style={styles.divider} />
              
              {/* Service Type */}
              <Text variant="titleMedium" style={styles.sectionTitle}>Service Type</Text>
              <View style={styles.radioGroup}>
                <RadioButton.Group
                  value={serviceType || ''}
                  onValueChange={(value) => setServiceType(value || null)}
                >
                  <View style={styles.radioItem}>
                    <RadioButton value="" />
                    <Text>Any</Text>
                  </View>
                  <View style={styles.radioItem}>
                    <RadioButton value="one-time" />
                    <Text>One-time</Text>
                  </View>
                  <View style={styles.radioItem}>
                    <RadioButton value="long-term" />
                    <Text>Long-term</Text>
                  </View>
                  <View style={styles.radioItem}>
                    <RadioButton value="consulting" />
                    <Text>Consulting</Text>
                  </View>
                  <View style={styles.radioItem}>
                    <RadioButton value="coaching" />
                    <Text>Coaching</Text>
                  </View>
                </RadioButton.Group>
              </View>
              
              <Divider style={styles.divider} />
              
              {/* Remote Only */}
              <View style={styles.switchContainer}>
                <Text variant="titleMedium">Remote Only</Text>
                <Switch
                  value={isRemoteOnly}
                  onValueChange={setIsRemoteOnly}
                />
              </View>
              
              <Divider style={styles.divider} />
              
              {/* Minimum Rating */}
              <Text variant="titleMedium" style={styles.sectionTitle}>Minimum Rating</Text>
              <View style={styles.ratingContainer}>
                <View style={styles.ratingStars}>
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <TouchableOpacity
                      key={rating}
                      onPress={() => setLocalMinRating(rating)}
                      style={styles.starButton}
                    >
                      <Star
                        size={24}
                        color="#F59E0B"
                        fill={localMinRating >= rating ? "#F59E0B" : "transparent"}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.ratingText}>
                  {localMinRating > 0 ? `${localMinRating}+ stars` : 'Any rating'}
                </Text>
              </View>
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <Button 
                mode="outlined" 
                onPress={handleReset}
                style={styles.resetButton}
              >
                Reset All
              </Button>
              <Button 
                mode="contained" 
                onPress={handleApply}
                style={styles.applyButton}
              >
                Apply Filters
              </Button>
            </View>
          </Surface>
        </Modal>
      </Portal>
    </>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  searchBar: {
    flex: 1,
    marginRight: 8,
    elevation: 0,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    height: 40, // Reduced height for smaller search bar
  },
  filterButton: {
    backgroundColor: '#3B82F6',
  },
  filterButtonContent: {
    paddingHorizontal: 12,
  },
  activeFiltersContainer: {
    marginBottom: 10,
    height: 40, // Fixed height to ensure full visibility of chips
  },
  activeFiltersContent: {
    paddingHorizontal: 16,
    alignItems: 'center', // Center vertically to prevent clipping
  },
  activeFilterChip: {
    marginRight: 8,
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
    paddingHorizontal: 10,
    height: 32, // Fixed height for chips to ensure text fits
  },
  clearAllChip: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    minWidth: 100,
  },
  tabContainer: {
    marginBottom: 10,
    paddingHorizontal: 16,
    zIndex: 0,
  },
  tabBar: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    height: 50,
    overflow: 'hidden',
  },
  tabSelectorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    height: 42,
    position: 'relative',
  },
  tabItem: {
    flex: 1,
    height: 42,
  },
  tabItemContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4B5563',
    textAlign: 'center',
  },
  selectedTabText: {
    color: '#1E40AF',
    fontWeight: 'bold',
  },
  modalContainer: {
    padding: 20,
    margin: 20,
  },
  modalContent: {
    borderRadius: 12,
    backgroundColor: 'white',
    elevation: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontWeight: 'bold',
  },
  modalScrollView: {
    padding: 16,
    maxHeight: 500,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: '600',
  },
  categoriesContainer: {
    marginBottom: 16,
  },
  categoriesContent: {
    paddingVertical: 4,
  },
  categoryChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  tagChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  divider: {
    marginVertical: 16,
  },
  priceRangeContainer: {
    marginBottom: 16,
  },
  priceLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  radioGroup: {
    marginBottom: 16,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  ratingContainer: {
    marginBottom: 16,
  },
  ratingStars: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  starButton: {
    marginRight: 8,
  },
  ratingText: {
    marginTop: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  resetButton: {
    flex: 1,
    marginRight: 8,
  },
  applyButton: {
    flex: 1,
    marginLeft: 8,
    backgroundColor: '#3B82F6',
  },
});

// Import TouchableOpacity and Animated components
import { TouchableOpacity, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';

// Custom animated tab selector component
interface TabSelectorProps {
  tabs: string[];
  selectedTab: string;
  onSelectTab: (tab: string) => void;
  labels: string[];
}

function TabSelector({ tabs, selectedTab, onSelectTab, labels }: TabSelectorProps) {
  // Create animated values for the indicator
  const indicatorPosition = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);
  
  // References to measure tab widths
  const tabRefs = React.useRef<React.RefObject<View | null>[]>(tabs.map(() => React.createRef<View>()));
  const tabWidths = React.useRef<number[]>(tabs.map(() => 0));
  const tabPositions = React.useRef<number[]>(tabs.map(() => 0));
  const isLayoutCalculated = React.useRef<boolean>(false);
  
  // Update indicator position when tab changes
  React.useEffect(() => {
    if (isLayoutCalculated.current) {
      const index = tabs.indexOf(selectedTab);
      if (index !== -1) {
        indicatorPosition.value = withTiming(tabPositions.current[index], {
          duration: 300,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        });
        indicatorWidth.value = withTiming(tabWidths.current[index], {
          duration: 300,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        });
      }
    }
  }, [selectedTab, indicatorPosition, indicatorWidth]);

  // Function to handle layout calculation
  const handleTabLayout = (index: number) => (event: any) => {
    const { width, x } = event.nativeEvent.layout;
    tabWidths.current[index] = width;
    tabPositions.current[index] = x;
    // Check if all tabs have been measured
    if (tabWidths.current.every(w => w > 0)) {
      isLayoutCalculated.current = true;
      // Initialize indicator position for the selected tab
      const selectedIndex = tabs.indexOf(selectedTab);
      if (selectedIndex !== -1) {
        indicatorPosition.value = tabPositions.current[selectedIndex];
        indicatorWidth.value = tabWidths.current[selectedIndex];
      }
    }
  };
  
  // Animated style for the indicator
  const indicatorStyle = useAnimatedStyle(() => {
    return {
      position: 'absolute',
      bottom: 0,
      left: indicatorPosition.value,
      width: indicatorWidth.value,
      height: 3,
      backgroundColor: '#38BDF8',
      borderRadius: 1.5,
    };
  });
  
  return (
    <View style={styles.tabSelectorContainer}>
      {tabs.map((tab: string, index: number) => {
        const isSelected = tab === selectedTab;
        
        // Create animated styles for each tab
        const tabAnimatedStyle = useAnimatedStyle(() => {
          return {
            opacity: withTiming(isSelected ? 1 : 0.7, { duration: 200 }),
            transform: [
              { 
                scale: withTiming(isSelected ? 1.05 : 1, { 
                  duration: 200,
                  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
                })
              }
            ],
          };
        });
        
        return (
          <Pressable
            key={tab}
            ref={tabRefs.current[index]}
            style={styles.tabItem}
            onLayout={handleTabLayout(index)}
            onPress={() => {
              if (tab !== selectedTab) {
                onSelectTab(tab);
              }
            }}
          >
            <Animated.View style={[styles.tabItemContent, tabAnimatedStyle]}>
              <Text 
                style={[styles.tabText, isSelected && styles.selectedTabText]}
              >
                {labels[index]}
              </Text>
            </Animated.View>
          </Pressable>
        );
      })}
      <Animated.View style={indicatorStyle} />
    </View>
  );
}

export default PostFilters;
