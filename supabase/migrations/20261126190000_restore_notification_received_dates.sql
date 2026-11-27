BEGIN;

-- The notification's timestamp is its received time.  Restore old bad timestamps
-- from the source event wherever that event is still retained.
WITH repaired AS (
  SELECT
    n.id,
    COALESCE(
      CASE WHEN n.type = 'post_like' THEN (
        SELECT pl.created_at FROM public.post_likes pl
        WHERE pl.post_id::text = n.post_id::text
          AND pl.user_id::text = n.from_user_id::text
        ORDER BY pl.created_at DESC LIMIT 1
      ) END,
      CASE WHEN n.type = 'reel_like' THEN (
        SELECT rl.created_at FROM public.reel_likes rl
        WHERE rl.reel_id::text = n.reel_id::text
          AND rl.user_id::text = n.from_user_id::text
        ORDER BY rl.created_at DESC LIMIT 1
      ) END,
      CASE WHEN n.type IN ('comment', 'comment_reply', 'mention') AND n.reel_id IS NULL THEN (
        SELECT c.created_at FROM public.comments c
        WHERE c.id::text = n.comment_id::text
        LIMIT 1
      ) END,
      CASE WHEN n.type IN ('reel_comment', 'mention') AND n.reel_id IS NOT NULL THEN (
        SELECT rc.created_at FROM public.reel_comments rc
        WHERE rc.id::text = n.comment_id::text
        LIMIT 1
      ) END,
      CASE WHEN n.type = 'comment_like' THEN (
        SELECT cl.created_at FROM public.comment_likes cl
        WHERE cl.comment_id::text = n.comment_id::text
          AND cl.user_id::text = n.from_user_id::text
        ORDER BY cl.created_at DESC LIMIT 1
      ) END,
      CASE WHEN n.type IN ('new_follower', 'follow') THEN (
        SELECT f.created_at FROM public.follows f
        WHERE f.follower_id::text = n.from_user_id::text
          AND f.following_id::text = n.user_id::text
        ORDER BY f.created_at DESC LIMIT 1
      ) END,
      CASE WHEN n.type = 'post_share' THEN (
        SELECT s.created_at FROM public.post_shares s
        WHERE s.post_id::text = n.post_id::text
          AND s.user_id::text = n.from_user_id::text
        ORDER BY s.created_at DESC LIMIT 1
      ) END,
      CASE WHEN n.type = 'new_post' THEN (
        SELECT p.created_at FROM public.posts p
        WHERE p.id::text = n.post_id::text
        LIMIT 1
      ) END,
      CASE WHEN n.type = 'rating' THEN (
        SELECT r.created_at FROM public.ratings r
        WHERE r.streamer_id::text = n.user_id::text
          AND r.fan_id::text = n.from_user_id::text
        ORDER BY r.created_at DESC LIMIT 1
      ) END
    ) AS received_at
  FROM public.notifications n
  WHERE n.created_at < timestamptz '2000-01-01 00:00:00+00'
)
UPDATE public.notifications n
SET created_at = r.received_at
FROM repaired r
WHERE n.id::text = r.id::text
  AND r.received_at IS NOT NULL
  AND r.received_at >= timestamptz '2000-01-01 00:00:00+00';

-- Explicit bad values from any client must not poison future notification dates.
CREATE OR REPLACE FUNCTION public.ensure_notification_received_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.created_at IS NULL OR NEW.created_at < timestamptz '2000-01-01 00:00:00+00' THEN
    NEW.created_at := statement_timestamp();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_notification_received_at ON public.notifications;
CREATE TRIGGER trg_ensure_notification_received_at
BEFORE INSERT OR UPDATE OF created_at ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.ensure_notification_received_at();

COMMIT;
