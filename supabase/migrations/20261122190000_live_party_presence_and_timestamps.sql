BEGIN;

-- Existing membership rows are not proof of a live viewer. Keep them stale
-- until that user opens the party and refreshes their heartbeat.
ALTER TABLE public.watch_party_members
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;
UPDATE public.watch_party_members SET last_seen_at = TIMESTAMPTZ '1970-01-01 00:00:00+00'
WHERE last_seen_at IS NULL;
ALTER TABLE public.watch_party_members
  ALTER COLUMN last_seen_at SET DEFAULT TIMESTAMPTZ '1970-01-01 00:00:00+00',
  ALTER COLUMN last_seen_at SET NOT NULL;

DROP POLICY IF EXISTS "Users can refresh own party presence" ON public.watch_party_members;
CREATE POLICY "Users can refresh own party presence" ON public.watch_party_members
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);
GRANT UPDATE ON public.watch_party_members TO authenticated;

-- A legacy default of Unix epoch made brand-new chat messages display as
-- decades old. Repair only invalid pre-2000 party timestamps, then set sane defaults.
ALTER TABLE public.watch_party_comments ALTER COLUMN created_at SET DEFAULT now();
UPDATE public.watch_party_comments SET created_at = now()
WHERE created_at IS NULL OR created_at < TIMESTAMPTZ '2000-01-01 00:00:00+00';
ALTER TABLE public.watch_party_comments ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE public.watch_party_reactions ALTER COLUMN created_at SET DEFAULT now();
UPDATE public.watch_party_reactions SET created_at = now()
WHERE created_at IS NULL OR created_at < TIMESTAMPTZ '2000-01-01 00:00:00+00';
ALTER TABLE public.watch_party_reactions ALTER COLUMN created_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public'
      AND tablename = 'watch_party_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.watch_party_members;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
COMMIT;
