CREATE TABLE IF NOT EXISTS public.watch_party_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID NOT NULL REFERENCES public.watch_parties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL CHECK (length(content) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS watch_party_comments_party_idx
  ON public.watch_party_comments(party_id, created_at DESC);

ALTER TABLE public.watch_party_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Party comments viewable by everyone"
  ON public.watch_party_comments FOR SELECT USING (true);

CREATE POLICY "Users can post party comments"
  ON public.watch_party_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own party comments"
  ON public.watch_party_comments FOR DELETE
  USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.watch_party_comments;