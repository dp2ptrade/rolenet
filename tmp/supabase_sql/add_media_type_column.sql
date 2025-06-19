-- Add media_type column to messages table
ALTER TABLE messages ADD COLUMN media_type TEXT DEFAULT 'text' CHECK (media_type IN ('text', 'image', 'file', 'audio', 'video'));

-- Create index for better performance when querying by media type
CREATE INDEX idx_messages_media_type ON messages(media_type);

-- Comment explaining the purpose
COMMENT ON COLUMN messages.media_type IS 'Stores the type of media attached to the message (text, image, file, audio, video)';