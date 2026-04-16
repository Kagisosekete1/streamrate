
-- WATCH PARTIES
CREATE TABLE public.watch_parties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  host_id UUID NOT NULL,
  title TEXT NOT NULL,
  platform TEXT NOT NULL,
  stream_url TEXT NOT NULL,
  streamer_channel TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);
ALTER TABLE public.watch_parties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Watch parties viewable by everyone" ON public.watch_parties FOR SELECT USING (true);
CREATE POLICY "Users can create watch parties" ON public.watch_parties FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Hosts can update own parties" ON public.watch_parties FOR UPDATE USING (auth.uid() = host_id);
CREATE POLICY "Hosts can delete own parties" ON public.watch_parties FOR DELETE USING (auth.uid() = host_id);

CREATE TABLE public.watch_party_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  party_id UUID NOT NULL REFERENCES public.watch_parties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(party_id, user_id)
);
ALTER TABLE public.watch_party_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members viewable by everyone" ON public.watch_party_members FOR SELECT USING (true);
CREATE POLICY "Users can join parties" ON public.watch_party_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave parties" ON public.watch_party_members FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.watch_party_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  party_id UUID NOT NULL REFERENCES public.watch_parties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.watch_party_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reactions viewable by everyone" ON public.watch_party_reactions FOR SELECT USING (true);
CREATE POLICY "Users can send reactions" ON public.watch_party_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.watch_party_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.watch_party_members;

-- CLIP IT
CREATE TABLE public.stream_clips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clipper_id UUID NOT NULL,
  source_streamer_id UUID,
  source_streamer_name TEXT,
  platform TEXT NOT NULL,
  stream_url TEXT NOT NULL,
  title TEXT,
  reel_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.stream_clips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clips viewable by everyone" ON public.stream_clips FOR SELECT USING (true);
CREATE POLICY "Users can create clips" ON public.stream_clips FOR INSERT WITH CHECK (auth.uid() = clipper_id);
CREATE POLICY "Clippers can delete own clips" ON public.stream_clips FOR DELETE USING (auth.uid() = clipper_id);

-- SQUAD UP
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS games TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS rank TEXT,
  ADD COLUMN IF NOT EXISTS playstyle TEXT,
  ADD COLUMN IF NOT EXISTS region TEXT,
  ADD COLUMN IF NOT EXISTS looking_for_squad BOOLEAN DEFAULT false;

CREATE TABLE public.squad_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  game TEXT NOT NULL,
  rank TEXT,
  region TEXT,
  playstyle TEXT,
  message TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours')
);
ALTER TABLE public.squad_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Squad requests viewable by everyone" ON public.squad_requests FOR SELECT USING (true);
CREATE POLICY "Users can create squad requests" ON public.squad_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own squad requests" ON public.squad_requests FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own squad requests" ON public.squad_requests FOR DELETE USING (auth.uid() = user_id);

-- STREAM POLLS
CREATE TABLE public.stream_polls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  streamer_id UUID NOT NULL,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  winning_option_index INTEGER,
  total_coins_pool INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);
ALTER TABLE public.stream_polls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Polls viewable by everyone" ON public.stream_polls FOR SELECT USING (true);
CREATE POLICY "Streamers can create polls" ON public.stream_polls FOR INSERT WITH CHECK (auth.uid() = streamer_id);
CREATE POLICY "Streamers can update own polls" ON public.stream_polls FOR UPDATE USING (auth.uid() = streamer_id);
CREATE POLICY "Streamers can delete own polls" ON public.stream_polls FOR DELETE USING (auth.uid() = streamer_id);

CREATE TABLE public.poll_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.stream_polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  option_index INTEGER NOT NULL,
  coins_spent INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(poll_id, user_id)
);
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Votes viewable by everyone" ON public.poll_votes FOR SELECT USING (true);
CREATE POLICY "Users can vote" ON public.poll_votes FOR INSERT WITH CHECK (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.stream_polls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_votes;
