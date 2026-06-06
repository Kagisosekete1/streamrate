
-- Phase 1: streamer_games, streamer_gear, chat_commands

CREATE TABLE public.streamer_games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  game_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'playing' CHECK (status IN ('playing','completed','backlog','dropped')),
  platform TEXT,
  notes TEXT,
  cover_url TEXT,
  rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.streamer_games TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.streamer_games TO authenticated;
GRANT ALL ON public.streamer_games TO service_role;
ALTER TABLE public.streamer_games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Games are publicly viewable" ON public.streamer_games FOR SELECT USING (true);
CREATE POLICY "Users manage their own games" ON public.streamer_games FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX streamer_games_user_idx ON public.streamer_games(user_id, status, position);
CREATE INDEX streamer_games_name_idx ON public.streamer_games(lower(game_name));
CREATE TRIGGER trg_streamer_games_updated_at BEFORE UPDATE ON public.streamer_games FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.streamer_gear (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  category TEXT NOT NULL,
  item_name TEXT NOT NULL,
  brand TEXT,
  notes TEXT,
  affiliate_url TEXT,
  image_url TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.streamer_gear TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.streamer_gear TO authenticated;
GRANT ALL ON public.streamer_gear TO service_role;
ALTER TABLE public.streamer_gear ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gear publicly viewable" ON public.streamer_gear FOR SELECT USING (true);
CREATE POLICY "Users manage their own gear" ON public.streamer_gear FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX streamer_gear_user_idx ON public.streamer_gear(user_id, category, position);
CREATE TRIGGER trg_streamer_gear_updated_at BEFORE UPDATE ON public.streamer_gear FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.chat_commands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  trigger TEXT NOT NULL,
  response TEXT NOT NULL,
  cooldown_seconds INTEGER NOT NULL DEFAULT 5,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  uses_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, trigger)
);
GRANT SELECT ON public.chat_commands TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_commands TO authenticated;
GRANT ALL ON public.chat_commands TO service_role;
ALTER TABLE public.chat_commands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Commands publicly viewable" ON public.chat_commands FOR SELECT USING (true);
CREATE POLICY "Users manage their own commands" ON public.chat_commands FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX chat_commands_user_idx ON public.chat_commands(user_id, is_enabled);
CREATE TRIGGER trg_chat_commands_updated_at BEFORE UPDATE ON public.chat_commands FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
