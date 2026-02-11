
-- Add profile_visibility and who_can_comment columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_visibility text NOT NULL DEFAULT 'public';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS who_can_comment text NOT NULL DEFAULT 'everyone';
