-- Create reel_views table to track views
CREATE TABLE public.reel_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reel_id UUID NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
  user_id UUID,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  watch_duration INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false
);

-- Create index for performance
CREATE INDEX idx_reel_views_reel_id ON public.reel_views(reel_id);
CREATE INDEX idx_reel_views_user_id ON public.reel_views(user_id);
CREATE INDEX idx_reel_views_viewed_at ON public.reel_views(viewed_at DESC);

-- Enable RLS
ALTER TABLE public.reel_views ENABLE ROW LEVEL SECURITY;

-- RLS policies for reel_views
CREATE POLICY "Anyone can view reel view counts" ON public.reel_views FOR SELECT USING (true);
CREATE POLICY "Anyone can record a view" ON public.reel_views FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own views" ON public.reel_views FOR UPDATE USING (user_id = auth.uid());

-- Add view_count column to reels table for quick access
ALTER TABLE public.reels ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;

-- Create user_interests table to track engagement patterns
CREATE TABLE public.user_interests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  hashtag_id UUID REFERENCES public.hashtags(id) ON DELETE CASCADE,
  creator_id UUID,
  interest_score NUMERIC(5,2) NOT NULL DEFAULT 1.0,
  last_interaction TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, hashtag_id),
  UNIQUE(user_id, creator_id)
);

-- Create indexes for user_interests
CREATE INDEX idx_user_interests_user_id ON public.user_interests(user_id);
CREATE INDEX idx_user_interests_score ON public.user_interests(interest_score DESC);

-- Enable RLS for user_interests
ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_interests
CREATE POLICY "Users can view their own interests" ON public.user_interests FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create their own interests" ON public.user_interests FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own interests" ON public.user_interests FOR UPDATE USING (user_id = auth.uid());

-- Function to increment view count
CREATE OR REPLACE FUNCTION public.increment_reel_view_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.reels 
  SET view_count = view_count + 1 
  WHERE id = NEW.reel_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-increment view count
CREATE TRIGGER on_reel_view_insert
AFTER INSERT ON public.reel_views
FOR EACH ROW
EXECUTE FUNCTION public.increment_reel_view_count();

-- Enable realtime for reel_views
ALTER PUBLICATION supabase_realtime ADD TABLE public.reel_views;