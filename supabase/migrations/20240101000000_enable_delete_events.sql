-- Enable DELETE events for Realtime subscriptions
-- This is necessary for Supabase Realtime to properly handle DELETE events
-- Run this SQL in the Supabase SQL editor

ALTER TABLE public.messages REPLICA IDENTITY FULL;