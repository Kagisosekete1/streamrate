-- Restore owner-scoped social writes and media uploads for the current
-- StreamRate schema, whose user and relation IDs are text rather than uuid.
-- Existing rows and Storage objects are preserved.
BEGIN;

-- Bring Auth users with missing profile rows back into the in-app directory.
-- Keep existing profile rows untouched; use a unique generated QR handle.
INSERT INTO public.profiles (id, email, full_name, avatar_url, qr_handle)
SELECT
  u.id::text,
  u.email,
  COALESCE(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'),
  COALESCE(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture'),
  'user' || replace(u.id::text, '-', '')
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id::text
);

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "StreamRate users update own profile" ON public.profiles;
    CREATE POLICY "StreamRate users update own profile"
      ON public.profiles FOR UPDATE TO authenticated
      USING (id = auth.uid()::text)
      WITH CHECK (id = auth.uid()::text);
  END IF;

  IF to_regclass('public.posts') IS NOT NULL THEN
    ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "StreamRate users create own posts" ON public.posts;
    DROP POLICY IF EXISTS "StreamRate users update own posts" ON public.posts;
    DROP POLICY IF EXISTS "StreamRate users delete own posts" ON public.posts;
    CREATE POLICY "StreamRate users create own posts"
      ON public.posts FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid()::text);
    CREATE POLICY "StreamRate users update own posts"
      ON public.posts FOR UPDATE TO authenticated
      USING (user_id = auth.uid()::text)
      WITH CHECK (user_id = auth.uid()::text);
    CREATE POLICY "StreamRate users delete own posts"
      ON public.posts FOR DELETE TO authenticated
      USING (user_id = auth.uid()::text);
  END IF;

  IF to_regclass('public.post_likes') IS NOT NULL THEN
    ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "StreamRate users create own post likes" ON public.post_likes;
    DROP POLICY IF EXISTS "StreamRate users remove own post likes" ON public.post_likes;
    CREATE POLICY "StreamRate users create own post likes"
      ON public.post_likes FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid()::text);
    CREATE POLICY "StreamRate users remove own post likes"
      ON public.post_likes FOR DELETE TO authenticated
      USING (user_id = auth.uid()::text);
  END IF;

  IF to_regclass('public.comments') IS NOT NULL THEN
    ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "StreamRate users create own comments" ON public.comments;
    DROP POLICY IF EXISTS "StreamRate users update own comments" ON public.comments;
    DROP POLICY IF EXISTS "StreamRate users delete own comments" ON public.comments;
    CREATE POLICY "StreamRate users create own comments"
      ON public.comments FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid()::text);
    CREATE POLICY "StreamRate users update own comments"
      ON public.comments FOR UPDATE TO authenticated
      USING (user_id = auth.uid()::text)
      WITH CHECK (user_id = auth.uid()::text);
    CREATE POLICY "StreamRate users delete own comments"
      ON public.comments FOR DELETE TO authenticated
      USING (user_id = auth.uid()::text);
  END IF;

  IF to_regclass('public.comment_likes') IS NOT NULL THEN
    ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "StreamRate users create own comment likes" ON public.comment_likes;
    DROP POLICY IF EXISTS "StreamRate users remove own comment likes" ON public.comment_likes;
    CREATE POLICY "StreamRate users create own comment likes"
      ON public.comment_likes FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid()::text);
    CREATE POLICY "StreamRate users remove own comment likes"
      ON public.comment_likes FOR DELETE TO authenticated
      USING (user_id = auth.uid()::text);
  END IF;

  IF to_regclass('public.follows') IS NOT NULL THEN
    ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "StreamRate users create follows" ON public.follows;
    DROP POLICY IF EXISTS "StreamRate users remove follows" ON public.follows;
    CREATE POLICY "StreamRate users create follows"
      ON public.follows FOR INSERT TO authenticated
      WITH CHECK (follower_id = auth.uid()::text AND following_id <> auth.uid()::text);
    CREATE POLICY "StreamRate users remove follows"
      ON public.follows FOR DELETE TO authenticated
      USING (follower_id = auth.uid()::text);
  END IF;

  IF to_regclass('public.reels') IS NOT NULL THEN
    ALTER TABLE public.reels ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "StreamRate users create own reels" ON public.reels;
    DROP POLICY IF EXISTS "StreamRate users update own reels" ON public.reels;
    DROP POLICY IF EXISTS "StreamRate users delete own reels" ON public.reels;
    CREATE POLICY "StreamRate users create own reels"
      ON public.reels FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid()::text);
    CREATE POLICY "StreamRate users update own reels"
      ON public.reels FOR UPDATE TO authenticated
      USING (user_id = auth.uid()::text)
      WITH CHECK (user_id = auth.uid()::text);
    CREATE POLICY "StreamRate users delete own reels"
      ON public.reels FOR DELETE TO authenticated
      USING (user_id = auth.uid()::text);
  END IF;

  IF to_regclass('public.reel_likes') IS NOT NULL THEN
    ALTER TABLE public.reel_likes ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "StreamRate users create own reel likes" ON public.reel_likes;
    DROP POLICY IF EXISTS "StreamRate users remove own reel likes" ON public.reel_likes;
    CREATE POLICY "StreamRate users create own reel likes"
      ON public.reel_likes FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid()::text);
    CREATE POLICY "StreamRate users remove own reel likes"
      ON public.reel_likes FOR DELETE TO authenticated
      USING (user_id = auth.uid()::text);
  END IF;

  IF to_regclass('public.reel_comments') IS NOT NULL THEN
    ALTER TABLE public.reel_comments ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "StreamRate users create own reel comments" ON public.reel_comments;
    DROP POLICY IF EXISTS "StreamRate users update own reel comments" ON public.reel_comments;
    DROP POLICY IF EXISTS "StreamRate users delete own reel comments" ON public.reel_comments;
    CREATE POLICY "StreamRate users create own reel comments"
      ON public.reel_comments FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid()::text);
    CREATE POLICY "StreamRate users update own reel comments"
      ON public.reel_comments FOR UPDATE TO authenticated
      USING (user_id = auth.uid()::text)
      WITH CHECK (user_id = auth.uid()::text);
    CREATE POLICY "StreamRate users delete own reel comments"
      ON public.reel_comments FOR DELETE TO authenticated
      USING (user_id = auth.uid()::text);
  END IF;

  IF to_regclass('public.post_shares') IS NOT NULL THEN
    ALTER TABLE public.post_shares ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can share posts" ON public.post_shares;
    DROP POLICY IF EXISTS "StreamRate users share posts" ON public.post_shares;
    CREATE POLICY "StreamRate users share posts"
      ON public.post_shares FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid()::text);
    DROP POLICY IF EXISTS "StreamRate users remove own post shares" ON public.post_shares;
    CREATE POLICY "StreamRate users remove own post shares"
      ON public.post_shares FOR DELETE TO authenticated
      USING (user_id = auth.uid()::text);
  END IF;

  IF to_regclass('public.reel_shares') IS NOT NULL THEN
    ALTER TABLE public.reel_shares ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "StreamRate users share reels" ON public.reel_shares;
    DROP POLICY IF EXISTS "StreamRate users remove own reel shares" ON public.reel_shares;
    CREATE POLICY "StreamRate users share reels"
      ON public.reel_shares FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid()::text);
    CREATE POLICY "StreamRate users remove own reel shares"
      ON public.reel_shares FOR DELETE TO authenticated
      USING (user_id = auth.uid()::text);
  END IF;

  IF to_regclass('public.reel_hashtags') IS NOT NULL THEN
    ALTER TABLE public.reel_hashtags ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "StreamRate reel owners manage reel hashtags" ON public.reel_hashtags;
    CREATE POLICY "StreamRate reel owners manage reel hashtags"
      ON public.reel_hashtags FOR ALL TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.reels r
        WHERE r.id = reel_hashtags.reel_id
          AND r.user_id = auth.uid()::text
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.reels r
        WHERE r.id = reel_hashtags.reel_id
          AND r.user_id = auth.uid()::text
      ));
  END IF;
END
$$;

-- The live hashtags.id is text. Keep count changes behind a SECURITY DEFINER
-- function instead of allowing clients to update hashtag rows directly.
CREATE OR REPLACE FUNCTION public.increment_hashtag_use_count(_hashtag_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  UPDATE public.hashtags
  SET use_count = use_count + 1
  WHERE id = _hashtag_id;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_hashtag_use_count(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_hashtag_use_count(text) TO authenticated;

-- Users may upload, replace and remove objects only inside their own user-id
-- folder. Existing public read policies and files remain untouched.
DROP POLICY IF EXISTS "StreamRate users upload own social media" ON storage.objects;
CREATE POLICY "StreamRate users upload own social media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('avatars', 'post-images', 'reels')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "StreamRate users update own social media" ON storage.objects;
CREATE POLICY "StreamRate users update own social media"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id IN ('avatars', 'post-images', 'reels')
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id IN ('avatars', 'post-images', 'reels')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "StreamRate users delete own social media" ON storage.objects;
CREATE POLICY "StreamRate users delete own social media"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id IN ('avatars', 'post-images', 'reels')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

COMMIT;
