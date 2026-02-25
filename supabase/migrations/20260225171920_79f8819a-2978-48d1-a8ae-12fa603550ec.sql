
-- Table to track daily hashtag usage for trending logic
CREATE TABLE public.hashtag_daily_usage (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hashtag_id uuid NOT NULL REFERENCES public.hashtags(id) ON DELETE CASCADE,
  usage_date date NOT NULL DEFAULT CURRENT_DATE,
  daily_count integer NOT NULL DEFAULT 1,
  UNIQUE(hashtag_id, usage_date)
);

ALTER TABLE public.hashtag_daily_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view hashtag daily usage"
  ON public.hashtag_daily_usage FOR SELECT USING (true);

CREATE POLICY "System can manage hashtag daily usage"
  ON public.hashtag_daily_usage FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update hashtag daily usage"
  ON public.hashtag_daily_usage FOR UPDATE USING (true);

-- Function to notify mentioned users in comments
CREATE OR REPLACE FUNCTION public.notify_on_mention_in_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  mention TEXT;
  mentioned_user_id UUID;
  commenter_username TEXT;
BEGIN
  -- Get commenter username
  SELECT username INTO commenter_username FROM public.profiles WHERE id = NEW.user_id;

  -- Find all @mentions in the comment content
  FOR mention IN SELECT (regexp_matches(NEW.content, '@(\w+)', 'g'))[1]
  LOOP
    -- Look up the mentioned user
    SELECT id INTO mentioned_user_id FROM public.profiles WHERE LOWER(username) = LOWER(mention);

    -- Don't notify self
    IF mentioned_user_id IS NOT NULL AND mentioned_user_id != NEW.user_id THEN
      INSERT INTO public.notifications (user_id, from_user_id, title, message, type, post_id, comment_id)
      VALUES (
        mentioned_user_id,
        NEW.user_id,
        'You were mentioned',
        COALESCE(commenter_username, 'Someone') || ' mentioned you in a comment',
        'mention',
        NEW.post_id,
        NEW.id
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Function to notify mentioned users in reel comments
CREATE OR REPLACE FUNCTION public.notify_on_mention_in_reel_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  mention TEXT;
  mentioned_user_id UUID;
  commenter_username TEXT;
BEGIN
  SELECT username INTO commenter_username FROM public.profiles WHERE id = NEW.user_id;

  FOR mention IN SELECT (regexp_matches(NEW.content, '@(\w+)', 'g'))[1]
  LOOP
    SELECT id INTO mentioned_user_id FROM public.profiles WHERE LOWER(username) = LOWER(mention);

    IF mentioned_user_id IS NOT NULL AND mentioned_user_id != NEW.user_id THEN
      INSERT INTO public.notifications (user_id, from_user_id, title, message, type)
      VALUES (
        mentioned_user_id,
        NEW.user_id,
        'You were mentioned',
        COALESCE(commenter_username, 'Someone') || ' mentioned you in a reel comment',
        'mention'
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create triggers for mention notifications
CREATE TRIGGER on_comment_mention
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_mention_in_comment();

CREATE TRIGGER on_reel_comment_mention
  AFTER INSERT ON public.reel_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_mention_in_reel_comment();
