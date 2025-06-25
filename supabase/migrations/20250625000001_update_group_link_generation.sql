-- Update group link generation to use group name

-- Create function to generate unique group links based on group name
CREATE OR REPLACE FUNCTION generate_group_link_from_name(group_name TEXT)
RETURNS TEXT AS $$
DECLARE
  base_link TEXT;
  final_link TEXT;
  counter INTEGER := 0;
BEGIN
  -- Convert group name to URL-friendly format
  base_link := lower(trim(group_name));
  -- Replace spaces and special characters with hyphens
  base_link := regexp_replace(base_link, '[^a-z0-9]+', '-', 'g');
  -- Remove leading/trailing hyphens
  base_link := trim(base_link, '-');
  -- Limit length to 50 characters
  base_link := left(base_link, 50);
  
  -- If base_link is empty, use default
  IF base_link = '' OR base_link IS NULL THEN
    base_link := 'group';
  END IF;
  
  final_link := base_link;
  
  -- Check for uniqueness and add counter if needed
  WHILE EXISTS (SELECT 1 FROM chats WHERE unique_link = final_link) LOOP
    counter := counter + 1;
    final_link := base_link || '-' || counter;
  END LOOP;
  
  RETURN final_link;
END;
$$ LANGUAGE plpgsql;

-- Update the trigger function to use group name
CREATE OR REPLACE FUNCTION set_group_link()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_group = true AND NEW.unique_link IS NULL THEN
    -- Use group name if available, otherwise fall back to random generation
    IF NEW.name IS NOT NULL AND trim(NEW.name) != '' THEN
      NEW.unique_link := generate_group_link_from_name(NEW.name);
    ELSE
      -- Fallback to random generation for groups without names
      LOOP
        NEW.unique_link := generate_group_link();
        -- Check if this link already exists
        IF NOT EXISTS (SELECT 1 FROM chats WHERE unique_link = NEW.unique_link) THEN
          EXIT;
        END IF;
      END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- The trigger is already created, so we don't need to recreate it
-- It will automatically use the updated function