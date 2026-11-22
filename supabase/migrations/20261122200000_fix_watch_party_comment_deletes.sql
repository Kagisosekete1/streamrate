BEGIN;

ALTER TABLE public.watch_party_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can delete own party comments"
  ON public.watch_party_comments;
CREATE POLICY "Users can delete own party comments"
  ON public.watch_party_comments
  FOR DELETE TO authenticated
  USING (user_id::text = auth.uid()::text);

GRANT DELETE ON public.watch_party_comments TO authenticated;

-- DELETE Realtime filters need party_id in the old row, not just the primary key.
ALTER TABLE public.watch_party_comments REPLICA IDENTITY FULL;
-- The legacy party tables are published to Realtime and need the old row
-- values available for filtered DELETE events and authorized cleanup.
ALTER TABLE public.watch_party_reactions REPLICA IDENTITY FULL;
ALTER TABLE public.watch_party_members REPLICA IDENTITY FULL;

COMMIT;
