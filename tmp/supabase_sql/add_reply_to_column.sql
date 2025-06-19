-- Add reply_to column to messages table for threaded replies
ALTER TABLE messages
ADD COLUMN reply_to UUID DEFAULT NULL,
ADD CONSTRAINT fk_reply_to FOREIGN KEY (reply_to) REFERENCES messages(id) ON DELETE SET NULL;

-- Add index for reply_to to improve query performance for threaded messages
CREATE INDEX idx_messages_reply_to ON messages(reply_to) WHERE reply_to IS NOT NULL;

COMMENT ON COLUMN messages.reply_to IS 'References the ID of the message this message is replying to, if any';
