BEGIN;

-- The restored schema contains UUID and text IDs in different tables.
-- Comparing their text representations keeps owner checks type-safe.
CREATE OR REPLACE FUNCTION public.is_seen_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id::text = auth.uid()::text
      AND lower(coalesce(email, '')) = 'kagisosekete5@gmail.com'
  );
$$;

REVOKE ALL ON FUNCTION public.is_seen_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_seen_admin() TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.get_post_viewers(uuid);
DROP FUNCTION IF EXISTS public.get_post_viewers(text);
CREATE FUNCTION public.get_post_viewers(_post_id text)
RETURNS TABLE (
  user_id uuid,
  username text,
  full_name text,
  avatar_url text,
  viewed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT
    NULLIF(pv.user_id::text, '')::uuid,
    p.username::text,
    p.full_name::text,
    p.avatar_url::text,
    pv.viewed_at
  FROM public.post_views pv
  LEFT JOIN public.profiles p ON p.id::text = pv.user_id::text
  WHERE public.is_seen_admin()
    AND pv.post_id::text = _post_id
    AND pv.user_id IS NOT NULL
  ORDER BY pv.viewed_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_post_viewers(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_post_viewers(text) TO authenticated, service_role;

-- Use text for the RPC ID so UUID and text post IDs are both accepted.
DROP FUNCTION IF EXISTS public.delete_own_post(uuid);
DROP FUNCTION IF EXISTS public.delete_own_post(text);
CREATE FUNCTION public.delete_own_post(_post_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_owner text;
  v_deleted integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in to delete a post';
  END IF;

  SELECT user_id::text INTO v_owner
  FROM public.posts
  WHERE id::text = _post_id;

  IF v_owner IS NULL OR v_owner <> auth.uid()::text THEN
    RETURN false;
  END IF;

  DELETE FROM public.comment_likes
  WHERE comment_id::text IN (
    SELECT id::text FROM public.comments WHERE post_id::text = _post_id
  );
  DELETE FROM public.comments WHERE post_id::text = _post_id;
  DELETE FROM public.bookmarks WHERE post_id::text = _post_id;
  DELETE FROM public.post_likes WHERE post_id::text = _post_id;
  DELETE FROM public.post_views WHERE post_id::text = _post_id;
  DELETE FROM public.post_shares WHERE post_id::text = _post_id;
  DELETE FROM public.reports WHERE reported_post_id::text = _post_id;
  DELETE FROM public.notifications WHERE post_id::text = _post_id;
  DELETE FROM public.posts
  WHERE id::text = _post_id AND user_id::text = auth.uid()::text;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_own_post(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_own_post(text) TO authenticated, service_role;

-- Replace mixed-type owner policies with casts that work for text or UUID IDs.
DO $$
BEGIN
  IF to_regclass('public.posts') IS NOT NULL THEN
    ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "StreamRate users delete own posts" ON public.posts;
    CREATE POLICY "StreamRate users delete own posts"
      ON public.posts FOR DELETE TO authenticated
      USING (user_id::text = auth.uid()::text);
    GRANT DELETE ON public.posts TO authenticated;
  END IF;

  IF to_regclass('public.comments') IS NOT NULL THEN
    ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "StreamRate users delete own comments" ON public.comments;
    CREATE POLICY "StreamRate users delete own comments"
      ON public.comments FOR DELETE TO authenticated
      USING (user_id::text = auth.uid()::text);
    GRANT DELETE ON public.comments TO authenticated;
  END IF;

  IF to_regclass('public.reels') IS NOT NULL THEN
    ALTER TABLE public.reels ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "StreamRate users delete own reels" ON public.reels;
    CREATE POLICY "StreamRate users delete own reels"
      ON public.reels FOR DELETE TO authenticated
      USING (user_id::text = auth.uid()::text);
    GRANT DELETE ON public.reels TO authenticated;
  END IF;

  IF to_regclass('public.reel_comments') IS NOT NULL THEN
    ALTER TABLE public.reel_comments ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "StreamRate users delete own reel comments" ON public.reel_comments;
    CREATE POLICY "StreamRate users delete own reel comments"
      ON public.reel_comments FOR DELETE TO authenticated
      USING (user_id::text = auth.uid()::text);
    GRANT DELETE ON public.reel_comments TO authenticated;
  END IF;

  IF to_regclass('public.reel_hashtags') IS NOT NULL THEN
    DROP POLICY IF EXISTS "StreamRate reel owners manage reel hashtags" ON public.reel_hashtags;
    CREATE POLICY "StreamRate reel owners manage reel hashtags"
      ON public.reel_hashtags FOR ALL TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.reels r
        WHERE r.id::text = reel_hashtags.reel_id::text
          AND r.user_id::text = auth.uid()::text
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.reels r
        WHERE r.id::text = reel_hashtags.reel_id::text
          AND r.user_id::text = auth.uid()::text
      ));
  END IF;
END;
$$;

-- Allow removal of media attached to the caller's own posts/reels even when
-- legacy object paths predate the current user-id folder convention.
CREATE OR REPLACE FUNCTION public.can_delete_owned_media(_bucket text, _name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT CASE _bucket
    WHEN 'avatars' THEN EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id::text = auth.uid()::text
        AND right(split_part(coalesce(p.avatar_url, ''), '?', 1), length('/avatars/' || _name)) = '/avatars/' || _name
    )
    WHEN 'post-images' THEN EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.user_id::text = auth.uid()::text
        AND right(split_part(coalesce(p.image_url, ''), '?', 1), length('/post-images/' || _name)) = '/post-images/' || _name
    )
    WHEN 'reels' THEN EXISTS (
      SELECT 1 FROM public.reels r
      WHERE r.user_id::text = auth.uid()::text
        AND right(split_part(coalesce(r.video_url, ''), '?', 1), length('/reels/' || _name)) = '/reels/' || _name
    )
    ELSE false
  END;
$$;

REVOKE ALL ON FUNCTION public.can_delete_owned_media(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_delete_owned_media(text, text) TO authenticated;

DROP POLICY IF EXISTS "StreamRate users delete own social media" ON storage.objects;
CREATE POLICY "StreamRate users delete own social media"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id IN ('avatars', 'post-images', 'reels')
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.can_delete_owned_media(bucket_id, name)
    )
  );

-- Track unique post viewers (post_views has one row per user/post) and repair
-- counters from their source rows instead of trusting stale cached values.
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0;
CREATE OR REPLACE FUNCTION public.sync_post_view_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  target_id text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_id := OLD.post_id::text;
  ELSE
    target_id := NEW.post_id::text;
  END IF;

  UPDATE public.posts p
  SET view_count = (
    SELECT count(*)::integer FROM public.post_views pv
    WHERE pv.post_id::text = p.id::text
  )
  WHERE p.id::text = target_id;

  IF TG_OP = 'UPDATE' AND OLD.post_id::text IS DISTINCT FROM NEW.post_id::text THEN
    UPDATE public.posts p
    SET view_count = (
      SELECT count(*)::integer FROM public.post_views pv
      WHERE pv.post_id::text = p.id::text
    )
    WHERE p.id::text = OLD.post_id::text;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS sync_post_view_count ON public.post_views;
CREATE TRIGGER sync_post_view_count
  AFTER INSERT OR UPDATE OR DELETE ON public.post_views
  FOR EACH ROW EXECUTE FUNCTION public.sync_post_view_count();

UPDATE public.posts p
SET view_count = (
  SELECT count(*)::integer FROM public.post_views pv
  WHERE pv.post_id::text = p.id::text
);

-- Reconcile reel view counters with actual recorded plays. The client now
-- records once per played reel session rather than once per React cleanup.
ALTER TABLE public.reels ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0;
CREATE OR REPLACE FUNCTION public.increment_reel_view_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  UPDATE public.reels
  SET view_count = view_count + 1
  WHERE id::text = NEW.reel_id::text;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_reel_view_insert ON public.reel_views;
CREATE TRIGGER on_reel_view_insert
  AFTER INSERT ON public.reel_views
  FOR EACH ROW EXECUTE FUNCTION public.increment_reel_view_count();

UPDATE public.reels r
SET view_count = (
  SELECT count(*)::integer FROM public.reel_views rv
  WHERE rv.reel_id::text = r.id::text
);

NOTIFY pgrst, 'reload schema';
COMMIT;
