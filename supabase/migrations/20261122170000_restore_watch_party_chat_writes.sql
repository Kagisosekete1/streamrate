BEGIN;

-- Legacy tables use text IDs without defaults. Generate text UUIDs for new
-- comments and reactions; no existing rows are changed.
ALTER TABLE public.watch_party_reactions
  ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE public.watch_party_comments
  ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

-- auth.uid() returns uuid while the legacy user_id columns are text.
DROP POLICY IF EXISTS "Users can send reactions" ON public.watch_party_reactions;
CREATE POLICY "Users can send reactions" ON public.watch_party_reactions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);
DROP POLICY IF EXISTS "Users can remove own party reactions" ON public.watch_party_reactions;
CREATE POLICY "Users can remove own party reactions" ON public.watch_party_reactions
  FOR DELETE TO authenticated USING (user_id = auth.uid()::text);
DROP POLICY IF EXISTS "Users can post party comments" ON public.watch_party_comments;
CREATE POLICY "Users can post party comments" ON public.watch_party_comments
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);
DROP POLICY IF EXISTS "Users can delete own party comments" ON public.watch_party_comments;
CREATE POLICY "Users can delete own party comments" ON public.watch_party_comments
  FOR DELETE TO authenticated USING (user_id = auth.uid()::text);

GRANT SELECT ON public.watch_party_reactions, public.watch_party_comments TO anon, authenticated;
GRANT INSERT, DELETE ON public.watch_party_reactions, public.watch_party_comments TO authenticated;
NOTIFY pgrst, 'reload schema';

COMMIT;
