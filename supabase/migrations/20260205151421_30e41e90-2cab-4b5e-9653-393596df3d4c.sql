-- Add visibility toggle columns for social links
ALTER TABLE public.profiles
ADD COLUMN show_twitch boolean DEFAULT true,
ADD COLUMN show_discord boolean DEFAULT true,
ADD COLUMN show_kick boolean DEFAULT true,
ADD COLUMN show_youtube_gaming boolean DEFAULT true;