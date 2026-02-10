
-- Create a trigger function that sends notifications when someone comments on a post
CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS TRIGGER AS $$
DECLARE
  post_owner_id UUID;
  commenter_username TEXT;
  parent_comment_owner_id UUID;
  post_content_preview TEXT;
BEGIN
  -- Get the commenter's username
  SELECT username INTO commenter_username FROM public.profiles WHERE id = NEW.user_id;
  
  -- Get the post owner
  SELECT user_id INTO post_owner_id FROM public.posts WHERE id = NEW.post_id;
  
  -- Get post content preview
  SELECT LEFT(content, 50) INTO post_content_preview FROM public.posts WHERE id = NEW.post_id;
  
  -- If this is a reply to a comment, notify the parent comment owner
  IF NEW.parent_id IS NOT NULL THEN
    SELECT user_id INTO parent_comment_owner_id FROM public.comments WHERE id = NEW.parent_id;
    
    -- Notify parent comment owner (if not self)
    IF parent_comment_owner_id IS NOT NULL AND parent_comment_owner_id != NEW.user_id THEN
      INSERT INTO public.notifications (user_id, from_user_id, title, message, type, post_id)
      VALUES (
        parent_comment_owner_id,
        NEW.user_id,
        'New Reply',
        COALESCE(commenter_username, 'Someone') || ' replied to your comment',
        'comment_reply',
        NEW.post_id
      );
    END IF;
  END IF;
  
  -- Notify the post owner about the comment (if not self and not already notified as reply owner)
  IF post_owner_id IS NOT NULL AND post_owner_id != NEW.user_id 
     AND (parent_comment_owner_id IS NULL OR post_owner_id != parent_comment_owner_id) THEN
    INSERT INTO public.notifications (user_id, from_user_id, title, message, type, post_id)
    VALUES (
      post_owner_id,
      NEW.user_id,
      'New Comment',
      COALESCE(commenter_username, 'Someone') || ' commented on your post',
      'comment',
      NEW.post_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger
DROP TRIGGER IF EXISTS on_comment_created ON public.comments;
CREATE TRIGGER on_comment_created
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_comment();

-- Create a trigger for comment likes notifications
CREATE OR REPLACE FUNCTION public.notify_on_comment_like()
RETURNS TRIGGER AS $$
DECLARE
  comment_owner_id UUID;
  liker_username TEXT;
  comment_post_id UUID;
BEGIN
  -- Get comment owner and post id
  SELECT user_id, post_id INTO comment_owner_id, comment_post_id FROM public.comments WHERE id = NEW.comment_id;
  
  -- Get liker username
  SELECT username INTO liker_username FROM public.profiles WHERE id = NEW.user_id;
  
  -- Notify comment owner (if not self)
  IF comment_owner_id IS NOT NULL AND comment_owner_id != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, from_user_id, title, message, type, post_id)
    VALUES (
      comment_owner_id,
      NEW.user_id,
      'Comment Liked',
      COALESCE(liker_username, 'Someone') || ' liked your comment',
      'comment_like',
      comment_post_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_comment_liked ON public.comment_likes;
CREATE TRIGGER on_comment_liked
  AFTER INSERT ON public.comment_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_comment_like();
