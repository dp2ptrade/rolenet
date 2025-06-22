-- Add UPDATE policy for messages table to allow pin and reaction updates
CREATE POLICY "Users can update messages in their chats" ON messages FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM chats WHERE chats.id = messages.chat_id AND auth.uid() = ANY(chats.participants)
  )
);