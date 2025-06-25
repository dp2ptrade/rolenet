-- Create storage bucket for chat media (voice messages, images, videos) if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-media',
  'chat-media',
  true,
  52428800, -- 50MB limit
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/mp4',
    'audio/wav',
    'audio/m4a',
    'audio/webm'
  ]
)
ON CONFLICT (id) DO NOTHING;

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

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to upload chat media" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to view chat media" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own chat media" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own chat media" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access to view chat media" ON storage.objects;

-- Policy: Allow authenticated users to upload chat media to their own folder
CREATE POLICY "Allow authenticated users to upload chat media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Allow public access to view chat media (for sharing in chats)
CREATE POLICY "Allow public access to view chat media"
ON storage.objects
FOR SELECT
USING (bucket_id = 'chat-media');

-- Policy: Allow users to update their own chat media
CREATE POLICY "Allow users to update their own chat media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'chat-media' AND
  auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'chat-media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Allow users to delete their own chat media
CREATE POLICY "Allow users to delete their own chat media"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Allow authenticated users to view chat media (for authenticated access)
CREATE POLICY "Allow authenticated users to view chat media"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'chat-media');