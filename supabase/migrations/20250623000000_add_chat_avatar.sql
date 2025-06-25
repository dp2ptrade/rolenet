-- Add avatar_url field to chats table (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chats' 
    AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE chats ADD COLUMN avatar_url TEXT;
  END IF;
END $$;
