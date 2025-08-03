import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Modal,
  Portal,
  Card,
  Text,
  Button,
  Chip,
  Switch,
  List,
  Divider,
  Surface
} from 'react-native-paper';
import Slider from '@react-native-community/slider';
import { X, Filter, Star, MapPin, Clock, Briefcase } from 'lucide-react-native';
import { SearchFilters } from '@/lib/searchEngine';
import { POPULAR_ROLES, POPULAR_TAGS } from '@/lib/types';
import { CONFIG } from '@/lib/config/chatConfig';

interface SearchFiltersProps {
  visible: boolean;
  onDismiss: () => void;
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onApply: () => void;
  onReset: () => void;
}

export default function SearchFiltersModal({
  visible,
  onDismiss,
  filters,
  onFiltersChange,
  onApply,
  onReset
}: SearchFiltersProps) {
  const [localFilters, setLocalFilters] = useState<SearchFilters>(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleRole = (role: string) => {
    const newRoles = localFilters.roles.includes(role)
      ? localFilters.roles.filter(r => r !== role)
      : [...localFilters.roles, role];
    updateFilter('roles', newRoles);
  };

  const toggleTag = (tag: string) => {
    const newTags = localFilters.tags.includes(tag)
      ? localFilters.tags.filter(t => t !== tag)
      : [...localFilters.tags, tag];
    updateFilter('tags', newTags);
  };

  const handleApply = () => {
    onFiltersChange(localFilters);
    onApply();
    onDismiss();
  };

  const handleReset = () => {
    const resetFilters: SearchFilters = {
      query: '',
      location: 'nearby',
      roles: [],
      tags: [],
      availability: 'all',
      rating: 0,
      experience: 'all',
      distance: 50,
      sortBy: 'relevance'
    };
    setLocalFilters(resetFilters);
    onFiltersChange(resetFilters);
    onReset();
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (localFilters.roles.length > 0) count++;
    if (localFilters.tags.length > 0) count++;
    if (localFilters.availability !== 'all') count++;
    if (localFilters.rating > 0) count++;
    if (localFilters.experience !== 'all') count++;
    if (localFilters.distance !== CONFIG.SEARCH.DEFAULT_RADIUS_KM) count++;
    if (localFilters.sortBy !== 'relevance') count++;
    return count;
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modal}
      >
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.header}>
              <View style={styles.titleContainer}>
                <Filter size={24} color="#3B82F6" />
                <Text variant="headlineSmall" style={styles.title}>
                  Search Filters
                </Text>
                {getActiveFiltersCount() > 0 && (
                  <Surface style={styles.badge} elevation={1}>
                    <Text variant="bodySmall" style={styles.badgeText}>
                      {getActiveFiltersCount()}
                    </Text>
                  </Surface>
                )}
              </View>
              <Button
                mode="text"
                onPress={onDismiss}
                icon={({ size, color }) => <X size={size} color={color} />}
                compact
              >
                Close
              </Button>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {/* Location Filter */}
              <View style={styles.section}>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  <MapPin size={20} color="#374151" /> Location
                </Text>
                <View style={styles.locationButtons}>
                  <Button
                    mode={localFilters.location === 'nearby' ? 'contained' : 'outlined'}
                    onPress={() => updateFilter('location', 'nearby')}
                    style={styles.locationButton}
                    compact
                  >
                    Nearby
                  </Button>
                  <Button
                    mode={localFilters.location === 'global' ? 'contained' : 'outlined'}
                    onPress={() => updateFilter('location', 'global')}
                    style={styles.locationButton}
                    compact
                  >
                    Global
                  </Button>
                </View>

                {localFilters.location === 'nearby' && (
                  <View style={styles.distanceContainer}>
                    <Text variant="bodyMedium" style={styles.distanceLabel}>
                      Distance: {localFilters.distance} km
                    </Text>
                    <Slider
                      style={styles.slider}
                      minimumValue={1}
                      maximumValue={200}
                      value={localFilters.distance}
                      onValueChange={(value: number) => updateFilter('distance', Math.round(value))}
                      step={1}
                      thumbTintColor="#007AFF"
                      minimumTrackTintColor="#3B82F6"
                      maximumTrackTintColor="#E5E5E5"
                    />
                  </View>
                )}
              </View>

              <Divider style={styles.divider} />

              {/* Professional Roles */}
              <View style={styles.section}>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  <Briefcase size={20} color="#374151" /> Professional Roles
                </Text>
                <View style={styles.chipsContainer}>
                  {POPULAR_ROLES.map((role) => (
                    <Chip
                      key={role}
                      selected={localFilters.roles.includes(role)}
                      onPress={() => toggleRole(role)}
                      style={[
                        styles.chip,
                        localFilters.roles.includes(role) && styles.selectedChip
                      ]}
                      textStyle={[
                        styles.chipText,
                        localFilters.roles.includes(role) && styles.selectedChipText
                      ]}
                    >
                      {role}
                    </Chip>
                  ))}
                </View>
              </View>

              <Divider style={styles.divider} />

              {/* Tags */}
              <View style={styles.section}>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Tags & Expertise
                </Text>
                <View style={styles.chipsContainer}>
                  {POPULAR_TAGS.map((tag) => (
                    <Chip
                      key={tag}
                      selected={localFilters.tags.includes(tag)}
                      onPress={() => toggleTag(tag)}
                      style={[
                        styles.chip,
                        localFilters.tags.includes(tag) && styles.selectedChip
                      ]}
                      textStyle={[
                        styles.chipText,
                        localFilters.tags.includes(tag) && styles.selectedChipText
                      ]}
                    >
                      {tag}
                    </Chip>
                  ))}
                </View>
              </View>

              <Divider style={styles.divider} />

              {/* Availability */}
              <View style={styles.section}>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  <Clock size={20} color="#374151" /> Availability
                </Text>
                <List.Item
                  title="All professionals"
                  left={() => <List.Icon icon="account-group" />}
                  right={() => (
                    <Switch
                      value={localFilters.availability === 'all'}
                      onValueChange={() => updateFilter('availability', 'all')}
                    />
                  )}
                />
                <List.Item
                  title="Available now"
                  left={() => <List.Icon icon="account-check" />}
                  right={() => (
                    <Switch
                      value={localFilters.availability === 'available'}
                      onValueChange={() => updateFilter('availability', 'available')}
                    />
                  )}
                />
                <List.Item
                  title="Busy professionals"
                  left={() => <List.Icon icon="account-clock" />}
                  right={() => (
                    <Switch
                      value={localFilters.availability === 'busy'}
                      onValueChange={() => updateFilter('availability', 'busy')}
                    />
                  )}
                />
              </View>

              <Divider style={styles.divider} />

              {/* Rating */}
              <View style={styles.section}>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  <Star size={20} color="#374151" /> Minimum Rating
                </Text>
                <View style={styles.ratingContainer}>
                  <Text variant="bodyMedium" style={styles.ratingLabel}>
                    {localFilters.rating === 0 ? 'Any rating' : `${localFilters.rating}+ stars`}
                  </Text>
                  <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={5}
                    value={localFilters.rating}
                    onValueChange={(value: number) => updateFilter('rating', Math.round(value * 2) / 2)}
                    step={0.5}
                    thumbTintColor="#007AFF"
                    minimumTrackTintColor="#F59E0B"
                    maximumTrackTintColor="#E5E5E5"
                  />
                </View>
              </View>

              <Divider style={styles.divider} />

              {/* Experience Level */}
              <View style={styles.section}>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Experience Level
                </Text>
                <View style={styles.experienceButtons}>
                  {['all', 'junior', 'mid', 'senior'].map((level) => (
                    <Button
                      key={level}
                      mode={localFilters.experience === level ? 'contained' : 'outlined'}
                      onPress={() => updateFilter('experience', level)}
                      style={styles.experienceButton}
                      compact
                    >
                      {level === 'all' ? 'All Levels' : level.charAt(0).toUpperCase() + level.slice(1)}
                    </Button>
                  ))}
                </View>
              </View>

              <Divider style={styles.divider} />

              {/* Sort By */}
              <View style={styles.section}>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Sort Results By
                </Text>
                <View style={styles.sortButtons}>
                  {[
                    { key: 'relevance', label: 'Relevance' },
                    { key: 'rating', label: 'Rating' },
                    { key: 'distance', label: 'Distance' },
                    { key: 'recent', label: 'Recently Active' }
                  ].map((sort) => (
                    <Button
                      key={sort.key}
                      mode={localFilters.sortBy === sort.key ? 'contained' : 'outlined'}
                      onPress={() => updateFilter('sortBy', sort.key)}
                      style={styles.sortButton}
                      compact
                    >
                      {sort.label}
                    </Button>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.footer}>
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
          </Card.Content>
        </Card>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    margin: 20,
    maxHeight: '90%',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  title: {
    marginLeft: 12,
    fontWeight: 'bold',
    color: '#374151',
    flex: 1,
  },
  badge: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  badgeText: {
    color: 'white',
    fontWeight: 'bold',
  },
  content: {
    maxHeight: 400,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#374151',
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    marginVertical: 16,
  },
  locationButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  locationButton: {
    flex: 1,
  },
  distanceContainer: {
    marginTop: 16,
  },
  distanceLabel: {
    marginBottom: 8,
    color: '#6B7280',
  },
  slider: {
    height: 40,
  },
  sliderThumb: {
    backgroundColor: '#3B82F6',
  },
  sliderTrack: {
    height: 4,
    borderRadius: 2,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#F3F4F6',
    marginBottom: 4,
  },
  selectedChip: {
    backgroundColor: '#3B82F6',
  },
  chipText: {
    color: '#374151',
  },
  selectedChipText: {
    color: 'white',
  },
  ratingContainer: {
    marginTop: 8,
  },
  ratingLabel: {
    marginBottom: 8,
    color: '#6B7280',
  },
  experienceButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  experienceButton: {
    flex: 1,
    minWidth: '45%',
  },
  sortButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sortButton: {
    flex: 1,
    minWidth: '45%',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  resetButton: {
    flex: 1,
  },
  applyButton: {
    flex: 2,
  },
});