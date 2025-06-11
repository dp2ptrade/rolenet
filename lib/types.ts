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
  onlineStatus: 'online' | 'offline' | 'busy';
  isAvailable: boolean;
  rating: number;
  ratingCount: number;
  createdAt: Date;
  lastSeen: Date;
}

export interface Ping {
  id: string;
  senderId: string;
  receiverId: string;
  message: string;
  status: 'pending' | 'responded' | 'ignored';
  createdAt: Date;
  respondedAt?: Date;
}

export interface Friend {
  id: string;
  userA: string;
  userB: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Date;
  acceptedAt?: Date;
}

export interface Call {
  id: string;
  callerId: string;
  calleeId: string;
  offer?: any;
  answer?: any;
  iceCandidates: any[];
  status: 'calling' | 'answered' | 'ended' | 'declined';
  startTime?: Date;
  endTime?: Date;
  createdAt: Date;
}

export interface Chat {
  id: string;
  participants: string[];
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount: { [userId: string]: number };
  createdAt: Date;
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
  raterId: string;
  ratedUserId: string;
  rating: number;
  feedback?: string;
  context: 'call' | 'chat' | 'ping';
  createdAt: Date;
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