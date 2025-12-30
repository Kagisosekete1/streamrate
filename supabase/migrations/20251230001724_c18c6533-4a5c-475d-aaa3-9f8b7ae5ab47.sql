-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'new_post',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  from_user_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);

-- Create function to notify followers when a streamer posts
CREATE OR REPLACE FUNCTION public.notify_followers_on_post()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  follower_record RECORD;
  poster_name TEXT;
BEGIN
  -- Get poster name
  SELECT full_name INTO poster_name FROM public.profiles WHERE id = NEW.user_id;
  
  -- Insert notification for each follower
  FOR follower_record IN 
    SELECT follower_id FROM public.follows WHERE following_id = NEW.user_id
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, post_id, from_user_id)
    VALUES (
      follower_record.follower_id,
      'new_post',
      'New Post',
      COALESCE(poster_name, 'A streamer you follow') || ' shared a new post',
      NEW.id,
      NEW.user_id
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new posts
CREATE TRIGGER on_new_post_notify_followers
AFTER INSERT ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.notify_followers_on_post();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;