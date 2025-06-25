-- Create storage bucket for chat avatars if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-avatars',
  'chat-avatars',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Enable RLS on storage.objects (only if not already enabled)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated users to upload chat avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to view chat avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own chat avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own chat avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access to view chat avatars" ON storage.objects;

-- Policy: Allow authenticated users to upload chat avatars
CREATE POLICY "Allow authenticated users to upload chat avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Allow authenticated users to view chat avatars
CREATE POLICY "Allow authenticated users to view chat avatars"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'chat-avatars');

-- Policy: Allow users to update their own chat avatars
CREATE POLICY "Allow users to update their own chat avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'chat-avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'chat-avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Allow users to delete their own chat avatars
CREATE POLICY "Allow users to delete their own chat avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Allow public access to view chat avatars (for public URLs)
CREATE POLICY "Allow public access to view chat avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'chat-avatars');