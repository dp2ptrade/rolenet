import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Notification } from '@/lib/types';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: (userId: string) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: (userId: string) => Promise<void>;
  subscribeToNotifications: (userId: string) => () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async (userId: string) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      const notifications = data as Notification[];
      const unreadCount = notifications.filter(n => !n.read_at).length;
      set({ notifications, unreadCount });
    } catch (error) {
      console.error('Unexpected error fetching notifications:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  markAsRead: async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);
      
      if (error) {
        console.error('Error marking notification as read:', error);
        return;
      }

      const currentNotifications = get().notifications;
      const updatedNotifications = currentNotifications.map(n => 
        n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
      );
      const unreadCount = updatedNotifications.filter(n => !n.read_at).length;
      set({ notifications: updatedNotifications, unreadCount });
    } catch (error) {
      console.error('Unexpected error marking notification as read:', error);
    }
  },

  markAllAsRead: async (userId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .is('read_at', null);
      
      if (error) {
        console.error('Error marking all notifications as read:', error);
        return;
      }

      const currentNotifications = get().notifications;
      const updatedNotifications = currentNotifications.map(n => 
        !n.read_at ? { ...n, read_at: new Date().toISOString() } : n
      );
      set({ notifications: updatedNotifications, unreadCount: 0 });
    } catch (error) {
      console.error('Unexpected error marking all notifications as read:', error);
    }
  },

  subscribeToNotifications: (userId: string) => {
    const subscription = supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        const newNotification = payload.new as Notification;
        set(state => ({
          notifications: [newNotification, ...state.notifications],
          unreadCount: state.unreadCount + 1,
        }));
      })
      .subscribe((status, error) => {
        if (error) {
          console.error('Error subscribing to notifications:', error);
        } else {
          console.log('Notification subscription established');
        }
      });

    return () => {
      subscription.unsubscribe();
      console.log('Unsubscribed from notifications');
    };
  },
}));
