
-- Table to store connected streaming platform accounts
CREATE TABLE public.connected_platforms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  platform TEXT NOT NULL, -- 'twitch', 'kick', 'discord'
  platform_username TEXT,
  platform_user_id TEXT,
  access_token TEXT,
  refresh_token TEXT,
  connected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_synced_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(user_id, platform)
);

ALTER TABLE public.connected_platforms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own platforms" ON public.connected_platforms
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own platforms" ON public.connected_platforms
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own platforms" ON public.connected_platforms
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own platforms" ON public.connected_platforms
  FOR DELETE USING (auth.uid() = user_id);

-- Table to store streaming analytics snapshots
CREATE TABLE public.streaming_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  platform TEXT NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  viewer_count INTEGER DEFAULT 0,
  peak_viewers INTEGER DEFAULT 0,
  is_live BOOLEAN DEFAULT false,
  stream_title TEXT,
  stream_duration_minutes INTEGER DEFAULT 0,
  chat_messages_count INTEGER DEFAULT 0,
  follower_count INTEGER DEFAULT 0,
  subscriber_count INTEGER DEFAULT 0,
  new_followers INTEGER DEFAULT 0,
  engagement_rate NUMERIC DEFAULT 0
);

ALTER TABLE public.streaming_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analytics" ON public.streaming_analytics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert analytics" ON public.streaming_analytics
  FOR INSERT WITH CHECK (true);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.streaming_analytics;
