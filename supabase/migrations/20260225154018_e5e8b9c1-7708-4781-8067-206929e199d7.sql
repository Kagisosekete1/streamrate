
-- Enable pg_net extension for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Drop existing triggers to avoid conflicts
DROP TRIGGER IF EXISTS on_new_follow ON public.follows;
DROP TRIGGER IF EXISTS on_post_like ON public.post_likes;
DROP TRIGGER IF EXISTS on_new_comment ON public.comments;
DROP TRIGGER IF EXISTS on_comment_like ON public.comment_likes;
DROP TRIGGER IF EXISTS on_new_post_notify_followers ON public.posts;
DROP TRIGGER IF EXISTS on_profile_view ON public.profile_views;
DROP TRIGGER IF EXISTS on_reel_like ON public.reel_likes;
DROP TRIGGER IF EXISTS on_reel_comment ON public.reel_comments;
DROP TRIGGER IF EXISTS on_reel_view ON public.reel_views;
DROP TRIGGER IF EXISTS on_notification_send_push ON public.notifications;

-- Create post like notification function
CREATE OR REPLACE FUNCTION public.notify_on_post_like()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  liker_name TEXT;
  post_owner_id UUID;
BEGIN
  SELECT full_name INTO liker_name FROM public.profiles WHERE id = NEW.user_id;
  SELECT user_id INTO post_owner_id FROM public.posts WHERE id = NEW.post_id;
  
  IF NEW.user_id = post_owner_id THEN RETURN NEW; END IF;
  
  INSERT INTO public.notifications (user_id, type, title, message, post_id, from_user_id)
  VALUES (post_owner_id, 'post_like', 'New Like', COALESCE(liker_name, 'Someone') || ' liked your post', NEW.post_id, NEW.user_id);
  
  RETURN NEW;
END;
$$;

-- 1. Follow trigger
CREATE TRIGGER on_new_follow AFTER INSERT ON public.follows FOR EACH ROW EXECUTE FUNCTION public.notify_on_follow();

-- 2. Post like trigger
CREATE TRIGGER on_post_like AFTER INSERT ON public.post_likes FOR EACH ROW EXECUTE FUNCTION public.notify_on_post_like();

-- 3. Comment trigger
CREATE TRIGGER on_new_comment AFTER INSERT ON public.comments FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment();

-- 4. Comment like trigger
CREATE TRIGGER on_comment_like AFTER INSERT ON public.comment_likes FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment_like();

-- 5. New post → notify followers
CREATE TRIGGER on_new_post_notify_followers AFTER INSERT ON public.posts FOR EACH ROW EXECUTE FUNCTION public.notify_followers_on_post();

-- 6. Profile view trigger
CREATE TRIGGER on_profile_view AFTER INSERT ON public.profile_views FOR EACH ROW EXECUTE FUNCTION public.notify_on_profile_view();

-- 7. Reel like trigger
CREATE TRIGGER on_reel_like AFTER INSERT ON public.reel_likes FOR EACH ROW EXECUTE FUNCTION public.notify_on_reel_like();

-- 8. Reel comment trigger
CREATE TRIGGER on_reel_comment AFTER INSERT ON public.reel_comments FOR EACH ROW EXECUTE FUNCTION public.notify_on_reel_comment();

-- 9. Reel view trigger
CREATE TRIGGER on_reel_view AFTER INSERT ON public.reel_views FOR EACH ROW EXECUTE FUNCTION public.notify_on_reel_view();

-- 10. Push notification trigger - fires on EVERY notification insert
CREATE TRIGGER on_notification_send_push AFTER INSERT ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.send_push_on_notification();
