-- Restore Data API access for existing interaction tables.
GRANT SELECT ON public.posts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;

GRANT SELECT ON public.post_likes TO anon, authenticated;
GRANT INSERT, DELETE ON public.post_likes TO authenticated;
GRANT ALL ON public.post_likes TO service_role;

GRANT SELECT ON public.comment_likes TO anon, authenticated;
GRANT INSERT, DELETE ON public.comment_likes TO authenticated;
GRANT ALL ON public.comment_likes TO service_role;

GRANT SELECT ON public.comments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT ALL ON public.comments TO service_role;

GRANT SELECT ON public.follows TO anon, authenticated;
GRANT INSERT, DELETE ON public.follows TO authenticated;
GRANT ALL ON public.follows TO service_role;

GRANT SELECT ON public.reels TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.reels TO authenticated;
GRANT ALL ON public.reels TO service_role;

GRANT SELECT ON public.reel_likes TO anon, authenticated;
GRANT INSERT, DELETE ON public.reel_likes TO authenticated;
GRANT ALL ON public.reel_likes TO service_role;

GRANT SELECT ON public.reel_comments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.reel_comments TO authenticated;
GRANT ALL ON public.reel_comments TO service_role;

GRANT SELECT ON public.post_shares TO anon, authenticated;
GRANT INSERT ON public.post_shares TO authenticated;
GRANT ALL ON public.post_shares TO service_role;

GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT INSERT ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

GRANT SELECT ON public.push_dispatch_logs TO authenticated;
GRANT ALL ON public.push_dispatch_logs TO service_role;

-- Add retry metadata to push logs if missing.
ALTER TABLE public.push_dispatch_logs
  ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_retry_at timestamptz;

-- Keep post counters accurate without letting RLS abort user interactions.
CREATE OR REPLACE FUNCTION public.sync_post_interaction_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_post_id uuid;
BEGIN
  v_post_id := COALESCE(NEW.post_id, OLD.post_id);

  IF v_post_id IS NOT NULL THEN
    UPDATE public.posts
    SET
      like_count = (SELECT count(*)::int FROM public.post_likes WHERE post_id = v_post_id),
      comment_count = (SELECT count(*)::int FROM public.comments WHERE post_id = v_post_id),
      reply_count = (SELECT count(*)::int FROM public.comments WHERE post_id = v_post_id AND parent_id IS NOT NULL),
      share_count = (SELECT count(*)::int FROM public.post_shares WHERE post_id = v_post_id)
    WHERE id = v_post_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Ensure share notifications include the shared post.
CREATE OR REPLACE FUNCTION public.notify_on_post_share()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  post_owner_id uuid;
  sharer_name text;
BEGIN
  SELECT user_id INTO post_owner_id FROM public.posts WHERE id = NEW.post_id;
  IF post_owner_id IS NULL OR post_owner_id = NEW.user_id THEN RETURN NEW; END IF;

  SELECT COALESCE(username, full_name, 'Someone') INTO sharer_name
  FROM public.profiles WHERE id = NEW.user_id;

  INSERT INTO public.notifications (user_id, from_user_id, title, message, type, post_id)
  VALUES (
    post_owner_id,
    NEW.user_id,
    'Post Shared',
    COALESCE(sharer_name, 'Someone') || ' shared your post',
    'post_share',
    NEW.post_id
  );
  RETURN NEW;
END;
$$;

-- Recreate missing interaction triggers. Drop first so the migration is safe to re-run.
DROP TRIGGER IF EXISTS trg_sync_post_likes_count_ins ON public.post_likes;
DROP TRIGGER IF EXISTS trg_sync_post_likes_count_del ON public.post_likes;
CREATE TRIGGER trg_sync_post_likes_count_ins
AFTER INSERT ON public.post_likes
FOR EACH ROW EXECUTE FUNCTION public.sync_post_interaction_counts();
CREATE TRIGGER trg_sync_post_likes_count_del
AFTER DELETE ON public.post_likes
FOR EACH ROW EXECUTE FUNCTION public.sync_post_interaction_counts();

DROP TRIGGER IF EXISTS trg_sync_comments_count_ins ON public.comments;
DROP TRIGGER IF EXISTS trg_sync_comments_count_upd ON public.comments;
DROP TRIGGER IF EXISTS trg_sync_comments_count_del ON public.comments;
CREATE TRIGGER trg_sync_comments_count_ins
AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.sync_post_interaction_counts();
CREATE TRIGGER trg_sync_comments_count_upd
AFTER UPDATE OF parent_id, post_id ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.sync_post_interaction_counts();
CREATE TRIGGER trg_sync_comments_count_del
AFTER DELETE ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.sync_post_interaction_counts();

DROP TRIGGER IF EXISTS trg_sync_post_shares_count_ins ON public.post_shares;
CREATE TRIGGER trg_sync_post_shares_count_ins
AFTER INSERT ON public.post_shares
FOR EACH ROW EXECUTE FUNCTION public.sync_post_interaction_counts();

DROP TRIGGER IF EXISTS trg_notify_on_post_like ON public.post_likes;
CREATE TRIGGER trg_notify_on_post_like
AFTER INSERT ON public.post_likes
FOR EACH ROW EXECUTE FUNCTION public.notify_on_post_like();

DROP TRIGGER IF EXISTS trg_notify_on_comment ON public.comments;
CREATE TRIGGER trg_notify_on_comment
AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment();

DROP TRIGGER IF EXISTS trg_notify_on_mention_in_comment ON public.comments;
CREATE TRIGGER trg_notify_on_mention_in_comment
AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.notify_on_mention_in_comment();

DROP TRIGGER IF EXISTS trg_notify_on_comment_like ON public.comment_likes;
CREATE TRIGGER trg_notify_on_comment_like
AFTER INSERT ON public.comment_likes
FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment_like();

DROP TRIGGER IF EXISTS trg_notify_on_follow ON public.follows;
CREATE TRIGGER trg_notify_on_follow
AFTER INSERT ON public.follows
FOR EACH ROW EXECUTE FUNCTION public.notify_on_follow();

DROP TRIGGER IF EXISTS trg_notify_on_reel_like ON public.reel_likes;
CREATE TRIGGER trg_notify_on_reel_like
AFTER INSERT ON public.reel_likes
FOR EACH ROW EXECUTE FUNCTION public.notify_on_reel_like();

DROP TRIGGER IF EXISTS trg_notify_on_reel_comment ON public.reel_comments;
CREATE TRIGGER trg_notify_on_reel_comment
AFTER INSERT ON public.reel_comments
FOR EACH ROW EXECUTE FUNCTION public.notify_on_reel_comment();

DROP TRIGGER IF EXISTS trg_notify_on_mention_in_reel_comment ON public.reel_comments;
CREATE TRIGGER trg_notify_on_mention_in_reel_comment
AFTER INSERT ON public.reel_comments
FOR EACH ROW EXECUTE FUNCTION public.notify_on_mention_in_reel_comment();

DROP TRIGGER IF EXISTS trg_notify_on_post_share ON public.post_shares;
CREATE TRIGGER trg_notify_on_post_share
AFTER INSERT ON public.post_shares
FOR EACH ROW EXECUTE FUNCTION public.notify_on_post_share();

DROP TRIGGER IF EXISTS trg_send_push_on_notification ON public.notifications;
CREATE TRIGGER trg_send_push_on_notification
AFTER INSERT ON public.notifications
FOR EACH ROW
WHEN (NEW.type IS DISTINCT FROM 'reel_view')
EXECUTE FUNCTION public.notify_push();

-- Backfill counters from existing data, preserving all rows.
UPDATE public.posts p
SET
  like_count = COALESCE(l.c, 0),
  comment_count = COALESCE(c.c, 0),
  reply_count = COALESCE(r.c, 0),
  share_count = COALESCE(s.c, 0)
FROM public.posts p2
LEFT JOIN (SELECT post_id, count(*)::int c FROM public.post_likes GROUP BY post_id) l ON l.post_id = p2.id
LEFT JOIN (SELECT post_id, count(*)::int c FROM public.comments GROUP BY post_id) c ON c.post_id = p2.id
LEFT JOIN (SELECT post_id, count(*)::int c FROM public.comments WHERE parent_id IS NOT NULL GROUP BY post_id) r ON r.post_id = p2.id
LEFT JOIN (SELECT post_id, count(*)::int c FROM public.post_shares GROUP BY post_id) s ON s.post_id = p2.id
WHERE p.id = p2.id;