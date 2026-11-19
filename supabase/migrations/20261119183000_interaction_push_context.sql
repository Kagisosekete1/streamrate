-- Reliable native interaction pushes and quiet profile-view history.
-- Re-runnable: only replaces triggers/functions; existing posts, users and media stay intact.
BEGIN;

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS poll_id uuid;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS comment_id uuid;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS reel_id uuid;

CREATE OR REPLACE FUNCTION public.notify_push()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE payload jsonb;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  payload := jsonb_build_object(
    'userId', NEW.user_id::text,
    'title', COALESCE(NEW.title, 'StreamRate'),
    'message', COALESCE(NEW.message, ''),
    'data', jsonb_build_object(
      'type', NEW.type,
      'postId', NEW.post_id,
      'reelId', NEW.reel_id,
      'commentId', NEW.comment_id,
      'pollId', NEW.poll_id,
      'fromUserId', NEW.from_user_id,
      'notificationId', NEW.id
    )
  );
  BEGIN
    PERFORM net.http_post(
      url := 'https://oczrdiyvubwxttrrajhe.supabase.co/functions/v1/send-push-notification',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := payload
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_push failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

-- Define the interaction notifiers here too: older project branches removed
-- their functions along with their triggers, while this migration restores both.
CREATE OR REPLACE FUNCTION public.notify_on_post_like()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id uuid; actor_name text;
BEGIN
  SELECT user_id INTO owner_id FROM public.posts WHERE id = NEW.post_id;
  IF owner_id IS NULL OR owner_id = NEW.user_id THEN RETURN NEW; END IF;
  SELECT COALESCE(username, full_name, 'Someone') INTO actor_name FROM public.profiles WHERE id = NEW.user_id;
  INSERT INTO public.notifications (user_id, from_user_id, title, message, type, post_id)
  VALUES (owner_id, NEW.user_id, 'New Like', COALESCE(actor_name, 'Someone') || ' liked your post', 'post_like', NEW.post_id);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'notify_on_post_like failed: %', SQLERRM; RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id uuid; parent_owner_id uuid; actor_name text;
BEGIN
  SELECT user_id INTO owner_id FROM public.posts WHERE id = NEW.post_id;
  SELECT COALESCE(username, full_name, 'Someone') INTO actor_name FROM public.profiles WHERE id = NEW.user_id;
  IF NEW.parent_id IS NOT NULL THEN
    SELECT user_id INTO parent_owner_id FROM public.comments WHERE id = NEW.parent_id;
    IF parent_owner_id IS NOT NULL AND parent_owner_id <> NEW.user_id THEN
      INSERT INTO public.notifications (user_id, from_user_id, title, message, type, post_id, comment_id)
      VALUES (parent_owner_id, NEW.user_id, 'New Reply', COALESCE(actor_name, 'Someone') || ' replied to your comment: ' || LEFT(NEW.content, 100), 'comment_reply', NEW.post_id, NEW.id);
    END IF;
  END IF;
  IF owner_id IS NOT NULL AND owner_id <> NEW.user_id
     AND (parent_owner_id IS NULL OR owner_id <> parent_owner_id) THEN
    INSERT INTO public.notifications (user_id, from_user_id, title, message, type, post_id, comment_id)
    VALUES (owner_id, NEW.user_id, 'New Comment', COALESCE(actor_name, 'Someone') || ' commented on your post: ' || LEFT(NEW.content, 100), 'comment', NEW.post_id, NEW.id);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'notify_on_comment failed: %', SQLERRM; RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_mention_in_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE mention text; mentioned_id uuid; actor_name text;
BEGIN
  SELECT COALESCE(username, full_name, 'Someone') INTO actor_name FROM public.profiles WHERE id = NEW.user_id;
  FOR mention IN SELECT (regexp_matches(NEW.content, '@([A-Za-z0-9_]+)', 'g'))[1] LOOP
    SELECT id INTO mentioned_id FROM public.profiles WHERE lower(username) = lower(mention);
    IF mentioned_id IS NOT NULL AND mentioned_id <> NEW.user_id THEN
      INSERT INTO public.notifications (user_id, from_user_id, title, message, type, post_id, comment_id)
      VALUES (mentioned_id, NEW.user_id, 'You were mentioned', COALESCE(actor_name, 'Someone') || ' mentioned you: ' || LEFT(NEW.content, 100), 'mention', NEW.post_id, NEW.id);
    END IF;
  END LOOP;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'notify_on_mention_in_comment failed: %', SQLERRM; RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_comment_like()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id uuid; target_post_id uuid; actor_name text;
BEGIN
  SELECT user_id, post_id INTO owner_id, target_post_id FROM public.comments WHERE id = NEW.comment_id;
  IF owner_id IS NULL OR owner_id = NEW.user_id THEN RETURN NEW; END IF;
  SELECT COALESCE(username, full_name, 'Someone') INTO actor_name FROM public.profiles WHERE id = NEW.user_id;
  INSERT INTO public.notifications (user_id, from_user_id, title, message, type, post_id, comment_id)
  VALUES (owner_id, NEW.user_id, 'Comment Liked', COALESCE(actor_name, 'Someone') || ' liked your comment', 'comment_like', target_post_id, NEW.comment_id);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'notify_on_comment_like failed: %', SQLERRM; RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_follow()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE actor_name text;
BEGIN
  IF NEW.follower_id = NEW.following_id THEN RETURN NEW; END IF;
  SELECT COALESCE(username, full_name, 'Someone') INTO actor_name FROM public.profiles WHERE id = NEW.follower_id;
  INSERT INTO public.notifications (user_id, from_user_id, title, message, type)
  VALUES (NEW.following_id, NEW.follower_id, 'New Follower', COALESCE(actor_name, 'Someone') || ' started following you', 'new_follower');
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'notify_on_follow failed: %', SQLERRM; RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_post_share()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id uuid; actor_name text; body_text text;
BEGIN
  SELECT user_id, LEFT(content, 100) INTO owner_id, body_text FROM public.posts WHERE id = NEW.post_id;
  IF owner_id IS NULL OR owner_id = NEW.user_id THEN RETURN NEW; END IF;
  SELECT COALESCE(username, full_name, 'Someone') INTO actor_name FROM public.profiles WHERE id = NEW.user_id;
  INSERT INTO public.notifications (user_id, from_user_id, title, message, type, post_id)
  VALUES (owner_id, NEW.user_id, 'Post Shared', COALESCE(actor_name, 'Someone') || ' shared your post' || CASE WHEN body_text IS NULL OR body_text = '' THEN '' ELSE ': ' || body_text END, 'post_share', NEW.post_id);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'notify_on_post_share failed: %', SQLERRM; RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_reel_like()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id uuid; actor_name text;
BEGIN
  SELECT user_id INTO owner_id FROM public.reels WHERE id = NEW.reel_id;
  IF owner_id IS NULL OR owner_id = NEW.user_id THEN RETURN NEW; END IF;
  SELECT COALESCE(username, full_name, 'Someone') INTO actor_name FROM public.profiles WHERE id = NEW.user_id;
  INSERT INTO public.notifications (user_id, from_user_id, title, message, type, reel_id)
  VALUES (owner_id, NEW.user_id, 'New Like', COALESCE(actor_name, 'Someone') || ' liked your reel', 'reel_like', NEW.reel_id);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'notify_on_reel_like failed: %', SQLERRM; RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_reel_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id uuid; actor_name text;
BEGIN
  SELECT user_id INTO owner_id FROM public.reels WHERE id = NEW.reel_id;
  IF owner_id IS NULL OR owner_id = NEW.user_id THEN RETURN NEW; END IF;
  SELECT COALESCE(username, full_name, 'Someone') INTO actor_name FROM public.profiles WHERE id = NEW.user_id;
  INSERT INTO public.notifications (user_id, from_user_id, title, message, type, reel_id, comment_id)
  VALUES (owner_id, NEW.user_id, 'New Reel Comment', COALESCE(actor_name, 'Someone') || ' commented on your reel: ' || LEFT(NEW.content, 100), 'reel_comment', NEW.reel_id, NEW.id);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'notify_on_reel_comment failed: %', SQLERRM; RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_mention_in_reel_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE mention text; mentioned_id uuid; actor_name text;
BEGIN
  SELECT COALESCE(username, full_name, 'Someone') INTO actor_name FROM public.profiles WHERE id = NEW.user_id;
  FOR mention IN SELECT (regexp_matches(NEW.content, '@([A-Za-z0-9_]+)', 'g'))[1] LOOP
    SELECT id INTO mentioned_id FROM public.profiles WHERE lower(username) = lower(mention);
    IF mentioned_id IS NOT NULL AND mentioned_id <> NEW.user_id THEN
      INSERT INTO public.notifications (user_id, from_user_id, title, message, type, reel_id, comment_id)
      VALUES (mentioned_id, NEW.user_id, 'You were mentioned', COALESCE(actor_name, 'Someone') || ' mentioned you in a reel: ' || LEFT(NEW.content, 100), 'mention', NEW.reel_id, NEW.id);
    END IF;
  END LOOP;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'notify_on_mention_in_reel_comment failed: %', SQLERRM; RETURN NEW;
END;
$$;

-- Re-enable interaction notifications that were removed during the old push migration.
DROP TRIGGER IF EXISTS on_post_like ON public.post_likes;
CREATE TRIGGER on_post_like AFTER INSERT ON public.post_likes
FOR EACH ROW EXECUTE FUNCTION public.notify_on_post_like();

DROP TRIGGER IF EXISTS on_new_comment ON public.comments;
CREATE TRIGGER on_new_comment AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment();
DROP TRIGGER IF EXISTS on_comment_mention ON public.comments;
CREATE TRIGGER on_comment_mention AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.notify_on_mention_in_comment();
DROP TRIGGER IF EXISTS on_comment_like ON public.comment_likes;
CREATE TRIGGER on_comment_like AFTER INSERT ON public.comment_likes
FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment_like();
DROP TRIGGER IF EXISTS on_follow_created ON public.follows;
CREATE TRIGGER on_follow_created AFTER INSERT ON public.follows
FOR EACH ROW EXECUTE FUNCTION public.notify_on_follow();
DROP TRIGGER IF EXISTS on_post_share ON public.post_shares;
CREATE TRIGGER on_post_share AFTER INSERT ON public.post_shares
FOR EACH ROW EXECUTE FUNCTION public.notify_on_post_share();
DROP TRIGGER IF EXISTS on_reel_like ON public.reel_likes;
CREATE TRIGGER on_reel_like AFTER INSERT ON public.reel_likes
FOR EACH ROW EXECUTE FUNCTION public.notify_on_reel_like();
DROP TRIGGER IF EXISTS on_reel_comment ON public.reel_comments;
CREATE TRIGGER on_reel_comment AFTER INSERT ON public.reel_comments
FOR EACH ROW EXECUTE FUNCTION public.notify_on_reel_comment();
DROP TRIGGER IF EXISTS on_reel_comment_mention ON public.reel_comments;
CREATE TRIGGER on_reel_comment_mention AFTER INSERT ON public.reel_comments
FOR EACH ROW EXECUTE FUNCTION public.notify_on_mention_in_reel_comment();

-- A first view of each post creates a single notification for its author.
CREATE OR REPLACE FUNCTION public.notify_on_post_view()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE post_owner uuid; viewer_name text;
BEGIN
  SELECT user_id INTO post_owner FROM public.posts WHERE id = NEW.post_id;
  IF post_owner IS NULL OR post_owner = NEW.user_id THEN RETURN NEW; END IF;
  SELECT COALESCE(username, full_name, 'Someone') INTO viewer_name FROM public.profiles WHERE id = NEW.user_id;
  INSERT INTO public.notifications (user_id, from_user_id, title, message, type, post_id)
  VALUES (post_owner, NEW.user_id, 'Post viewed', COALESCE(viewer_name, 'Someone') || ' viewed your post', 'post_view', NEW.post_id);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_on_post_view failed: %', SQLERRM;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trigger_notify_view ON public.post_views;
CREATE TRIGGER trigger_notify_view AFTER INSERT ON public.post_views
FOR EACH ROW EXECUTE FUNCTION public.notify_on_post_view();

-- Notify a creator once per viewer/reel per day to avoid repeated swipe spam.
CREATE OR REPLACE FUNCTION public.notify_on_reel_view()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE reel_owner uuid; viewer_name text;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  SELECT user_id INTO reel_owner FROM public.reels WHERE id = NEW.reel_id;
  IF reel_owner IS NULL OR reel_owner = NEW.user_id THEN RETURN NEW; END IF;
  IF EXISTS (
    SELECT 1 FROM public.notifications n
    WHERE n.user_id = reel_owner AND n.from_user_id = NEW.user_id
      AND n.type = 'reel_view' AND n.reel_id = NEW.reel_id
      AND n.created_at > now() - interval '24 hours'
  ) THEN RETURN NEW; END IF;
  SELECT COALESCE(username, full_name, 'Someone') INTO viewer_name FROM public.profiles WHERE id = NEW.user_id;
  INSERT INTO public.notifications (user_id, from_user_id, title, message, type, reel_id)
  VALUES (reel_owner, NEW.user_id, 'Reel viewed', COALESCE(viewer_name, 'Someone') || ' watched your reel', 'reel_view', NEW.reel_id);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_on_reel_view failed: %', SQLERRM;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS notify_reel_view ON public.reel_views;
CREATE TRIGGER notify_reel_view AFTER INSERT ON public.reel_views
FOR EACH ROW EXECUTE FUNCTION public.notify_on_reel_view();

-- Boost confirmation is a notification to the person who bought the boost.
CREATE OR REPLACE FUNCTION public.notify_on_profile_boost()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_active THEN
    INSERT INTO public.notifications (user_id, from_user_id, title, message, type)
    VALUES (NEW.user_id, NEW.user_id, 'Profile boost active', 'Your profile boost is now active', 'profile_boost');
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_on_profile_boost failed: %', SQLERRM;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS notify_profile_boost ON public.profile_boosts;
CREATE TRIGGER notify_profile_boost AFTER INSERT ON public.profile_boosts
FOR EACH ROW EXECUTE FUNCTION public.notify_on_profile_boost();

-- Poll votes carry their source poll through to push deep links.
CREATE OR REPLACE FUNCTION public.notify_on_poll_vote()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE streamer uuid; poll_q text; voter_name text;
BEGIN
  SELECT streamer_id, question INTO streamer, poll_q FROM public.stream_polls WHERE id = NEW.poll_id;
  IF streamer IS NULL OR streamer = NEW.user_id THEN RETURN NEW; END IF;
  SELECT COALESCE(full_name, username, 'Someone') INTO voter_name FROM public.profiles WHERE id = NEW.user_id;
  INSERT INTO public.notifications (user_id, from_user_id, title, message, type, poll_id)
  VALUES (streamer, NEW.user_id, 'New Poll Vote', COALESCE(voter_name, 'Someone') || ' voted on "' || LEFT(poll_q, 40) || '"', 'poll_vote', NEW.poll_id);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_on_poll_vote failed: %', SQLERRM;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_notify_on_poll_vote ON public.poll_votes;
CREATE TRIGGER trg_notify_on_poll_vote AFTER INSERT ON public.poll_votes
FOR EACH ROW EXECUTE FUNCTION public.notify_on_poll_vote();

-- Profile visits remain silently recorded for analytics; never create/push a notification.
DROP TRIGGER IF EXISTS on_profile_view ON public.profile_views;
DROP TRIGGER IF EXISTS on_notification_send_push ON public.notifications;
DROP TRIGGER IF EXISTS trg_send_push_on_notification ON public.notifications;
CREATE TRIGGER on_notification_send_push
AFTER INSERT ON public.notifications
FOR EACH ROW WHEN (NEW.type IS DISTINCT FROM 'profile_view')
EXECUTE FUNCTION public.notify_push();

COMMIT;
