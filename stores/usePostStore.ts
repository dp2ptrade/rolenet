import { create } from 'zustand';
import { Post, PostBookmark, PostRating, ServiceBundle, CaseStudy, AvailabilitySlot, PostCategory, PostTag } from '../lib/types';
import { postService, realtimeService } from '../lib/supabaseService';

interface PostState {
  // Core state
  posts: Post[];
  userPosts: Post[];
  bookmarkedPosts: Post[];
  currentPost: Post | null;
  categories: PostCategory[];
  tags: PostTag[];
  isLoading: boolean;
  error: string | null;
  
  // Filters and search
  searchQuery: string;
  selectedCategory: string | null;
  selectedTags: string[];
  priceRange: [number, number];
  experienceLevel: string | null;
  serviceType: string | null;
  isRemoteOnly: boolean;
  minRating: number;
  sortBy: string;
  
  // Pagination
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
  
  // Subscriptions
  subscription: any;
  bookmarkSubscription: any;
  
  // Basic setters
  setPosts: (posts: Post[]) => void;
  setUserPosts: (posts: Post[]) => void;
  setBookmarkedPosts: (posts: Post[]) => void;
  setCurrentPost: (post: Post | null) => void;
  setCategories: (categories: PostCategory[]) => void;
  setTags: (tags: PostTag[]) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Filter setters
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string | null) => void;
  setSelectedTags: (tags: string[]) => void;
  setPriceRange: (range: [number, number]) => void;
  setExperienceLevel: (level: string | null) => void;
  setServiceType: (type: string | null) => void;
  setIsRemoteOnly: (remote: boolean) => void;
  setMinRating: (rating: number) => void;
  setSortBy: (sort: string) => void;
  resetFilters: () => void;
  
  // Pagination setters
  setCurrentPage: (page: number) => void;
  setTotalPages: (pages: number) => void;
  setHasMore: (hasMore: boolean) => void;
  
  // Post actions
  createPost: (postData: Partial<Post>) => Promise<Post | null>;
  updatePost: (postId: string, updates: Partial<Post>) => Promise<Post | null>;
  deletePost: (postId: string) => Promise<boolean>;
  loadPosts: (options?: any) => Promise<void>;
  loadUserPosts: (userId: string) => Promise<void>;
  loadBookmarkedPosts: (userId: string) => Promise<void>;
  loadPost: (postId: string) => Promise<Post | null>;
  loadCategories: () => Promise<void>;
  loadTags: (categoryId?: string) => Promise<void>;
  bookmarkPost: (userId: string, postId: string) => Promise<void>;
  unbookmarkPost: (userId: string, postId: string) => Promise<void>;
  isPostBookmarked: (userId: string, postId: string) => Promise<boolean>;
  ratePost: (userId: string, postId: string, rating: number, comment?: string) => Promise<void>;
  loadMorePosts: () => Promise<void>;
  
  // Service bundle actions
  addServiceBundle: (bundle: Partial<ServiceBundle>) => Promise<ServiceBundle | null>;
  
  // Case study actions
  addCaseStudy: (caseStudy: Partial<CaseStudy>) => Promise<CaseStudy | null>;
  
  // Availability slot actions
  addAvailabilitySlot: (slot: Partial<AvailabilitySlot>) => Promise<AvailabilitySlot | null>;
  bookAvailabilitySlot: (slotId: string, userId: string) => Promise<AvailabilitySlot | null>;
  
  // Subscription actions
  subscribeToUserPosts: (userId: string) => void;
  unsubscribeFromUserPosts: () => void;
  subscribeToPostBookmarks: (userId: string) => void;
  unsubscribeFromPostBookmarks: () => void;
}

export const usePostStore = create<PostState>((set, get) => ({
  // Initial state
  posts: [],
  userPosts: [],
  bookmarkedPosts: [],
  currentPost: null,
  categories: [],
  tags: [],
  isLoading: false,
  error: null,
  
  // Filters and search
  searchQuery: '',
  selectedCategory: null,
  selectedTags: [],
  priceRange: [0, 10000],
  experienceLevel: null,
  serviceType: null,
  isRemoteOnly: false,
  minRating: 0,
  sortBy: 'newest',
  
  // Pagination
  currentPage: 1,
  totalPages: 1,
  hasMore: false,
  
  // Subscriptions
  subscription: null,
  bookmarkSubscription: null,
  
  // Basic setters
  setPosts: (posts) => set({ posts }),
  setUserPosts: (posts) => set({ userPosts: posts }),
  setBookmarkedPosts: (posts) => set({ bookmarkedPosts: posts }),
  setCurrentPost: (post) => set({ currentPost: post }),
  setCategories: (categories) => set({ categories }),
  setTags: (tags) => set({ tags }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  
  // Filter setters
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  setSelectedTags: (tags) => set({ selectedTags: tags }),
  setPriceRange: (range) => set({ priceRange: range }),
  setExperienceLevel: (level) => set({ experienceLevel: level }),
  setServiceType: (type) => set({ serviceType: type }),
  setIsRemoteOnly: (remote) => set({ isRemoteOnly: remote }),
  setMinRating: (rating) => set({ minRating: rating }),
  setSortBy: (sort) => set({ sortBy: sort }),
  
  resetFilters: () => set({
    searchQuery: '',
    selectedCategory: null,
    selectedTags: [],
    priceRange: [0, 10000],
    experienceLevel: null,
    serviceType: null,
    isRemoteOnly: false,
    minRating: 0,
    sortBy: 'newest'
  }),
  
  // Pagination setters
  setCurrentPage: (page) => set({ currentPage: page }),
  setTotalPages: (pages) => set({ totalPages: pages }),
  setHasMore: (hasMore) => set({ hasMore }),
  
  // Post actions
  createPost: async (postData) => {
    try {
      set({ isLoading: true, error: null });
      const { data, error } = await postService.createPost(postData);
      
      if (error) {
        set({ error: error.message, isLoading: false });
        return null;
      }
      
      // Add to user posts
      const { userPosts } = get();
      set({ userPosts: [data, ...userPosts], isLoading: false });
      
      return data;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return null;
    }
  },
  
  updatePost: async (postId, updates) => {
    try {
      set({ isLoading: true, error: null });
      const { data, error } = await postService.updatePost(postId, updates);
      
      if (error) {
        set({ error: error.message, isLoading: false });
        return null;
      }
      
      // Update in posts array
      const { posts, userPosts, currentPost } = get();
      const updatedPosts = posts.map(post => post.id === postId ? data : post);
      const updatedUserPosts = userPosts.map(post => post.id === postId ? data : post);
      
      set({ 
        posts: updatedPosts, 
        userPosts: updatedUserPosts,
        currentPost: currentPost?.id === postId ? data : currentPost,
        isLoading: false 
      });
      
      return data;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return null;
    }
  },
  
  deletePost: async (postId) => {
    try {
      set({ isLoading: true, error: null });
      const { error } = await postService.deletePost(postId);
      
      if (error) {
        set({ error: error.message, isLoading: false });
        return false;
      }
      
      // Remove from posts array
      const { posts, userPosts } = get();
      set({ 
        posts: posts.filter(post => post.id !== postId),
        userPosts: userPosts.filter(post => post.id !== postId),
        currentPost: null,
        isLoading: false 
      });
      
      return true;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return false;
    }
  },
  
  loadPosts: async (options = {}) => {
    try {
      set({ isLoading: true, error: null });
      
      const { 
        searchQuery, 
        selectedCategory, 
        selectedTags, 
        priceRange, 
        experienceLevel, 
        serviceType, 
        isRemoteOnly, 
        minRating, 
        sortBy,
        currentPage
      } = get();
      
      const limit = 10;
      const offset = (currentPage - 1) * limit;
      
      const queryOptions = {
        limit,
        offset,
        search: searchQuery,
        category: selectedCategory || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        priceMin: priceRange[0] > 0 ? priceRange[0] : undefined,
        priceMax: priceRange[1] < 10000 ? priceRange[1] : undefined,
        experienceLevel: experienceLevel || undefined,
        serviceType: serviceType || undefined,
        isRemote: isRemoteOnly ? true : undefined,
        minRating: minRating > 0 ? minRating : undefined,
        sortBy,
        ...options
      };
      
      const { data, error, count } = await postService.getPosts(queryOptions);
      
      if (error) {
        set({ error: error.message, isLoading: false });
        return;
      }
      
      // Calculate pagination
      const totalItems = count || 0;
      const totalPages = Math.ceil(totalItems / limit);
      const hasMore = currentPage < totalPages;
      
      set({ 
        posts: currentPage === 1 ? data : [...get().posts, ...data],
        totalPages,
        hasMore,
        isLoading: false 
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },
  
  loadUserPosts: async (userId) => {
    try {
      set({ isLoading: true, error: null });
      
      const { data, error } = await postService.getPosts({ userId });
      
      if (error) {
        set({ error: error.message, isLoading: false });
        return;
      }
      
      set({ userPosts: data, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },
  
  loadBookmarkedPosts: async (userId) => {
    try {
      set({ isLoading: true, error: null });
      
      const { data, error } = await postService.getUserBookmarks(userId);
      
      if (error) {
        set({ error: error.message, isLoading: false });
        return;
      }
      
      // Extract posts from bookmarks
      const bookmarkedPosts = data.map((bookmark: any) => bookmark.post);
      
      set({ bookmarkedPosts, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },
  
  loadPost: async (postId) => {
    try {
      set({ isLoading: true, error: null });
      
      const { data, error } = await postService.getPost(postId);
      
      if (error) {
        set({ error: error.message, isLoading: false });
        return null;
      }
      
      set({ currentPost: data, isLoading: false });
      
      // Increment view count
      postService.incrementPostView(postId).catch(console.error);
      
      return data;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return null;
    }
  },
  
  loadCategories: async () => {
    try {
      const { data, error } = await postService.getPostCategories();
      
      if (error) {
        set({ error: error.message });
        return;
      }
      
      set({ categories: data });
    } catch (error: any) {
      set({ error: error.message });
    }
  },
  
  loadTags: async (categoryId) => {
    try {
      const { data, error } = await postService.getPostTags(categoryId);
      
      if (error) {
        set({ error: error.message });
        return;
      }
      
      set({ tags: data });
    } catch (error: any) {
      set({ error: error.message });
    }
  },
  
  bookmarkPost: async (userId, postId) => {
    try {
      const { error } = await postService.bookmarkPost(userId, postId);
      
      if (error) {
        set({ error: error.message });
        return;
      }
      
      // Update bookmarked posts
      await get().loadBookmarkedPosts(userId);
    } catch (error: any) {
      set({ error: error.message });
    }
  },
  
  unbookmarkPost: async (userId, postId) => {
    try {
      const { error } = await postService.unbookmarkPost(userId, postId);
      
      if (error) {
        set({ error: error.message });
        return;
      }
      
      // Update bookmarked posts
      const { bookmarkedPosts } = get();
      set({ bookmarkedPosts: bookmarkedPosts.filter(post => post.id !== postId) });
    } catch (error: any) {
      set({ error: error.message });
    }
  },
  
  isPostBookmarked: async (userId, postId) => {
    try {
      const { isBookmarked, error } = await postService.isPostBookmarked(userId, postId);
      
      if (error) {
        return false;
      }
      
      return isBookmarked;
    } catch (error) {
      return false;
    }
  },
  
  ratePost: async (userId, postId, rating, comment) => {
    try {
      const { error } = await postService.ratePost(userId, postId, rating, comment);
      
      if (error) {
        set({ error: error.message });
        return;
      }
      
      // Reload current post to get updated rating
      if (get().currentPost?.id === postId) {
        await get().loadPost(postId);
      }
    } catch (error: any) {
      set({ error: error.message });
    }
  },
  
  loadMorePosts: async () => {
    const { currentPage, hasMore, isLoading } = get();
    
    if (!hasMore || isLoading) return;
    
    set({ currentPage: currentPage + 1 });
    await get().loadPosts();
  },
  
  addServiceBundle: async (bundle) => {
    try {
      set({ isLoading: true, error: null });
      
      const { data, error } = await postService.addServiceBundle(bundle);
      
      if (error) {
        set({ error: error.message, isLoading: false });
        return null;
      }
      
      // Reload current post to get updated bundles
      if (get().currentPost?.id === bundle.post_id) {
        await get().loadPost(bundle.post_id as string);
      }
      
      set({ isLoading: false });
      return data;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return null;
    }
  },
  
  addCaseStudy: async (caseStudy) => {
    try {
      set({ isLoading: true, error: null });
      
      const { data, error } = await postService.addCaseStudy(caseStudy);
      
      if (error) {
        set({ error: error.message, isLoading: false });
        return null;
      }
      
      // Reload current post to get updated case studies
      if (get().currentPost?.id === caseStudy.post_id) {
        await get().loadPost(caseStudy.post_id as string);
      }
      
      set({ isLoading: false });
      return data;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return null;
    }
  },
  
  addAvailabilitySlot: async (slot) => {
    try {
      set({ isLoading: true, error: null });
      
      const { data, error } = await postService.addAvailabilitySlot(slot);
      
      if (error) {
        set({ error: error.message, isLoading: false });
        return null;
      }
      
      set({ isLoading: false });
      return data;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return null;
    }
  },
  
  bookAvailabilitySlot: async (slotId, userId) => {
    try {
      set({ isLoading: true, error: null });
      
      const { data, error } = await postService.bookAvailabilitySlot(slotId, userId);
      
      if (error) {
        set({ error: error.message, isLoading: false });
        return null;
      }
      
      set({ isLoading: false });
      return data;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return null;
    }
  },
  
  subscribeToUserPosts: (userId) => {
    const { subscription } = get();
    
    if (subscription) {
      subscription.unsubscribe();
    }
    
    const newSubscription = realtimeService.subscribeToUserPosts(userId, async (payload) => {
      // Reload user posts when changes occur
      await get().loadUserPosts(userId);
    });
    
    set({ subscription: newSubscription });
  },
  
  unsubscribeFromUserPosts: () => {
    const { subscription } = get();
    
    if (subscription) {
      subscription.unsubscribe();
      set({ subscription: null });
    }
  },
  
  subscribeToPostBookmarks: (userId) => {
    const { bookmarkSubscription } = get();
    
    if (bookmarkSubscription) {
      bookmarkSubscription.unsubscribe();
    }
    
    const newSubscription = realtimeService.subscribeToPostBookmarks(userId, async (payload) => {
      // Reload bookmarked posts when changes occur
      await get().loadBookmarkedPosts(userId);
    });
    
    set({ bookmarkSubscription: newSubscription });
  },
  
  unsubscribeFromPostBookmarks: () => {
    const { bookmarkSubscription } = get();
    
    if (bookmarkSubscription) {
      bookmarkSubscription.unsubscribe();
      set({ bookmarkSubscription: null });
    }
  }
}));