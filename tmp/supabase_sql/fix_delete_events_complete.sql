-- Complete fix for message deletion issues in RoleNet

-- 1. Verify the REPLICA IDENTITY setting
SELECT relname, relreplident 
FROM pg_class 
WHERE relname = 'messages';

-- The result should show 'f' for FULL in the relreplident column
-- If it shows 'd' (default) or 'n' (nothing), then run the following command:
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- 2. Add a DELETE policy for the messages table if it doesn't exist
-- First, check if a DELETE policy already exists
SELECT policyname, permissive, cmd, qual 
FROM pg_policies 
WHERE tablename = 'messages' AND cmd = 'DELETE';

-- If no policy exists, create one
-- This policy allows users to delete their own messages in chats they're part of
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'messages' AND cmd = 'DELETE'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can delete their own messages" ON messages FOR DELETE USING (
      auth.uid() = sender_id AND
      EXISTS (
        SELECT 1 FROM chats WHERE chats.id = messages.chat_id AND auth.uid() = ANY(chats.participants)
      )
    )';
  END IF;
END
$$;

-- 3. Verify the changes
-- Check REPLICA IDENTITY again
SELECT relname, relreplident 
FROM pg_class 
WHERE relname = 'messages';

-- Check DELETE policy
SELECT policyname, permissive, cmd, qual 
FROM pg_policies 
WHERE tablename = 'messages' AND cmd = 'DELETE';