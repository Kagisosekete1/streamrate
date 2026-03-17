
-- =============================================
-- GAMIFICATION SYSTEM: XP, Levels, Coins, Missions, Badges, Boosts
-- =============================================

-- 1. User XP & Levels
CREATE TABLE public.user_xp (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  total_xp integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  streak_days integer NOT NULL DEFAULT 0,
  last_streak_date date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_xp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view XP" ON public.user_xp FOR SELECT USING (true);
CREATE POLICY "Users can insert own XP" ON public.user_xp FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own XP" ON public.user_xp FOR UPDATE USING (auth.uid() = user_id);

-- 2. User Coins
CREATE TABLE public.user_coins (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  balance integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_coins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own coins" ON public.user_coins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own coins" ON public.user_coins FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own coins" ON public.user_coins FOR UPDATE USING (auth.uid() = user_id);

-- 3. Coin Transactions
CREATE TABLE public.coin_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  type text NOT NULL DEFAULT 'earn',
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON public.coin_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON public.coin_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. User Badges
CREATE TABLE public.user_badges (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  badge_type text NOT NULL,
  badge_name text NOT NULL,
  badge_icon text NOT NULL DEFAULT '🏆',
  earned_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_type)
);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view badges" ON public.user_badges FOR SELECT USING (true);
CREATE POLICY "Users can insert own badges" ON public.user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. Daily Missions
CREATE TABLE public.daily_missions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  xp_reward integer NOT NULL DEFAULT 10,
  coin_reward integer NOT NULL DEFAULT 5,
  action_type text NOT NULL,
  target_count integer NOT NULL DEFAULT 1,
  icon text NOT NULL DEFAULT '🎯',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active missions" ON public.daily_missions FOR SELECT USING (is_active = true);

-- 6. User Daily Mission Progress
CREATE TABLE public.user_daily_missions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  mission_id uuid NOT NULL REFERENCES public.daily_missions(id) ON DELETE CASCADE,
  progress integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  claimed boolean NOT NULL DEFAULT false,
  mission_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, mission_id, mission_date)
);

ALTER TABLE public.user_daily_missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own missions" ON public.user_daily_missions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own missions" ON public.user_daily_missions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own missions" ON public.user_daily_missions FOR UPDATE USING (auth.uid() = user_id);

-- 7. Profile Boosts
CREATE TABLE public.profile_boosts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  boost_type text NOT NULL DEFAULT 'visibility',
  coin_cost integer NOT NULL DEFAULT 50,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '24 hours'),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_boosts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active boosts" ON public.profile_boosts FOR SELECT USING (true);
CREATE POLICY "Users can insert own boosts" ON public.profile_boosts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own boosts" ON public.profile_boosts FOR UPDATE USING (auth.uid() = user_id);

-- 8. Seller Verification (Blue Badge for Sellers)
CREATE TABLE public.seller_verifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  is_verified boolean NOT NULL DEFAULT false,
  verified_at timestamp with time zone,
  expires_at timestamp with time zone,
  payment_amount numeric NOT NULL DEFAULT 600,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.seller_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view verifications" ON public.seller_verifications FOR SELECT USING (true);
CREATE POLICY "Users can insert own verification" ON public.seller_verifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own verification" ON public.seller_verifications FOR UPDATE USING (auth.uid() = user_id);

-- 9. Seed default daily missions
INSERT INTO public.daily_missions (title, description, xp_reward, coin_reward, action_type, target_count, icon) VALUES
  ('Reel Watcher', 'Watch 2 reels today', 20, 10, 'watch_reels', 2, '🎥'),
  ('Rate a Creator', 'Rate 3 creators today', 30, 15, 'rate_creators', 3, '⭐'),
  ('Post a Reel', 'Post 1 reel today', 50, 25, 'post_reel', 1, '📹'),
  ('Social Butterfly', 'Comment on 3 posts', 25, 12, 'comment_posts', 3, '💬'),
  ('Like Machine', 'Like 5 posts today', 15, 8, 'like_posts', 5, '❤️'),
  ('Explorer', 'View 5 profiles today', 20, 10, 'view_profiles', 5, '👀'),
  ('Trend Setter', 'Create a post with a hashtag', 25, 12, 'post_with_hashtag', 1, '🔥');

-- 10. Function to calculate level from XP
CREATE OR REPLACE FUNCTION public.calculate_level(xp integer)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT GREATEST(1, FLOOR(SQRT(xp::numeric / 100))::integer + 1)
$$;

-- 11. Function to get XP needed for next level
CREATE OR REPLACE FUNCTION public.xp_for_level(lvl integer)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT ((lvl - 1) * (lvl - 1) * 100)::integer
$$;

-- Triggers for updated_at
CREATE TRIGGER update_user_xp_updated_at
BEFORE UPDATE ON public.user_xp
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_coins_updated_at
BEFORE UPDATE ON public.user_coins
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
