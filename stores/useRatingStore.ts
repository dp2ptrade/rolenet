import { create } from 'zustand';
import { Rating, User } from '../lib/types';
import { ratingService } from '../lib/supabaseService';

interface RatingState {
  userRatings: Rating[];
  isLoading: boolean;
  
  // Basic setters
  setUserRatings: (ratings: Rating[]) => void;
  setLoading: (loading: boolean) => void;
  addRating: (rating: Rating) => void;
  
  // Rating actions
  createRating: (raterId: string, ratedUserId: string, rating: number, feedback?: string, context?: string) => Promise<void>;
  loadUserRatings: (userId: string) => Promise<void>;
  calculateAverageRating: (ratings?: Rating[]) => number;
}

export const useRatingStore = create<RatingState>((set, get) => ({
  userRatings: [],
  isLoading: false,
  
  // Basic setters
  setUserRatings: (ratings) => set({ userRatings: ratings }),
  setLoading: (loading) => set({ isLoading: loading }),
  
  addRating: (rating) => {
    const { userRatings } = get();
    set({ userRatings: [rating, ...userRatings] });
  },
  
  // Rating actions
  createRating: async (raterId, ratedUserId, rating, feedback, context) => {
    try {
      set({ isLoading: true });
      const { data: newRating, error } = await ratingService.addRating(
        raterId, 
        ratedUserId, 
        rating, 
        feedback, 
        context
      );
      
      if (error) throw error;
      if (!newRating) throw new Error('No rating data returned');
      
      const { userRatings } = get();
      set({ userRatings: [newRating, ...userRatings] });
    } catch (error) {
      console.error('Create rating error:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  
  loadUserRatings: async (userId) => {
    try {
      set({ isLoading: true });
      const { data: ratings, error } = await ratingService.getUserRatings(userId);
      if (error) throw error;
      set({ userRatings: ratings || [] });
    } catch (error) {
      console.error('Load user ratings error:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  
  calculateAverageRating: (ratings) => {
    const ratingsToUse = ratings || get().userRatings;
    
    if (ratingsToUse.length === 0) return 0;
    
    const sum = ratingsToUse.reduce((acc, rating) => acc + rating.rating, 0);
    return Math.round((sum / ratingsToUse.length) * 10) / 10; // Round to 1 decimal place
  },
}));