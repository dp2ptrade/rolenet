-- Migration: 20250628000000_fix_group_members_rls_recursion.sql
-- Fix infinite recursion in group_members RLS policies

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Group admins can manage members" ON group_members;
DROP POLICY IF EXISTS "Users can leave groups" ON group_members;
DROP POLICY IF EXISTS "Only group admins can modify settings" ON group_settings;

-- Create new policies that avoid recursion by using chats.created_by instead of group_members role check
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

-- Fix group_settings policy
CREATE POLICY "Only group creators can modify settings" ON group_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM chats 
      WHERE chats.id = group_settings.chat_id 
      AND chats.created_by = auth.uid()
    )
  );