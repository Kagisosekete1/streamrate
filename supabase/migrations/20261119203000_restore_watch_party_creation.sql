BEGIN;

CREATE TABLE IF NOT EXISTS public.watch_parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  platform text NOT NULL,
  stream_url text NOT NULL,
  streamer_channel text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.watch_party_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id uuid NOT NULL REFERENCES public.watch_parties(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (party_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.watch_party_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id uuid NOT NULL REFERENCES public.watch_parties(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.watch_party_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id uuid NOT NULL REFERENCES public.watch_parties(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (length(content) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS watch_parties_active_created_idx
  ON public.watch_parties (is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS watch_party_members_party_idx
  ON public.watch_party_members (party_id);
CREATE INDEX IF NOT EXISTS watch_party_reactions_party_idx
  ON public.watch_party_reactions (party_id, created_at DESC);
CREATE INDEX IF NOT EXISTS watch_party_comments_party_idx
  ON public.watch_party_comments (party_id, created_at DESC);

ALTER TABLE public.watch_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_party_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_party_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_party_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Watch parties viewable by everyone" ON public.watch_parties;
CREATE POLICY "Watch parties viewable by everyone"
  ON public.watch_parties FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Users can create watch parties" ON public.watch_parties;
CREATE POLICY "Users can create watch parties"
  ON public.watch_parties FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = host_id);
DROP POLICY IF EXISTS "Hosts can update own parties" ON public.watch_parties;
CREATE POLICY "Hosts can update own parties"
  ON public.watch_parties FOR UPDATE TO authenticated
  USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id);
DROP POLICY IF EXISTS "Hosts can delete own parties" ON public.watch_parties;
CREATE POLICY "Hosts can delete own parties"
  ON public.watch_parties FOR DELETE TO authenticated
  USING (auth.uid() = host_id);

DROP POLICY IF EXISTS "Members viewable by everyone" ON public.watch_party_members;
CREATE POLICY "Members viewable by everyone"
  ON public.watch_party_members FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Users can join parties" ON public.watch_party_members;
CREATE POLICY "Users can join parties"
  ON public.watch_party_members FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can leave parties" ON public.watch_party_members;
CREATE POLICY "Users can leave parties"
  ON public.watch_party_members FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Reactions viewable by everyone" ON public.watch_party_reactions;
CREATE POLICY "Reactions viewable by everyone"
  ON public.watch_party_reactions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Users can send reactions" ON public.watch_party_reactions;
CREATE POLICY "Users can send reactions"
  ON public.watch_party_reactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can remove own party reactions" ON public.watch_party_reactions;
CREATE POLICY "Users can remove own party reactions"
  ON public.watch_party_reactions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Party comments viewable by everyone" ON public.watch_party_comments;
CREATE POLICY "Party comments viewable by everyone"
  ON public.watch_party_comments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Users can post party comments" ON public.watch_party_comments;
CREATE POLICY "Users can post party comments"
  ON public.watch_party_comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own party comments" ON public.watch_party_comments;
CREATE POLICY "Users can delete own party comments"
  ON public.watch_party_comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT ON public.watch_parties, public.watch_party_members,
  public.watch_party_reactions, public.watch_party_comments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.watch_parties TO authenticated;
GRANT INSERT, DELETE ON public.watch_party_members,
  public.watch_party_reactions, public.watch_party_comments TO authenticated;
GRANT ALL ON public.watch_parties, public.watch_party_members,
  public.watch_party_reactions, public.watch_party_comments TO service_role;

-- Create a party and add its host as the first member in one database transaction.
CREATE OR REPLACE FUNCTION public.create_watch_party(
  _title text,
  _platform text,
  _stream_url text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_party_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in to create a watch party';
  END IF;
  IF length(trim(coalesce(_title, ''))) = 0
     OR length(trim(coalesce(_platform, ''))) = 0
     OR length(trim(coalesce(_stream_url, ''))) = 0 THEN
    RAISE EXCEPTION 'Party title, platform, and stream URL are required';
  END IF;

  INSERT INTO public.watch_parties (host_id, title, platform, stream_url)
  VALUES (auth.uid(), trim(_title), trim(_platform), trim(_stream_url))
  RETURNING id INTO new_party_id;

  INSERT INTO public.watch_party_members (party_id, user_id)
  VALUES (new_party_id, auth.uid());

  RETURN new_party_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_watch_party(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_watch_party(text, text, text) TO authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'watch_party_members'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.watch_party_members';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'watch_party_reactions'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.watch_party_reactions';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'watch_party_comments'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.watch_party_comments';
    END IF;
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';
COMMIT;
