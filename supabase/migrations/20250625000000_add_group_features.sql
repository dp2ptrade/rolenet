-- Add group name and unique link fields to chats table
DO $$
BEGIN
  -- Add name field for group chats
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chats' 
    AND column_name = 'name'
  ) THEN
    ALTER TABLE chats ADD COLUMN name TEXT;
  END IF;
  
  -- Add unique_link field for group invites
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chats' 
    AND column_name = 'unique_link'
  ) THEN
    ALTER TABLE chats ADD COLUMN unique_link TEXT UNIQUE;
  END IF;
  
  -- Add is_group field to distinguish group chats from direct chats
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chats' 
    AND column_name = 'is_group'
  ) THEN
    ALTER TABLE chats ADD COLUMN is_group BOOLEAN DEFAULT false;
  END IF;
  
  -- Add created_by field to track group creator
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chats' 
    AND column_name = 'created_by'
  ) THEN
    ALTER TABLE chats ADD COLUMN created_by UUID REFERENCES users(id);
  END IF;
END $$;

-- Create index on unique_link for faster lookups
CREATE INDEX IF NOT EXISTS idx_chats_unique_link ON chats(unique_link);

-- Create function to generate unique group links
CREATE OR REPLACE FUNCTION generate_group_link()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..12 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN 'rolenet_' || result;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate unique links for group chats
CREATE OR REPLACE FUNCTION set_group_link()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_group = true AND NEW.unique_link IS NULL THEN
    LOOP
      NEW.unique_link := generate_group_link();
      -- Check if this link already exists
      IF NOT EXISTS (SELECT 1 FROM chats WHERE unique_link = NEW.unique_link) THEN
        EXIT;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_set_group_link ON chats;
CREATE TRIGGER trigger_set_group_link
  BEFORE INSERT OR UPDATE ON chats
  FOR EACH ROW
  EXECUTE FUNCTION set_group_link();