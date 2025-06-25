-- Add Member Roles and Group Settings Tables
-- Migration: 20250627000000_add_group_roles_and_settings.sql

-- Create group_members table for member roles management
CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  invited_by UUID REFERENCES users(id),
  permissions JSONB DEFAULT '{}', -- Custom permissions for moderators
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(chat_id, user_id)
);

-- Create group_settings table for group configuration
CREATE TABLE IF NOT EXISTS group_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE UNIQUE,
  description TEXT,
  max_members INTEGER DEFAULT 256 CHECK (max_members > 0 AND max_members <= 1000),
  allow_member_invite BOOLEAN DEFAULT true,
  allow_member_add_others BOOLEAN DEFAULT false,
  message_history_visible BOOLEAN DEFAULT true,
  only_admins_can_send BOOLEAN DEFAULT false,
  approval_required_to_join BOOLEAN DEFAULT false,
  allow_media_sharing BOOLEAN DEFAULT true,
  allow_voice_messages BOOLEAN DEFAULT true,
  allow_file_sharing BOOLEAN DEFAULT true,
  auto_delete_messages_days INTEGER DEFAULT NULL CHECK (auto_delete_messages_days IS NULL OR auto_delete_messages_days > 0),
  welcome_message TEXT,
  group_rules TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_group_members_chat_id ON group_members(chat_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_role ON group_members(role);
CREATE INDEX IF NOT EXISTS idx_group_settings_chat_id ON group_settings(chat_id);

-- Enable RLS (Row Level Security)
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for group_members
CREATE POLICY "Users can view group members of their groups" ON group_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chats 
      WHERE chats.id = group_members.chat_id 
      AND auth.uid() = ANY(chats.participants)
    )
  );

-- Separate policies to avoid recursion
CREATE POLICY "Group creators can manage all members" ON group_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM chats 
      WHERE chats.id = group_members.chat_id 
      AND chats.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can insert themselves as members" ON group_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
  );

CREATE POLICY "Users can update their own membership" ON group_members
  FOR UPDATE USING (
    user_id = auth.uid()
  );

CREATE POLICY "Users can delete their own membership" ON group_members
  FOR DELETE USING (
    user_id = auth.uid()
  );

-- RLS Policies for group_settings
CREATE POLICY "Users can view settings of their groups" ON group_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chats 
      WHERE chats.id = group_settings.chat_id 
      AND auth.uid() = ANY(chats.participants)
    )
  );

CREATE POLICY "Only group creators can modify settings" ON group_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM chats 
      WHERE chats.id = group_settings.chat_id 
      AND chats.created_by = auth.uid()
    )
  );

-- Function to automatically create group settings when a group is created
CREATE OR REPLACE FUNCTION create_default_group_settings()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create settings for group chats
  IF NEW.is_group = true THEN
    INSERT INTO group_settings (chat_id)
    VALUES (NEW.id)
    ON CONFLICT (chat_id) DO NOTHING;
    
    -- Add the creator as admin
    IF NEW.created_by IS NOT NULL THEN
      INSERT INTO group_members (chat_id, user_id, role, invited_by)
      VALUES (NEW.id, NEW.created_by, 'admin', NEW.created_by)
      ON CONFLICT (chat_id, user_id) DO UPDATE SET
        role = 'admin',
        is_active = true;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-creating group settings
DROP TRIGGER IF EXISTS trigger_create_group_settings ON chats;
CREATE TRIGGER trigger_create_group_settings
  AFTER INSERT ON chats
  FOR EACH ROW
  EXECUTE FUNCTION create_default_group_settings();

-- Function to add members to group_members table when participants are updated
CREATE OR REPLACE FUNCTION sync_group_participants()
RETURNS TRIGGER AS $$
DECLARE
  participant_id UUID;
BEGIN
  -- Only process group chats
  IF NEW.is_group = true THEN
    -- Add new participants as members (if not already exists)
    FOREACH participant_id IN ARRAY NEW.participants
    LOOP
      INSERT INTO group_members (chat_id, user_id, role, invited_by)
      VALUES (NEW.id, participant_id, 'member', NEW.created_by)
      ON CONFLICT (chat_id, user_id) DO UPDATE SET
        is_active = true;
    END LOOP;
    
    -- Deactivate members who are no longer in participants array
    UPDATE group_members 
    SET is_active = false
    WHERE chat_id = NEW.id 
    AND user_id != ALL(NEW.participants)
    AND is_active = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for syncing participants
DROP TRIGGER IF EXISTS trigger_sync_group_participants ON chats;
CREATE TRIGGER trigger_sync_group_participants
  AFTER UPDATE OF participants ON chats
  FOR EACH ROW
  EXECUTE FUNCTION sync_group_participants();

-- Update triggers for updated_at columns
CREATE TRIGGER trigger_group_members_updated_at
    BEFORE UPDATE ON group_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_group_settings_updated_at
    BEFORE UPDATE ON group_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();