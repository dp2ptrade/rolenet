-- Run this SQL in your Supabase SQL Editor to fix the message deletion issue
-- This is necessary for Supabase Realtime to properly handle DELETE events

ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Verify the change was applied
SELECT relname, relreplident 
FROM pg_class 
WHERE relname = 'messages';

-- The result should show 'f' for FULL in the relreplident column
-- Example output:
--  relname  | relreplident 
-- ----------+--------------
--  messages | f