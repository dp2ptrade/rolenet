-- Add group chat metadata columns to the chats table
ALTER TABLE chats ADD COLUMN IF NOT EXISTS group_name TEXT;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS group_avatar TEXT;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS admins UUID[] DEFAULT '{}';

-- Update RLS policies if needed (no changes required for existing policies)
-- Note: Ensure that the policies allow updates to these new fields for participants
