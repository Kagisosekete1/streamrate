-- Add social media link columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS twitch_url text,
ADD COLUMN IF NOT EXISTS discord_url text,
ADD COLUMN IF NOT EXISTS kick_url text,
ADD COLUMN IF NOT EXISTS youtube_gaming_url text;