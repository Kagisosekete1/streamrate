-- Create reels table
CREATE TABLE public.reels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  video_url TEXT NOT NULL,
  caption TEXT,
  duration INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reels ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Reels are viewable by everyone"
ON public.reels FOR SELECT
USING (true);

CREATE POLICY "Users can create reels"
ON public.reels FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reels"
ON public.reels FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reels"
ON public.reels FOR DELETE
USING (auth.uid() = user_id);

-- Create hashtags table
CREATE TABLE public.hashtags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  use_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hashtags ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Hashtags are viewable by everyone"
ON public.hashtags FOR SELECT
USING (true);

CREATE POLICY "Anyone can create hashtags"
ON public.hashtags FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update hashtag counts"
ON public.hashtags FOR UPDATE
USING (true);

-- Create reel_hashtags junction table
CREATE TABLE public.reel_hashtags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reel_id UUID NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
  hashtag_id UUID NOT NULL REFERENCES public.hashtags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(reel_id, hashtag_id)
);

-- Enable RLS
ALTER TABLE public.reel_hashtags ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Reel hashtags are viewable by everyone"
ON public.reel_hashtags FOR SELECT
USING (true);

CREATE POLICY "Users can add hashtags to their reels"
ON public.reel_hashtags FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.reels WHERE id = reel_id AND user_id = auth.uid()
));

CREATE POLICY "Users can remove hashtags from their reels"
ON public.reel_hashtags FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.reels WHERE id = reel_id AND user_id = auth.uid()
));

-- Enable realtime for reels
ALTER PUBLICATION supabase_realtime ADD TABLE public.reels;

-- Create storage bucket for reels videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('reels', 'reels', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for reels
CREATE POLICY "Reel videos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'reels');

CREATE POLICY "Users can upload reel videos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'reels' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their reel videos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'reels' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their reel videos"
ON storage.objects FOR DELETE
USING (bucket_id = 'reels' AND auth.uid()::text = (storage.foldername(name))[1]);