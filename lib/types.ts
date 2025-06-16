export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  tags: string[];
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  avatar?: string;
  bio?: string;
  online_status: 'online' | 'offline' | 'away';
  is_available: boolean;
  rating: number;
  rating_count: number;
  created_at: Date;
  last_seen: Date;
  profile_visible: boolean;
  allow_messages: boolean;
  allow_pings: boolean;
  blocked_users: string[];
}

export interface Ping {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  status: 'pending' | 'responded' | 'ignored';
  created_at: Date;
  responded_at?: Date;
}

export interface Friend {
  id: string;
  user_a: string;
  user_b: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: Date;
  accepted_at?: Date;
}

export interface Call {
  id: string;
  caller_id: string;
  callee_id: string;
  offer?: any;
  answer?: any;
  ice_candidates: any[];
  status: 'pending' | 'ringing' | 'active' | 'ended' | 'declined' | 'missed';
  duration?: number;
  created_at: Date;
  ended_at?: Date;
}

export interface Chat {
  id: string;
  participants: string[];
  last_message?: string;
  last_message_time?: Date;
  unread_count: { [userId: string]: number };
  created_at: Date;
  updated_at: Date;
}

export interface Message {
  id: string;
  senderId: string;
  text?: string;
  mediaUrl?: string;
  type: 'text' | 'image' | 'audio';
  status: 'sent' | 'delivered' | 'read';
  timestamp: Date;
}

export interface Rating {
  id: string;
  rater_id: string;
  rated_user_id: string;
  rating: number;
  feedback?: string;
  context: 'call' | 'chat' | 'ping';
  created_at: Date;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: 'ping' | 'message' | 'friend_request' | 'call';
  data?: any;
  sent_at: string;
  read_at?: string;
  status: 'sent' | 'delivered' | 'failed';
  created_at: string;
}

export const POPULAR_ROLES = [
  'Teacher', 'Doctor', 'Engineer', 'Designer', 'Developer', 'Manager',
  'Student', 'Driver', 'Chef', 'Artist', 'Lawyer', 'Architect',
  'Entrepreneur', 'Consultant', 'Writer', 'Photographer'
];

export const POPULAR_TAGS = [
  'Networking', 'Mentorship', 'Collaboration', 'Learning', 'Business',
  'Innovation', 'Technology', 'Creative', 'Leadership', 'Freelance',
  'Startup', 'Remote Work', 'Career Growth', 'Skills Development'
];
