BEGIN;

CREATE TABLE IF NOT EXISTS public.watch_parties (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  host_id text NOT NULL,
  title text NOT NULL,
  platform text NOT NULL,
  stream_url text NOT NULL,
  streamer_channel text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);

ALTER TABLE public.watch_parties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Watch parties viewable by everyone" ON public.watch_parties;
CREATE POLICY "Watch parties viewable by everyone" ON public.watch_parties
  FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Users can create watch parties" ON public.watch_parties;
CREATE POLICY "Users can create watch parties" ON public.watch_parties
  FOR INSERT TO authenticated WITH CHECK (host_id = auth.uid()::text);
DROP POLICY IF EXISTS "Hosts can update own parties" ON public.watch_parties;
CREATE POLICY "Hosts can update own parties" ON public.watch_parties
  FOR UPDATE TO authenticated USING (host_id = auth.uid()::text)
  WITH CHECK (host_id = auth.uid()::text);
DROP POLICY IF EXISTS "Hosts can delete own parties" ON public.watch_parties;
CREATE POLICY "Hosts can delete own parties" ON public.watch_parties
  FOR DELETE TO authenticated USING (host_id = auth.uid()::text);

GRANT SELECT ON public.watch_parties TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.watch_parties TO authenticated;

CREATE OR REPLACE FUNCTION public.create_watch_party(_title text, _platform text, _stream_url text)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE new_party_id text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to create a watch party'; END IF;
  IF length(trim(coalesce(_title, ''))) = 0
     OR length(trim(coalesce(_platform, ''))) = 0
     OR length(trim(coalesce(_stream_url, ''))) = 0 THEN
    RAISE EXCEPTION 'Party title, platform, and stream URL are required';
  END IF;

  INSERT INTO public.watch_parties (host_id, title, platform, stream_url)
  VALUES (auth.uid()::text, trim(_title), trim(_platform), trim(_stream_url))
  RETURNING id INTO new_party_id;

  INSERT INTO public.watch_party_members (party_id, user_id)
  VALUES (new_party_id, auth.uid()::text);

  RETURN new_party_id;
END;
$$;
REVOKE ALL ON FUNCTION public.create_watch_party(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_watch_party(text, text, text) TO authenticated;
NOTIFY pgrst, 'reload schema';

COMMIT;
