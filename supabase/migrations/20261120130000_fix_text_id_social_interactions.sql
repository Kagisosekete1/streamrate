BEGIN;

-- This project stores social IDs as text. Keep trigger comparisons text-safe;
-- UUID-typed variables in the prior counter trigger raised uuid = text errors,
-- which aborted likes and comments after their INSERT statements.
CREATE OR REPLACE FUNCTION public.sync_post_interaction_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_post_id text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_post_id := to_jsonb(OLD) ->> 'post_id';
  ELSE
    v_post_id := to_jsonb(NEW) ->> 'post_id';
  END IF;

  IF v_post_id IS NOT NULL THEN
    UPDATE public.posts
    SET like_count = (SELECT count(*)::integer FROM public.post_likes WHERE post_id::text = v_post_id),
        comment_count = (SELECT count(*)::integer FROM public.comments WHERE post_id::text = v_post_id),
        reply_count = (SELECT count(*)::integer FROM public.comments WHERE post_id::text = v_post_id AND parent_id IS NOT NULL),
        share_count = (SELECT count(*)::integer FROM public.post_shares WHERE post_id::text = v_post_id)
    WHERE id::text = v_post_id;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

-- Use the source table's actual ID types so notification inserts work whether
-- the live project uses UUID or text IDs. Cast only for comparisons/lookups.
CREATE OR REPLACE FUNCTION public.notify_on_post_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  owner_id public.posts.user_id%TYPE;
  actor_name text;
BEGIN
  SELECT user_id INTO owner_id FROM public.posts WHERE id::text = NEW.post_id::text;
  IF owner_id IS NULL OR owner_id::text = NEW.user_id::text THEN RETURN NEW; END IF;

  SELECT COALESCE(username, full_name, 'Someone') INTO actor_name
  FROM public.profiles WHERE id::text = NEW.user_id::text;

  INSERT INTO public.notifications (user_id, from_user_id, title, message, type, post_id)
  VALUES (owner_id, NEW.user_id, 'New Like', COALESCE(actor_name, 'Someone') || ' liked your post', 'post_like', NEW.post_id);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_on_post_like failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  post_owner_id public.posts.user_id%TYPE;
  parent_owner_id public.comments.user_id%TYPE;
  actor_name text;
BEGIN
  SELECT user_id INTO post_owner_id FROM public.posts WHERE id::text = NEW.post_id::text;
  SELECT COALESCE(username, full_name, 'Someone') INTO actor_name
  FROM public.profiles WHERE id::text = NEW.user_id::text;

  IF NEW.parent_id IS NOT NULL THEN
    SELECT user_id INTO parent_owner_id FROM public.comments WHERE id::text = NEW.parent_id::text;
    IF parent_owner_id IS NOT NULL AND parent_owner_id::text <> NEW.user_id::text THEN
      INSERT INTO public.notifications (user_id, from_user_id, title, message, type, post_id, comment_id)
      VALUES (parent_owner_id, NEW.user_id, 'New Reply',
        COALESCE(actor_name, 'Someone') || ' replied to your comment: ' || LEFT(NEW.content, 100),
        'comment_reply', NEW.post_id, NEW.id);
    END IF;
  END IF;

  IF post_owner_id IS NOT NULL AND post_owner_id::text <> NEW.user_id::text
     AND (parent_owner_id IS NULL OR post_owner_id::text <> parent_owner_id::text) THEN
    INSERT INTO public.notifications (user_id, from_user_id, title, message, type, post_id, comment_id)
    VALUES (post_owner_id, NEW.user_id, 'New Comment',
      COALESCE(actor_name, 'Someone') || ' commented on your post: ' || LEFT(NEW.content, 100),
      'comment', NEW.post_id, NEW.id);
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_on_comment failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_mention_in_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  mention text;
  mentioned_id public.profiles.id%TYPE;
  actor_name text;
BEGIN
  SELECT COALESCE(username, full_name, 'Someone') INTO actor_name
  FROM public.profiles WHERE id::text = NEW.user_id::text;

  FOR mention IN
    SELECT DISTINCT (regexp_matches(NEW.content, '@([A-Za-z0-9_]+)', 'g'))[1]
  LOOP
    SELECT id INTO mentioned_id
    FROM public.profiles
    WHERE lower(username) = lower(mention)
    LIMIT 1;

    IF mentioned_id IS NOT NULL AND mentioned_id::text <> NEW.user_id::text THEN
      INSERT INTO public.notifications (user_id, from_user_id, title, message, type, post_id, comment_id)
      VALUES (mentioned_id, NEW.user_id, 'You were mentioned',
        COALESCE(actor_name, 'Someone') || ' mentioned you: ' || LEFT(NEW.content, 100),
        'mention', NEW.post_id, NEW.id);
    END IF;
  END LOOP;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_on_mention_in_comment failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_comment_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  comment_owner_id public.comments.user_id%TYPE;
  target_post_id public.comments.post_id%TYPE;
  actor_name text;
BEGIN
  SELECT user_id, post_id INTO comment_owner_id, target_post_id
  FROM public.comments WHERE id::text = NEW.comment_id::text;
  IF comment_owner_id IS NULL OR comment_owner_id::text = NEW.user_id::text THEN RETURN NEW; END IF;

  SELECT COALESCE(username, full_name, 'Someone') INTO actor_name
  FROM public.profiles WHERE id::text = NEW.user_id::text;

  INSERT INTO public.notifications (user_id, from_user_id, title, message, type, post_id, comment_id)
  VALUES (comment_owner_id, NEW.user_id, 'Comment Liked',
    COALESCE(actor_name, 'Someone') || ' liked your comment', 'comment_like', target_post_id, NEW.comment_id);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_on_comment_like failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Ensure the app roles have table privileges in addition to the owner-scoped
-- RLS policies below. These grants do not bypass RLS.
GRANT SELECT ON public.posts, public.post_likes, public.comments, public.comment_likes TO anon, authenticated;
GRANT INSERT, DELETE ON public.post_likes, public.comment_likes TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT ALL ON public.posts, public.post_likes, public.comments, public.comment_likes TO service_role;

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can like posts" ON public.post_likes;
DROP POLICY IF EXISTS "Users can unlike posts" ON public.post_likes;
DROP POLICY IF EXISTS "StreamRate users create own post likes" ON public.post_likes;
DROP POLICY IF EXISTS "StreamRate users remove own post likes" ON public.post_likes;
DROP POLICY IF EXISTS "Zyiro users can read post likes" ON public.post_likes;
DROP POLICY IF EXISTS "Zyiro users can add own post likes" ON public.post_likes;
DROP POLICY IF EXISTS "Zyiro users can remove own post likes" ON public.post_likes;
CREATE POLICY "Zyiro users can read post likes" ON public.post_likes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Zyiro users can add own post likes" ON public.post_likes FOR INSERT TO authenticated WITH CHECK (user_id::text = auth.uid()::text);
CREATE POLICY "Zyiro users can remove own post likes" ON public.post_likes FOR DELETE TO authenticated USING (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;
DROP POLICY IF EXISTS "Users can create comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;
DROP POLICY IF EXISTS "StreamRate users create own comments" ON public.comments;
DROP POLICY IF EXISTS "StreamRate users update own comments" ON public.comments;
DROP POLICY IF EXISTS "StreamRate users delete own comments" ON public.comments;
DROP POLICY IF EXISTS "Zyiro users can read comments" ON public.comments;
DROP POLICY IF EXISTS "Zyiro users can add own comments" ON public.comments;
DROP POLICY IF EXISTS "Zyiro users can edit own comments" ON public.comments;
DROP POLICY IF EXISTS "Zyiro users can delete own comments" ON public.comments;
CREATE POLICY "Zyiro users can read comments" ON public.comments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Zyiro users can add own comments" ON public.comments FOR INSERT TO authenticated WITH CHECK (user_id::text = auth.uid()::text);
CREATE POLICY "Zyiro users can edit own comments" ON public.comments FOR UPDATE TO authenticated USING (user_id::text = auth.uid()::text) WITH CHECK (user_id::text = auth.uid()::text);
CREATE POLICY "Zyiro users can delete own comments" ON public.comments FOR DELETE TO authenticated USING (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Users can like comments" ON public.comment_likes;
DROP POLICY IF EXISTS "Users can unlike comments" ON public.comment_likes;
DROP POLICY IF EXISTS "StreamRate users create own comment likes" ON public.comment_likes;
DROP POLICY IF EXISTS "StreamRate users remove own comment likes" ON public.comment_likes;
DROP POLICY IF EXISTS "Zyiro users can read comment likes" ON public.comment_likes;
DROP POLICY IF EXISTS "Zyiro users can add own comment likes" ON public.comment_likes;
DROP POLICY IF EXISTS "Zyiro users can remove own comment likes" ON public.comment_likes;
CREATE POLICY "Zyiro users can read comment likes" ON public.comment_likes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Zyiro users can add own comment likes" ON public.comment_likes FOR INSERT TO authenticated WITH CHECK (user_id::text = auth.uid()::text);
CREATE POLICY "Zyiro users can remove own comment likes" ON public.comment_likes FOR DELETE TO authenticated USING (user_id::text = auth.uid()::text);

-- Drop old duplicate triggers so one interaction creates one counter update and
-- one notification, then install the text-safe trigger functions.
DROP TRIGGER IF EXISTS trg_sync_post_likes_count_ins ON public.post_likes;
DROP TRIGGER IF EXISTS trg_sync_post_likes_count_del ON public.post_likes;
DROP TRIGGER IF EXISTS trg_sync_comments_count_ins ON public.comments;
DROP TRIGGER IF EXISTS trg_sync_comments_count_upd ON public.comments;
DROP TRIGGER IF EXISTS trg_sync_comments_count_del ON public.comments;
DROP TRIGGER IF EXISTS trg_notify_on_post_like ON public.post_likes;
DROP TRIGGER IF EXISTS on_post_like ON public.post_likes;
DROP TRIGGER IF EXISTS trg_post_like_notification ON public.post_likes;
DROP TRIGGER IF EXISTS trg_notify_on_comment ON public.comments;
DROP TRIGGER IF EXISTS on_new_comment ON public.comments;
DROP TRIGGER IF EXISTS on_comment_mention ON public.comments;
DROP TRIGGER IF EXISTS trg_notify_on_mention_in_comment ON public.comments;
DROP TRIGGER IF EXISTS trg_notify_on_comment_like ON public.comment_likes;
DROP TRIGGER IF EXISTS on_comment_like ON public.comment_likes;
DROP TRIGGER IF EXISTS trg_comment_like_notification ON public.comment_likes;

CREATE TRIGGER trg_sync_post_likes_count_ins AFTER INSERT ON public.post_likes FOR EACH ROW EXECUTE FUNCTION public.sync_post_interaction_counts();
CREATE TRIGGER trg_sync_post_likes_count_del AFTER DELETE ON public.post_likes FOR EACH ROW EXECUTE FUNCTION public.sync_post_interaction_counts();
CREATE TRIGGER trg_sync_comments_count_ins AFTER INSERT ON public.comments FOR EACH ROW EXECUTE FUNCTION public.sync_post_interaction_counts();
CREATE TRIGGER trg_sync_comments_count_upd AFTER UPDATE OF parent_id, post_id ON public.comments FOR EACH ROW EXECUTE FUNCTION public.sync_post_interaction_counts();
CREATE TRIGGER trg_sync_comments_count_del AFTER DELETE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.sync_post_interaction_counts();
CREATE TRIGGER trg_notify_on_post_like AFTER INSERT ON public.post_likes FOR EACH ROW EXECUTE FUNCTION public.notify_on_post_like();
CREATE TRIGGER trg_notify_on_comment AFTER INSERT ON public.comments FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment();
CREATE TRIGGER trg_notify_on_mention_in_comment AFTER INSERT ON public.comments FOR EACH ROW EXECUTE FUNCTION public.notify_on_mention_in_comment();
CREATE TRIGGER trg_notify_on_comment_like AFTER INSERT ON public.comment_likes FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment_like();

ALTER TABLE public.post_likes REPLICA IDENTITY FULL;
ALTER TABLE public.comments REPLICA IDENTITY FULL;
ALTER TABLE public.comment_likes REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'post_likes') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.post_likes;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'comments') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'comment_likes') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.comment_likes;
    END IF;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.notify_on_mention_in_reel_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  mention text;
  mentioned_id public.profiles.id%TYPE;
  actor_name text;
BEGIN
  SELECT COALESCE(username, full_name, 'Someone') INTO actor_name
  FROM public.profiles WHERE id::text = NEW.user_id::text;

  FOR mention IN
    SELECT DISTINCT (regexp_matches(NEW.content, '@([A-Za-z0-9_]+)', 'g'))[1]
  LOOP
    SELECT id INTO mentioned_id
    FROM public.profiles
    WHERE lower(username) = lower(mention)
    LIMIT 1;

    IF mentioned_id IS NOT NULL AND mentioned_id::text <> NEW.user_id::text THEN
      INSERT INTO public.notifications (user_id, from_user_id, title, message, type, reel_id, comment_id)
      VALUES (mentioned_id, NEW.user_id, 'You were mentioned',
        COALESCE(actor_name, 'Someone') || ' mentioned you in a reel: ' || LEFT(NEW.content, 100),
        'mention', NEW.reel_id, NEW.id);
    END IF;
  END LOOP;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_on_mention_in_reel_comment failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_mention_in_reel_comment ON public.reel_comments;
DROP TRIGGER IF EXISTS on_reel_comment_mention ON public.reel_comments;
CREATE TRIGGER trg_notify_on_mention_in_reel_comment
AFTER INSERT ON public.reel_comments
FOR EACH ROW EXECUTE FUNCTION public.notify_on_mention_in_reel_comment();



CREATE OR REPLACE FUNCTION public.notify_on_mention_in_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  mention text;
  mentioned_id public.profiles.id%TYPE;
  actor_name text;
  already_mentioned boolean;
BEGIN
  SELECT COALESCE(username, full_name, 'Someone') INTO actor_name
  FROM public.profiles WHERE id::text = NEW.user_id::text;

  FOR mention IN
    SELECT DISTINCT (regexp_matches(NEW.content, '@([A-Za-z0-9_]+)', 'g'))[1]
  LOOP
    IF TG_OP = 'UPDATE' THEN
      SELECT EXISTS (
        SELECT 1 FROM regexp_matches(COALESCE(OLD.content, ''), '@([A-Za-z0-9_]+)', 'g') AS old_matches(parts)
        WHERE lower(parts[1]) = lower(mention)
      ) INTO already_mentioned;
      IF already_mentioned THEN CONTINUE; END IF;
    END IF;

    SELECT id INTO mentioned_id FROM public.profiles
    WHERE lower(username) = lower(mention)
    LIMIT 1;

    IF mentioned_id IS NOT NULL AND mentioned_id::text <> NEW.user_id::text THEN
      INSERT INTO public.notifications (user_id, from_user_id, title, message, type, post_id)
      VALUES (mentioned_id, NEW.user_id, 'You were mentioned',
        COALESCE(actor_name, 'Someone') || ' mentioned you in a post: ' || LEFT(NEW.content, 100),
        'mention', NEW.id);
    END IF;
  END LOOP;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_on_mention_in_post failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_mention_in_post ON public.posts;
CREATE TRIGGER trg_notify_on_mention_in_post
AFTER INSERT OR UPDATE OF content ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.notify_on_mention_in_post();

COMMIT;





