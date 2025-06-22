
import { User, Ping, Friend, Call, Chat, Message, Rating } from './types';
import { supabase } from './supabase';
import { Session, AuthError } from '@supabase/supabase-js';
import * as FileSystem from 'expo-file-system';
import 'react-native-url-polyfill/auto';

// Auth Service
export class AuthService {
  static async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data, error };
  }

  static async confirmSignUp(token: string) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'signup',
    });
    return { data, error };
  }

  static async resetPassword(token: string, newPassword: string) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'recovery',
    });
    if (error) return { data: null, error };

    const { data: updateData, error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { data: updateData, error: updateError };
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

  static async uploadMedia(uri: string, bucket: string = 'chat-media'): Promise<string> {
    console.log('🔄 Starting media upload process...');
    console.log('📁 URI:', uri);
    console.log('🪣 Bucket:', bucket);
    
    try {
      // Get current user
      console.log('🔐 Checking user authentication...');
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('❌ Authentication failed:', authError);
        throw new Error('User not authenticated');
      }
      console.log('✅ User authenticated:', user.id);

      // Generate unique filename with user ID for RLS
      let fileExt = 'jpg'; // default extension
      
      // Extract file extension based on URI type
      if (uri.startsWith('data:')) {
        // For data URLs, extract MIME type
        const mimeMatch = uri.match(/data:([^;]+)/);
        if (mimeMatch) {
          const mimeType = mimeMatch[1];
          if (mimeType.includes('png')) fileExt = 'png';
          else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) fileExt = 'jpg';
          else if (mimeType.includes('gif')) fileExt = 'gif';
          else if (mimeType.includes('webp')) fileExt = 'webp';
        }
      } else {
        // For regular file URIs, extract extension from path
        const pathParts = uri.split('.');
        if (pathParts.length > 1) {
          fileExt = pathParts.pop() || 'jpg';
        }
      }
      
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      console.log('📝 Generated filename:', fileName);

      // Convert URI to blob
      console.log('🔄 Converting URI to blob...');
      let blob: Blob;
      
      // Check if it's a local file URI (starts with file://) or a web URI
      if (uri.startsWith('file://') || uri.startsWith('content://') || uri.startsWith('ph://')) {
        console.log('📱 Processing local file URI...');
        // Read local file using FileSystem
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        // Convert base64 to blob
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        
        // Determine MIME type from file extension
        let mimeType = 'application/octet-stream';
        if (fileExt === 'jpg' || fileExt === 'jpeg') mimeType = 'image/jpeg';
        else if (fileExt === 'png') mimeType = 'image/png';
        else if (fileExt === 'gif') mimeType = 'image/gif';
        else if (fileExt === 'webp') mimeType = 'image/webp';
        else if (fileExt === 'pdf') mimeType = 'application/pdf';
        
        blob = new Blob([byteArray], { type: mimeType });
      } else {
        console.log('🌐 Processing web URI...');
        // Handle web URIs with fetch
        const response = await fetch.call(globalThis, uri);
        
        if (!response.ok) {
          console.error('❌ Failed to fetch file:', response.status, response.statusText);
          throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
        }
        
        blob = await response.blob();
      }
      console.log('✅ Blob created:', {
        size: blob.size,
        type: blob.type
      });

      // Check file size (limit to 10MB)
      if (blob.size > 10 * 1024 * 1024) {
        console.error('❌ File too large:', blob.size);
        throw new Error('File size exceeds 10MB limit');
      }

      // Upload to Supabase Storage
      console.log('☁️ Uploading to Supabase Storage...');
      const uploadStartTime = Date.now();
      
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, blob, {
          cacheControl: '3600',
          upsert: false
        });

      const uploadDuration = Date.now() - uploadStartTime;
      console.log(`⏱️ Upload took ${uploadDuration}ms`);

      if (error) {
        console.error('❌ Supabase upload error:', {
          message: error.message,
          error: error
        });
        throw error;
      }

      console.log('✅ Upload successful:', data);

      // Get public URL
      console.log('🔗 Getting public URL...');
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      console.log('✅ Public URL generated:', publicUrl);
      return publicUrl;
      
    } catch (error) {
      console.error('💥 Media upload failed:', {
        error: error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        uri,
        bucket
      });
      
      // Re-throw with more context
      if (error instanceof Error) {
        throw new Error(`Media upload failed: ${error.message}`);
      }
      throw new Error('Media upload failed: Unknown error');
    }
  }

  static async sendMessage(chatId: string, senderId: string, text: string, mediaUrl?: string, mediaType?: string, type: string = 'text') {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        sender_id: senderId,
        text,
        media_url: mediaUrl,
        media_type: mediaType,
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
          last_message: text || (mediaType === 'image' ? '📷 Image' : '📎 File'),
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

  static async getUserChats(userId: string, limit: number = 20) {
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .contains('participants', [userId])
      .order('updated_at', { ascending: false })
      .limit(limit);
    
    return { data, error };
  }

  static async togglePinChat(chatId: string, pin: boolean) {
    const { data, error } = await supabase
      .from('chats')
      .update({ is_pinned: pin })
      .eq('id', chatId)
      .select()
      .single();
    
    return { data, error };
  }

  static async deleteMessage(messageId: string) {
    console.log('ChatService: Deleting message with ID:', messageId);
    
    try {
      // First, get the message to check if it has media attached
      const { data: message, error: fetchError } = await supabase
        .from('messages')
        .select('media_url, media_type')
        .eq('id', messageId)
        .single();
      
      if (fetchError) {
        console.error('ChatService: Error fetching message before deletion:', fetchError);
        return { data: null, error: fetchError };
      }
      
      // Delete the message from the database
      const { data, error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .select();
      
      if (error) {
        console.error('ChatService: Error deleting message:', error);
        return { data, error };
      }
      
      // If the message had media attached, delete it from storage
      if (message && message.media_url && message.media_type) {
        // Extract the file path from the media URL
        // The URL format is like: https://[supabase-project].supabase.co/storage/v1/object/public/chat-media/[user-id]/[filename]
        const urlParts = message.media_url.split('/chat-media/');
        if (urlParts.length > 1) {
          const filePath = urlParts[1];
          console.log('ChatService: Attempting to delete media file:', filePath);
          
          const { error: storageError } = await supabase.storage
            .from('chat-media')
            .remove([filePath]);
          
          if (storageError) {
            console.error('ChatService: Error deleting media file:', storageError);
            // We still return success for the message deletion even if media deletion fails
          } else {
            console.log('ChatService: Media file deleted successfully');
          }
        }
      }
      
      console.log('ChatService: Message deleted successfully:', data);
      return { data, error: null };
    } catch (error) {
      console.error('ChatService: Unexpected error in deleteMessage:', error);
      return { data: null, error };
    }
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
    console.log('RealtimeService: Subscribing to chat:', chatId);
    
    const wrappedCallback = (payload: any) => {
      console.log('RealtimeService: Received event:', payload.eventType, 'for chat:', chatId);
      
      // Enhanced logging for debugging
      if (payload.eventType === 'DELETE') {
        console.log('RealtimeService: DELETE event details:', JSON.stringify({
          old: payload.old,
          schema: payload.schema,
          table: payload.table,
          commit_timestamp: payload.commit_timestamp
        }, null, 2));
        console.log('RealtimeService: DELETE event old record ID:', payload.old?.id);
      } else if (payload.eventType === 'INSERT') {
        console.log('RealtimeService: INSERT event message ID:', payload.new?.id);
        console.log('RealtimeService: INSERT event details:', JSON.stringify({
          new: payload.new,
          schema: payload.schema,
          table: payload.table,
          commit_timestamp: payload.commit_timestamp
        }, null, 2));
      }
      
      callback(payload);
    };
    
    return supabase
      .channel(`chat-${chatId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`,
      }, wrappedCallback)
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`,
      }, wrappedCallback)
      .subscribe();
  }

  static subscribeToAllMessages(callback: (payload: any) => void) {
    console.log('RealtimeService: Subscribing to all messages');
    
    const wrappedCallback = (payload: any) => {
      console.log('RealtimeService: Received global message event:', payload.eventType);
      callback(payload);
    };
    
    return supabase
      .channel('all-messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, wrappedCallback)
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
