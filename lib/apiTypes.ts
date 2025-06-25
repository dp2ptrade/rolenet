/**
 * Enhanced Type Definitions for RoleNet API
 * Provides strict type safety for API responses and data structures
 */

import { ErrorCode } from './errors';

/**
 * Generic API Response wrapper
 */
export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
  success: boolean;
  timestamp?: string;
}

/**
 * Structured API Error
 */
export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: Record<string, any>;
  statusCode?: number;
}

/**
 * Result type for operations that can succeed or fail
 */
export type ApiResult<T> = 
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: ApiError };

/**
 * Enhanced Message type with strict validation
 */
export interface SendMessageParams {
  chatId: string;
  senderId: string;
  text: string;
  type?: 'text' | 'image' | 'audio';
  mediaUri?: string;
  metadata?: {
    fileName?: string;
    fileSize?: number;
    duration?: number; // for voice messages
    coordinates?: { lat: number; lng: number }; // for location
    replyTo?: string; // message ID being replied to
  };
  tempId?: string; // for optimistic updates
}

/**
 * Enhanced Chat type with better structure
 */
export interface ChatData {
  id: string;
  participants: string[];
  type: 'individual' | 'group';
  name?: string; // for group chats
  avatar?: string;
  lastMessage?: {
    id: string;
    text: string;
    senderId: string;
    timestamp: string;
    type: string;
  };
  unreadCount: number;
  isPinned: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  settings?: {
    muteNotifications: boolean;
    customNotificationSound?: string;
  };
}

/**
 * Enhanced User type with validation
 */
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: string;
  tags: string[];
  bio?: string;
  location?: {
    latitude: number;
    longitude: number;
    city?: string;
    country?: string;
  };
  onlineStatus: 'online' | 'offline' | 'away' | 'busy';
  lastSeen?: string;
  rating: number;
  ratingCount: number;
  isAvailable: boolean;
  preferences?: {
    visibility: 'public' | 'friends' | 'private';
    allowPings: boolean;
    allowCalls: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  limit?: number;
  cursor?: string;
  offset?: number;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  hasMore: boolean;
  nextCursor?: string;
  total?: number;
}

/**
 * Search and filter parameters
 */
export interface SearchParams {
  query?: string;
  role?: string;
  tags?: string[];
  location?: {
    latitude: number;
    longitude: number;
    radius: number; // in kilometers
  };
  onlineOnly?: boolean;
  availableOnly?: boolean;
  minRating?: number;
  pagination?: PaginationParams;
}

/**
 * Call data structure
 */
export interface CallData {
  id: string;
  callerId: string;
  calleeId: string;
  type: 'audio' | 'video';
  status: 'pending' | 'ringing' | 'active' | 'ended' | 'declined' | 'missed';
  startTime?: string;
  endTime?: string;
  duration?: number; // in seconds
  quality?: {
    audioQuality: 'poor' | 'fair' | 'good' | 'excellent';
    connectionStability: number; // 0-100
  };
  createdAt: string;
}

/**
 * Ping data structure
 */
export interface PingData {
  id: string;
  senderId: string;
  receiverId: string;
  message: string;
  status: 'pending' | 'responded' | 'ignored' | 'expired';
  responseType?: 'chat' | 'call' | 'friend_request';
  expiresAt?: string;
  createdAt: string;
  respondedAt?: string;
}

/**
 * Type guards for runtime type checking
 */
export const isApiError = (error: any): error is ApiError => {
  return (
    error &&
    typeof error === 'object' &&
    typeof error.code === 'string' &&
    typeof error.message === 'string'
  );
};

export const isMessage = (data: any): data is SendMessageParams => {
  return (
    data &&
    typeof data === 'object' &&
    typeof data.chatId === 'string' &&
    typeof data.senderId === 'string' &&
    typeof data.text === 'string'
  );
};

export const isUserProfile = (data: any): data is UserProfile => {
  return (
    data &&
    typeof data === 'object' &&
    typeof data.id === 'string' &&
    typeof data.email === 'string' &&
    typeof data.name === 'string' &&
    typeof data.role === 'string' &&
    Array.isArray(data.tags)
  );
};

export const isChatData = (data: any): data is ChatData => {
  return (
    data &&
    typeof data === 'object' &&
    typeof data.id === 'string' &&
    Array.isArray(data.participants) &&
    ['individual', 'group'].includes(data.type)
  );
};

/**
 * Validation helpers
 */
export const validateSendMessageParams = (params: any): params is SendMessageParams => {
  if (!isMessage(params)) return false;
  
  // Additional validation
  if (params.text.trim().length === 0) return false;
  if (params.type && !['text', 'image', 'voice', 'document', 'location'].includes(params.type)) return false;
  
  return true;
};

export const validatePaginationParams = (params: any): params is PaginationParams => {
  if (!params || typeof params !== 'object') return true; // optional
  
  if (params.limit !== undefined && (typeof params.limit !== 'number' || params.limit <= 0)) return false;
  if (params.cursor !== undefined && typeof params.cursor !== 'string') return false;
  if (params.offset !== undefined && (typeof params.offset !== 'number' || params.offset < 0)) return false;
  
  return true;
};

/**
 * Response builders for consistent API responses
 */
export const createSuccessResponse = <T>(data: T): ApiResponse<T> => ({
  data,
  error: null,
  success: true,
  timestamp: new Date().toISOString()
});

export const createErrorResponse = <T>(error: ApiError): ApiResponse<T> => ({
  data: null,
  error,
  success: false,
  timestamp: new Date().toISOString()
});

export const createApiResult = <T>(data: T): ApiResult<T> => ({
  success: true,
  data,
  error: null
});

export const createApiError = <T>(error: ApiError): ApiResult<T> => ({
  success: false,
  data: null,
  error
});