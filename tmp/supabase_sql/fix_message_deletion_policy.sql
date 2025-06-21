-- Run this SQL in your Supabase SQL Editor to fix the message deletion issue

-- 1. Verify the REPLICA IDENTITY setting
SELECT relname, relreplident 
FROM pg_class 
WHERE relname = 'messages';

-- The result should show 'f' for FULL in the relreplident column
-- If it shows 'd' (default) or 'n' (nothing), then run the following command:
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- 2. Add a DELETE policy for the messages table
-- This policy allows users to delete their own messages in chats they're part of
CREATE POLICY "Users can delete their own messages" ON messages FOR DELETE USING (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM chats WHERE chats.id = messages.chat_id AND auth.uid() = ANY(chats.participants)
  )
);

-- 3. Verify the policy was created
SELECT policyname, permissive, cmd, qual 
FROM pg_policies 
WHERE tablename = 'messages' AND cmd = 'DELETE';