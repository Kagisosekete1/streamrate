
-- Add reel_id column to notifications table
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS reel_id uuid;

-- Update notify_on_reel_like to include reel_id
CREATE OR REPLACE FUNCTION public.notify_on_reel_like()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  liker_name TEXT;
  reel_owner_id UUID;
BEGIN
  SELECT full_name INTO liker_name FROM public.profiles WHERE id = NEW.user_id;
  SELECT user_id INTO reel_owner_id FROM public.reels WHERE id = NEW.reel_id;
  
  IF NEW.user_id = reel_owner_id THEN RETURN NEW; END IF;
  
  INSERT INTO public.notifications (user_id, type, title, message, from_user_id, reel_id)
  VALUES (
    reel_owner_id,
    'reel_like',
    'New Like',
    COALESCE(liker_name, 'Someone') || ' liked your reel',
    NEW.user_id,
    NEW.reel_id
  );
  
  RETURN NEW;
END;
$function$;

-- Update notify_on_reel_comment to include reel_id
CREATE OR REPLACE FUNCTION public.notify_on_reel_comment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  commenter_name TEXT;
  reel_owner_id UUID;
BEGIN
  SELECT full_name INTO commenter_name FROM public.profiles WHERE id = NEW.user_id;
  SELECT user_id INTO reel_owner_id FROM public.reels WHERE id = NEW.reel_id;
  
  IF NEW.user_id = reel_owner_id THEN RETURN NEW; END IF;
  
  INSERT INTO public.notifications (user_id, type, title, message, from_user_id, reel_id)
  VALUES (
    reel_owner_id,
    'reel_comment',
    'New Comment',
    COALESCE(commenter_name, 'Someone') || ' commented on your reel',
    NEW.user_id,
    NEW.reel_id
  );
  
  RETURN NEW;
END;
$function$;

-- Update mention in reel comment to include reel_id
CREATE OR REPLACE FUNCTION public.notify_on_mention_in_reel_comment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      INSERT INTO public.notifications (user_id, from_user_id, title, message, type, reel_id)
      VALUES (
        mentioned_user_id,
        NEW.user_id,
        'You were mentioned',
        COALESCE(commenter_username, 'Someone') || ' mentioned you in a reel comment',
        'mention',
        NEW.reel_id
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;

-- Create reel view notification trigger function
CREATE OR REPLACE FUNCTION public.notify_on_reel_view()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  viewer_name TEXT;
  reel_owner_id UUID;
  recent_view_exists BOOLEAN;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  
  SELECT user_id INTO reel_owner_id FROM public.reels WHERE id = NEW.reel_id;
  
  IF NEW.user_id = reel_owner_id THEN RETURN NEW; END IF;
  
  -- Throttle: one notification per viewer per reel per hour
  SELECT EXISTS (
    SELECT 1 FROM public.notifications
    WHERE user_id = reel_owner_id
      AND from_user_id = NEW.user_id
      AND type = 'reel_view'
      AND reel_id = NEW.reel_id
      AND created_at > now() - INTERVAL '1 hour'
  ) INTO recent_view_exists;
  
  IF recent_view_exists THEN RETURN NEW; END IF;
  
  SELECT full_name INTO viewer_name FROM public.profiles WHERE id = NEW.user_id;
  
  INSERT INTO public.notifications (user_id, type, title, message, from_user_id, reel_id)
  VALUES (
    reel_owner_id,
    'reel_view',
    'Reel View',
    COALESCE(viewer_name, 'Someone') || ' viewed your reel',
    NEW.user_id,
    NEW.reel_id
  );
  
  RETURN NEW;
END;
$function$;

-- Create trigger for reel views
DROP TRIGGER IF EXISTS on_reel_view_notify ON public.reel_views;
CREATE TRIGGER on_reel_view_notify
  AFTER INSERT ON public.reel_views
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_reel_view();
