-- RoleNet Supabase Database Schema
-- This file contains the SQL schema for the RoleNet app

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  location JSONB, -- {latitude, longitude, address}
  avatar TEXT,
  bio TEXT,
  online_status TEXT DEFAULT 'offline' CHECK (online_status IN ('online', 'offline', 'away')),
  is_available BOOLEAN DEFAULT true,
  rating DECIMAL(2,1) DEFAULT 0.0,
  rating_count INTEGER DEFAULT 0,
  profile_visible BOOLEAN DEFAULT true,
  allow_messages BOOLEAN DEFAULT true,
  allow_pings BOOLEAN DEFAULT true,
  blocked_users TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pings table
CREATE TABLE pings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'responded', 'ignored')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE
);

-- Friends table
CREATE TABLE friends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_a UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_a, user_b)
);

-- Calls table
CREATE TABLE calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  caller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  callee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  offer JSONB,
  answer JSONB,
  ice_candidates JSONB[],
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'ringing', 'active', 'ended', 'declined', 'missed')),
  duration INTEGER DEFAULT 0, -- in seconds
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE
);

-- Chats table
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participants UUID[] NOT NULL,
  last_message TEXT,
  last_message_time TIMESTAMP WITH TIME ZONE,
  unread_count JSONB DEFAULT '{}', -- {user_id: count}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT,
  media_url TEXT,
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'audio', 'video')),
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ratings table
CREATE TABLE ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rater_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rated_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  context TEXT, -- 'call', 'chat', 'ping'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(rater_id, rated_user_id, context)
);

-- Additional tables for notifications and activity tracking
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('ping', 'message', 'friend_request', 'call')),
    data JSONB,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pings_sent INTEGER DEFAULT 0,
    pings_received INTEGER DEFAULT 0,
    calls_made INTEGER DEFAULT 0,
    calls_received INTEGER DEFAULT 0,
    messages_sent INTEGER DEFAULT 0,
    friends_count INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Add push_token and notification_preferences to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"ping": true, "message": true, "friend_request": true, "call": true}'::jsonb;

-- Indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_online_status ON users(online_status);
CREATE INDEX idx_users_is_available ON users(is_available);
CREATE INDEX idx_users_push_token ON users(push_token);
CREATE INDEX idx_pings_sender_id ON pings(sender_id);
CREATE INDEX idx_pings_receiver_id ON pings(receiver_id);
CREATE INDEX idx_pings_status ON pings(status);
CREATE INDEX idx_friends_user_a ON friends(user_a);
CREATE INDEX idx_friends_user_b ON friends(user_b);
CREATE INDEX idx_friends_status ON friends(status);
CREATE INDEX idx_calls_caller_id ON calls(caller_id);
CREATE INDEX idx_calls_callee_id ON calls(callee_id);
CREATE INDEX idx_calls_status ON calls(status);
CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_ratings_rated_user_id ON ratings(rated_user_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_action ON activity_logs(action);
CREATE INDEX idx_user_stats_user ON user_stats(user_id);

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pings ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- Users can read all public user data but only update their own
CREATE POLICY "Users can view all users" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- Pings policies
CREATE POLICY "Users can view pings they sent or received" ON pings FOR SELECT USING (
  auth.uid() = sender_id OR auth.uid() = receiver_id
);
CREATE POLICY "Users can send pings" ON pings FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can update pings they received" ON pings FOR UPDATE USING (auth.uid() = receiver_id);

-- Friends policies
CREATE POLICY "Users can view their friendships" ON friends FOR SELECT USING (
  auth.uid() = user_a OR auth.uid() = user_b
);
CREATE POLICY "Users can send friend requests" ON friends FOR INSERT WITH CHECK (auth.uid() = user_a);
CREATE POLICY "Users can update friend requests they received" ON friends FOR UPDATE USING (auth.uid() = user_b);

-- Calls policies
CREATE POLICY "Users can view their calls" ON calls FOR SELECT USING (
  auth.uid() = caller_id OR auth.uid() = callee_id
);
CREATE POLICY "Users can initiate calls" ON calls FOR INSERT WITH CHECK (auth.uid() = caller_id);
CREATE POLICY "Users can update calls they're part of" ON calls FOR UPDATE USING (
  auth.uid() = caller_id OR auth.uid() = callee_id
);

-- Chats policies
CREATE POLICY "Users can view chats they're part of" ON chats FOR SELECT USING (
  auth.uid() = ANY(participants)
);
CREATE POLICY "Users can create chats they're part of" ON chats FOR INSERT WITH CHECK (
  auth.uid() = ANY(participants)
);
CREATE POLICY "Users can update chats they're part of" ON chats FOR UPDATE USING (
  auth.uid() = ANY(participants)
);

-- Messages policies
CREATE POLICY "Users can view messages in their chats" ON messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM chats WHERE chats.id = messages.chat_id AND auth.uid() = ANY(chats.participants)
  )
);
CREATE POLICY "Users can send messages in their chats" ON messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM chats WHERE chats.id = messages.chat_id AND auth.uid() = ANY(chats.participants)
  )
);

-- Ratings policies
CREATE POLICY "Users can view ratings for any user" ON ratings FOR SELECT USING (true);
CREATE POLICY "Users can create ratings" ON ratings FOR INSERT WITH CHECK (auth.uid() = rater_id);

-- Enable RLS on notifications table
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role can insert notifications" ON notifications FOR INSERT WITH CHECK (true);

-- Enable RLS on activity_logs table
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Activity logs policies
CREATE POLICY "Users can view their own activity logs" ON activity_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own activity logs" ON activity_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Enable RLS on user_stats table
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- User stats policies
CREATE POLICY "Users can view their own stats" ON user_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view other users' public stats" ON user_stats FOR SELECT USING (true);
CREATE POLICY "Service role can update user stats" ON user_stats FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can update user stats" ON user_stats FOR UPDATE USING (true);

-- Function to update user rating
CREATE OR REPLACE FUNCTION update_user_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users 
    SET 
        rating = (
            SELECT AVG(rating)::DECIMAL(3,2) 
            FROM ratings 
            WHERE rated_user_id = NEW.rated_user_id
        ),
        rating_count = (
            SELECT COUNT(*) 
            FROM ratings 
            WHERE rated_user_id = NEW.rated_user_id
        )
    WHERE id = NEW.rated_user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to increment user stats
CREATE OR REPLACE FUNCTION increment_user_stat(user_id UUID, stat_name TEXT)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_stats (user_id, pings_sent, pings_received, calls_made, calls_received, messages_sent, friends_count)
    VALUES (user_id, 
        CASE WHEN stat_name = 'pings_sent' THEN 1 ELSE 0 END,
        CASE WHEN stat_name = 'pings_received' THEN 1 ELSE 0 END,
        CASE WHEN stat_name = 'calls_made' THEN 1 ELSE 0 END,
        CASE WHEN stat_name = 'calls_received' THEN 1 ELSE 0 END,
        CASE WHEN stat_name = 'messages_sent' THEN 1 ELSE 0 END,
        CASE WHEN stat_name = 'friends_count' THEN 1 ELSE 0 END
    )
    ON CONFLICT (user_id) DO UPDATE SET
        pings_sent = user_stats.pings_sent + CASE WHEN stat_name = 'pings_sent' THEN 1 ELSE 0 END,
        pings_received = user_stats.pings_received + CASE WHEN stat_name = 'pings_received' THEN 1 ELSE 0 END,
        calls_made = user_stats.calls_made + CASE WHEN stat_name = 'calls_made' THEN 1 ELSE 0 END,
        calls_received = user_stats.calls_received + CASE WHEN stat_name = 'calls_received' THEN 1 ELSE 0 END,
        messages_sent = user_stats.messages_sent + CASE WHEN stat_name = 'messages_sent' THEN 1 ELSE 0 END,
        friends_count = user_stats.friends_count + CASE WHEN stat_name = 'friends_count' THEN 1 ELSE 0 END,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Trigger to update user rating after new rating
CREATE TRIGGER trigger_update_user_rating
    AFTER INSERT ON ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_user_rating();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_chats_updated_at
    BEFORE UPDATE ON chats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_user_stats_updated_at
    BEFORE UPDATE ON user_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();