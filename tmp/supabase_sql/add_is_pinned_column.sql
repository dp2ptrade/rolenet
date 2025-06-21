-- Add is_pinned column to messages table for pinning functionality
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;

-- Add is_pinned column to chats table for pinning functionality
ALTER TABLE chats ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;

-- Create index for better performance when querying pinned messages
CREATE INDEX IF NOT EXISTS idx_messages_is_pinned ON messages(is_pinned) WHERE is_pinned = true;

-- Create index for better performance when querying pinned chats
CREATE INDEX IF NOT EXISTS idx_chats_is_pinned ON chats(is_pinned) WHERE is_pinned = true;

-- Update any existing messages to have is_pinned = false (this is redundant due to DEFAULT but explicit)
-- UPDATE messages SET is_pinned = false WHERE is_pinned IS NULL;

-- Update any existing chats to have is_pinned = false (this is redundant due to DEFAULT but explicit)
-- UPDATE chats SET is_pinned = false WHERE is_pinned IS NULL;