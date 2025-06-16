-- Fix for Supabase Storage RLS Policy for Avatars Bucket

-- This script creates the necessary Row Level Security (RLS) policies for the avatars storage bucket
-- to allow authenticated users to upload, view, and update their own avatars.

-- 1. Policy for INSERT - Allow authenticated users to upload avatars to their own folder
CREATE POLICY "Allow authenticated users to upload their own avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = (auth.uid())::text
);

-- 2. Policy for SELECT - Allow anyone to view avatars (public access)
CREATE POLICY "Allow public to view avatars"
ON storage.objects
FOR SELECT
TO authenticated, anon
USING (
  bucket_id = 'avatars'
);

-- 3. Policy for UPDATE - Allow authenticated users to update their own avatars
CREATE POLICY "Allow authenticated users to update their own avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = (auth.uid())::text
);

-- 4. Policy for DELETE - Allow authenticated users to delete their own avatars
CREATE POLICY "Allow authenticated users to delete their own avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = (auth.uid())::text
);