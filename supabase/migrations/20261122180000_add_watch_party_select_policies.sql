BEGIN;

-- Inserts use RETURNING in the client, and chat history needs SELECT access.
-- The tables contain public, non-sensitive party activity.
DROP POLICY IF EXISTS "Reactions viewable by everyone" ON public.watch_party_reactions;
CREATE POLICY "Reactions viewable by everyone" ON public.watch_party_reactions
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Party comments viewable by everyone" ON public.watch_party_comments;
CREATE POLICY "Party comments viewable by everyone" ON public.watch_party_comments
  FOR SELECT TO anon, authenticated USING (true);

GRANT SELECT ON public.watch_party_reactions, public.watch_party_comments
  TO anon, authenticated;
NOTIFY pgrst, 'reload schema';

COMMIT;
