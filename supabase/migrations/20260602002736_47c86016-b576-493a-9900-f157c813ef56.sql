CREATE OR REPLACE FUNCTION public.is_seen_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND lower(coalesce(email, '')) = 'kagisosekete5@gmail.com'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_post_viewers(_post_id uuid)
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
SET search_path = public
AS $$
  SELECT
    pv.user_id,
    p.username,
    p.full_name,
    p.avatar_url,
    pv.viewed_at
  FROM public.post_views pv
  LEFT JOIN public.profiles p ON p.id = pv.user_id
  WHERE public.is_seen_admin()
    AND pv.post_id = _post_id
    AND pv.user_id IS NOT NULL
  ORDER BY pv.viewed_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.delete_own_post(_post_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
BEGIN
  SELECT user_id INTO v_owner
  FROM public.posts
  WHERE id = _post_id;

  IF v_owner IS NULL OR v_owner <> auth.uid() THEN
    RETURN false;
  END IF;

  DELETE FROM public.comment_likes
  WHERE comment_id IN (SELECT id FROM public.comments WHERE post_id = _post_id);

  DELETE FROM public.comments WHERE post_id = _post_id;
  DELETE FROM public.bookmarks WHERE post_id = _post_id;
  DELETE FROM public.post_likes WHERE post_id = _post_id;
  DELETE FROM public.post_views WHERE post_id = _post_id;
  DELETE FROM public.reports WHERE reported_post_id = _post_id;
  DELETE FROM public.notifications WHERE post_id = _post_id;
  DELETE FROM public.posts WHERE id = _post_id AND user_id = auth.uid();

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_seen_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_post_viewers(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_own_post(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_seen_admin() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_post_viewers(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_own_post(uuid) TO service_role;

DROP POLICY IF EXISTS "Users can read their own post views" ON public.post_views;
DROP POLICY IF EXISTS "Approved seen admin can read post views" ON public.post_views;

CREATE POLICY "Approved seen admin can read post views"
ON public.post_views
FOR SELECT
TO authenticated
USING (public.is_seen_admin());