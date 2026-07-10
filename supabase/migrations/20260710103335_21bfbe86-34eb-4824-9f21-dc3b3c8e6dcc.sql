-- Remove stale or duplicate triggers before rebuilding the interaction trigger set.
DROP TRIGGER IF EXISTS on_comment_created ON public.comments;
DROP TRIGGER IF EXISTS on_new_comment ON public.comments;
DROP TRIGGER IF EXISTS comments_count_after_insert ON public.comments;
DROP TRIGGER IF EXISTS comments_count_after_delete ON public.comments;
DROP TRIGGER IF EXISTS on_post_like ON public.post_likes;
DROP TRIGGER IF EXISTS post_likes_count_after_insert ON public.post_likes;
DROP TRIGGER IF EXISTS post_likes_count_after_delete ON public.post_likes;
DROP TRIGGER IF EXISTS on_comment_like ON public.comment_likes;
DROP TRIGGER IF EXISTS on_follow_created ON public.follows;
DROP TRIGGER IF EXISTS on_post_share ON public.post_shares;
DROP TRIGGER IF EXISTS post_shares_count_after_insert ON public.post_shares;
DROP TRIGGER IF EXISTS post_shares_count_after_delete ON public.post_shares;
DROP TRIGGER IF EXISTS on_reel_like ON public.reel_likes;
DROP TRIGGER IF EXISTS on_reel_comment ON public.reel_comments;
DROP TRIGGER IF EXISTS on_profile_view ON public.profile_views;
DROP TRIGGER IF EXISTS trigger_send_push_on_notification ON public.notifications;
DROP TRIGGER IF EXISTS on_notification_send_push ON public.notifications;

-- Harden count functions so counts never go below zero and replies are counted separately.
CREATE OR REPLACE FUNCTION public.increment_post_like_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.posts
  SET like_count = COALESCE(like_count, 0) + 1
  WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_post_like_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.posts
  SET like_count = GREATEST(COALESCE(like_count, 0) - 1, 0)
  WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_post_comment_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.parent_id IS NULL THEN
    UPDATE public.posts
    SET comment_count = COALESCE(comment_count, 0) + 1
    WHERE id = NEW.post_id;
  ELSE
    UPDATE public.posts
    SET reply_count = COALESCE(reply_count, 0) + 1
    WHERE id = NEW.post_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_post_comment_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.parent_id IS NULL THEN
    UPDATE public.posts
    SET comment_count = GREATEST(COALESCE(comment_count, 0) - 1, 0)
    WHERE id = OLD.post_id;
  ELSE
    UPDATE public.posts
    SET reply_count = GREATEST(COALESCE(reply_count, 0) - 1, 0)
    WHERE id = OLD.post_id;
  END IF;
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_post_share_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.posts
  SET share_count = COALESCE(share_count, 0) + 1
  WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_post_share_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.posts
  SET share_count = GREATEST(COALESCE(share_count, 0) - 1, 0)
  WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$;

-- Make share notifications safe and complete.
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
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_on_post_share failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Make all interaction notification functions non-blocking so interaction saves do not roll back if a notification insert fails.
CREATE OR REPLACE FUNCTION public.notify_on_post_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  liker_name text;
  post_owner_id uuid;
BEGIN
  SELECT COALESCE(username, full_name, 'Someone') INTO liker_name FROM public.profiles WHERE id = NEW.user_id;
  SELECT user_id INTO post_owner_id FROM public.posts WHERE id = NEW.post_id;
  IF post_owner_id IS NULL OR NEW.user_id = post_owner_id THEN RETURN NEW; END IF;

  INSERT INTO public.notifications (user_id, type, title, message, post_id, from_user_id)
  VALUES (post_owner_id, 'post_like', 'New Like', COALESCE(liker_name, 'Someone') || ' liked your post', NEW.post_id, NEW.user_id);
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
SET search_path TO 'public'
AS $$
DECLARE
  post_owner_id uuid;
  commenter_username text;
  parent_comment_owner_id uuid;
BEGIN
  SELECT COALESCE(username, full_name, 'Someone') INTO commenter_username FROM public.profiles WHERE id = NEW.user_id;
  SELECT user_id INTO post_owner_id FROM public.posts WHERE id = NEW.post_id;

  IF NEW.parent_id IS NOT NULL THEN
    SELECT user_id INTO parent_comment_owner_id FROM public.comments WHERE id = NEW.parent_id;
    IF parent_comment_owner_id IS NOT NULL AND parent_comment_owner_id <> NEW.user_id THEN
      INSERT INTO public.notifications (user_id, from_user_id, title, message, type, post_id, comment_id)
      VALUES (parent_comment_owner_id, NEW.user_id, 'New Reply', COALESCE(commenter_username, 'Someone') || ' replied to your comment', 'comment_reply', NEW.post_id, NEW.id);
    END IF;
  END IF;

  IF post_owner_id IS NOT NULL AND post_owner_id <> NEW.user_id
     AND (parent_comment_owner_id IS NULL OR post_owner_id <> parent_comment_owner_id) THEN
    INSERT INTO public.notifications (user_id, from_user_id, title, message, type, post_id, comment_id)
    VALUES (post_owner_id, NEW.user_id, 'New Comment', COALESCE(commenter_username, 'Someone') || ' commented on your post', 'comment', NEW.post_id, NEW.id);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_on_comment failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_comment_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  comment_owner_id uuid;
  liker_username text;
  comment_post_id uuid;
BEGIN
  SELECT user_id, post_id INTO comment_owner_id, comment_post_id FROM public.comments WHERE id = NEW.comment_id;
  SELECT COALESCE(username, full_name, 'Someone') INTO liker_username FROM public.profiles WHERE id = NEW.user_id;

  IF comment_owner_id IS NOT NULL AND comment_owner_id <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, from_user_id, title, message, type, post_id, comment_id)
    VALUES (comment_owner_id, NEW.user_id, 'Comment Liked', COALESCE(liker_username, 'Someone') || ' liked your comment', 'comment_like', comment_post_id, NEW.comment_id);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_on_comment_like failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_follow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  follower_name text;
BEGIN
  IF NEW.follower_id = NEW.following_id THEN RETURN NEW; END IF;
  SELECT COALESCE(username, full_name, 'Someone') INTO follower_name FROM public.profiles WHERE id = NEW.follower_id;
  INSERT INTO public.notifications (user_id, type, title, message, from_user_id)
  VALUES (NEW.following_id, 'new_follower', 'New Follower', COALESCE(follower_name, 'Someone') || ' started following you', NEW.follower_id);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_on_follow failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_reel_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  liker_name text;
  reel_owner_id uuid;
BEGIN
  SELECT COALESCE(username, full_name, 'Someone') INTO liker_name FROM public.profiles WHERE id = NEW.user_id;
  SELECT user_id INTO reel_owner_id FROM public.reels WHERE id = NEW.reel_id;
  IF reel_owner_id IS NULL OR NEW.user_id = reel_owner_id THEN RETURN NEW; END IF;

  INSERT INTO public.notifications (user_id, type, title, message, from_user_id, reel_id)
  VALUES (reel_owner_id, 'reel_like', 'New Like', COALESCE(liker_name, 'Someone') || ' liked your reel', NEW.user_id, NEW.reel_id);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_on_reel_like failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_reel_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  commenter_name text;
  reel_owner_id uuid;
BEGIN
  SELECT COALESCE(username, full_name, 'Someone') INTO commenter_name FROM public.profiles WHERE id = NEW.user_id;
  SELECT user_id INTO reel_owner_id FROM public.reels WHERE id = NEW.reel_id;
  IF reel_owner_id IS NULL OR NEW.user_id = reel_owner_id THEN RETURN NEW; END IF;

  INSERT INTO public.notifications (user_id, type, title, message, from_user_id, reel_id)
  VALUES (reel_owner_id, 'reel_comment', 'New Comment', COALESCE(commenter_name, 'Someone') || ' commented on your reel', NEW.user_id, NEW.reel_id);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_on_reel_comment failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Recreate the canonical triggers.
CREATE TRIGGER post_likes_count_after_insert
  AFTER INSERT ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.increment_post_like_count();

CREATE TRIGGER post_likes_count_after_delete
  AFTER DELETE ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.decrement_post_like_count();

CREATE TRIGGER on_post_like
  AFTER INSERT ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_post_like();

CREATE TRIGGER comments_count_after_insert
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.increment_post_comment_counts();

CREATE TRIGGER comments_count_after_delete
  AFTER DELETE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.decrement_post_comment_counts();

CREATE TRIGGER on_new_comment
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment();

CREATE TRIGGER on_comment_like
  AFTER INSERT ON public.comment_likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment_like();

CREATE TRIGGER on_follow_created
  AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_follow();

CREATE TRIGGER post_shares_count_after_insert
  AFTER INSERT ON public.post_shares
  FOR EACH ROW EXECUTE FUNCTION public.increment_post_share_count();

CREATE TRIGGER post_shares_count_after_delete
  AFTER DELETE ON public.post_shares
  FOR EACH ROW EXECUTE FUNCTION public.decrement_post_share_count();

CREATE TRIGGER on_post_share
  AFTER INSERT ON public.post_shares
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_post_share();

CREATE TRIGGER on_reel_like
  AFTER INSERT ON public.reel_likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_reel_like();

CREATE TRIGGER on_reel_comment
  AFTER INSERT ON public.reel_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_reel_comment();

CREATE TRIGGER on_profile_view
  AFTER INSERT ON public.profile_views
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_profile_view();

CREATE TRIGGER on_notification_send_push
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.notify_push();