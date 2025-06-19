-- Add reactions column to messages table for storing emoji reactions by user IDs
ALTER TABLE messages
ADD COLUMN reactions JSONB DEFAULT '{}'::jsonb;

-- Add index for reactions to improve query performance
CREATE INDEX idx_messages_reactions ON messages USING GIN (reactions);

COMMENT ON COLUMN messages.reactions IS 'JSONB object storing emoji reactions with arrays of user IDs who reacted';
