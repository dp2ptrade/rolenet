-- Create chat-media storage bucket (Dashboard method preferred)
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO NOTHING;

-- Only create policies if they don't exist
DO $$
BEGIN
    -- Check if RLS is already enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE c.relname = 'objects' 
        AND n.nspname = 'storage' 
        AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- Create policies only if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Allow authenticated users to upload chat media') THEN
        EXECUTE 'CREATE POLICY "Allow authenticated users to upload chat media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = ''chat-media'' AND (storage.foldername(name))[1] = auth.uid()::text)';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Allow authenticated users to view chat media') THEN
        EXECUTE 'CREATE POLICY "Allow authenticated users to view chat media" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = ''chat-media'')';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Allow users to delete their own chat media') THEN
        EXECUTE 'CREATE POLICY "Allow users to delete their own chat media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = ''chat-media'' AND auth.uid() = owner)';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Allow users to update their own chat media') THEN
        EXECUTE 'CREATE POLICY "Allow users to update their own chat media" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = ''chat-media'' AND auth.uid() = owner) WITH CHECK (bucket_id = ''chat-media'' AND auth.uid() = owner)';
    END IF;
END $$;