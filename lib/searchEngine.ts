import { User } from './types';

export interface SearchFilters {
  query: string;
  location: 'nearby' | 'global';
  roles: string[];
  tags: string[];
  availability: 'all' | 'available' | 'busy';
  rating: number;
  experience: 'all' | 'junior' | 'mid' | 'senior';
  distance: number; // in km
  sortBy: 'relevance' | 'rating' | 'distance' | 'recent';
}

export interface SearchResult {
  user: User;
  relevanceScore: number;
  matchedFields: string[];
  distance?: number;
}

// AI-powered search scoring algorithm
export class SmartSearchEngine {
  private static calculateRelevanceScore(user: User, filters: SearchFilters): number {
    let score = 0;
    const matchedFields: string[] = [];

    // Text similarity scoring (simplified semantic matching)
    if (filters.query) {
      const query = filters.query.toLowerCase();
      const searchableText = [
        user.name,
        user.role,
        user.bio || '',
        ...user.tags
      ].join(' ').toLowerCase();

      // Exact matches get highest score
      if (searchableText.includes(query)) {
        score += 100;
        matchedFields.push('exact_match');
      }

      // Partial matches
      const queryWords = query.split(' ');
      queryWords.forEach(word => {
        if (word.length > 2 && searchableText.includes(word)) {
          score += 20;
          matchedFields.push('partial_match');
        }
      });

      // Role-specific scoring
      if (user.role.toLowerCase().includes(query)) {
        score += 80;
        matchedFields.push('role');
      }

      // Tag matching
      user.tags.forEach(tag => {
        if (tag.toLowerCase().includes(query)) {
          score += 60;
          matchedFields.push('tag');
        }
      });

      // Bio matching
      if (user.bio && user.bio.toLowerCase().includes(query)) {
        score += 40;
        matchedFields.push('bio');
      }
    }

    // Role filter scoring
    if (filters.roles.length > 0) {
      if (filters.roles.includes(user.role)) {
        score += 50;
        matchedFields.push('role_filter');
      }
    }

    // Tag filter scoring
    if (filters.tags.length > 0) {
      const matchingTags = user.tags.filter(tag => filters.tags.includes(tag));
      score += matchingTags.length * 30;
      if (matchingTags.length > 0) {
        matchedFields.push('tag_filter');
      }
    }

    // Availability scoring
    if (filters.availability !== 'all') {
      if (filters.availability === 'available' && user.is_available) {
        score += 25;
        matchedFields.push('availability');
      } else if (filters.availability === 'busy' && !user.is_available) {
        score += 25;
        matchedFields.push('availability');
      }
    }

    // Rating scoring
    if (user.rating >= filters.rating) {
      score += (user.rating - filters.rating) * 10;
      matchedFields.push('rating');
    }

    // Online status bonus
    if (user.online_status === 'online') {
      score += 15;
      matchedFields.push('online');
    }

    // High rating bonus
    if (user.rating >= 4.5) {
      score += 20;
      matchedFields.push('high_rating');
    }

    // Experience level scoring (based on rating count as proxy)
    const experienceLevel = this.getExperienceLevel(user.rating_count);
    if (filters.experience !== 'all' && experienceLevel === filters.experience) {
      score += 30;
      matchedFields.push('experience');
    }

    return score;
  }

  private static getExperienceLevel(rating_count: number): 'junior' | 'mid' | 'senior' {
    if (rating_count < 10) return 'junior';
    if (rating_count < 50) return 'mid';
    return 'senior';
  }

  private static calculateDistance(
    lat1: number, 
    lon1: number, 
    lat2: number, 
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  static search(
    users: User[], 
    filters: SearchFilters, 
    userLocation?: { latitude: number; longitude: number }
  ): SearchResult[] {
    let results: SearchResult[] = [];

    users.forEach(user => {
      const relevanceScore = this.calculateRelevanceScore(user, filters);
      
      // Skip users with very low relevance unless no query is provided
      if (relevanceScore < 10 && filters.query) return;

      let distance: number | undefined;
      
      // Calculate distance for nearby search
      if (filters.location === 'nearby' && userLocation) {
        distance = this.calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          user.location.latitude,
          user.location.longitude
        );

        // Filter by distance
        if (distance > filters.distance) return;
      }

      const matchedFields: string[] = [];
      results.push({
        user,
        relevanceScore,
        matchedFields,
        distance
      });
    });

    // Sort results
    results.sort((a, b) => {
      switch (filters.sortBy) {
        case 'rating':
          return b.user.rating - a.user.rating;
        case 'distance':
          if (a.distance !== undefined && b.distance !== undefined) {
            return a.distance - b.distance;
          }
          return b.relevanceScore - a.relevanceScore;
        case 'recent':
          return b.user.last_seen.getTime() - a.user.last_seen.getTime();
        case 'relevance':
        default:
          return b.relevanceScore - a.relevanceScore;
      }
    });

    return results;
  }

  // AI-powered query suggestions
  static generateQuerySuggestions(query: string, users: User[]): string[] {
    const suggestions: string[] = [];
    const queryLower = query.toLowerCase();

    // Role suggestions
    const roles = [...new Set(users.map(u => u.role))];
    roles.forEach(role => {
      if (role.toLowerCase().includes(queryLower)) {
        suggestions.push(role);
      }
    });

    // Tag suggestions
    const allTags = [...new Set(users.flatMap(u => u.tags))];
    allTags.forEach(tag => {
      if (tag.toLowerCase().includes(queryLower)) {
        suggestions.push(tag);
      }
    });

    // Smart suggestions based on common patterns
    const smartSuggestions = [
      'experienced developer',
      'senior consultant',
      'creative designer',
      'healthcare professional',
      'education specialist',
      'business mentor',
      'technical expert',
      'startup advisor'
    ];

    smartSuggestions.forEach(suggestion => {
      if (suggestion.includes(queryLower) && queryLower.length > 2) {
        suggestions.push(suggestion);
      }
    });

    return suggestions.slice(0, 5);
  }
}

// Voice search processing
export class VoiceSearchProcessor {
  static processVoiceQuery(transcript: string): SearchFilters {
    const query = transcript.toLowerCase();
    
    // Extract intent from voice query
    const filters: Partial<SearchFilters> = {
      query: transcript,
      location: 'nearby',
      roles: [],
      tags: [],
      availability: 'all',
      rating: 0,
      experience: 'all',
      distance: 50,
      sortBy: 'relevance'
    };

    // Location intent detection
    if (query.includes('nearby') || query.includes('near me') || query.includes('local')) {
      filters.location = 'nearby';
    } else if (query.includes('global') || query.includes('anywhere') || query.includes('worldwide')) {
      filters.location = 'global';
    }

    // Availability intent detection
    if (query.includes('available') || query.includes('online')) {
      filters.availability = 'available';
    }

    // Experience level detection
    if (query.includes('senior') || query.includes('experienced')) {
      filters.experience = 'senior';
    } else if (query.includes('junior') || query.includes('beginner')) {
      filters.experience = 'junior';
    }

    // Rating intent detection
    if (query.includes('top rated') || query.includes('best')) {
      filters.rating = 4.5;
      filters.sortBy = 'rating';
    }

    // Distance extraction
    const distanceMatch = query.match(/(\d+)\s*(km|kilometer|mile)/);
    if (distanceMatch) {
      const distance = parseInt(distanceMatch[1]);
      filters.distance = distanceMatch[2].startsWith('mile') ? distance * 1.6 : distance;
    }

    return filters as SearchFilters;
  }
}