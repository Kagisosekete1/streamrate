-- Create trigger function for new followers
CREATE OR REPLACE FUNCTION public.notify_on_follow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  follower_name TEXT;
BEGIN
  -- Get follower name
  SELECT full_name INTO follower_name FROM public.profiles WHERE id = NEW.follower_id;
  
  -- Don't notify if following yourself
  IF NEW.follower_id = NEW.following_id THEN
    RETURN NEW;
  END IF;
  
  -- Insert notification for the user being followed
  INSERT INTO public.notifications (user_id, type, title, message, from_user_id)
  VALUES (
    NEW.following_id,
    'new_follower',
    'New Follower',
    COALESCE(follower_name, 'Someone') || ' started following you',
    NEW.follower_id
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for new followers
DROP TRIGGER IF EXISTS on_new_follow ON public.follows;
CREATE TRIGGER on_new_follow
  AFTER INSERT ON public.follows
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_follow();

-- Create trigger function for reel likes
CREATE OR REPLACE FUNCTION public.notify_on_reel_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  liker_name TEXT;
  reel_owner_id UUID;
BEGIN
  -- Get liker name
  SELECT full_name INTO liker_name FROM public.profiles WHERE id = NEW.user_id;
  
  -- Get reel owner
  SELECT user_id INTO reel_owner_id FROM public.reels WHERE id = NEW.reel_id;
  
  -- Don't notify if liking own reel
  IF NEW.user_id = reel_owner_id THEN
    RETURN NEW;
  END IF;
  
  -- Insert notification for reel owner
  INSERT INTO public.notifications (user_id, type, title, message, from_user_id)
  VALUES (
    reel_owner_id,
    'reel_like',
    'New Like',
    COALESCE(liker_name, 'Someone') || ' liked your reel',
    NEW.user_id
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for reel likes
DROP TRIGGER IF EXISTS on_reel_like ON public.reel_likes;
CREATE TRIGGER on_reel_like
  AFTER INSERT ON public.reel_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_reel_like();

-- Create trigger function for reel comments
CREATE OR REPLACE FUNCTION public.notify_on_reel_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  commenter_name TEXT;
  reel_owner_id UUID;
BEGIN
  -- Get commenter name
  SELECT full_name INTO commenter_name FROM public.profiles WHERE id = NEW.user_id;
  
  -- Get reel owner
  SELECT user_id INTO reel_owner_id FROM public.reels WHERE id = NEW.reel_id;
  
  -- Don't notify if commenting on own reel
  IF NEW.user_id = reel_owner_id THEN
    RETURN NEW;
  END IF;
  
  -- Insert notification for reel owner
  INSERT INTO public.notifications (user_id, type, title, message, from_user_id)
  VALUES (
    reel_owner_id,
    'reel_comment',
    'New Comment',
    COALESCE(commenter_name, 'Someone') || ' commented on your reel',
    NEW.user_id
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for reel comments
DROP TRIGGER IF EXISTS on_reel_comment ON public.reel_comments;
CREATE TRIGGER on_reel_comment
  AFTER INSERT ON public.reel_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_reel_comment();