CREATE OR REPLACE FUNCTION public.notification_actor_name(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(NULLIF(username, ''), NULLIF(full_name, ''), 'Someone')
  FROM public.profiles
  WHERE id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.create_post_like_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_id uuid;
  actor_name text;
BEGIN
  SELECT user_id INTO owner_id FROM public.posts WHERE id = NEW.post_id;
  IF owner_id IS NULL OR owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  actor_name := public.notification_actor_name(NEW.user_id);
  INSERT INTO public.notifications (user_id, from_user_id, post_id, type, title, message)
  VALUES (owner_id, NEW.user_id, NEW.post_id, 'post_like', 'New like', actor_name || ' liked your post');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_comment_interaction_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_owner_id uuid;
  parent_owner_id uuid;
  actor_name text;
BEGIN
  SELECT user_id INTO post_owner_id FROM public.posts WHERE id = NEW.post_id;
  actor_name := public.notification_actor_name(NEW.user_id);

  IF NEW.parent_id IS NOT NULL THEN
    SELECT user_id INTO parent_owner_id FROM public.comments WHERE id = NEW.parent_id;
    IF parent_owner_id IS NOT NULL AND parent_owner_id <> NEW.user_id THEN
      INSERT INTO public.notifications (user_id, from_user_id, post_id, comment_id, type, title, message)
      VALUES (parent_owner_id, NEW.user_id, NEW.post_id, NEW.id, 'comment_reply', 'New reply', actor_name || ' replied to your comment');
    END IF;

    IF post_owner_id IS NOT NULL AND post_owner_id <> NEW.user_id AND post_owner_id IS DISTINCT FROM parent_owner_id THEN
      INSERT INTO public.notifications (user_id, from_user_id, post_id, comment_id, type, title, message)
      VALUES (post_owner_id, NEW.user_id, NEW.post_id, NEW.id, 'comment', 'New reply on your post', actor_name || ' replied on your post');
    END IF;
  ELSE
    IF post_owner_id IS NOT NULL AND post_owner_id <> NEW.user_id THEN
      INSERT INTO public.notifications (user_id, from_user_id, post_id, comment_id, type, title, message)
      VALUES (post_owner_id, NEW.user_id, NEW.post_id, NEW.id, 'comment', 'New comment', actor_name || ' commented on your post');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_comment_like_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  comment_owner_id uuid;
  comment_post_id uuid;
  actor_name text;
BEGIN
  SELECT user_id, post_id INTO comment_owner_id, comment_post_id FROM public.comments WHERE id = NEW.comment_id;
  IF comment_owner_id IS NULL OR comment_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  actor_name := public.notification_actor_name(NEW.user_id);
  INSERT INTO public.notifications (user_id, from_user_id, post_id, comment_id, type, title, message)
  VALUES (comment_owner_id, NEW.user_id, comment_post_id, NEW.comment_id, 'comment_like', 'New comment like', actor_name || ' liked your comment');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_reel_like_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_id uuid;
  actor_name text;
BEGIN
  SELECT user_id INTO owner_id FROM public.reels WHERE id = NEW.reel_id;
  IF owner_id IS NULL OR owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  actor_name := public.notification_actor_name(NEW.user_id);
  INSERT INTO public.notifications (user_id, from_user_id, reel_id, type, title, message)
  VALUES (owner_id, NEW.user_id, NEW.reel_id, 'reel_like', 'New reel like', actor_name || ' liked your reel');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_reel_comment_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reel_owner_id uuid;
  parent_owner_id uuid;
  actor_name text;
  notif_type text;
  notif_title text;
  notif_message text;
BEGIN
  SELECT user_id INTO reel_owner_id FROM public.reels WHERE id = NEW.reel_id;
  actor_name := public.notification_actor_name(NEW.user_id);

  IF NEW.parent_id IS NOT NULL THEN
    SELECT user_id INTO parent_owner_id FROM public.reel_comments WHERE id = NEW.parent_id;
    IF parent_owner_id IS NOT NULL AND parent_owner_id <> NEW.user_id THEN
      INSERT INTO public.notifications (user_id, from_user_id, reel_id, comment_id, type, title, message)
      VALUES (parent_owner_id, NEW.user_id, NEW.reel_id, NEW.id, 'reel_comment', 'New reel reply', actor_name || ' replied to your reel comment');
    END IF;

    IF reel_owner_id IS NOT NULL AND reel_owner_id <> NEW.user_id AND reel_owner_id IS DISTINCT FROM parent_owner_id THEN
      INSERT INTO public.notifications (user_id, from_user_id, reel_id, comment_id, type, title, message)
      VALUES (reel_owner_id, NEW.user_id, NEW.reel_id, NEW.id, 'reel_comment', 'New reel reply', actor_name || ' replied on your reel');
    END IF;
  ELSE
    IF reel_owner_id IS NOT NULL AND reel_owner_id <> NEW.user_id THEN
      INSERT INTO public.notifications (user_id, from_user_id, reel_id, comment_id, type, title, message)
      VALUES (reel_owner_id, NEW.user_id, NEW.reel_id, NEW.id, 'reel_comment', 'New reel comment', actor_name || ' commented on your reel');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_post_share_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_id uuid;
  actor_name text;
BEGIN
  SELECT user_id INTO owner_id FROM public.posts WHERE id = NEW.post_id;
  IF owner_id IS NULL OR owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  actor_name := public.notification_actor_name(NEW.user_id);
  INSERT INTO public.notifications (user_id, from_user_id, post_id, type, title, message)
  VALUES (owner_id, NEW.user_id, NEW.post_id, 'post_share', 'New share', actor_name || ' shared your post');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_follow_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_name text;
BEGIN
  IF NEW.following_id IS NULL OR NEW.following_id = NEW.follower_id THEN
    RETURN NEW;
  END IF;

  actor_name := public.notification_actor_name(NEW.follower_id);
  INSERT INTO public.notifications (user_id, from_user_id, type, title, message)
  VALUES (NEW.following_id, NEW.follower_id, 'follow', 'New follower', actor_name || ' followed you');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_post_like_notification ON public.post_likes;
CREATE TRIGGER trg_post_like_notification
AFTER INSERT ON public.post_likes
FOR EACH ROW EXECUTE FUNCTION public.create_post_like_notification();

DROP TRIGGER IF EXISTS trg_comment_interaction_notification ON public.comments;
CREATE TRIGGER trg_comment_interaction_notification
AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.create_comment_interaction_notification();

DROP TRIGGER IF EXISTS trg_comment_like_notification ON public.comment_likes;
CREATE TRIGGER trg_comment_like_notification
AFTER INSERT ON public.comment_likes
FOR EACH ROW EXECUTE FUNCTION public.create_comment_like_notification();

DROP TRIGGER IF EXISTS trg_reel_like_notification ON public.reel_likes;
CREATE TRIGGER trg_reel_like_notification
AFTER INSERT ON public.reel_likes
FOR EACH ROW EXECUTE FUNCTION public.create_reel_like_notification();

DROP TRIGGER IF EXISTS trg_reel_comment_notification ON public.reel_comments;
CREATE TRIGGER trg_reel_comment_notification
AFTER INSERT ON public.reel_comments
FOR EACH ROW EXECUTE FUNCTION public.create_reel_comment_notification();

DROP TRIGGER IF EXISTS trg_post_share_notification ON public.post_shares;
CREATE TRIGGER trg_post_share_notification
AFTER INSERT ON public.post_shares
FOR EACH ROW EXECUTE FUNCTION public.create_post_share_notification();

DROP TRIGGER IF EXISTS trg_follow_notification ON public.follows;
CREATE TRIGGER trg_follow_notification
AFTER INSERT ON public.follows
FOR EACH ROW EXECUTE FUNCTION public.create_follow_notification();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'post_shares'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.post_shares;
  END IF;
END $$;