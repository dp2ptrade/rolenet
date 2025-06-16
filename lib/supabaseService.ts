import { supabase } from './supabase';
import { User, Ping, Friend, Call, Chat, Message, Rating } from './types';
import { Session, AuthError } from '@supabase/supabase-js';

// Auth Service
export class AuthService {
  static async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data, error };
  }

  static async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  }

  static async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  }

  static async getCurrentSession(): Promise<{ session: Session | null; error: AuthError | null }> {
    const { data: { session }, error } = await supabase.auth.getSession();
    return { session, error };
  }

  static onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
}

// User Service
export class UserService {
  static async createUserProfile(userId: string, profileData: Partial<User>) {
    const { data, error } = await supabase
      .from('users')
      .insert({
        id: userId,
        ...profileData,
      })
      .select()
      .single();
    
    return { data, error };
  }

  static async getUserProfile(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    return { data, error };
  }

  static async updateUserProfile(userId: string, updates: Partial<User>) {
    const { data, error } = await supabase
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();
    
    return { data, error };
  }

  static async updateOnlineStatus(userId: string, status: 'online' | 'offline' | 'away') {
    const { data, error } = await supabase
      .from('users')
      .update({
        online_status: status,
        last_seen: new Date().toISOString(),
      })
      .eq('id', userId);
    
    return { data, error };
  }

  static async searchUsers(filters: {
    role?: string;
    tags?: string[];
    location?: { latitude: number; longitude: number; radius?: number };
    is_available?: boolean;
  online_status?: string;
    limit?: number;
  }) {
    let query = supabase
      .from('users')
      .select('*');

    if (filters.role) {
      query = query.ilike('role', `%${filters.role}%`);
    }

    if (filters.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags);
    }

    if (filters.is_available !== undefined) {
      query = query.eq('is_available', filters.is_available);
    }

    if (filters.online_status) {
      query = query.eq('online_status', filters.online_status);
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;
    return { data, error };
  }

  static async getNearbyUsers(latitude: number, longitude: number, radiusKm: number = 50) {
    // Using PostGIS for location-based queries
    const { data, error } = await supabase.rpc('get_nearby_users', {
      user_lat: latitude,
      user_lng: longitude,
      radius_km: radiusKm,
    });
    
    return { data, error };
  }
}

// Ping Service
export class PingService {
  static async sendPing(senderId: string, receiverId: string, message: string) {
    const { data, error } = await supabase
      .from('pings')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        message,
        status: 'pending',
      })
      .select()
      .single();
    
    // Trigger push notification via Edge Function
    if (!error && data) {
      await supabase.functions.invoke('process-ping', {
        body: {
          pingId: data.id,
          receiverId,
          senderId,
          message,
        },
      });
    }
    
    return { data, error };
  }

  static async getUserPings(userId: string, type: 'sent' | 'received') {
    const column = type === 'sent' ? 'sender_id' : 'receiver_id';
    const { data, error } = await supabase
      .from('pings')
      .select(`
        *,
        sender:users!sender_id(id, name, avatar, role),
        receiver:users!receiver_id(id, name, avatar, role)
      `)
      .eq(column, userId)
      .order('created_at', { ascending: false });
    
    return { data, error };
  }

  static async updatePingStatus(pingId: string, status: 'responded' | 'ignored') {
    const { data, error } = await supabase
      .from('pings')
      .update({
        status,
        responded_at: new Date().toISOString(),
      })
      .eq('id', pingId)
      .select()
      .single();
    
    return { data, error };
  }
}

// Friend Service
export class FriendService {
  static async sendFriendRequest(userA: string, userB: string) {
    const { data, error } = await supabase
      .from('friends')
      .insert({
        user_a: userA,
        user_b: userB,
        status: 'pending',
      })
      .select()
      .single();
    
    return { data, error };
  }

  static async respondToFriendRequest(friendId: string, status: 'accepted' | 'declined') {
    const { data, error } = await supabase
      .from('friends')
      .update({ status })
      .eq('id', friendId)
      .select()
      .single();
    
    return { data, error };
  }

  static async getUserFriends(userId: string) {
    const { data, error } = await supabase
      .from('friends')
      .select(`
        *,
        user_a_profile:users!user_a(id, name, avatar, role, online_status),
        user_b_profile:users!user_b(id, name, avatar, role, online_status)
      `)
      .or(`user_a.eq.${userId},user_b.eq.${userId}`)
      .eq('status', 'accepted');
    
    return { data, error };
  }

  static async getFriendRequests(userId: string) {
    const { data, error } = await supabase
      .from('friends')
      .select(`
        *,
        user_a_profile:users!user_a(id, name, avatar, role),
        user_b_profile:users!user_b(id, name, avatar, role)
      `)
      .eq('user_b', userId)
      .eq('status', 'pending');
    
    return { data, error };
  }
}

// Call Service
export class CallService {
  static async initiateCall(callerId: string, calleeId: string, offer: any) {
    const { data, error } = await supabase
      .from('calls')
      .insert({
        caller_id: callerId,
        callee_id: calleeId,
        offer,
        status: 'pending',
      })
      .select()
      .single();
    
    return { data, error };
  }

  static async updateCallStatus(callId: string, status: string, answer?: any) {
    const updates: any = { status };
    if (answer) updates.answer = answer;
    if (status === 'ended') updates.ended_at = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('calls')
      .update(updates)
      .eq('id', callId)
      .select()
      .single();
    
    return { data, error };
  }

  static async addIceCandidate(callId: string, candidate: any) {
    // Get current ice_candidates and append new one
    const { data: call } = await supabase
      .from('calls')
      .select('ice_candidates')
      .eq('id', callId)
      .single();
    
    const currentCandidates = call?.ice_candidates || [];
    const updatedCandidates = [...currentCandidates, candidate];
    
    const { data, error } = await supabase
      .from('calls')
      .update({ ice_candidates: updatedCandidates })
      .eq('id', callId);
    
    return { data, error };
  }

  static async updateCall(callId: string, updates: Partial<Call>) {
    const { data, error } = await supabase
      .from('calls')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', callId)
      .select()
      .single();
    
    return { data, error };
  }

  static async getCallHistory(userId: string, limit: number = 50) {
    const { data, error } = await supabase
      .from('calls')
      .select(`
        *,
        caller:users!caller_id(id, name, avatar),
        callee:users!callee_id(id, name, avatar)
      `)
      .or(`caller_id.eq.${userId},callee_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    return { data, error };
  }

  static subscribeToCall(callId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`call-${callId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'calls',
        filter: `id=eq.${callId}`,
      }, callback)
      .subscribe();
  }
}

// Chat Service
export class ChatService {
  static async getOrCreateChat(participants: string[]) {
    // First, try to find existing chat with these participants
    const { data: existingChats, error: findError } = await supabase
      .from('chats')
      .select('*')
      .contains('participants', participants)
      .order('updated_at', { ascending: false });
    
    if (findError) {
      return { data: null, error: findError };
    }
    
    // If we found an existing chat with these exact participants, return it
    if (existingChats && existingChats.length > 0) {
      return { data: existingChats[0], error: null };
    }
    
    // Otherwise, create a new chat
    const { data, error } = await supabase
      .from('chats')
      .insert({
        participants,
        unread_count: participants.reduce((acc, id) => ({ ...acc, [id]: 0 }), {}),
      })
      .select()
      .single();
    
    return { data, error };
  }

  static async sendMessage(chatId: string, senderId: string, text: string, mediaUrl?: string, type: string = 'text') {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        sender_id: senderId,
        text,
        media_url: mediaUrl,
        type,
        status: 'sent',
      })
      .select()
      .single();
    
    // Update chat's last message
    if (!error && data) {
      await supabase
        .from('chats')
        .update({
          last_message: text || 'Media message',
          last_message_time: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', chatId);
    }
    
    return { data, error };
  }

  static async getChatMessages(chatId: string, limit: number = 50) {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!sender_id(id, name, avatar)
      `)
      .eq('chat_id', chatId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    return { data, error };
  }

  static async getUserChats(userId: string) {
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .contains('participants', [userId])
      .order('updated_at', { ascending: false });
    
    return { data, error };
  }
}

// Rating Service
export class RatingService {
  static async addRating(raterId: string, ratedUserId: string, rating: number, feedback?: string, context: string = 'profile') {
    const { data, error } = await supabase
      .from('ratings')
      .insert({
        rater_id: raterId,
        rated_user_id: ratedUserId,
        rating,
        feedback,
        context,
      })
      .select()
      .single();
    
    // Update user's average rating
    if (!error) {
      await this.updateUserRating(ratedUserId);
    }
    
    return { data, error };
  }

  static async updateUserRating(userId: string) {
    const { data: ratings } = await supabase
      .from('ratings')
      .select('rating')
      .eq('rated_user_id', userId);
    
    if (ratings && ratings.length > 0) {
      const avgRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
      
      await supabase
        .from('users')
        .update({
          rating: Math.round(avgRating * 10) / 10, // Round to 1 decimal
          rating_count: ratings.length,
        })
        .eq('id', userId);
    }
  }

  static async getUserRatings(userId: string) {
    const { data, error } = await supabase
      .from('ratings')
      .select(`
        *,
        rater:users!rater_id(id, name, avatar)
      `)
      .eq('rated_user_id', userId)
      .order('created_at', { ascending: false });
    
    return { data, error };
  }
}

// Realtime subscriptions
export class RealtimeService {
  static subscribeToUserUpdates(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`user-${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'users',
        filter: `id=eq.${userId}`,
      }, callback)
      .subscribe();
  }

  static subscribeToPings(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`pings-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'pings',
        filter: `receiver_id=eq.${userId}`,
      }, callback)
      .subscribe();
  }

  static subscribeToCall(callId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`call-${callId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'calls',
        filter: `id=eq.${callId}`,
      }, callback)
      .subscribe();
  }

  static subscribeToChat(chatId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`chat-${chatId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`,
      }, callback)
      .subscribe();
  }
}

// Service instances for easier importing
export const authService = AuthService;
export const userService = UserService;
export const pingService = PingService;
export const friendService = FriendService;
export const callService = CallService;
export const chatService = ChatService;
export const ratingService = RatingService;
export const realtimeService = RealtimeService;