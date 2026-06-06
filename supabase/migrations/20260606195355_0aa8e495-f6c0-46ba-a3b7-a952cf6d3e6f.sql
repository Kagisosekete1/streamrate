
-- Phase 2 + 3 tables

CREATE TABLE public.co_stream_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ,
  game TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','cancelled','completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.co_stream_requests TO authenticated;
GRANT ALL ON public.co_stream_requests TO service_role;
ALTER TABLE public.co_stream_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parties view their co-stream requests" ON public.co_stream_requests FOR SELECT TO authenticated USING (auth.uid() IN (from_user_id, to_user_id));
CREATE POLICY "Senders create co-stream requests" ON public.co_stream_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = from_user_id);
CREATE POLICY "Parties update co-stream requests" ON public.co_stream_requests FOR UPDATE TO authenticated USING (auth.uid() IN (from_user_id, to_user_id));
CREATE POLICY "Senders delete pending requests" ON public.co_stream_requests FOR DELETE TO authenticated USING (auth.uid() = from_user_id AND status = 'pending');
CREATE INDEX co_stream_requests_to_idx ON public.co_stream_requests(to_user_id, status);
CREATE INDEX co_stream_requests_from_idx ON public.co_stream_requests(from_user_id, status);
CREATE TRIGGER trg_co_stream_requests_updated_at BEFORE UPDATE ON public.co_stream_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.stream_raids (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  raider_count INTEGER NOT NULL DEFAULT 0,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.stream_raids TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stream_raids TO authenticated;
GRANT ALL ON public.stream_raids TO service_role;
ALTER TABLE public.stream_raids ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Raids publicly viewable" ON public.stream_raids FOR SELECT USING (true);
CREATE POLICY "Streamers send their own raids" ON public.stream_raids FOR INSERT TO authenticated WITH CHECK (auth.uid() = from_user_id);
CREATE INDEX stream_raids_to_idx ON public.stream_raids(to_user_id, created_at DESC);

-- Extend stream_clips for chapter / moment markers
ALTER TABLE public.stream_clips
  ADD COLUMN IF NOT EXISTS chapter_title TEXT,
  ADD COLUMN IF NOT EXISTS timestamp_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS game TEXT;
CREATE INDEX IF NOT EXISTS stream_clips_chapter_idx ON public.stream_clips(lower(chapter_title));

-- Tournaments
CREATE TABLE public.tournaments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  host_user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  game TEXT,
  format TEXT NOT NULL DEFAULT 'single_elimination' CHECK (format IN ('single_elimination','double_elimination','round_robin')),
  max_teams INTEGER NOT NULL DEFAULT 8,
  prize TEXT,
  description TEXT,
  banner_url TEXT,
  starts_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'registration' CHECK (status IN ('registration','locked','in_progress','completed','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tournaments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tournaments TO authenticated;
GRANT ALL ON public.tournaments TO service_role;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tournaments publicly viewable" ON public.tournaments FOR SELECT USING (true);
CREATE POLICY "Users create tournaments" ON public.tournaments FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_user_id);
CREATE POLICY "Hosts update own tournament" ON public.tournaments FOR UPDATE TO authenticated USING (auth.uid() = host_user_id);
CREATE POLICY "Hosts delete own tournament" ON public.tournaments FOR DELETE TO authenticated USING (auth.uid() = host_user_id);
CREATE TRIGGER trg_tournaments_updated_at BEFORE UPDATE ON public.tournaments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.tournament_teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  captain_user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  team_name TEXT NOT NULL,
  seed INTEGER,
  status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered','checked_in','withdrawn','eliminated')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, captain_user_id),
  UNIQUE(tournament_id, team_name)
);
GRANT SELECT ON public.tournament_teams TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tournament_teams TO authenticated;
GRANT ALL ON public.tournament_teams TO service_role;
ALTER TABLE public.tournament_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teams publicly viewable" ON public.tournament_teams FOR SELECT USING (true);
CREATE POLICY "Users register their team" ON public.tournament_teams FOR INSERT TO authenticated WITH CHECK (auth.uid() = captain_user_id);
CREATE POLICY "Captains or hosts update team" ON public.tournament_teams FOR UPDATE TO authenticated USING (
  auth.uid() = captain_user_id
  OR auth.uid() = (SELECT host_user_id FROM public.tournaments WHERE id = tournament_id)
);
CREATE POLICY "Captains or hosts delete team" ON public.tournament_teams FOR DELETE TO authenticated USING (
  auth.uid() = captain_user_id
  OR auth.uid() = (SELECT host_user_id FROM public.tournaments WHERE id = tournament_id)
);
CREATE INDEX tournament_teams_t_idx ON public.tournament_teams(tournament_id);

CREATE TABLE public.tournament_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  position INTEGER NOT NULL,
  team_a_id UUID REFERENCES public.tournament_teams(id) ON DELETE SET NULL,
  team_b_id UUID REFERENCES public.tournament_teams(id) ON DELETE SET NULL,
  winner_team_id UUID REFERENCES public.tournament_teams(id) ON DELETE SET NULL,
  score_a INTEGER,
  score_b INTEGER,
  scheduled_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','live','completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, round, position)
);
GRANT SELECT ON public.tournament_matches TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tournament_matches TO authenticated;
GRANT ALL ON public.tournament_matches TO service_role;
ALTER TABLE public.tournament_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Matches publicly viewable" ON public.tournament_matches FOR SELECT USING (true);
CREATE POLICY "Hosts insert matches" ON public.tournament_matches FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = (SELECT host_user_id FROM public.tournaments WHERE id = tournament_id)
);
CREATE POLICY "Hosts update matches" ON public.tournament_matches FOR UPDATE TO authenticated USING (
  auth.uid() = (SELECT host_user_id FROM public.tournaments WHERE id = tournament_id)
);
CREATE POLICY "Hosts delete matches" ON public.tournament_matches FOR DELETE TO authenticated USING (
  auth.uid() = (SELECT host_user_id FROM public.tournaments WHERE id = tournament_id)
);
CREATE INDEX tournament_matches_t_idx ON public.tournament_matches(tournament_id, round, position);
CREATE TRIGGER trg_tournament_matches_updated_at BEFORE UPDATE ON public.tournament_matches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
