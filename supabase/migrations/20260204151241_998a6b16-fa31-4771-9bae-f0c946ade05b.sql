-- Create profile_views table to track who viewed profiles
CREATE TABLE public.profile_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL,
  viewer_id UUID,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(profile_id, viewer_id, viewed_at)
);

-- Enable RLS
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

-- Anyone can insert a view
CREATE POLICY "Anyone can insert profile views"
ON public.profile_views
FOR INSERT
WITH CHECK (true);

-- Users can see who viewed their profile
CREATE POLICY "Users can view their own profile views"
ON public.profile_views
FOR SELECT
USING (auth.uid() = profile_id);

-- Create function to notify on profile view (throttled - once per viewer per hour)
CREATE OR REPLACE FUNCTION public.notify_on_profile_view()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  viewer_name TEXT;
  recent_view_exists BOOLEAN;
BEGIN
  -- Don't notify for anonymous views or self-views
  IF NEW.viewer_id IS NULL OR NEW.viewer_id = NEW.profile_id THEN
    RETURN NEW;
  END IF;
  
  -- Check if we already notified about this viewer in the last hour
  SELECT EXISTS (
    SELECT 1 FROM public.notifications
    WHERE user_id = NEW.profile_id
      AND from_user_id = NEW.viewer_id
      AND type = 'profile_view'
      AND created_at > now() - INTERVAL '1 hour'
  ) INTO recent_view_exists;
  
  IF recent_view_exists THEN
    RETURN NEW;
  END IF;
  
  -- Get viewer name
  SELECT full_name INTO viewer_name FROM public.profiles WHERE id = NEW.viewer_id;
  
  -- Insert notification
  INSERT INTO public.notifications (user_id, type, title, message, from_user_id)
  VALUES (
    NEW.profile_id,
    'profile_view',
    'Profile View',
    COALESCE(viewer_name, 'Someone') || ' viewed your profile',
    NEW.viewer_id
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for profile view notifications
CREATE TRIGGER on_profile_view
AFTER INSERT ON public.profile_views
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_profile_view();

-- Create function to notify on reel view (throttled - once per viewer per reel per hour)
CREATE OR REPLACE FUNCTION public.notify_on_reel_view()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  viewer_name TEXT;
  reel_owner_id UUID;
  recent_view_exists BOOLEAN;
BEGIN
  -- Get reel owner
  SELECT user_id INTO reel_owner_id FROM public.reels WHERE id = NEW.reel_id;
  
  -- Don't notify for anonymous views or self-views
  IF NEW.user_id IS NULL OR NEW.user_id = reel_owner_id THEN
    RETURN NEW;
  END IF;
  
  -- Check if we already notified about this viewer for this reel in the last hour
  SELECT EXISTS (
    SELECT 1 FROM public.notifications
    WHERE user_id = reel_owner_id
      AND from_user_id = NEW.user_id
      AND type = 'reel_view'
      AND created_at > now() - INTERVAL '1 hour'
  ) INTO recent_view_exists;
  
  IF recent_view_exists THEN
    RETURN NEW;
  END IF;
  
  -- Get viewer name
  SELECT full_name INTO viewer_name FROM public.profiles WHERE id = NEW.user_id;
  
  -- Insert notification
  INSERT INTO public.notifications (user_id, type, title, message, from_user_id)
  VALUES (
    reel_owner_id,
    'reel_view',
    'Reel View',
    COALESCE(viewer_name, 'Someone') || ' viewed your reel',
    NEW.user_id
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for reel view notifications
CREATE TRIGGER on_reel_view
AFTER INSERT ON public.reel_views
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_reel_view();