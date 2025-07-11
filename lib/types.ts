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
  caller?: {
    id: string;
    name: string;
    avatar?: string;
    role?: string;
  };
  callee?: {
    id: string;
    name: string;
    avatar?: string;
    role?: string;
  };
}

export interface Chat {
  id: string;
  participants: string[];
  name?: string; // Group name for group chats
  unique_link?: string; // Unique invite link for groups
  is_group?: boolean; // Whether this is a group chat
  created_by?: string; // User ID who created the group
  avatar_url?: string; // Group avatar URL
  last_message?: string;
  last_message_time?: Date;
  unread_count?: number;
  created_at: Date;
  updated_at: Date;
  isPinned?: boolean;
  isFromPing?: boolean; // Indicates if the chat originated from a ping message
}

export interface Message {
  id: string;
  chat_id?: string;
  senderId: string;
  text?: string;
  mediaUrl?: string;
  mediaUri?: string;
  type: 'text' | 'image' | 'audio' | 'voice' | 'document' | 'location';
  status: 'sent' | 'delivered' | 'read' | 'pending' | 'failed';
  timestamp: Date;
  tempId?: string;
  isPinned?: boolean;
  reactions?: { [key: string]: string[] };
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

export interface GroupMember {
  id: string;
  chat_id: string;
  user_id: string;
  role: 'admin' | 'moderator' | 'member';
  joined_at: Date;
  invited_by?: string;
  permissions?: Record<string, any>; // Custom permissions for moderators
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface GroupSettings {
  id: string;
  chat_id: string;
  description?: string;
  max_members: number;
  allow_member_invite: boolean;
  allow_member_add_others: boolean;
  message_history_visible: boolean;
  only_admins_can_send: boolean;
  approval_required_to_join: boolean;
  allow_media_sharing: boolean;
  allow_voice_messages: boolean;
  allow_file_sharing: boolean;
  auto_delete_messages_days?: number;
  welcome_message?: string;
  group_rules?: string;
  created_at: Date;
  updated_at: Date;
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

// Post types
export interface Post {
  id: string;
  title: string;
  user_id: string;
  category: string;
  description: string;
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  is_remote: boolean;
  tags: string[];
  price_type: 'fixed' | 'hourly' | 'free' | 'contact';
  price?: number;
  currency: string;
  availability_date?: Date;
  availability_status: 'available' | 'limited' | 'unavailable';
  experience_level: 'junior' | 'mid' | 'senior';
  service_type: 'one-time' | 'long-term' | 'consulting' | 'coaching';
  media_urls: string[];
  has_video_pitch: boolean;
  has_voice_intro: boolean;
  is_verified: boolean;
  is_featured: boolean;
  is_collaborative: boolean;
  collaborators: string[];
  success_rate?: number;
  projects_completed: number;
  avg_response_time?: number;
  view_count: number;
  rating: number;
  rating_count: number;
  created_at: Date;
  updated_at: Date;
  user?: User;
  service_bundles?: ServiceBundle[];
  case_studies?: CaseStudy[];
  availability_slots?: AvailabilitySlot[];
  ai_match_score?: number; // Calculated field
}

export interface PostBookmark {
  id: string;
  post_id: string;
  user_id: string;
  created_at: Date;
}

export interface PostRating {
  id: string;
  post_id: string;
  user_id: string;
  rating: number;
  comment?: string;
  created_at: Date;
}

export interface PostCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  created_at: Date;
}

export interface PostTag {
  id: string;
  name: string;
  category_id?: string;
  created_at: Date;
}

export interface ServiceBundle {
  id: string;
  post_id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  delivery_time?: number; // in days
  created_at: Date;
  updated_at: Date;
}

export interface AvailabilitySlot {
  id: string;
  post_id: string;
  start_time: Date;
  end_time: Date;
  is_booked: boolean;
  booked_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CaseStudy {
  id: string;
  post_id: string;
  title: string;
  description: string;
  results?: string;
  media_urls: string[];
  created_at: Date;
  updated_at: Date;
}
