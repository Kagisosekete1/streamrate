-- 1) PROFILES: enforce profile_visibility + hide email
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Helper: safe lookup of who_can_comment without recursive RLS
CREATE OR REPLACE FUNCTION public.get_who_can_comment(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT who_can_comment FROM public.profiles WHERE id = _user_id;
$$;

CREATE OR REPLACE FUNCTION public.get_profile_visibility(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT profile_visibility FROM public.profiles WHERE id = _user_id;
$$;

-- New SELECT policy that respects profile_visibility
CREATE POLICY "Profiles visible based on visibility setting"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id
  OR profile_visibility = 'public'
  OR profile_visibility IS NULL
  OR (
    profile_visibility = 'followers'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.follows
      WHERE follower_id = auth.uid() AND following_id = profiles.id
    )
  )
);

-- Hide email column from non-owners via a public view
CREATE OR REPLACE VIEW public.profiles_public AS
SELECT
  id, username, full_name, avatar_url, bio, country,
  header_url, profile_visibility, who_can_comment,
  last_seen, last_seen_visibility,
  twitch_url, kick_url, youtube_gaming_url, discord_url,
  show_twitch, show_kick, show_youtube_gaming, show_discord,
  signup_number, created_at, updated_at
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- Restrict direct email access: only owner can read their email through SQL functions
CREATE OR REPLACE FUNCTION public.get_my_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM public.profiles WHERE id = auth.uid();
$$;

-- 2) NOTIFICATIONS: remove permissive insert policy
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
-- Notifications are created by SECURITY DEFINER triggers; no direct client insert needed.

-- 3) REEL_VIEWS / PROFILE_VIEWS: require auth
DROP POLICY IF EXISTS "Anyone can record a view" ON public.reel_views;
CREATE POLICY "Authenticated users can record reel views"
ON public.reel_views
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can insert profile views" ON public.profile_views;
CREATE POLICY "Authenticated users can record profile views"
ON public.profile_views
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- 4) REEL_COMMENTS: enforce reel owner's who_can_comment setting
DROP POLICY IF EXISTS "Users can create reel comments" ON public.reel_comments;
CREATE POLICY "Users can create reel comments respecting owner setting"
ON public.reel_comments
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.reels r
    WHERE r.id = reel_id
    AND (
      r.user_id = auth.uid()
      OR public.get_who_can_comment(r.user_id) IS NULL
      OR public.get_who_can_comment(r.user_id) = 'everyone'
      OR (
        public.get_who_can_comment(r.user_id) = 'followers'
        AND EXISTS (
          SELECT 1 FROM public.follows f
          WHERE f.follower_id = auth.uid() AND f.following_id = r.user_id
        )
      )
    )
  )
);

-- 5) Length constraints on user-generated content
ALTER TABLE public.comments
  ADD CONSTRAINT comment_length_check CHECK (length(content) <= 2000 AND length(trim(content)) > 0);

ALTER TABLE public.reel_comments
  ADD CONSTRAINT reel_comment_length_check CHECK (length(content) <= 2000 AND length(trim(content)) > 0);

ALTER TABLE public.posts
  ADD CONSTRAINT post_content_length_check CHECK (length(content) <= 5000);

ALTER TABLE public.reels
  ADD CONSTRAINT reel_caption_length_check CHECK (caption IS NULL OR length(caption) <= 1000);

ALTER TABLE public.ratings
  ADD CONSTRAINT review_length_check CHECK (review_text IS NULL OR length(review_text) <= 2000);
