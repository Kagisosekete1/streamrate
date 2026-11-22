BEGIN;

-- The live tables use text IDs and currently have no defaults. Preserve existing
-- data while making new rows safe for both RPC and direct authenticated inserts.
ALTER TABLE public.watch_parties
  ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE public.watch_party_members
  ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

CREATE OR REPLACE FUNCTION public.create_watch_party(
  _title text,
  _platform text,
  _stream_url text
)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_party_id text := gen_random_uuid()::text;
  current_user_id text := auth.uid()::text;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Sign in to create a watch party';
  END IF;

  IF length(trim(coalesce(_title, ''))) = 0
     OR length(trim(coalesce(_platform, ''))) = 0
     OR length(trim(coalesce(_stream_url, ''))) = 0 THEN
    RAISE EXCEPTION 'Party title, platform, and stream URL are required';
  END IF;

  INSERT INTO public.watch_parties (
    id, host_id, title, platform, stream_url, is_active, created_at
  ) VALUES (
    new_party_id, current_user_id, trim(_title), trim(_platform), trim(_stream_url), true, now()
  );

  INSERT INTO public.watch_party_members (id, party_id, user_id, joined_at)
  VALUES (gen_random_uuid()::text, new_party_id, current_user_id, now());

  RETURN new_party_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_watch_party(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_watch_party(text, text, text) TO authenticated;
NOTIFY pgrst, 'reload schema';

COMMIT;
