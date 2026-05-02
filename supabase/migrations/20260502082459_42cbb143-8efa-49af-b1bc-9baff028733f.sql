DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public
WITH (security_invoker = true) AS
SELECT
  id, username, full_name, avatar_url, bio, country,
  header_url, profile_visibility, who_can_comment,
  last_seen, last_seen_visibility,
  twitch_url, kick_url, youtube_gaming_url, discord_url,
  show_twitch, show_kick, show_youtube_gaming, show_discord,
  signup_number, created_at, updated_at
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO anon, authenticated;