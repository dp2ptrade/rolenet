import { User, Ping, Friend, Call, Chat, Message, Rating, Post, PostBookmark, PostRating, ServiceBundle, CaseStudy, AvailabilitySlot } from './types';
import { supabase } from './supabase';
import { Session, AuthError } from '@supabase/supabase-js';
import * as FileSystem from 'expo-file-system';
import 'react-native-url-polyfill/auto';
import { AppError, ERROR_CODES } from './errors';
import { uploadTester } from './uploadTester';
import { CONFIG } from './config/chatConfig';

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

  static async getNearbyUsers(latitude: number, longitude: number, radiusKm: number = CONFIG.SEARCH.DEFAULT_RADIUS_KM) {
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
        is_group: participants.length > 2,
      })
      .select()
      .single();
    
    return { data, error };
  }

  static async createGroupChat(name: string, participants: string[], createdBy: string) {
    console.log('🏗️ Creating group chat:', { name, participants, createdBy });
    
    // Ensure the creator is included in participants if not already
    const allParticipants = participants.includes(createdBy) ? participants : [...participants, createdBy];
    console.log('👥 Final participants list:', allParticipants);
    
    const { data, error } = await supabase
      .from('chats')
      .insert({
        name,
        participants: allParticipants,
        is_group: true,
        created_by: createdBy,
        unread_count: allParticipants.reduce((acc, id) => ({ ...acc, [id]: 0 }), {}),
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error creating group chat:', error);
      return { data: null, error };
    }
    
    console.log('✅ Group chat created successfully:', {
      id: data.id,
      name: data.name,
      is_group: data.is_group,
      created_by: data.created_by,
      participants: data.participants
    });
    return { data, error: null };
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
        
        console.log('📄 File info:', {
          uri,
          base64Length: base64.length,
          fileExt
        });
        
        // Convert base64 to blob - optimized for React Native
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        
        console.log('🔢 Byte array created:', {
          length: byteArray.length,
          type: typeof byteArray
        });
        
        // Determine MIME type from file extension
        let mimeType = 'application/octet-stream';
        if (fileExt === 'jpg' || fileExt === 'jpeg') mimeType = 'image/jpeg';
        else if (fileExt === 'png') mimeType = 'image/png';
        else if (fileExt === 'gif') mimeType = 'image/gif';
        else if (fileExt === 'webp') mimeType = 'image/webp';
        else if (fileExt === 'pdf') mimeType = 'application/pdf';
        else if (fileExt === 'm4a' || fileExt === 'mp4') mimeType = 'audio/mp4';
        else if (fileExt === 'wav') mimeType = 'audio/wav';
        else if (fileExt === 'mp3') mimeType = 'audio/mpeg';
        
        // Create blob with React Native compatible approach - avoid ArrayBuffer issues
        try {
          // Use base64 data URL approach first (most compatible with React Native)
          const dataUrl = `data:${mimeType};base64,${base64}`;
          const response = await fetch(dataUrl);
          blob = await response.blob();
          console.log('✅ Blob created with data URL approach');
        } catch (dataUrlError) {
          console.warn('Data URL approach failed, trying direct Uint8Array:', dataUrlError);
          try {
            // Fallback to direct Uint8Array
            blob = new Blob([byteArray], { type: mimeType });
            console.log('✅ Blob created with Uint8Array approach');
          } catch (uint8Error) {
            console.error('All blob creation methods failed, using FormData approach:', uint8Error);
            // Last resort: create a FormData-compatible object
            const formData = new FormData();
            
            // Create a File-like object from base64
            const fileName = `upload.${fileExt}`;
            const file = new File([base64], fileName, { type: mimeType });
            
            // For Supabase, we can upload the file directly
            blob = file as any;
            console.log('✅ Created File object as fallback');
          }
        }
      } else {
        console.log('🌐 Processing web URI...');
        // Handle web URIs with fetch - add timeout and retry logic
        let retries = 3;
        let response: Response;
        
        while (retries > 0) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), CONFIG.REALTIME.HEARTBEAT_INTERVAL);
            
            response = await fetch.call(globalThis, uri, {
              signal: controller.signal,
              headers: {
                'Cache-Control': 'no-cache',
              },
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            break; // Success, exit retry loop
          } catch (error) {
            retries--;
            console.warn(`🔄 Fetch attempt failed, ${retries} retries left:`, error);
            
            if (retries === 0) {
              if (error instanceof Error && error.name === 'AbortError') {
                throw new Error('Network request timed out. Please check your internet connection and try again.');
              }
              throw new Error(`Failed to fetch file: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
            
            // Wait before retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, CONFIG.OFFLINE.BASE_RETRY_DELAY * Math.pow(CONFIG.OFFLINE.BACKOFF_MULTIPLIER, 4 - retries)));
          }
        }
        
        blob = await response!.blob();
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

      // Upload to Supabase Storage with retry logic
      console.log('☁️ Uploading to Supabase Storage...');
      const uploadStartTime = Date.now();
      
      let uploadRetries = 3;
      let uploadData, uploadError;
      
      while (uploadRetries > 0) {
        try {
          const result = await supabase.storage
            .from(bucket)
            .upload(fileName, blob, {
              cacheControl: '3600',
              upsert: false
            });
          
          uploadData = result.data;
          uploadError = result.error;
          
          if (!uploadError) {
            break; // Success, exit retry loop
          }
          
          // If it's a network error, retry
          if (uploadError.message.includes('Network') || uploadError.message.includes('timeout') || uploadError.message.includes('connection')) {
            uploadRetries--;
            if (uploadRetries > 0) {
              console.warn(`🔄 Upload retry ${4 - uploadRetries}/3:`, uploadError.message);
              await new Promise(resolve => setTimeout(resolve, CONFIG.OFFLINE.BASE_RETRY_DELAY * Math.pow(CONFIG.OFFLINE.BACKOFF_MULTIPLIER, 4 - uploadRetries)));
              continue;
            }
          }
          
          // Non-retryable error, break out
          break;
        } catch (error) {
          uploadRetries--;
          uploadError = error;
          if (uploadRetries > 0) {
            console.warn(`🔄 Upload retry ${4 - uploadRetries}/3:`, error);
            await new Promise(resolve => setTimeout(resolve, CONFIG.OFFLINE.BASE_RETRY_DELAY * Math.pow(CONFIG.OFFLINE.BACKOFF_MULTIPLIER, 4 - uploadRetries)));
          }
        }
      }

      const uploadDuration = Date.now() - uploadStartTime;
      console.log(`⏱️ Upload took ${uploadDuration}ms`);

      if (uploadError) {
        console.error('❌ Supabase upload error:', {
          message: uploadError instanceof Error ? uploadError.message : String(uploadError),
          error: uploadError
        });
        
        // Provide user-friendly error messages
        const errorMessage = uploadError instanceof Error ? uploadError.message : 
                           (uploadError && typeof uploadError === 'object' && 'message' in uploadError) ? 
                           String((uploadError as any).message) : String(uploadError);
        
        if (errorMessage.includes('Network')) {
          throw new Error('Upload failed due to network issues. Please check your internet connection and try again.');
        } else if (errorMessage.includes('timeout')) {
          throw new Error('Upload timed out. Please try again with a smaller file or better internet connection.');
        } else if (errorMessage.includes('permission')) {
          throw new Error('Permission denied. Please check your account permissions.');
        }
        
        throw uploadError;
      }

      console.log('✅ Upload successful:', uploadData);

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

  static async getChatMessages(chatId: string, limit: number = CONFIG.MESSAGES.DEFAULT_LIMIT) {
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

  static async getUserChats(userId: string, limit: number = CONFIG.CHATS.DEFAULT_LIMIT) {
    console.log('🔍 getUserChats called with userId:', userId, 'limit:', limit);
    
    // Try multiple query approaches to ensure we get all chats
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .or(`participants.cs.{${userId}},created_by.eq.${userId}`)
      .order('updated_at', { ascending: false })
      .limit(limit);
    
    console.log('📊 getUserChats result:', {
      dataCount: data?.length || 0,
      error: error?.message || 'none',
      groupChats: data?.filter(chat => chat.is_group)?.length || 0,
      directChats: data?.filter(chat => !chat.is_group)?.length || 0,
      createdByUser: data?.filter(chat => chat.created_by === userId)?.length || 0
    });
    
    if (data) {
      console.log('📋 Chat details:', data.map(chat => ({
        id: chat.id,
        name: chat.name,
        is_group: chat.is_group,
        created_by: chat.created_by,
        participants: chat.participants,
        isUserCreator: chat.created_by === userId,
        isUserParticipant: chat.participants?.includes(userId)
      })));
    }
    
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

  static async updateChatAvatar(chatId: string, avatarUri: string): Promise<{ data: any, error: any }> {
    try {
      // Upload the avatar to Supabase Storage
      const publicUrl = await this.uploadMedia(avatarUri, 'chat-avatars');
      
      if (!publicUrl) {
        throw new Error('Failed to upload avatar');
      }

      // Update the chat with the new avatar URL
      const { data, error } = await supabase
        .from('chats')
        .update({ avatar_url: publicUrl })
        .eq('id', chatId)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating chat avatar:', error);
        return { data: null, error };
      }
      
      console.log('Chat avatar updated successfully:', data);
      return { data, error: null };
    } catch (error) {
      console.error('Unexpected error updating chat avatar:', error);
      let errorMessage = 'Failed to update chat avatar due to an unexpected error.';
      if (error instanceof Error && error.message.includes('Network request failed')) {
        errorMessage = 'Failed to update chat avatar due to a network error. Please check your internet connection and try again.';
      }
      return { data: null, error: new Error(errorMessage) };
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

// Post Service
export class PostService {
  static async createPost(postData: Partial<Post>) {
    const { data, error } = await supabase
      .from('posts')
      .insert(postData)
      .select()
      .single();
    
    return { data, error };
  }

  static async getPost(postId: string) {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        user:users!user_id(id, name, avatar, role, rating, rating_count),
        service_bundles:service_bundles(*),
        case_studies:case_studies(*)
      `)
      .eq('id', postId)
      .single();
    
    return { data, error };
  }

  static async updatePost(postId: string, updates: Partial<Post>) {
    const { data, error } = await supabase
      .from('posts')
      .update(updates)
      .eq('id', postId)
      .select()
      .single();
    
    return { data, error };
  }

  static async deletePost(postId: string) {
    const { data, error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);
    
    return { data, error };
  }

  static async getPosts(options: {
    limit?: number;
    offset?: number;
    category?: string;
    tags?: string[];
    search?: string;
    priceMin?: number;
    priceMax?: number;
    experienceLevel?: string;
    serviceType?: string;
    isRemote?: boolean;
    minRating?: number;
    sortBy?: string;
    userId?: string;
  } = {}) {
    let query = supabase
      .from('posts')
      .select(`
        *,
        user:users!user_id(id, name, avatar, role, rating, rating_count)
      `);
    
    // Apply filters
    if (options.category) {
      query = query.eq('category', options.category);
    }
    
    if (options.tags && options.tags.length > 0) {
      query = query.overlaps('tags', options.tags);
    }
    
    if (options.search) {
      query = query.or(`title.ilike.%${options.search}%,description.ilike.%${options.search}%,category.ilike.%${options.search}%`);
    }
    
    if (options.priceMin !== undefined) {
      query = query.gte('price', options.priceMin);
    }
    
    if (options.priceMax !== undefined) {
      query = query.lte('price', options.priceMax);
    }
    
    if (options.experienceLevel) {
      query = query.eq('experience_level', options.experienceLevel);
    }
    
    if (options.serviceType) {
      query = query.eq('service_type', options.serviceType);
    }
    
    if (options.isRemote !== undefined) {
      query = query.eq('is_remote', options.isRemote);
    }
    
    if (options.minRating !== undefined) {
      query = query.gte('rating', options.minRating);
    }
    
    if (options.userId) {
      query = query.eq('user_id', options.userId);
    }
    
    // Apply sorting
    if (options.sortBy) {
      switch (options.sortBy) {
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'oldest':
          query = query.order('created_at', { ascending: true });
          break;
        case 'price_low':
          query = query.order('price', { ascending: true });
          break;
        case 'price_high':
          query = query.order('price', { ascending: false });
          break;
        case 'rating':
          query = query.order('rating', { ascending: false });
          break;
        default:
          query = query.order('created_at', { ascending: false });
      }
    } else {
      // Default sort by newest
      query = query.order('created_at', { ascending: false });
    }
    
    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }
    
    const { data, error, count } = await query;
    
    return { data, error, count };
  }

  static async getPostCategories() {
    const { data, error } = await supabase
      .from('post_categories')
      .select('*')
      .order('name', { ascending: true });
    
    return { data, error };
  }

  static async getPostTags(categoryId?: string) {
    let query = supabase
      .from('post_tags')
      .select('*')
      .order('name', { ascending: true });
    
    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }
    
    const { data, error } = await query;
    
    return { data, error };
  }

  static async bookmarkPost(userId: string, postId: string) {
    const { data, error } = await supabase
      .from('post_bookmarks')
      .insert({
        user_id: userId,
        post_id: postId
      })
      .select()
      .single();
    
    return { data, error };
  }

  static async unbookmarkPost(userId: string, postId: string) {
    const { data, error } = await supabase
      .from('post_bookmarks')
      .delete()
      .eq('user_id', userId)
      .eq('post_id', postId);
    
    return { data, error };
  }

  static async getUserBookmarks(userId: string) {
    const { data, error } = await supabase
      .from('post_bookmarks')
      .select(`
        *,
        post:posts(
          *,
          user:users!user_id(id, name, avatar, role, rating, rating_count)
        )
      `)
      .eq('user_id', userId);
    
    return { data, error };
  }

  static async isPostBookmarked(userId: string, postId: string) {
    const { data, error } = await supabase
      .from('post_bookmarks')
      .select('id')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .single();
    
    return { isBookmarked: !!data, error };
  }

  static async ratePost(userId: string, postId: string, rating: number, comment?: string) {
    const { data, error } = await supabase
      .from('post_ratings')
      .insert({
        user_id: userId,
        post_id: postId,
        rating,
        comment
      })
      .select()
      .single();
    
    return { data, error };
  }

  static async getPostRatings(postId: string) {
    const { data, error } = await supabase
      .from('post_ratings')
      .select(`
        *,
        user:users!user_id(id, name, avatar, role)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: false });
    
    return { data, error };
  }

  static async addServiceBundle(bundle: Partial<ServiceBundle>) {
    const { data, error } = await supabase
      .from('service_bundles')
      .insert(bundle)
      .select()
      .single();
    
    return { data, error };
  }

  static async addCaseStudy(caseStudy: Partial<CaseStudy>) {
    const { data, error } = await supabase
      .from('case_studies')
      .insert(caseStudy)
      .select()
      .single();
    
    return { data, error };
  }

  static async addAvailabilitySlot(slot: Partial<AvailabilitySlot>) {
    const { data, error } = await supabase
      .from('availability_slots')
      .insert(slot)
      .select()
      .single();
    
    return { data, error };
  }

  static async getAvailabilitySlots(postId: string) {
    const { data, error } = await supabase
      .from('availability_slots')
      .select('*')
      .eq('post_id', postId)
      .order('start_time', { ascending: true });
    
    return { data, error };
  }

  static async bookAvailabilitySlot(slotId: string, userId: string) {
    const { data, error } = await supabase
      .from('availability_slots')
      .update({
        is_booked: true,
        booked_by: userId
      })
      .eq('id', slotId)
      .select()
      .single();
    
    return { data, error };
  }

  static async incrementPostView(postId: string) {
    const { data, error } = await supabase.rpc('increment_post_view', {
      post_id: postId
    });
    
    return { data, error };
  }

  static async calculateAIMatchScore(userId: string, postId: string) {
    // This would be a more complex function in a real implementation
    // For now, we'll return a random score between 50 and 100
    const score = Math.floor(Math.random() * 51) + 50;
    return { score };
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

  static subscribeToPosts(callback: (payload: any) => void) {
    return supabase
      .channel('posts-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'posts',
      }, callback)
      .subscribe();
  }

  static subscribeToUserPosts(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`user-posts-${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'posts',
        filter: `user_id=eq.${userId}`,
      }, callback)
      .subscribe();
  }

  static subscribeToPostBookmarks(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`post-bookmarks-${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'post_bookmarks',
        filter: `user_id=eq.${userId}`,
      }, callback)
      .subscribe();
  }
}

export class GroupService {
  // Get group members with user details
  static async getGroupMembers(chatId: string) {
    const { data, error } = await supabase
      .from('group_members')
      .select(`
        *,
        users:user_id (
          id,
          name,
          email,
          avatar,
          online_status
        )
      `)
      .eq('chat_id', chatId)
      .eq('is_active', true)
      .order('role', { ascending: false }) // admins first
      .order('joined_at', { ascending: true });

    return { data, error };
  }

  // Add member to group
  static async addGroupMember(chatId: string, userId: string, role: 'admin' | 'moderator' | 'member' = 'member', invitedBy?: string) {
    const { data, error } = await supabase
      .from('group_members')
      .insert({
        chat_id: chatId,
        user_id: userId,
        role,
        invited_by: invitedBy,
        is_active: true
      })
      .select()
      .single();

    if (!error) {
      // Also add to chat participants
      const { data: chat } = await supabase
        .from('chats')
        .select('participants')
        .eq('id', chatId)
        .single();

      if (chat && !chat.participants.includes(userId)) {
        await supabase
          .from('chats')
          .update({
            participants: [...chat.participants, userId]
          })
          .eq('id', chatId);
      }
    }

    return { data, error };
  }

  // Remove member from group
  static async removeGroupMember(chatId: string, userId: string) {
    const { data, error } = await supabase
      .from('group_members')
      .update({ is_active: false })
      .eq('chat_id', chatId)
      .eq('user_id', userId)
      .select()
      .single();

    if (!error) {
      // Also remove from chat participants
      const { data: chat } = await supabase
        .from('chats')
        .select('participants')
        .eq('id', chatId)
        .single();

      if (chat) {
        await supabase
          .from('chats')
          .update({
            participants: chat.participants.filter((id: string) => id !== userId)
          })
          .eq('id', chatId);
      }
    }

    return { data, error };
  }

  // Update member role
  static async updateMemberRole(chatId: string, userId: string, role: 'admin' | 'moderator' | 'member') {
    const { data, error } = await supabase
      .from('group_members')
      .update({ role })
      .eq('chat_id', chatId)
      .eq('user_id', userId)
      .select()
      .single();

    return { data, error };
  }

  // Get group settings
  static async getGroupSettings(chatId: string) {
    const { data, error } = await supabase
      .from('group_settings')
      .select('*')
      .eq('chat_id', chatId)
      .single();

    return { data, error };
  }

  // Update group settings
  static async updateGroupSettings(chatId: string, settings: Partial<{
    description: string;
    max_members: number;
    allow_member_invite: boolean;
    allow_member_add_others: boolean;
    message_history_visible: boolean;
    only_admins_can_send: boolean;
    approval_required_to_join: boolean;
    allow_media_sharing: boolean;
    allow_voice_messages: boolean;
    allow_file_sharing: boolean;
    auto_delete_messages_days: number | null;
    welcome_message: string;
    group_rules: string;
  }>) {
    const { data, error } = await supabase
      .from('group_settings')
      .update(settings)
      .eq('chat_id', chatId)
      .select()
      .single();

    return { data, error };
  }

  // Check if user is admin or moderator
  static async getUserRole(chatId: string, userId: string) {
    const { data, error } = await supabase
      .from('group_members')
      .select('role')
      .eq('chat_id', chatId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    return { data: data?.role || 'member', error };
  }

  // Check if user has permission to perform action
  static async hasPermission(chatId: string, userId: string, action: 'manage_members' | 'manage_settings' | 'delete_messages' | 'pin_messages') {
    const { data: role } = await this.getUserRole(chatId, userId);
    
    switch (action) {
      case 'manage_members':
      case 'manage_settings':
        return role === 'admin';
      case 'delete_messages':
      case 'pin_messages':
        return role === 'admin' || role === 'moderator';
      default:
        return false;
    }
  }

  // Leave group (for current user)
  static async leaveGroup(chatId: string, userId: string) {
    // Check if user is the only admin
    const { data: members } = await supabase
      .from('group_members')
      .select('user_id, role')
      .eq('chat_id', chatId)
      .eq('is_active', true);

    const admins = members?.filter(m => m.role === 'admin') || [];
    const isOnlyAdmin = admins.length === 1 && admins[0].user_id === userId;

    if (isOnlyAdmin) {
      // Transfer admin to another member or delete group if no other members
      const otherMembers = members?.filter(m => m.user_id !== userId) || [];
      
      if (otherMembers.length > 0) {
        // Promote the oldest member to admin
        await this.updateMemberRole(chatId, otherMembers[0].user_id, 'admin');
      } else {
        // Delete the group if no other members
        await supabase.from('chats').delete().eq('id', chatId);
        return { data: { deleted: true }, error: null };
      }
    }

    // Remove user from group
    return await this.removeGroupMember(chatId, userId);
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
export const groupService = GroupService;
export const postService = PostService;