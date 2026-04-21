-- Weekly missions definitions
CREATE TABLE public.weekly_missions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  xp_reward INTEGER NOT NULL DEFAULT 100,
  coin_reward INTEGER NOT NULL DEFAULT 50,
  action_type TEXT NOT NULL,
  target_count INTEGER NOT NULL DEFAULT 1,
  icon TEXT NOT NULL DEFAULT '🏆',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.weekly_missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active weekly missions"
ON public.weekly_missions FOR SELECT
USING (is_active = true);

-- User weekly mission progress (ISO week start as date)
CREATE TABLE public.user_weekly_missions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  mission_id UUID NOT NULL REFERENCES public.weekly_missions(id) ON DELETE CASCADE,
  week_start DATE NOT NULL DEFAULT date_trunc('week', CURRENT_DATE)::date,
  progress INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  claimed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, mission_id, week_start)
);

ALTER TABLE public.user_weekly_missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own weekly missions"
ON public.user_weekly_missions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weekly missions"
ON public.user_weekly_missions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weekly missions"
ON public.user_weekly_missions FOR UPDATE
USING (auth.uid() = user_id);

-- Seed weekly mega-missions
INSERT INTO public.weekly_missions (title, description, xp_reward, coin_reward, action_type, target_count, icon) VALUES
('Party Marathon', 'Host 3 watch parties this week', 200, 100, 'host_party', 3, '🎉'),
('Poll Champion', 'Vote in 5 stream polls this week', 150, 75, 'vote_poll', 5, '🗳️'),
('Squad Recruiter', 'Post 5 LFG requests this week', 150, 75, 'post_lfg', 5, '🎮'),
('Clip Legend', 'Clip 10 streams this week', 250, 125, 'clip_stream', 10, '🎬');